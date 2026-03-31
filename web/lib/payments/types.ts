/**
 * Unified Payment System Types
 * 
 * Defines the core interfaces and types for the provider-agnostic payment system.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WebhookEvent<T = any> {
  type: string
  id: string
  data: {
    object: T
  }
}

import type { PaymentMethod as DbPaymentMethod, PaymentStatus as DbPaymentStatus } from '../types/database/enums'

// =============================================================================
// Core Types
// =============================================================================

/**
 * Extended payment methods supported by providers
 */
export type PaymentMethod = DbPaymentMethod | 'stripe' | 'bancard' | 'tigo_money'

/**
 * Payment status lifecycle
 */
export type PaymentStatus = DbPaymentStatus

/**
 * Supported currencies (PYG is primary for Paraguay)
 */
export type Currency = 'PYG' | 'USD'

/**
 * Payment Intent represents a transaction in progress
 */
export interface PaymentIntent {
  id: string
  clientSecret: string | null
  amount: number
  currency: Currency
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded'
  metadata?: Record<string, string>
  provider: string
}

/**
 * Result of a provider operation
 */
export interface PaymentError {
  code: string
  message: string
  details?: unknown
  provider?: string
}

export interface ProviderResult<T> {
  success: boolean
  data?: T
  error?: PaymentError
}

// =============================================================================
// Provider Interface
// =============================================================================

export interface CreatePaymentIntentOptions {
  amount: number
  currency: Currency
  invoiceId: string
  tenantId: string
  customerId?: string
  customerEmail?: string
  description?: string
  metadata?: Record<string, string>
}

/**
 * Factory for creating payment providers
 */
export interface PaymentProviderFactory {
  getProvider(name?: string): PaymentProvider
}

export interface PaymentProvider {
  /**
   * Provider identifier (e.g., 'stripe', 'bancard')
   */
  readonly name: string

  /**
   * Initialize a payment transaction
   */
  createPaymentIntent(options: CreatePaymentIntentOptions): Promise<ProviderResult<PaymentIntent>>

  /**
   * Retrieve an existing payment intent
   */
  getPaymentIntent(intentId: string): Promise<ProviderResult<PaymentIntent>>

  /**
   * Process a refund
   */
  refund(paymentIntentId: string, amount?: number, reason?: string): Promise<ProviderResult<{ refundId: string }>>

  /**
   * Verify a webhook signature and parse the event
   */
  verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>>
}

// =============================================================================
// Service Configuration
// =============================================================================

export interface PaymentServiceConfig {
  defaultProvider: string
  providers: {
    stripe?: {
      enabled: boolean
      publishableKey: string
      secretKey: string
      webhookSecret: string
    }
    bancard?: {
      enabled: boolean
      publicKey: string
      privateKey: string
      environment: 'sandbox' | 'production'
    }
    tigo_money?: {
      enabled: boolean
      apiKey: string
      apiSecret: string
      environment: 'sandbox' | 'production'
    }
    // Future providers can be added here
  }
}
