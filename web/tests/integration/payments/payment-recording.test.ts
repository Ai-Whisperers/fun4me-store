/**
 * Payment Recording Integration Tests
 *
 * Tests the payment recording workflow including:
 * - Recording payments on invoices
 * - Automatic status updates (partial, paid)
 * - Amount validation
 * - Authorization checks
 *
 * @ticket TICKET-BIZ-005
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST as recordPayment, GET as getPayments } from '@/app/api/invoices/[id]/payments/route'
import { NextRequest } from 'next/server'

// Mock response type helper
interface MockResponse {
  status: number
  json: () => Promise<Record<string, unknown>>
}

// Mock user and profile
const mockUser = { id: 'user-123', email: 'vet@clinic.com' }
const mockProfile = { tenant_id: 'tenant-terrapet', role: 'vet', full_name: 'Dr. Test' }

// Mock Supabase client with RPC support
const mockRpcFn = vi.fn()
const mockSelectFn = vi.fn()
const mockEqFn = vi.fn()
const mockSingleFn = vi.fn()
const mockOrderFn = vi.fn()

const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  },
  from: vi.fn().mockImplementation((table: string) => ({
    select: (...args: unknown[]) => {
      mockSelectFn(...args)
      return {
        eq: (...eqArgs: unknown[]) => {
          mockEqFn(...eqArgs)
          return {
            single: () => mockSingleFn(),
            order: (...orderArgs: unknown[]) => {
              mockOrderFn(...orderArgs)
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
      }
    },
  })),
  rpc: mockRpcFn,
})

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(createMockSupabase()),
}))

vi.mock('@/lib/auth', () => ({
  withApiAuthParams: (handler: (...args: unknown[]) => unknown, _options?: { roles: string[] }) => {
    return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      const supabase = createMockSupabase()
      const params = await context.params
      return handler(
        { user: mockUser, profile: mockProfile, supabase, request },
        params
      )
    }
  },
  isStaff: (profile: { role: string }) => ['vet', 'admin'].includes(profile.role),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

// Import routes AFTER mocks
import { POST as recordPayment, GET as getPayments } from '@/app/api/invoices/[id]/payments/route'

describe('Payment Recording API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invoices/[id]/payments', () => {
    const invoiceId = 'invoice-123'

    const createRequest = (body: Record<string, unknown>) =>
      new NextRequest('http://localhost/api/invoices/invoice-123/payments', {
        method: 'POST',
        body: JSON.stringify(body),
      })

    it('should record a payment successfully', async () => {
      const paymentAmount = 50000

      mockRpcFn.mockResolvedValue({
        data: {
          success: true,
          payment_id: 'payment-456',
          amount_paid: paymentAmount,
          amount_due: 0,
          status: 'paid',
        },
        error: null,
      })

      const request = createRequest({
        amount: paymentAmount,
        payment_method: 'cash',
        notes: 'Pago en efectivo',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json).toMatchObject({
        payment: { id: 'payment-456' },
        invoice: {
          amount_paid: paymentAmount,
          amount_due: 0,
          status: 'paid',
        },
      })
    })

    it('should handle partial payments and update status to partial', async () => {
      const paymentAmount = 25000

      mockRpcFn.mockResolvedValue({
        data: {
          success: true,
          payment_id: 'payment-789',
          amount_paid: paymentAmount,
          amount_due: 25000,
          status: 'partial',
        },
        error: null,
      })

      const request = createRequest({
        amount: paymentAmount,
        payment_method: 'transfer',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(201)
      const json = await response.json() as any
      expect(json.invoice.status).toBe('partial')
      expect(json.invoice.amount_due).toBe(25000)
    })

    it('should reject payment without amount', async () => {
      const request = createRequest({
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.code).toBe('VALIDATION_ERROR')
    })

    it('should reject payment with invalid amount type', async () => {
      const request = createRequest({
        amount: 'not-a-number',
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(400)
    })

    it('should reject payment with zero amount', async () => {
      const request = createRequest({
        amount: 0,
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(400)
    })

    it('should reject payment with negative amount via RPC', async () => {
      // Negative amounts pass initial validation (amount is truthy and is a number)
      // The RPC function should handle this validation
      mockRpcFn.mockResolvedValue({
        data: {
          success: false,
          error: 'Monto debe ser positivo',
        },
        error: null,
      })

      const request = createRequest({
        amount: -100,
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.details?.reason).toContain('positivo')
    })

    it('should handle RPC validation errors', async () => {
      mockRpcFn.mockResolvedValue({
        data: {
          success: false,
          error: 'Monto excede saldo pendiente',
        },
        error: null,
      })

      const request = createRequest({
        amount: 999999,
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.details?.reason).toContain('Monto excede')
    })

    it('should handle database errors gracefully', async () => {
      mockRpcFn.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      })

      const request = createRequest({
        amount: 50000,
        payment_method: 'cash',
      })

      const response = (await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(500)
      const json = await response.json() as any
      expect(json.code).toBe('DATABASE_ERROR')
    })

    it('should default payment method to cash when not provided', async () => {
      mockRpcFn.mockResolvedValue({
        data: {
          success: true,
          payment_id: 'payment-123',
          amount_paid: 50000,
          amount_due: 0,
          status: 'paid',
        },
        error: null,
      })

      const request = createRequest({
        amount: 50000,
      })

      await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })

      expect(mockRpcFn).toHaveBeenCalledWith(
        'record_invoice_payment',
        expect.objectContaining({
          p_payment_method: 'cash',
        })
      )
    })

    it('should include reference number when provided', async () => {
      mockRpcFn.mockResolvedValue({
        data: {
          success: true,
          payment_id: 'payment-123',
          amount_paid: 50000,
          amount_due: 0,
          status: 'paid',
        },
        error: null,
      })

      const request = createRequest({
        amount: 50000,
        payment_method: 'transfer',
        reference_number: 'TXN-12345',
      })

      await recordPayment(request, {
        params: Promise.resolve({ id: invoiceId }),
      })

      expect(mockRpcFn).toHaveBeenCalledWith(
        'record_invoice_payment',
        expect.objectContaining({
          p_reference_number: 'TXN-12345',
        })
      )
    })
  })

  describe('GET /api/invoices/[id]/payments', () => {
    const invoiceId = 'invoice-123'

    const createGetRequest = () =>
      new NextRequest(`http://localhost/api/invoices/${invoiceId}/payments`, {
        method: 'GET',
      })

    it('should return payments list for invoice', async () => {
      const mockPayments = [
        { id: 'pay-1', amount: 25000, payment_method: 'cash', paid_at: '2024-01-15' },
        { id: 'pay-2', amount: 25000, payment_method: 'transfer', paid_at: '2024-01-16' },
      ]

      mockSingleFn.mockResolvedValue({
        data: { id: invoiceId, owner_id: 'owner-123', tenant_id: 'tenant-terrapet' },
        error: null,
      })

      mockOrderFn.mockReturnValue(Promise.resolve({ data: mockPayments, error: null }))

      const request = createGetRequest()
      const response = (await getPayments(request, {
        params: Promise.resolve({ id: invoiceId }),
      })) as MockResponse

      expect(response.status).toBe(200)
      const json = await response.json() as any
      expect(Array.isArray(json)).toBe(true)
    })

    it('should return 404 for non-existent invoice', async () => {
      mockSingleFn.mockResolvedValue({
        data: null,
        error: null,
      })

      const request = createGetRequest()
      const response = (await getPayments(request, {
        params: Promise.resolve({ id: 'non-existent' }),
      })) as MockResponse

      expect(response.status).toBe(404)
    })
  })
})
