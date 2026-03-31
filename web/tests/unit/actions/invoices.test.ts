import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Helper to create chainable mock query builder
const createMockQueryBuilder = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  ...overrides,
})

// Mock the Supabase client - use 'as any' to allow partial mocking in tests
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => createMockQueryBuilder()) as any,
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocking
import {
  createInvoice,
  recordPayment,
  updateInvoiceStatus,
  sendInvoice,
  voidInvoice,
} from '@/app/actions/invoices'

describe('Invoice Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createInvoice', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await createInvoice({
        pet_id: 'pet-123',
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No autorizado')
      }
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'owner' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await createInvoice({
        pet_id: 'pet-123',
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // withActionAuth returns 'Acceso denegado' for non-staff users
        expect(result.error).toBe('Acceso denegado')
      }
    })

    it('should return error when no pet_id is provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await createInvoice({
        pet_id: '',
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Debe seleccionar una mascota')
      }
    })

    it('should return error when no items are provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await createInvoice({
        pet_id: 'pet-123',
        items: [],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Debe agregar al menos un item')
      }
    })

    it('should successfully create invoice when all validations pass', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({ data: 'INV-001' })

      const callCount = 0
      const mockFrom = vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
              error: null,
            }),
          }
        }
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'pet-123', tenant_id: TENANT_IDS.ADRIS, owner_id: 'owner-456' },
              error: null,
            }),
          }
        }
        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'invoice-123', invoice_number: 'INV-001' },
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'invoice_items') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })
      mockSupabaseClient.from = mockFrom as any

      const result = await createInvoice({
        pet_id: 'pet-123',
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
      }
    })
  })

  describe('recordPayment', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 50000,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No autorizado')
      }
    })

    it('should return error when user is not staff', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'owner' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 50000,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // withActionAuth returns 'Acceso denegado' for non-staff users
        expect(result.error).toBe('Acceso denegado')
      }
    })

    it('should return error when invoice is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any
      
      // Mock RPC call to return invoice not found error
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'INVOICE_NOT_FOUND',
          message: 'Factura no encontrada'
        },
        error: null,
      })

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 50000,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Factura no encontrada')
      }
    })

    it('should return error when invoice is void', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any
      
      // Mock RPC call to return void invoice error
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'VOIDED',
          message: 'Esta factura ha sido anulada'
        },
        error: null,
      })

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 50000,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Esta factura ha sido anulada')
      }
    })

    it('should return error when invoice is already paid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any
      
      // Mock RPC call to return already paid error
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'ALREADY_PAID',
          message: 'Esta factura ya está completamente pagada',
          current_paid: 100000,
          total: 100000
        },
        error: null,
      })

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 50000,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Esta factura ya está completamente pagada')
      }
    })

    it('should return error when amount is zero or negative', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
              error: null,
            })
          }
          return Promise.resolve({
            data: {
              id: 'invoice-123',
              status: 'sent',
              total: 100000,
              amount_paid: 0,
              amount_due: 100000,
              tenant_id: TENANT_IDS.ADRIS,
            },
            error: null,
          })
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 0,
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('El monto debe ser mayor a 0')
      }
    })

    it('should return error when amount exceeds due amount', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
          error: null,
        }),
      }))
      mockSupabaseClient.from = mockFrom as any
      
      // Mock RPC call to return overpayment error
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'OVERPAYMENT',
          message: 'El monto excede el total de la factura',
          amount_due: 50000,
          attempted_payment: 60000
        },
        error: null,
      })

      const result = await recordPayment({
        invoice_id: 'invoice-123',
        amount: 60000, // More than 50000 due
        payment_method: 'cash',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('excede el total de la factura')
      }
    })
  })

  describe('updateInvoiceStatus', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await updateInvoiceStatus('invoice-123', 'sent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No autorizado')
      }
    })

    it('should return error for invalid status transition', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
              error: null,
            })
          }
          // Invoice already paid - can't change status
          return Promise.resolve({
            data: { id: 'invoice-123', status: 'paid', tenant_id: TENANT_IDS.ADRIS },
            error: null,
          })
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await updateInvoiceStatus('invoice-123', 'sent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('No se puede cambiar')
      }
    })
  })

  describe('sendInvoice', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await sendInvoice('invoice-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No autorizado')
      }
    })

    it('should return error when invoice cannot be sent', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
              error: null,
            })
          }
          // Invoice is void - can't be sent
          return Promise.resolve({
            data: { id: 'invoice-123', status: 'void', tenant_id: TENANT_IDS.ADRIS },
            error: null,
          })
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await sendInvoice('invoice-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Esta factura no puede ser enviada')
      }
    })
  })

  describe('voidInvoice', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await voidInvoice('invoice-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No autorizado')
      }
    })

    it('should return error when invoice is already void', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' },
              error: null,
            })
          }
          return Promise.resolve({
            data: { id: 'invoice-123', status: 'void', tenant_id: TENANT_IDS.ADRIS, amount_paid: 0 },
            error: null,
          })
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await voidInvoice('invoice-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Esta factura ya está anulada')
      }
    })

    it('should return error when non-admin tries to void invoice with payments', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      let callCount = 0
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              data: { tenant_id: TENANT_IDS.ADRIS, role: 'vet' }, // Not admin
              error: null,
            })
          }
          return Promise.resolve({
            data: { id: 'invoice-123', status: 'partial', tenant_id: TENANT_IDS.ADRIS, amount_paid: 50000 },
            error: null,
          })
        }),
      }))
      mockSupabaseClient.from = mockFrom as any

      const result = await voidInvoice('invoice-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          'Solo un administrador puede anular facturas con pagos registrados'
        )
      }
    })
  })
})

describe('Invoice Utility Functions', () => {
  describe('calculateLineTotal', () => {
    it('should calculate total without discount', async () => {
      const { calculateLineTotal } = await import('@/lib/types/invoicing')

      const result = calculateLineTotal(2, 50000)

      expect(result).toBe(100000)
    })

    it('should calculate total with discount', async () => {
      const { calculateLineTotal } = await import('@/lib/types/invoicing')

      const result = calculateLineTotal(2, 50000, 10) // 10% discount

      expect(result).toBe(90000) // 100000 - 10% = 90000
    })

    it('should handle zero quantity', async () => {
      const { calculateLineTotal } = await import('@/lib/types/invoicing')

      const result = calculateLineTotal(0, 50000)

      expect(result).toBe(0)
    })
  })

  describe('calculateInvoiceTotals', () => {
    it('should calculate all totals correctly from line_totals', async () => {
      const { calculateInvoiceTotals } = await import('@/lib/types/invoicing')

      // Items with pre-calculated line_total (as InvoiceItem type expects)
      const items = [
        { description: 'Service 1', quantity: 1, unit_price: 100000, line_total: 100000 },
        { description: 'Service 2', quantity: 2, unit_price: 50000, line_total: 100000 },
      ] as any

      const result = calculateInvoiceTotals(items, 10)

      expect(result.subtotal).toBe(200000)
      expect(result.taxAmount).toBe(20000)
      expect(result.total).toBe(220000)
    })

    it('should handle items with discounts reflected in line_total', async () => {
      const { calculateInvoiceTotals } = await import('@/lib/types/invoicing')

      const items = [
        {
          description: 'Service 1',
          quantity: 1,
          unit_price: 100000,
          discount_percent: 20,
          line_total: 80000,
        },
        {
          description: 'Service 2',
          quantity: 2,
          unit_price: 50000,
          discount_percent: 10,
          line_total: 90000,
        },
      ] as any

      const result = calculateInvoiceTotals(items, 10)

      expect(result.subtotal).toBe(170000)
      expect(result.taxAmount).toBe(17000)
      expect(result.total).toBe(187000)
    })

    it('should handle empty items array', async () => {
      const { calculateInvoiceTotals } = await import('@/lib/types/invoicing')

      const result = calculateInvoiceTotals([], 10)

      expect(result.subtotal).toBe(0)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  describe('canEditInvoice', () => {
    it('should return true for draft status', async () => {
      const { canEditInvoice } = await import('@/lib/types/invoicing')

      expect(canEditInvoice('draft')).toBe(true)
    })

    it('should return false for non-draft statuses', async () => {
      const { canEditInvoice } = await import('@/lib/types/invoicing')

      expect(canEditInvoice('sent')).toBe(false)
      expect(canEditInvoice('paid')).toBe(false)
      expect(canEditInvoice('partial')).toBe(false)
      expect(canEditInvoice('overdue')).toBe(false)
      expect(canEditInvoice('cancelled')).toBe(false)
      expect(canEditInvoice('void')).toBe(false)
    })
  })

  describe('canReceivePayment', () => {
    it('should return true for valid payment statuses with amount due', async () => {
      const { canReceivePayment } = await import('@/lib/types/invoicing')

      // canReceivePayment returns true if: amount > 0 AND status not in ['void', 'cancelled']
      expect(canReceivePayment('sent', 50000)).toBe(true)
      expect(canReceivePayment('partial', 50000)).toBe(true)
      expect(canReceivePayment('overdue', 50000)).toBe(true)
      expect(canReceivePayment('draft', 50000)).toBe(true) // Draft with amount can receive payment
    })

    it('should return false when no amount is due', async () => {
      const { canReceivePayment } = await import('@/lib/types/invoicing')

      expect(canReceivePayment('sent', 0)).toBe(false)
    })

    it('should return false for void and cancelled statuses', async () => {
      const { canReceivePayment } = await import('@/lib/types/invoicing')

      // Only void and cancelled block payments
      expect(canReceivePayment('cancelled', 50000)).toBe(false)
      expect(canReceivePayment('void', 50000)).toBe(false)
    })
  })

  describe('canSendInvoice', () => {
    it('should return true for draft and sent statuses', async () => {
      const { canSendInvoice } = await import('@/lib/types/invoicing')

      // Only draft and sent can be (re)sent
      expect(canSendInvoice('draft')).toBe(true)
      expect(canSendInvoice('sent')).toBe(true)
    })

    it('should return false for other statuses', async () => {
      const { canSendInvoice } = await import('@/lib/types/invoicing')

      expect(canSendInvoice('partial')).toBe(false)
      expect(canSendInvoice('overdue')).toBe(false)
      expect(canSendInvoice('paid')).toBe(false)
      expect(canSendInvoice('cancelled')).toBe(false)
      expect(canSendInvoice('void')).toBe(false)
    })
  })

  describe('canVoidInvoice', () => {
    it('should return true for voidable statuses', async () => {
      const { canVoidInvoice } = await import('@/lib/types/invoicing')

      // Can void if not already void or paid
      expect(canVoidInvoice('draft')).toBe(true)
      expect(canVoidInvoice('sent')).toBe(true)
      expect(canVoidInvoice('partial')).toBe(true)
      expect(canVoidInvoice('overdue')).toBe(true)
      expect(canVoidInvoice('cancelled')).toBe(true)
    })

    it('should return false for void and paid statuses', async () => {
      const { canVoidInvoice } = await import('@/lib/types/invoicing')

      expect(canVoidInvoice('paid')).toBe(false)
      expect(canVoidInvoice('void')).toBe(false)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in Paraguayan Guaraní', async () => {
      const { formatCurrency } = await import('@/lib/types/invoicing')

      const formatted = formatCurrency(100000)

      // Should contain the amount with Guaraní formatting
      expect(formatted).toContain('100')
      expect(formatted).toMatch(/Gs\.?|₲|PYG/)
    })

    it('should handle zero', async () => {
      const { formatCurrency } = await import('@/lib/types/invoicing')

      const formatted = formatCurrency(0)

      expect(formatted).toContain('0')
    })
  })

  describe('formatDate', () => {
    it('should format date in Spanish', async () => {
      const { formatDate } = await import('@/lib/types/invoicing')

      const formatted = formatDate('2025-12-25T10:00:00Z')

      // Should contain Spanish month abbreviation and year
      expect(formatted).toMatch(/dic/i)
      expect(formatted).toContain('2025')
    })
  })
})

describe('Invoice Status Configuration', () => {
  it('should have all invoice statuses configured with labels', async () => {
    const { STATUS_LABELS } = await import('@/lib/types/invoicing')

    const expectedStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void']

    expectedStatuses.forEach((status) => {
      expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS]).toBeDefined()
      expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS]).toBeTruthy()
    })
  })

  it('should have Spanish labels for all statuses', async () => {
    const { STATUS_LABELS } = await import('@/lib/types/invoicing')

    expect(STATUS_LABELS.draft).toBe('Borrador')
    expect(STATUS_LABELS.sent).toBe('Enviada')
    expect(STATUS_LABELS.paid).toBe('Pagada')
    expect(STATUS_LABELS.partial).toBe('Pago parcial')
    expect(STATUS_LABELS.overdue).toBe('Vencida')
    expect(STATUS_LABELS.cancelled).toBe('Cancelada')
    expect(STATUS_LABELS.void).toBe('Anulada')
  })

  it('should have all statuses with color classes', async () => {
    const { STATUS_COLORS } = await import('@/lib/types/invoicing')

    const expectedStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void']

    expectedStatuses.forEach((status) => {
      expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBeDefined()
      expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toContain('bg-')
      expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toContain('text-')
    })
  })
})

describe('Payment Method Configuration', () => {
  it('should have all payment methods configured', async () => {
    const { PAYMENT_METHOD_LABELS } = await import('@/lib/types/invoicing')

    const expectedMethods = ['cash', 'card', 'transfer', 'check', 'other']

    expectedMethods.forEach((method) => {
      expect(PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS]).toBeDefined()
    })
  })

  it('should have Spanish labels for payment methods', async () => {
    const { PAYMENT_METHOD_LABELS } = await import('@/lib/types/invoicing')

    expect(PAYMENT_METHOD_LABELS.cash).toBe('Efectivo')
    expect(PAYMENT_METHOD_LABELS.card).toBe('Tarjeta')
    expect(PAYMENT_METHOD_LABELS.transfer).toBe('Transferencia')
    expect(PAYMENT_METHOD_LABELS.check).toBe('Cheque')
    expect(PAYMENT_METHOD_LABELS.other).toBe('Otro')
  })
})
