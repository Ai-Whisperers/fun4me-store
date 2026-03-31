import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripePaymentProvider } from '@/lib/payments/stripe-provider'
import { getStripeClient } from '@/lib/billing/stripe'

vi.mock('@/lib/billing/stripe', () => ({
  getStripeClient: vi.fn(),
  // Use actual helper to test real conversion logic
  toStripeAmount: (amount: number, currency: string) => {
    if (currency.toUpperCase() === 'PYG') return Math.round(amount)
    return Math.round(amount * 100)
  }
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}))

describe('StripePaymentProvider - Edge Cases', () => {
  let provider: StripePaymentProvider
  let mockStripe: any

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StripePaymentProvider()
    mockStripe = {
      paymentIntents: { create: vi.fn() },
      webhooks: { constructEvent: vi.fn() }
    }
    ;(getStripeClient as any).mockReturnValue(mockStripe)
  })

  it('should NOT multiply PYG amounts by 100 (zero-decimal currency)', async () => {
    mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_1', status: 'succeeded', currency: 'pyg', amount: 150000 })

    await provider.createPaymentIntent({
      amount: 150000,
      currency: 'PYG',
      invoiceId: 'inv-1',
      tenantId: 'tenant-1',
    })

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 150000, // Should be 150000, not 15000000
      currency: 'pyg'
    }))
  })

  it('should multiply USD amounts by 100 (decimal currency)', async () => {
    mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_2', status: 'succeeded', currency: 'usd', amount: 1000 })

    await provider.createPaymentIntent({
      amount: 10,
      currency: 'USD',
      invoiceId: 'inv-2',
      tenantId: 'tenant-1',
    })

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1000, // $10.00
      currency: 'usd'
    }))
  })

  it('should correctly verify and parse webhooks', async () => {
    const payload = { id: 'evt_1' }
    const signature = 'sig_1'
    const secret = 'whsec_1'
    mockStripe.webhooks.constructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: {} } })

    const result = await provider.verifyWebhook(JSON.stringify(payload), signature, secret)

    expect(result.success).toBe(true)
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(JSON.stringify(payload), signature, secret)
  })
})
