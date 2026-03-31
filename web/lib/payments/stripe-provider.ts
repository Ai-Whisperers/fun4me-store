/**
 * Stripe Payment Provider
 * 
 * Implementation of PaymentProvider for Stripe.
 */

import { AbstractPaymentProvider } from './abstract-provider'
import type { 
  PaymentIntent, 
  CreatePaymentIntentOptions, 
  ProviderResult,
  PaymentError,
  WebhookEvent,
  Currency
} from './types'
import { getStripeClient, toStripeAmount } from '../billing/stripe'
import type Stripe from 'stripe'

export class StripePaymentProvider extends AbstractPaymentProvider {
  readonly name = 'stripe'

  protected async doCreatePaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntent> {
    const stripe = getStripeClient()
    
    const params: Stripe.PaymentIntentCreateParams = {
      amount: toStripeAmount(options.amount, options.currency),
      currency: options.currency.toLowerCase(),
      metadata: {
        tenant_id: options.tenantId,
        invoice_id: options.invoiceId,
        ...options.metadata,
      },
    }

    if (options.customerId) {
      params.customer = options.customerId
    } else if (options.customerEmail) {
      params.receipt_email = options.customerEmail
    }

    if (options.description) {
      params.description = options.description
    }

    const intent = await stripe.paymentIntents.create(params)
    return this.mapStripeIntent(intent)
  }

  protected async doGetPaymentIntent(intentId: string): Promise<PaymentIntent> {
    const stripe = getStripeClient()
    const intent = await stripe.paymentIntents.retrieve(intentId)
    return this.mapStripeIntent(intent)
  }

  protected async doRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refundId: string }> {
    const stripe = getStripeClient()
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }
    // Note: Currency handling for partial refunds needed here if amount is provided
    const refund = await stripe.refunds.create(params)
    return { refundId: refund.id }
  }

  async verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>> {
    // Webhooks are special and usually handled before execute wrapper to avoid body re-reading issues
    return this.execute('verifyWebhook', async () => {
      const stripe = getStripeClient()
      const event = stripe.webhooks.constructEvent(payload as string | Buffer, signature, secret)
      return event as unknown as WebhookEvent
    })
  }

  protected override normalizeError(error: unknown): PaymentError {
    const stripeError = error as Record<string, unknown>
    return {
      code: (stripeError.code as string) || (stripeError.type as string) || 'stripe_error',
      message: (stripeError.message as string) || 'Unknown Stripe error',
      details: stripeError,
    }
  }

  private mapStripeIntent(intent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency.toUpperCase() as Currency,
      status: this.mapStripeStatus(intent.status),
      metadata: intent.metadata as Record<string, string>,
      provider: 'stripe',
    }
  }

  private mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentIntent['status'] {
    switch (status) {
      case 'requires_payment_method': return 'requires_payment_method'
      case 'requires_confirmation': return 'requires_confirmation'
      case 'requires_action': return 'requires_action'
      case 'processing': return 'processing'
      case 'requires_capture': return 'requires_capture'
      case 'canceled': return 'canceled'
      case 'succeeded': return 'succeeded'
      default: return 'processing'
    }
  }
}