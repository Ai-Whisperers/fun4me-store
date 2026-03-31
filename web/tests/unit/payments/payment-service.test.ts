import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/lib/payments/service'

// Mock logger to avoid noise
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PAYMENT_PROVIDER
  })

  it('should initialize with default mock provider when no env is set', () => {
    const service = new PaymentService()
    expect(service.providerName).toBe('mock')
  })

  it('should initialize with stripe provider when env is set to stripe', () => {
    process.env.PAYMENT_PROVIDER = 'stripe'
    const service = new PaymentService()
    expect(service.providerName).toBe('stripe')
  })

  it('should correctly call createPaymentIntent on the provider', async () => {
    const service = new PaymentService('mock')
    const options = {
      amount: 100000,
      currency: 'PYG' as const,
      invoiceId: 'inv-123',
      tenantId: 'tenant-abc',
    }

    const result = await service.createPaymentIntent(options)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.amount).toBe(100000)
    expect(result.data?.currency).toBe('PYG')
    expect(result.data?.provider).toBe('mock')
    expect(result.data?.id).toContain('mock_pi_')
  })

  it('should handle provider errors gracefully', async () => {
    const service = new PaymentService('mock')
    
    // Force an error by mocking the provider's internal method
    const provider = (service as any).provider
    vi.spyOn(provider, 'doCreatePaymentIntent').mockRejectedValue(new Error('Provider failed'))

    const result = await service.createPaymentIntent({
      amount: 1000,
      currency: 'PYG',
      invoiceId: 'inv-123',
      tenantId: 'tenant-abc',
    })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('unknown_provider_error')
    expect(result.error?.message).toBe('Provider failed')
  })
})
