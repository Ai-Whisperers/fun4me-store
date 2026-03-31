/**
 * Store Checkout API Tests
 *
 * Tests for:
 * - POST /api/store/checkout
 *
 * This route handles atomic checkout operations including:
 * - Stock validation
 * - Prescription validation
 * - Invoice creation
 * - Inventory decrement
 *
 * Rate limited endpoint for fraud prevention.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/store/checkout/route'
import {
  mockState,
  TENANTS,
  PRODUCTS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any) => {
    return async (request: Request) => {
      const { mockState } = await import('@/lib/test-utils')
      const { createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
      }

      if (!mockState.profile) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      const supabase = createStatefulSupabaseMock()
      // Mock logger for API context
      const log = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      }
      return handler({
        request,
        user: mockState.user,
        profile: mockState.profile,
        supabase,
        log,
      })
    }
  },
}))

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, ...options?.details },
      { status }
    )
  },
  HTTP_STATUS: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock audit logging
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

// Mock feature access for ecommerce
vi.mock('@/lib/features/server', () => ({
  checkFeatureAccess: vi.fn().mockResolvedValue({ allowed: true }),
  requireFeature: vi.fn().mockResolvedValue(null),
}))


// Helper to create POST request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/store/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample cart items
const SAMPLE_PRODUCT_ITEMS = [
  {
    id: PRODUCTS.DOG_FOOD.id,
    name: PRODUCTS.DOG_FOOD.name,
    price: PRODUCTS.DOG_FOOD.base_price,
    type: 'product' as const,
    quantity: 2,
  },
  {
    id: PRODUCTS.SHAMPOO.id,
    name: PRODUCTS.SHAMPOO.name,
    price: PRODUCTS.SHAMPOO.base_price,
    type: 'product' as const,
    quantity: 1,
  },
]

const PRESCRIPTION_ITEM = {
  id: PRODUCTS.ANTIBIOTIC.id,
  name: PRODUCTS.ANTIBIOTIC.name,
  price: PRODUCTS.ANTIBIOTIC.base_price,
  type: 'product' as const,
  quantity: 1,
  requires_prescription: true,
  prescription_file: 'https://storage.example.com/prescriptions/rx-001.pdf',
}

const SERVICE_ITEM = {
  id: 'service-consultation',
  name: 'Consulta General',
  price: 80000,
  type: 'service' as const,
  quantity: 1,
}

// Sample successful checkout result
const SUCCESS_CHECKOUT_RESULT = {
  success: true,
  invoice: {
    id: 'invoice-001',
    invoice_number: 'INV-2024-001',
    total: 395000,
    status: 'pending',
  },
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('POST /api/store/checkout', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(401)
    })

    it('should allow authenticated owner to checkout', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })

    it('should allow authenticated vet to checkout', async () => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 for invalid JSON', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/store/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('JSON inválido')
    })

    it('should return 400 when items is empty', async () => {
      const response = await POST(
        createRequest({
          items: [],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('El carrito está vacío')
    })

    it('should return 400 when items is missing', async () => {
      const response = await POST(
        createRequest({
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
    })

    it('should return 403 when clinic does not match user tenant', async () => {
      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.PETLIFE.id, // Different tenant
        })
      )

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.message).toBe('Clínica no válida')
    })
  })

  // ============================================================================
  // Successful Checkout Tests
  // ============================================================================

  describe('Successful Checkout', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should create invoice for product items', async () => {
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invoice).toBeDefined()
      expect(body.invoice.id).toBeDefined()
      expect(body.invoice.invoice_number).toBeDefined()
    })

    it('should create invoice for mixed items (products + services)', async () => {
      mockState.setRpcResult('process_checkout', {
        success: true,
        invoice: {
          id: 'invoice-mixed',
          invoice_number: 'INV-2024-002',
          total: 475000,
          status: 'pending',
        },
      })

      const response = await POST(
        createRequest({
          items: [...SAMPLE_PRODUCT_ITEMS, SERVICE_ITEM],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should include notes in order', async () => {
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
          notes: 'Por favor enviar a la tarde',
        })
      )

      expect(response.status).toBe(201)
    })

    it('should process prescription items with file', async () => {
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: [PRESCRIPTION_ITEM],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })

    it('should log audit trail', async () => {
      const { logAudit } = await import('@/lib/audit')
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(logAudit).toHaveBeenCalledWith(
        'CHECKOUT',
        expect.stringContaining('invoices/'),
        expect.any(Object)
      )
    })
  })

  // ============================================================================
  // Stock Error Tests
  // ============================================================================

  describe('Stock Errors', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when stock is insufficient', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        error: 'Stock insuficiente para algunos productos',
        stock_errors: [
          {
            id: PRODUCTS.DOG_FOOD.id,
            name: PRODUCTS.DOG_FOOD.name,
            requested: 10,
            available: 5,
          },
        ],
      })

      const response = await POST(
        createRequest({
          items: [{ ...SAMPLE_PRODUCT_ITEMS[0], quantity: 10 }],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.stockErrors).toBeDefined()
      expect(body.stockErrors.length).toBeGreaterThan(0)
    })

    it('should return all stock errors', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        error: 'Stock insuficiente',
        stock_errors: [
          {
            id: PRODUCTS.DOG_FOOD.id,
            name: PRODUCTS.DOG_FOOD.name,
            requested: 100,
            available: 25,
          },
          {
            id: PRODUCTS.SHAMPOO.id,
            name: PRODUCTS.SHAMPOO.name,
            requested: 50,
            available: 30,
          },
        ],
      })

      const response = await POST(
        createRequest({
          items: [
            { ...SAMPLE_PRODUCT_ITEMS[0], quantity: 100 },
            { ...SAMPLE_PRODUCT_ITEMS[1], quantity: 50 },
          ],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.stockErrors.length).toBe(2)
    })

    it('should include available quantity in error', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        stock_errors: [
          {
            id: PRODUCTS.OUT_OF_STOCK.id,
            name: PRODUCTS.OUT_OF_STOCK.name,
            requested: 1,
            available: 0,
          },
        ],
      })

      const response = await POST(
        createRequest({
          items: [
            {
              id: PRODUCTS.OUT_OF_STOCK.id,
              name: PRODUCTS.OUT_OF_STOCK.name,
              price: PRODUCTS.OUT_OF_STOCK.base_price,
              type: 'product' as const,
              quantity: 1,
            },
          ],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.stockErrors[0].available).toBe(0)
    })
  })

  // ============================================================================
  // Prescription Error Tests
  // ============================================================================

  describe('Prescription Errors', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when prescription is missing', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        error: 'Falta receta médica para algunos productos',
        prescription_errors: [
          {
            id: PRODUCTS.ANTIBIOTIC.id,
            name: PRODUCTS.ANTIBIOTIC.name,
            error: 'Requiere receta médica',
          },
        ],
      })

      const response = await POST(
        createRequest({
          items: [
            {
              id: PRODUCTS.ANTIBIOTIC.id,
              name: PRODUCTS.ANTIBIOTIC.name,
              price: PRODUCTS.ANTIBIOTIC.base_price,
              type: 'product' as const,
              quantity: 1,
              requires_prescription: true,
              // No prescription_file provided
            },
          ],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.prescriptionErrors).toBeDefined()
    })

    it('should return all prescription errors', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        prescription_errors: [
          {
            id: 'prod-1',
            name: 'Medicamento 1',
            error: 'Requiere receta',
          },
          {
            id: 'prod-2',
            name: 'Medicamento 2',
            error: 'Receta expirada',
          },
        ],
      })

      const response = await POST(
        createRequest({
          items: [
            {
              id: 'prod-1',
              name: 'Medicamento 1',
              price: 50000,
              type: 'product' as const,
              quantity: 1,
              requires_prescription: true,
            },
            {
              id: 'prod-2',
              name: 'Medicamento 2',
              price: 60000,
              type: 'product' as const,
              quantity: 1,
              requires_prescription: true,
            },
          ],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.prescriptionErrors.length).toBe(2)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 500 on database error', async () => {
      mockState.setRpcError('process_checkout', new Error('Database connection failed'))

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(500)
    })

    it('should return error message from database function', async () => {
      mockState.setRpcResult('process_checkout', {
        success: false,
        error: 'Error específico del servidor',
      })

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toContain('Error')
    })

    it('should log errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError('process_checkout', new Error('Connection failed'))

      await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(logger.error).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should handle complete checkout flow', async () => {
      mockState.setRpcResult('process_checkout', {
        success: true,
        invoice: {
          id: 'invoice-complete',
          invoice_number: 'INV-2024-100',
          total: 540000,
          status: 'pending',
        },
      })

      const response = await POST(
        createRequest({
          items: [
            ...SAMPLE_PRODUCT_ITEMS,
            PRESCRIPTION_ITEM,
            SERVICE_ITEM,
          ],
          clinic: TENANTS.ADRIS.id,
          notes: 'Entrega urgente',
        })
      )

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invoice.total).toBe(540000)
    })

    it('should handle single service checkout', async () => {
      mockState.setRpcResult('process_checkout', {
        success: true,
        invoice: {
          id: 'invoice-service',
          invoice_number: 'INV-2024-101',
          total: 80000,
          status: 'pending',
        },
      })

      const response = await POST(
        createRequest({
          items: [SERVICE_ITEM],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })

    it('should handle high quantity order', async () => {
      mockState.setRpcResult('process_checkout', {
        success: true,
        invoice: {
          id: 'invoice-bulk',
          invoice_number: 'INV-2024-102',
          total: 9000000, // Large order
          status: 'pending',
        },
      })

      const response = await POST(
        createRequest({
          items: [
            {
              id: PRODUCTS.DOG_FOOD.id,
              name: PRODUCTS.DOG_FOOD.name,
              price: PRODUCTS.DOG_FOOD.base_price,
              type: 'product' as const,
              quantity: 50, // Bulk order
            },
          ],
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })
  })

  // ============================================================================
  // Tenant Isolation Tests
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should not allow checkout for different tenant', async () => {
      // User is in ADRIS tenant
      mockState.setAuthScenario('OWNER')

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.PETLIFE.id, // Different tenant
        })
      )

      expect(response.status).toBe(403)
    })

    it('should allow checkout for own tenant', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)

      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id, // Same tenant as user
        })
      )

      expect(response.status).toBe(201)
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('process_checkout', SUCCESS_CHECKOUT_RESULT)
    })

    it('should return 201 on success', async () => {
      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(201)
    })

    it('should return invoice details on success', async () => {
      const response = await POST(
        createRequest({
          items: SAMPLE_PRODUCT_ITEMS,
          clinic: TENANTS.ADRIS.id,
        })
      )

      const body = await response.json()
      expect(body.invoice).toHaveProperty('id')
      expect(body.invoice).toHaveProperty('invoice_number')
      expect(body.invoice).toHaveProperty('total')
      expect(body.invoice).toHaveProperty('status')
    })
  })
})
