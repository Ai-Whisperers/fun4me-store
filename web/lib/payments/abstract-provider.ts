/**
 *  Abstract Payment Provider
 * 
 * Base class for all payment providers to ensure consistent logging,
 * error handling, and telemetry.
 */

import { logger } from '@/lib/logger'
import type { 
  PaymentProvider, 
  PaymentIntent, 
  CreatePaymentIntentOptions, 
  ProviderResult,
  PaymentError,
  WebhookEvent
} from './types'

export abstract class AbstractPaymentProvider implements PaymentProvider {
  abstract readonly name: string

  /**
   * Initialize a payment transaction - implemented by concrete providers
   */
  protected abstract doCreatePaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntent>

  /**
   * Retrieve an existing payment intent - implemented by concrete providers
   */
  protected abstract doGetPaymentIntent(intentId: string): Promise<PaymentIntent>

  /**
   * Process a refund - implemented by concrete providers
   */
  protected abstract doRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refundId: string }>

  /**
   * Verify a webhook signature - implemented by concrete providers
   */
  public abstract verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>>

  /**
   * Standardized wrapper for creating payment intents
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<ProviderResult<PaymentIntent>> {
    return this.execute('createPaymentIntent', () => this.doCreatePaymentIntent(options), { options })
  }

  /**
   * Standardized wrapper for retrieving payment intents
   */
  async getPaymentIntent(intentId: string): Promise<ProviderResult<PaymentIntent>> {
    return this.execute('getPaymentIntent', () => this.doGetPaymentIntent(intentId), { intentId })
  }

  /**
   * Standardized wrapper for processing refunds
   */
  async refund(paymentIntentId: string, amount?: number, reason?: string): Promise<ProviderResult<{ refundId: string }>> {
    return this.execute('refund', () => this.doRefund(paymentIntentId, amount, reason), { paymentIntentId, amount })
  }

  /**
   * Common execution wrapper for logging, error normalization and telemetry
   */
  protected async execute<T>(
    operation: string, 
    action: () => Promise<T>, 
    context: Record<string, unknown> = {}
  ): Promise<ProviderResult<T>> {
    const startTime = Date.now()
    
    try {
      const data = await action()
      const duration = Date.now() - startTime
      
      logger.info(`[PaymentProvider:${this.name}] ${operation} success`, {
        operation,
        duration,
        ...context
      })

      return { success: true, data }
    } catch (error) {
      const duration = Date.now() - startTime
      const normalizedError = this.normalizeError(error)
      normalizedError.provider = this.name

      logger.error(`[PaymentProvider:${this.name}] ${operation} failed`, {
        operation,
        duration,
        error: normalizedError,
        ...context
      })

      return { success: false, error: normalizedError }
    }
  }

  /**
 * Normalize provider-specific errors into a standard PaymentError
 */
  protected normalizeError(error: unknown): PaymentError {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const err = error as Record<string, unknown>
      return {
        code: String(err.code),
        message: String(err.message),
        details: error
      }
    }

    return {
      code: 'unknown_provider_error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error
    }
  }
}
