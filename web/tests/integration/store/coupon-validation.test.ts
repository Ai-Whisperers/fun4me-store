/**
 * Coupon Validation API Tests
 *
 * Tests for:
 * - POST /api/store/coupons/validate
 *
 * This route validates coupon codes and returns discount information.
 * Rate limited endpoint, requires authentication.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/store/coupons/validate/route'
import {
  mockState,
  TENANTS,
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
      return handler({
        request,
        user: mockState.user,
        profile: mockState.profile,
        supabase,
      })
    }
  },
}))

// Mock rate limit
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
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

// Import routes AFTER mocks
import { POST } from '@/app/api/store/coupons/validate/route'

// Helper to create POST request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/store/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample valid coupon result
const VALID_PERCENTAGE_COUPON = {
  valid: true,
  coupon_id: 'coupon-001',
  discount_type: 'percentage',
  discount_value: 10,
  calculated_discount: 15000, // 10% of 150000
  name: '10% de descuento',
}

const VALID_FIXED_COUPON = {
  valid: true,
  coupon_id: 'coupon-002',
  discount_type: 'fixed',
  discount_value: 20000,
  calculated_discount: 20000,
  name: 'Gs. 20.000 de descuento',
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('POST /api/store/coupons/validate', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(401)
    })

    it('should allow authenticated owner to validate', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
    })

    it('should allow authenticated vet to validate', async () => {
      mockState.setAuthScenario('VET')
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockState.setAuthScenario('OWNER')

      const { rateLimit } = await import('@/lib/rate-limit')
      vi.mocked(rateLimit).mockResolvedValueOnce({
        success: false,
        response: NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 }),
      })

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(429)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when code is missing', async () => {
      const response = await POST(
        createRequest({
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Faltan parámetros requeridos')
    })

    it('should return 400 when clinic is missing', async () => {
      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(400)
    })

    it('should return 400 when cart_total is missing', async () => {
      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
        })
      )

      expect(response.status).toBe(400)
    })

    it('should accept cart_total of 0', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'El monto mínimo no fue alcanzado',
      })

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 0,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Valid Coupon Tests
  // ============================================================================

  describe('Valid Coupons', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return valid percentage coupon', async () => {
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.discount_type).toBe('percentage')
      expect(body.discount_value).toBe(10)
      expect(body.calculated_discount).toBe(15000)
    })

    it('should return valid fixed amount coupon', async () => {
      mockState.setRpcResult('validate_coupon', VALID_FIXED_COUPON)

      const response = await POST(
        createRequest({
          code: 'FIJO20000',
          clinic: TENANTS.ADRIS.id,
          cart_total: 200000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.discount_type).toBe('fixed')
      expect(body.discount_value).toBe(20000)
    })

    it('should convert code to uppercase', async () => {
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'descuento10', // lowercase
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(true)
    })

    it('should return coupon name', async () => {
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.name).toBeDefined()
    })

    it('should return coupon_id for use at checkout', async () => {
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.coupon_id).toBeDefined()
    })
  })

  // ============================================================================
  // Invalid Coupon Tests
  // ============================================================================

  describe('Invalid Coupons', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return invalid for non-existent code', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'Cupón no encontrado',
      })

      const response = await POST(
        createRequest({
          code: 'NOEXISTE',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe('Cupón no encontrado')
    })

    it('should return invalid for expired coupon', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'Cupón expirado',
      })

      const response = await POST(
        createRequest({
          code: 'EXPIRED',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toContain('expirado')
    })

    it('should return invalid for usage limit exceeded', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'Límite de uso alcanzado',
      })

      const response = await POST(
        createRequest({
          code: 'MAXUSED',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
    })

    it('should return invalid for minimum not met', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'El monto mínimo es Gs. 100.000',
      })

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 50000, // Below minimum
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
    })

    it('should return invalid for first-time customer only', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'Cupón solo para nuevos clientes',
      })

      const response = await POST(
        createRequest({
          code: 'BIENVENIDO',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
    })

    it('should return invalid for different tenant coupon', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
        error: 'Cupón no válido para esta clínica',
      })

      const response = await POST(
        createRequest({
          code: 'PETLIFE10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
    })

    it('should return default error when none provided', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: false,
      })

      const response = await POST(
        createRequest({
          code: 'INVALID',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe('Cupón no válido')
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
      mockState.setRpcError('validate_coupon', new Error('Database connection failed'))

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('No se pudo validar el cupón')
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError('validate_coupon', new Error('Connection failed'))

      await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
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

    it('should support checkout flow coupon validation', async () => {
      mockState.setRpcResult('validate_coupon', VALID_PERCENTAGE_COUPON)

      const response = await POST(
        createRequest({
          code: 'DESCUENTO10',
          clinic: TENANTS.ADRIS.id,
          cart_total: 150000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      // Checkout needs these fields
      expect(body.valid).toBe(true)
      expect(body.coupon_id).toBeDefined()
      expect(body.calculated_discount).toBeDefined()
    })

    it('should handle free shipping coupon', async () => {
      mockState.setRpcResult('validate_coupon', {
        valid: true,
        coupon_id: 'coupon-free-shipping',
        discount_type: 'free_shipping',
        discount_value: 0,
        calculated_discount: 15000, // Shipping cost
        name: 'Envío gratis',
      })

      const response = await POST(
        createRequest({
          code: 'ENVIOGRATIS',
          clinic: TENANTS.ADRIS.id,
          cart_total: 200000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.discount_type).toBe('free_shipping')
    })

    it('should cap discount at cart total', async () => {
      // Discount should not exceed cart total
      mockState.setRpcResult('validate_coupon', {
        valid: true,
        coupon_id: 'coupon-big',
        discount_type: 'fixed',
        discount_value: 100000,
        calculated_discount: 50000, // Capped at cart total
        name: 'Descuento gigante',
      })

      const response = await POST(
        createRequest({
          code: 'BIGDISCOUNT',
          clinic: TENANTS.ADRIS.id,
          cart_total: 50000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.calculated_discount).toBeLessThanOrEqual(50000)
    })
  })
})
