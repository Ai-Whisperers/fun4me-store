/**
 * Payment Service
 * 
 * Orchestrates payment operations across different providers and 
 * manages the integration with the application's database.
 */

import { paymentProviderFactory } from './factory'
import type { 
  PaymentProvider, 
  PaymentIntent, 
  CreatePaymentIntentOptions, 
  ProviderResult,
  WebhookEvent
} from './types'

export class PaymentService {
  private provider: PaymentProvider

  constructor(providerName?: string) {
    this.provider = paymentProviderFactory.getProvider(providerName)
  }

  /**
   * Get the current provider name
   */
  get providerName(): string {
    return this.provider.name
  }

  /**
   * Initialize a payment transaction
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<ProviderResult<PaymentIntent>> {
    // Logging and timing are now handled by the AbstractPaymentProvider
    return this.provider.createPaymentIntent(options)
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(intentId: string): Promise<ProviderResult<PaymentIntent>> {
    return this.provider.getPaymentIntent(intentId)
  }

  /**
   * Process a refund
   */
  async refund(paymentIntentId: string, amount?: number, reason?: string): Promise<ProviderResult<{ refundId: string }>> {
    return this.provider.refund(paymentIntentId, amount, reason)
  }

  /**
   * Verify a webhook
   */
  async verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>> {
    return this.provider.verifyWebhook(payload, signature, secret)
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let paymentServiceInstance: PaymentService | null = null

export function getPaymentService(providerName?: string): PaymentService {
  // If a specific provider is requested, we don't use the singleton
  // unless it matches the existing one.
  if (providerName) {
    return new PaymentService(providerName)
  }

  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService()
  }
  return paymentServiceInstance
}