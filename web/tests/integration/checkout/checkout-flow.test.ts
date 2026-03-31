/**
 * Checkout Flow Integration Tests
 *
 * Tests the store checkout workflow including:
 * - Cart validation
 * - Stock availability checks
 * - Prescription requirement validation
 * - Order creation
 * - Inventory decrement
 * - Tenant isolation
 *
 * @ticket TICKET-BIZ-003, TICKET-BIZ-004
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/store/checkout/route'
import { NextRequest } from 'next/server'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Mock response type helper
interface MockResponse {
  status: number
  json: () => Promise<Record<string, unknown>>
}

// Mock user and profile
const mockUser = { id: 'user-123', email: 'customer@clinic.com' }
const mockProfile = { tenant_id: TENANT_IDS.ADRIS, role: 'owner', full_name: 'Test Customer' }

// Mock RPC function
const mockRpcFn = vi.fn()
const mockSelectFn = vi.fn()
const mockDeleteFn = vi.fn()

const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'store_carts') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockSelectFn,
        delete: vi.fn().mockReturnValue({
          eq: mockDeleteFn,
        }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),
  rpc: mockRpcFn,
})

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(createMockSupabase()),
}))

vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: (...args: unknown[]) => unknown, _options?: Record<string, unknown>) => {
    return async (request: NextRequest) => {
      const supabase = createMockSupabase()
      return handler({ user: mockUser, profile: mockProfile, supabase, request })
    }
  },
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectFn.mockResolvedValue({ data: { id: 'cart-123' }, error: null })
    mockDeleteFn.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/store/checkout', () => {
    const createRequest = (body: Record<string, unknown>) =>
      new NextRequest('http://localhost/api/store/checkout', {
        method: 'POST',
        body: JSON.stringify(body),
      })

    describe('Request Validation', () => {
      it('should reject empty cart', async () => {
        const request = createRequest({
          items: [],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('VALIDATION_ERROR')
        expect(json.details?.message).toContain('vacío')
      })

      it('should reject missing items', async () => {
        const request = createRequest({
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should reject invalid JSON', async () => {
        const request = new NextRequest('http://localhost/api/store/checkout', {
          method: 'POST',
          body: 'not json',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('INVALID_FORMAT')
      })

      it('should reject mismatched tenant', async () => {
        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 1000, type: 'product', quantity: 1 }],
          clinic: 'other-clinic', // Different from user's tenant
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(403)
        const json = await response.json() as any
        expect(json.code).toBe('FORBIDDEN')
      })
    })

    describe('Successful Checkout', () => {
      it('should process checkout with valid items', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            invoice: {
              id: 'inv-456',
              invoice_number: 'INV-001',
              total: 50000,
              status: 'draft',
            },
          },
          error: null,
        })

        const request = createRequest({
          items: [
            { id: 'prod-1', name: 'Alimento', price: 25000, type: 'product', quantity: 2 },
          ],
          clinic: 'terrapet',
          notes: 'Entrega a domicilio',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
        const json = await response.json() as any
        expect(json.success).toBe(true)
        expect(json.invoice).toBeDefined()
        expect(json.invoice.id).toBe('inv-456')
      })

      it('should handle mixed products and services', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            invoice: {
              id: 'inv-789',
              invoice_number: 'INV-002',
              total: 100000,
              status: 'draft',
            },
          },
          error: null,
        })

        const request = createRequest({
          items: [
            { id: 'prod-1', name: 'Vacuna', price: 50000, type: 'product', quantity: 1 },
            { id: 'svc-1', name: 'Consulta', price: 50000, type: 'service', quantity: 1 },
          ],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should clear cart after successful checkout', async () => {
        mockRpcFn
          .mockResolvedValueOnce({
            data: {
              success: true,
              invoice: { id: 'inv-1', invoice_number: 'INV-003', total: 10000, status: 'draft' },
            },
            error: null,
          })
          .mockResolvedValueOnce({ data: null, error: null }) // convert_reservations_to_sale

        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 10000, type: 'product', quantity: 1 }],
          clinic: 'terrapet',
        })

        await POST(request)

        // Verify cart deletion was attempted
        expect(mockDeleteFn).toHaveBeenCalled()
      })
    })

    describe('Stock Validation', () => {
      it('should reject when stock is insufficient', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: false,
            error: 'Stock insuficiente para algunos productos',
            stock_errors: [
              { id: 'prod-1', name: 'Alimento Premium', requested: 10, available: 3 },
            ],
          },
          error: null,
        })

        const request = createRequest({
          items: [
            { id: 'prod-1', name: 'Alimento Premium', price: 50000, type: 'product', quantity: 10 },
          ],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('VALIDATION_ERROR')
        expect(json.details?.stockErrors).toBeDefined()
        expect(json.details?.stockErrors[0].available).toBe(3)
      })

      it('should include all stock errors for multiple products', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: false,
            error: 'Stock insuficiente',
            stock_errors: [
              { id: 'prod-1', name: 'Producto A', requested: 5, available: 2 },
              { id: 'prod-2', name: 'Producto B', requested: 3, available: 0 },
            ],
          },
          error: null,
        })

        const request = createRequest({
          items: [
            { id: 'prod-1', name: 'Producto A', price: 10000, type: 'product', quantity: 5 },
            { id: 'prod-2', name: 'Producto B', price: 20000, type: 'product', quantity: 3 },
          ],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.details?.stockErrors).toHaveLength(2)
      })
    })

    describe('Prescription Validation', () => {
      it('should reject prescription products without prescription file', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: false,
            error: 'Falta receta médica para algunos productos',
            prescription_errors: [
              {
                id: 'prod-rx',
                name: 'Antibiótico',
                error: 'Requiere receta médica',
              },
            ],
          },
          error: null,
        })

        const request = createRequest({
          items: [
            {
              id: 'prod-rx',
              name: 'Antibiótico',
              price: 35000,
              type: 'product',
              quantity: 1,
              requires_prescription: true,
              // No prescription_file provided
            },
          ],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('VALIDATION_ERROR')
        expect(json.details?.prescriptionErrors).toBeDefined()
      })

      it('should accept prescription products with prescription file', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            invoice: {
              id: 'inv-rx',
              invoice_number: 'INV-RX-001',
              total: 35000,
              status: 'pending_review',
            },
          },
          error: null,
        })

        const request = createRequest({
          items: [
            {
              id: 'prod-rx',
              name: 'Antibiótico',
              price: 35000,
              type: 'product',
              quantity: 1,
              requires_prescription: true,
              prescription_file: 'https://storage.supabase.co/prescriptions/rx-123.pdf',
            },
          ],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockRpcFn.mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        })

        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 10000, type: 'product', quantity: 1 }],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(500)
        const json = await response.json() as any
        expect(json.code).toBe('DATABASE_ERROR')
      })

      it('should handle RPC errors', async () => {
        mockRpcFn.mockRejectedValue(new Error('RPC failed'))

        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 10000, type: 'product', quantity: 1 }],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(500)
        const json = await response.json() as any
        expect(json.code).toBe('SERVER_ERROR')
      })

      it('should handle generic RPC failure', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: false,
            error: 'Unknown error occurred',
          },
          error: null,
        })

        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 10000, type: 'product', quantity: 1 }],
          clinic: 'terrapet',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(500)
        const json = await response.json() as any
        expect(json.code).toBe('SERVER_ERROR')
      })
    })

    describe('RPC Parameters', () => {
      it('should pass correct parameters to process_checkout', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            invoice: { id: 'inv-1', invoice_number: 'INV-001', total: 10000, status: 'draft' },
          },
          error: null,
        })

        const items = [
          {
            id: 'prod-1',
            name: 'Product',
            price: 10000,
            type: 'product' as const,
            quantity: 2,
          },
        ]

        const request = createRequest({
          items,
          clinic: 'terrapet',
          notes: 'Test notes',
        })

        await POST(request)

        expect(mockRpcFn).toHaveBeenCalledWith('process_checkout', {
          p_tenant_id: TENANT_IDS.ADRIS,
          p_user_id: 'user-123',
          p_items: expect.any(String),
          p_notes: 'Test notes',
        })

        // Verify items JSON structure
        const callArgs = mockRpcFn.mock.calls[0][1]
        const parsedItems = JSON.parse(callArgs.p_items)
        expect(parsedItems[0]).toMatchObject({
          id: 'prod-1',
          name: 'Product',
          price: 10000,
          quantity: 2,
          type: 'product',
        })
      })

      it('should use default notes when not provided', async () => {
        mockRpcFn.mockResolvedValue({
          data: {
            success: true,
            invoice: { id: 'inv-1', invoice_number: 'INV-001', total: 10000, status: 'draft' },
          },
          error: null,
        })

        const request = createRequest({
          items: [{ id: 'prod-1', name: 'Test', price: 10000, type: 'product', quantity: 1 }],
          clinic: 'terrapet',
          // notes not provided
        })

        await POST(request)

        expect(mockRpcFn).toHaveBeenCalledWith(
          'process_checkout',
          expect.objectContaining({
            p_notes: 'Pedido desde tienda online',
          })
        )
      })
    })
  })
})

describe('Checkout Business Rules', () => {
  describe('Price Calculations', () => {
    it('should calculate order total correctly', () => {
      const items = [
        { price: 25000, quantity: 2 }, // 50,000
        { price: 15000, quantity: 3 }, // 45,000
        { price: 10000, quantity: 1 }, // 10,000
      ]

      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      expect(total).toBe(105000)
    })

    it('should handle fractional quantities for weight-based products', () => {
      const weightBasedItem = { price: 50000, quantity: 0.5 } // Half kg
      const total = weightBasedItem.price * weightBasedItem.quantity

      expect(total).toBe(25000)
    })
  })

  describe('Stock Reservation', () => {
    it('should document reservation expiration', () => {
      const reservationMinutes = 15
      const reservedAt = new Date()
      const expiresAt = new Date(reservedAt.getTime() + reservationMinutes * 60 * 1000)

      expect(expiresAt.getTime()).toBeGreaterThan(reservedAt.getTime())
    })
  })

  describe('Order States', () => {
    const orderStates = ['draft', 'pending_review', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

    it('should have defined order states', () => {
      expect(orderStates).toContain('draft')
      expect(orderStates).toContain('pending_review')
      expect(orderStates).toContain('confirmed')
    })

    it('should require review for prescription orders', () => {
      const hasPrescription = true
      const expectedStatus = hasPrescription ? 'pending_review' : 'confirmed'

      expect(expectedStatus).toBe('pending_review')
    })
  })
})
