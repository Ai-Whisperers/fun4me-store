/**
 * Payment Provider Factory
 * 
 * Handles the creation and resolution of payment providers.
 */

import { StripePaymentProvider } from './stripe-provider'
import { BancardPaymentProvider } from './bancard-provider'
import { TigoMoneyPaymentProvider } from './tigo-money-provider'
import { MockPaymentProvider } from './mock-provider'
import type { PaymentProvider, PaymentProviderFactory } from './types'
import { logger } from '@/lib/logger'

export class DefaultPaymentProviderFactory implements PaymentProviderFactory {
  getProvider(name?: string): PaymentProvider {
    const providerName = name || process.env.PAYMENT_PROVIDER || 'mock'

    switch (providerName.toLowerCase()) {
      case 'stripe':
        return new StripePaymentProvider()
      case 'bancard':
        return new BancardPaymentProvider({
          publicKey: process.env.BANCARD_PUBLIC_KEY || '',
          privateKey: process.env.BANCARD_PRIVATE_KEY || '',
          environment: (process.env.BANCARD_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        })
      case 'tigo_money':
        return new TigoMoneyPaymentProvider({
          apiKey: process.env.TIGO_MONEY_API_KEY || '',
          apiSecret: process.env.TIGO_MONEY_API_SECRET || '',
          environment: (process.env.TIGO_MONEY_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        })
      case 'mock':
        return new MockPaymentProvider()
      default:
        logger.warn(`[PaymentProviderFactory] Unknown provider "${providerName}", falling back to mock`, {
          requested: providerName,
          env: process.env.NODE_ENV
        })
        return new MockPaymentProvider()
    }
  }
}

// Global factory instance
export const paymentProviderFactory = new DefaultPaymentProviderFactory()
