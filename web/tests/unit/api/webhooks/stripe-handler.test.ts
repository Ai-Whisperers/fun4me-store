import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/webhooks/stripe/route'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

vi.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}))

describe('Stripe Webhook Handler Routing', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  const createMockRequest = (body: string, signature: string) => {
    return new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body,
    })
  }

  it('should call record_invoice_payment RPC when store invoice_id is present', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_store_123',
          amount: 150000,
          metadata: {
            invoice_id: 'store-inv-uuid',
            tenant_id: 'tenant-uuid',
          }
        }
      }
    }
    ;(constructWebhookEvent as any).mockReturnValue(event)

    const req = createMockRequest(JSON.stringify({}), 'valid_sig')
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('record_invoice_payment', expect.objectContaining({
      p_invoice_id: 'store-inv-uuid',
      p_tenant_id: 'tenant-uuid',
      p_amount: 150000,
    }))
  })

  it('should update platform_invoices when platform_invoice_id is present', async () => {
    const event = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_platform_123',
          amount: 5000,
          metadata: {
            platform_invoice_id: 'plat-inv-uuid',
            transaction_id: 'tx-uuid',
          }
        }
      }
    }
    ;(constructWebhookEvent as any).mockReturnValue(event)
    
    // Mock the platform invoice check
    mockSupabase.single.mockResolvedValue({ data: { status: 'sent' }, error: null })

    const req = createMockRequest(JSON.stringify({}), 'valid_sig')
    await POST(req)

    // Should update billing_payment_transactions
    expect(mockSupabase.from).toHaveBeenCalledWith('billing_payment_transactions')
    // Should update platform_invoices
    expect(mockSupabase.from).toHaveBeenCalledWith('platform_invoices')
  })
})
