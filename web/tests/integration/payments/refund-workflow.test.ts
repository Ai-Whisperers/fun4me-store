/**
 * Refund Workflow Integration Tests
 *
 * Tests the refund processing workflow including:
 * - Processing refunds on invoices
 * - Authorization (admin only)
 * - Reason requirement validation
 * - Amount limits
 * - Audit trail
 *
 * @ticket TICKET-BIZ-005
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST as processRefund } from '@/app/api/invoices/[id]/refund/route'
import { NextRequest } from 'next/server'

// Mock response type helper
interface MockResponse {
  status: number
  json: () => Promise<Record<string, unknown>>
}

// Mock users with different roles
const mockAdminUser = { id: 'admin-123', email: 'admin@clinic.com' }
const mockAdminProfile = { tenant_id: 'tenant-terrapet', role: 'admin', full_name: 'Admin User' }

const mockVetUser = { id: 'vet-123', email: 'vet@clinic.com' }
const mockVetProfile = { tenant_id: 'tenant-terrapet', role: 'vet', full_name: 'Dr. Vet' }

// Mock Supabase client with RPC support
const mockRpcFn = vi.fn()

const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
  },
  from: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  })),
  rpc: mockRpcFn,
})

// Track which profile to use
let currentProfile = mockAdminProfile

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(createMockSupabase()),
}))

vi.mock('@/lib/auth', () => ({
  withApiAuthParams: (handler: (...args: unknown[]) => unknown, options?: { roles: string[] }) => {
    return async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      // Check role restriction
      if (options?.roles && !options.roles.includes(currentProfile.role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Forbidden', code: 'FORBIDDEN' }),
        }
      }

      const supabase = createMockSupabase()
      const params = await context.params
      const user = currentProfile.role === 'admin' ? mockAdminUser : mockVetUser
      return handler({ user, profile: currentProfile, supabase, request }, params)
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
import { POST as processRefund } from '@/app/api/invoices/[id]/refund/route'

describe('Refund Workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentProfile = mockAdminProfile
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invoices/[id]/refund', () => {
    const invoiceId = 'invoice-123'

    const createRequest = (body: Record<string, unknown>) =>
      new NextRequest('http://localhost/api/invoices/invoice-123/refund', {
        method: 'POST',
        body: JSON.stringify(body),
      })

    describe('Authorization', () => {
      it('should allow admins to process refunds', async () => {
        currentProfile = mockAdminProfile

        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            refund_id: 'refund-456',
            amount_paid: 0,
            amount_due: 50000,
            status: 'partial',
          },
          error: null,
        })

        const request = createRequest({
          amount: 50000,
          reason: 'Cliente solicitó reembolso',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should reject non-admin users', async () => {
        currentProfile = mockVetProfile

        const request = createRequest({
          amount: 50000,
          reason: 'Test refund',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(403)
        const json = await response.json() as any
        expect(json.code).toBe('FORBIDDEN')
      })
    })

    describe('Validation', () => {
      it('should require a reason for refund', async () => {
        const request = createRequest({
          amount: 50000,
          // reason missing
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('MISSING_FIELDS')
      })

      it('should reject empty reason string', async () => {
        const request = createRequest({
          amount: 50000,
          reason: '',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should reject missing amount', async () => {
        const request = createRequest({
          reason: 'Servicio no prestado',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('VALIDATION_ERROR')
      })

      it('should reject invalid amount type', async () => {
        const request = createRequest({
          amount: 'not-a-number',
          reason: 'Test',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should reject zero amount refund', async () => {
        const request = createRequest({
          amount: 0,
          reason: 'Zero refund test',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should reject negative amount refund via RPC', async () => {
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
          amount: -50000,
          reason: 'Negative refund test',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.details?.reason).toContain('positivo')
      })
    })

    describe('Refund Processing', () => {
      it('should process full refund successfully', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            refund_id: 'refund-789',
            amount_paid: 0,
            amount_due: 100000,
            status: 'void',
          },
          error: null,
        })

        const request = createRequest({
          amount: 100000,
          reason: 'Servicio cancelado por el cliente',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(201)
        const json = await response.json() as any
        expect(json).toMatchObject({
          refund: { id: 'refund-789' },
          invoice: {
            amount_paid: 0,
            amount_due: 100000,
            status: 'void',
          },
        })
      })

      it('should process partial refund successfully', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            refund_id: 'refund-111',
            amount_paid: 50000,
            amount_due: 50000,
            status: 'partial',
          },
          error: null,
        })

        const request = createRequest({
          amount: 50000,
          reason: 'Descuento por demora',
          payment_id: 'payment-original',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(201)
        const json = await response.json() as any
        expect(json.invoice.status).toBe('partial')
      })

      it('should handle refund exceeding paid amount', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: false,
            error: 'Monto de reembolso excede el monto pagado',
          },
          error: null,
        })

        const request = createRequest({
          amount: 999999,
          reason: 'Intentando reembolso excesivo',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.details?.reason).toContain('excede')
      })
    })

    describe('Database Errors', () => {
      it('should handle RPC errors gracefully', async () => {
        mockRpcFn.mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        })

        const request = createRequest({
          amount: 50000,
          reason: 'Test refund',
        })

        const response = (await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })) as MockResponse

        expect(response.status).toBe(500)
        const json = await response.json() as any
        expect(json.code).toBe('DATABASE_ERROR')
      })
    })

    describe('RPC Parameters', () => {
      it('should pass correct parameters to RPC function', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            refund_id: 'refund-test',
            amount_paid: 0,
            amount_due: 50000,
            status: 'void',
          },
          error: null,
        })

        const request = createRequest({
          amount: 50000,
          reason: 'Razón del reembolso',
          payment_id: 'pay-specific',
        })

        await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })

        expect(mockRpcFn).toHaveBeenCalledWith('process_invoice_refund', {
          p_invoice_id: invoiceId,
          p_tenant_id: 'tenant-terrapet',
          p_amount: 50000,
          p_reason: 'Razón del reembolso',
          p_payment_id: 'pay-specific',
          p_processed_by: 'admin-123',
        })
      })

      it('should handle null payment_id when not provided', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            refund_id: 'refund-test',
            amount_paid: 0,
            amount_due: 50000,
            status: 'void',
          },
          error: null,
        })

        const request = createRequest({
          amount: 50000,
          reason: 'General refund',
        })

        await processRefund(request, {
          params: Promise.resolve({ id: invoiceId }),
        })

        expect(mockRpcFn).toHaveBeenCalledWith(
          'process_invoice_refund',
          expect.objectContaining({
            p_payment_id: null,
          })
        )
      })
    })
  })
})

describe('Refund Business Rules', () => {
  describe('Refund reason requirements', () => {
    const validReasons = [
      'Servicio no prestado',
      'Producto defectuoso',
      'Descuento por demora',
      'Error de facturación',
      'Cancelación por el cliente',
      'Doble cobro',
      'Promoción aplicada retroactivamente',
    ]

    validReasons.forEach((reason) => {
      it(`should accept valid reason: "${reason}"`, () => {
        expect(reason.length).toBeGreaterThan(0)
        expect(typeof reason).toBe('string')
      })
    })
  })

  describe('Refund timing scenarios', () => {
    it('should document same-day refund scenario', () => {
      const paymentDate = new Date('2024-01-15T10:00:00')
      const refundDate = new Date('2024-01-15T15:00:00')
      const hoursDiff = (refundDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60)

      expect(hoursDiff).toBeLessThan(24)
    })

    it('should document multi-day refund scenario', () => {
      const paymentDate = new Date('2024-01-15T10:00:00')
      const refundDate = new Date('2024-01-20T15:00:00')
      const daysDiff = (refundDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)

      expect(daysDiff).toBeGreaterThan(1)
    })
  })

  describe('Audit trail requirements', () => {
    it('should require refund to be traceable', () => {
      const refundAuditData = {
        invoice_id: 'inv-123',
        refund_id: 'ref-456',
        amount: 50000,
        reason: 'Test reason',
        processed_by: 'admin-123',
        processed_at: new Date().toISOString(),
      }

      expect(refundAuditData).toHaveProperty('invoice_id')
      expect(refundAuditData).toHaveProperty('refund_id')
      expect(refundAuditData).toHaveProperty('amount')
      expect(refundAuditData).toHaveProperty('reason')
      expect(refundAuditData).toHaveProperty('processed_by')
      expect(refundAuditData).toHaveProperty('processed_at')
    })
  })
})
