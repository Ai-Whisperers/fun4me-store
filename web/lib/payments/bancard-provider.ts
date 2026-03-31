import { AbstractPaymentProvider } from './abstract-provider'
import type { 
  PaymentIntent, 
  CreatePaymentIntentOptions, 
  ProviderResult,
  PaymentError,
  WebhookEvent
} from './types'
import crypto from 'crypto'

interface BancardConfig {
  publicKey: string
  privateKey: string
  environment: 'sandbox' | 'production'
}

interface BancardPaymentResponse {
  status: string
  process_id?: string
  token?: string
  confirmation_code?: string
  response_code?: string
  response_details?: string
}

interface BancardRefundResponse {
  status: string
  refund_id?: string
  response_code?: string
  response_details?: string
}

export class BancardPaymentProvider extends AbstractPaymentProvider {
  readonly name = 'bancard'
  
  private config: BancardConfig

  constructor(config: BancardConfig) {
    super()
    this.config = config
  }

  protected async doCreatePaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntent> {
    const endpoint = this.getEndpoint('buy')
    
    const payload = {
      public_key: this.config.publicKey,
      operation: {
        token: this.generateOperationToken(),
        shop_process_id: this.generateShopProcessId(),
        amount: options.amount,
        currency: options.currency,
        additional_data: {
          invoice_id: options.invoiceId,
          tenant_id: options.tenantId,
          description: options.description || `Pago Vete - Factura ${options.invoiceId}`,
          customer_email: options.customerEmail,
        },
        ...options.metadata,
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: BancardPaymentResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Bancard payment initiation failed: ${result.response_details || 'Unknown error'}`)
      }

      return {
        id: result.process_id || result.token || '',
        clientSecret: result.token || null,
        amount: options.amount,
        currency: options.currency,
        status: 'requires_payment_method',
        metadata: {
          ...options.metadata,
          shop_process_id: payload.operation.shop_process_id,
          confirmation_code: result.confirmation_code || '',
        },
        provider: 'bancard',
      }
    } catch (error) {
      throw new Error(`Bancard API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  protected async doGetPaymentIntent(intentId: string): Promise<PaymentIntent> {
    const endpoint = this.getEndpoint('check_status')
    
    const payload = {
      public_key: this.config.publicKey,
      operation: {
        shop_process_id: intentId,
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: BancardPaymentResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Bancard status check failed: ${result.response_details || 'Unknown error'}`)
      }

      let status: PaymentIntent['status'] = 'requires_payment_method'
      if (result.confirmation_code) {
        status = 'succeeded'
      } else if (result.response_code === '01') {
        status = 'requires_action'
      }

      return {
        id: intentId,
        clientSecret: result.token || null,
        amount: 0,
        currency: 'PYG',
        status,
        metadata: {
          confirmation_code: result.confirmation_code || '',
          response_code: result.response_code || '',
        },
        provider: 'bancard',
      }
    } catch (error) {
      throw new Error(`Bancard API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  protected async doRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refundId: string }> {
    const endpoint = this.getEndpoint('cancel')
    
    const payload = {
      public_key: this.config.publicKey,
      operation: {
        shop_process_id: paymentIntentId,
        amount: amount,
        reason: reason || 'Customer requested refund',
      },
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: BancardRefundResponse = await response.json()

      if (result.status !== 'success' && result.response_code !== '00') {
        throw new Error(`Bancard refund failed: ${result.response_details || 'Unknown error'}`)
      }

      return { refundId: result.refund_id || `refund_${Date.now()}` }
    } catch (error) {
      throw new Error(`Bancard API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    const message = (err.message as string) || (err.response_details as string) || 'Unknown Bancard error'
    const code = (err.response_code as string) || (err.code as string) || 'bancard_error'

    return {
      code,
      message,
      details: error,
      provider: 'bancard',
    }
  }

  private getEndpoint(operation: 'buy' | 'check_status' | 'cancel'): string {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://prod.bancard.com.py/api/v1' 
      : 'https://sbox.bancard.com.py/api/v1'

    const endpoints = {
      buy: '/buy',
      check_status: '/check_status',
      cancel: '/cancel',
    }

    return `${baseUrl}${endpoints[operation]}`
  }

  private generateOperationToken(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateShopProcessId(): string {
    return `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateWebhookSignature(payload: unknown, secret: string): string {
    const stringifiedPayload = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort())
    return crypto.createHmac('sha256', secret).update(stringifiedPayload).digest('hex')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseWebhookEvent(payload: any): WebhookEvent {
    return {
      id: String(payload.operation_id || payload.shop_process_id),
      type: this.mapBancardEventType(payload.status),
      data: {
        object: {
          shop_process_id: payload.shop_process_id,
          amount: payload.amount,
          currency: payload.currency || 'PYG',
          confirmation_code: payload.confirmation_code,
          response_code: payload.response_code,
          response_details: payload.response_details,
          additional_data: payload.additional_data,
          created_at: payload.created_at || new Date().toISOString(),
        }
      },
    }
  }

  private mapBancardEventType(bancardStatus: string): string {
    const statusMap: Record<string, string> = {
      'approved': 'payment_intent.succeeded',
      'rejected': 'payment_intent.payment_failed',
      'cancelled': 'payment_intent.canceled',
      'pending': 'payment_intent.requires_action',
    }

    return statusMap[bancardStatus] || 'payment_intent.unknown'
  }
}
