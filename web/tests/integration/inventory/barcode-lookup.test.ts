/**
 * Barcode Lookup API Tests
 *
 * Tests for:
 * - GET /api/inventory/barcode-lookup
 *
 * This route handles barcode scanning lookups using a database function.
 * Staff only operations (vet/admin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/inventory/barcode-lookup/route'
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
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
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

      if (options?.roles && !options.roles.includes(mockState.profile.role)) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN)
      }

      const supabase = createStatefulSupabaseMock()
      return handler({
        request,
        user: mockState.user,
        profile: mockState.profile,
        supabase,
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
    NOT_FOUND: 404,
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

// Import routes AFTER mocks
import { GET } from '@/app/api/inventory/barcode-lookup/route'

// Helper to create request with query params
function createRequest(barcode?: string, clinic?: string): NextRequest {
  const params = new URLSearchParams()
  if (barcode) params.set('barcode', barcode)
  if (clinic) params.set('clinic', clinic)

  return new NextRequest(`http://localhost:3000/api/inventory/barcode-lookup?${params.toString()}`, {
    method: 'GET',
  })
}

// Sample product data returned from RPC
const SAMPLE_PRODUCT_RESULT = {
  id: PRODUCTS.DOG_FOOD.id,
  name: PRODUCTS.DOG_FOOD.name,
  sku: PRODUCTS.DOG_FOOD.sku,
  barcode: '7890123456789',
  base_price: PRODUCTS.DOG_FOOD.base_price,
  stock_quantity: PRODUCTS.DOG_FOOD.stock_quantity,
  image_url: null,
  category_name: 'Alimentos',
  is_prescription_required: false,
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/inventory/barcode-lookup', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to lookup', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(403)
    })

    it('should allow vet to lookup barcode', async () => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should allow admin to lookup barcode', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when barcode is missing', async () => {
      const response = await GET(createRequest(undefined, TENANTS.ADRIS.id))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.field).toBe('barcode')
    })

    it('should return 400 when clinic is missing', async () => {
      const response = await GET(createRequest('7890123456789', undefined))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.field).toBe('clinic')
    })

    it('should return 400 when both params are missing', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(400)
    })
  })

  // ============================================================================
  // Tenant Isolation Tests
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should return 403 when clinic does not match user tenant', async () => {
      mockState.setAuthScenario('VET') // VET is in ADRIS tenant

      const response = await GET(createRequest('7890123456789', TENANTS.PETLIFE.id))

      expect(response.status).toBe(403)
    })

    it('should allow lookup for matching tenant', async () => {
      mockState.setAuthScenario('VET') // VET is in ADRIS tenant
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Barcode Lookup Tests
  // ============================================================================

  describe('Barcode Lookup', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return product when barcode matches', async () => {
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.id).toBe(PRODUCTS.DOG_FOOD.id)
      expect(body.name).toBe(PRODUCTS.DOG_FOOD.name)
    })

    it('should return 404 when barcode not found', async () => {
      mockState.setRpcResult('find_product_by_barcode', [])

      const response = await GET(createRequest('0000000000000', TENANTS.ADRIS.id))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('product')
    })

    it('should trim whitespace from barcode', async () => {
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('  7890123456789  ', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should return product with all fields', async () => {
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('name')
      expect(body).toHaveProperty('sku')
      expect(body).toHaveProperty('barcode')
      expect(body).toHaveProperty('base_price')
      expect(body).toHaveProperty('stock_quantity')
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setRpcError('find_product_by_barcode', new Error('Database error'))

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError('find_product_by_barcode', new Error('Connection failed'))

      await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(logger.error).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Barcode Format Tests
  // ============================================================================

  describe('Barcode Formats', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])
    })

    it('should handle EAN-13 barcode (13 digits)', async () => {
      const response = await GET(createRequest('7891234567890', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should handle UPC-A barcode (12 digits)', async () => {
      const response = await GET(createRequest('012345678901', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should handle EAN-8 barcode (8 digits)', async () => {
      const response = await GET(createRequest('12345678', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should handle custom internal barcode', async () => {
      const response = await GET(createRequest('ADRIS-001-DOG-FOOD', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })

    it('should handle barcode with leading zeros', async () => {
      const response = await GET(createRequest('0000000000001', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should support scanner quick lookup workflow', async () => {
      mockState.setRpcResult('find_product_by_barcode', [SAMPLE_PRODUCT_RESULT])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
      const body = await response.json()

      // Scanner workflow needs these fields
      expect(body.stock_quantity).toBeDefined()
      expect(body.name).toBeDefined()
    })

    it('should handle prescription product lookup', async () => {
      mockState.setRpcResult('find_product_by_barcode', [
        {
          ...SAMPLE_PRODUCT_RESULT,
          is_prescription_required: true,
        },
      ])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.is_prescription_required).toBe(true)
    })

    it('should handle out of stock product lookup', async () => {
      mockState.setRpcResult('find_product_by_barcode', [
        {
          ...SAMPLE_PRODUCT_RESULT,
          stock_quantity: 0,
        },
      ])

      const response = await GET(createRequest('7890123456789', TENANTS.ADRIS.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stock_quantity).toBe(0)
    })
  })
})
