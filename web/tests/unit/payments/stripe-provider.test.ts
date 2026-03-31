import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripePaymentProvider } from '@/lib/payments/stripe-provider'
import { getStripeClient } from '@/lib/billing/stripe'

// Mock Stripe client and logger
vi.mock('@/lib/billing/stripe', () => ({
  getStripeClient: vi.fn(),
  toStripeAmount: vi.fn((amount) => amount), // Simplified for test
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('StripePaymentProvider', () => {
  let provider: StripePaymentProvider
  let mockStripe: any

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StripePaymentProvider()
    
    mockStripe = {
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      refunds: {
        create: vi.fn(),
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    }
    
    ;(getStripeClient as any).mockReturnValue(mockStripe)
  })

  it('should create a payment intent successfully (internal mapping)', async () => {
    const mockIntent = {
      id: 'pi_123',
      client_secret: 'secret_123',
      amount: 100000,
      currency: 'pyg',
      status: 'requires_payment_method',
      metadata: { tenant_id: 'tenant-1' },
    }
    mockStripe.paymentIntents.create.mockResolvedValue(mockIntent)

    const result = await (provider as any).doCreatePaymentIntent({
      amount: 100000,
      currency: 'PYG',
      invoiceId: 'inv-1',
      tenantId: 'tenant-1',
    })

    expect(result.id).toBe('pi_123')
    expect(result.clientSecret).toBe('secret_123')
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 100000,
      currency: 'pyg',
    }))
  })

  it('should handle stripe errors during intent creation via base class', async () => {
    mockStripe.paymentIntents.create.mockRejectedValue({
      code: 'card_declined',
      message: 'Your card was declined.',
    })

    const result = await provider.createPaymentIntent({
      amount: 1000,
      currency: 'PYG',
      invoiceId: 'inv-1',
      tenantId: 'tenant-1',
    })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('card_declined')
    expect(result.error?.message).toBe('Your card was declined.')
    expect(result.error?.provider).toBe('stripe')
  })

  it('should retrieve a payment intent (internal mapping)', async () => {
    const mockIntent = {
      id: 'pi_123',
      status: 'succeeded',
      amount: 50000,
      currency: 'pyg',
      metadata: {},
    }
    mockStripe.paymentIntents.retrieve.mockResolvedValue(mockIntent)

    const result = await (provider as any).doGetPaymentIntent('pi_123')

    expect(result.id).toBe('pi_123')
    expect(result.status).toBe('succeeded')
    expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123')
  })
})