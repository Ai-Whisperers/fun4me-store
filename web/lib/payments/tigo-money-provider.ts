import { AbstractPaymentProvider } from './abstract-provider'
import type { 
  PaymentIntent, 
  CreatePaymentIntentOptions, 
  ProviderResult,
  PaymentError,
  WebhookEvent,
  Currency
} from './types'
import crypto from 'crypto'

interface TigoMoneyConfig {
  apiKey: string
  apiSecret: string
  environment: 'sandbox' | 'production'
}

interface TigoMoneyPaymentResponse {
  status: string
  transaction_id?: string
  qr_code?: string
  qr_code_expires_at?: string
  payment_url?: string
  response_code?: string
  response_details?: string
}

interface TigoMoneyStatusResponse {
  status: string
  transaction_id: string
  amount: number
  currency: string
  paid_at?: string
  response_code?: string
  response_details?: string
}

interface TigoMoneyRefundResponse {
  status: string
  refund_id?: string
  response_code?: string
  response_details?: string
}

export class TigoMoneyPaymentProvider extends AbstractPaymentProvider {
  readonly name = 'tigo_money'
  
  private config: TigoMoneyConfig

  constructor(config: TigoMoneyConfig) {
    super()
    this.config = config
  }

  protected async doCreatePaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntent> {
    const endpoint = this.getEndpoint('generate_qr')
    
    const payload = {
      api_key: this.config.apiKey,
      transaction: {
        external_id: this.generateExternalId(),
        amount: options.amount,
        currency: options.currency,
        description: options.description || `Pago Vete - Factura ${options.invoiceId}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/tigo_money`,
        expires_in: 3600,
        metadata: {
          invoice_id: options.invoiceId,
          tenant_id: options.tenantId,
          customer_email: options.customerEmail,
          ...options.metadata,
        },
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateApiToken()}`,
        },
        body: JSON.stringify(payload),
      })

      const result: TigoMoneyPaymentResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Tigo Money QR generation failed: ${result.response_details || 'Unknown error'}`)
      }

      return {
        id: result.transaction_id || '',
        clientSecret: result.qr_code || null,
        amount: options.amount,
        currency: options.currency,
        status: 'requires_payment_method',
        metadata: {
          ...options.metadata,
          qr_code: result.qr_code || '',
          qr_code_expires_at: result.qr_code_expires_at || '',
          payment_url: result.payment_url || '',
        },
        provider: 'tigo_money',
      }
    } catch (error) {
      throw new Error(`Tigo Money API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  protected async doGetPaymentIntent(intentId: string): Promise<PaymentIntent> {
    const endpoint = this.getEndpoint('check_status')
    
    const payload = {
      api_key: this.config.apiKey,
      transaction_id: intentId,
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateApiToken()}`,
        },
        body: JSON.stringify(payload),
      })

      const result: TigoMoneyStatusResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Tigo Money status check failed: ${result.response_details || 'Unknown error'}`)
      }

      let status: PaymentIntent['status'] = 'requires_payment_method'
      if (result.paid_at) {
        status = 'succeeded'
      } else if (result.response_code === '01') {
        status = 'requires_action'
      }

      return {
        id: intentId,
        clientSecret: null,
        amount: result.amount,
        currency: result.currency as Currency,
        status,
        metadata: {
          paid_at: result.paid_at || '',
          response_code: result.response_code || '',
        },
        provider: 'tigo_money',
      }
    } catch (error) {
      throw new Error(`Tigo Money API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  protected async doRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refundId: string }> {
    const endpoint = this.getEndpoint('refund')
    
    const payload = {
      api_key: this.config.apiKey,
      refund: {
        original_transaction_id: paymentIntentId,
        amount: amount,
        reason: reason || 'Customer requested refund',
        external_id: this.generateExternalId(),
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateApiToken()}`,
        },
        body: JSON.stringify(payload),
      })

      const result: TigoMoneyRefundResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Tigo Money refund failed: ${result.response_details || 'Unknown error'}`)
      }

      return { refundId: result.refund_id || `refund_${Date.now()}` }
    } catch (error) {
      throw new Error(`Tigo Money API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>> {
    try {
      const expectedSignature = this.generateWebhookSignature(payload, secret)
      
      if (signature !== expectedSignature) {
        throw new Error('Webhook signature verification failed')
      }

      const event = this.parseWebhookEvent(payload)

      return {
        success: true,
        data: event,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'webhook_verification_failed',
          message: `Webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  protected override normalizeError(error: unknown): PaymentError {
    const err = error as Record<string, unknown>
    const message = (err.message as string) || (err.response_details as string) || 'Unknown Tigo Money error'
    const code = (err.response_code as string) || (err.code as string) || 'tigo_money_error'

    return {
      code,
      message,
      details: error,
      provider: 'tigo_money',
    }
  }

  private getEndpoint(operation: 'generate_qr' | 'check_status' | 'refund'): string {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://api.tigomoney.com.py/v2' 
      : 'https://sandbox.tigomoney.com.py/v2'

    const endpoints = {
      generate_qr: '/payments/generate_qr',
      check_status: '/payments/status',
      refund: '/payments/refund',
    }

    return `${baseUrl}${endpoints[operation]}`
  }

  private generateApiToken(): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const signatureString = `${this.config.apiKey}:${timestamp}:${this.config.apiSecret}`
    const signature = crypto.createHmac('sha256', signatureString).digest('hex')
    
    return Buffer.from(`${this.config.apiKey}:${timestamp}:${signature}`).toString('base64')
  }

  private generateExternalId(): string {
    return `tigo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateWebhookSignature(payload: unknown, secret: string): string {
    const stringifiedPayload = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort())
    return crypto.createHmac('sha256', secret).update(stringifiedPayload).digest('hex')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseWebhookEvent(payload: any): WebhookEvent {
    return {
      id: String(payload.transaction_id || payload.external_id),
      type: this.mapTigoMoneyEventType(payload.status),
      data: {
        object: {
          transaction_id: payload.transaction_id,
          external_id: payload.external_id,
          amount: payload.amount,
          currency: payload.currency || 'PYG',
          status: payload.status,
          paid_at: payload.paid_at,
          response_code: payload.response_code,
          response_details: payload.response_details,
          metadata: payload.metadata,
          created_at: payload.created_at || new Date().toISOString(),
        }
      },
    }
  }

  private mapTigoMoneyEventType(tigoStatus: string): string {
    const statusMap: Record<string, string> = {
      'paid': 'payment_intent.succeeded',
      'failed': 'payment_intent.payment_failed',
      'cancelled': 'payment_intent.canceled',
      'pending': 'payment_intent.requires_action',
      'expired': 'payment_intent.canceled',
    }

    return statusMap[tigoStatus] || 'payment_intent.unknown'
  }
}
