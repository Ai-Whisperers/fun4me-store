/**
 * Lab Orders API Tests
 *
 * Tests for:
 * - GET /api/lab-orders (list orders)
 * - POST /api/lab-orders (create order)
 *
 * This route handles lab order management for veterinary clinics.
 * Staff only operations (vet/admin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from '@/app/api/lab-orders/route'
import {
  mockState,
  TENANTS,
  USERS,
  PETS,
  LAB_ORDERS,
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

// Mock rate limit
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock pagination helpers
vi.mock('@/lib/api/pagination', () => ({
  parsePagination: vi.fn().mockReturnValue({ page: 1, limit: 20, offset: 0 }),
  paginatedResponse: (data: any[], count: number, pagination: any) => ({
    data,
    meta: {
      total: count,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(count / pagination.limit),
    },
  }),
}))

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown>; field_errors?: Record<string, string[]> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, ...options?.details, field_errors: options?.field_errors },
      { status }
    )
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
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
import { GET, POST } from '@/app/api/lab-orders/route'

// Helper to create GET request with query params
function createGetRequest(params?: Record<string, string>): NextRequest {
  const searchParams = new URLSearchParams(params)
  const url = params
    ? `http://localhost:3000/api/lab-orders?${searchParams.toString()}`
    : 'http://localhost:3000/api/lab-orders'

  return new NextRequest(url, { method: 'GET' })
}

// Helper to create POST request
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/lab-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample lab order data with relations
const SAMPLE_LAB_ORDER = {
  id: LAB_ORDERS.PENDING.id,
  tenant_id: TENANTS.ADRIS.id,
  pet_id: PETS.MAX_DOG.id,
  order_number: 'LAB-20240115-0001',
  ordered_by: USERS.VET_CARLOS.id,
  ordered_at: new Date().toISOString(),
  status: 'ordered',
  priority: 'routine',
  lab_type: 'in_house',
  pets: {
    id: PETS.MAX_DOG.id,
    name: PETS.MAX_DOG.name,
    species: PETS.MAX_DOG.species,
  },
}

// ============================================================================
// GET /api/lab-orders Tests
// ============================================================================

describe('GET /api/lab-orders', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to access', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(403)
    })

    it('should allow vet to access', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('List Orders', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return paginated list of orders', async () => {
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toBeDefined()
      expect(body.meta).toBeDefined()
    })

    it('should return empty list when no orders', async () => {
      mockState.setTableResult('lab_orders', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual([])
    })

    it('should filter by pet_id', async () => {
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest({ pet_id: PETS.MAX_DOG.id }))

      expect(response.status).toBe(200)
    })

    it('should filter by status', async () => {
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest({ status: 'ordered' }))

      expect(response.status).toBe(200)
    })

    it('should include pet details in response', async () => {
      mockState.setTableResult('lab_orders', [SAMPLE_LAB_ORDER])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].pets).toBeDefined()
      expect(body.data[0].pets.name).toBe(PETS.MAX_DOG.name)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('lab_orders', new Error('Database error'))

      const response = await GET(createGetRequest())

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('lab_orders', new Error('Connection failed'))

      await GET(createGetRequest())

      expect(logger.error).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// POST /api/lab-orders Tests
// ============================================================================

describe('POST /api/lab-orders', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to create', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(403)
    })

    it('should allow vet to create order', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { id: PETS.MAX_DOG.id, tenant_id: TENANTS.ADRIS.id })
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(201)
    })

    it('should allow admin to create order', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('pets', { id: PETS.MAX_DOG.id, tenant_id: TENANTS.ADRIS.id })
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 for invalid JSON', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/lab-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
      )

      expect(response.status).toBe(400)
    })

    it('should return 400 when pet_id is missing', async () => {
      const response = await POST(
        createPostRequest({
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.field_errors?.pet_id).toBeDefined()
    })

    it('should return 400 when test_ids is missing', async () => {
      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
        })
      )

      expect(response.status).toBe(400)
    })

    it('should return 400 when test_ids is empty', async () => {
      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: [],
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.field_errors?.test_ids).toBeDefined()
    })
  })

  describe('Pet Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when pet not found', async () => {
      mockState.setTableResult('pets', null)

      const response = await POST(
        createPostRequest({
          pet_id: 'non-existent-pet',
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(404)
    })

    it('should return 403 when pet belongs to different tenant', async () => {
      mockState.setTableResult('pets', { id: PETS.MILO_PETLIFE.id, tenant_id: TENANTS.PETLIFE.id })

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MILO_PETLIFE.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(403)
    })
  })

  describe('Order Creation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { id: PETS.MAX_DOG.id, tenant_id: TENANTS.ADRIS.id })
    })

    it('should create order with required fields', async () => {
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001', 'test-002'],
        })
      )

      expect(response.status).toBe(201)
    })

    it('should create order with all optional fields', async () => {
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
          panel_ids: ['panel-001'],
          priority: 'urgent',
          lab_type: 'external',
          fasting_status: 'fasted_12h',
          clinical_notes: 'Control de rutina post-cirugía',
        })
      )

      expect(response.status).toBe(201)
    })

    it('should use default priority when not provided', async () => {
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(201)
    })

    it('should use default lab_type when not provided', async () => {
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(201)
    })
  })

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockState.setAuthScenario('VET')

      const { rateLimit } = await import('@/lib/rate-limit')
      vi.mocked(rateLimit).mockResolvedValueOnce({
        success: false,
        response: NextResponse.json({ error: 'Too many requests', code: 'RATE_LIMITED' }, { status: 429 }),
      })

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(429)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { id: PETS.MAX_DOG.id, tenant_id: TENANTS.ADRIS.id })
    })

    it('should return 500 on order creation error', async () => {
      mockState.setTableError('lab_orders', new Error('Insert failed'))

      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(response.status).toBe(500)
    })

    it('should log errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('lab_orders', new Error('Database error'))

      await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['test-001'],
        })
      )

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { id: PETS.MAX_DOG.id, tenant_id: TENANTS.ADRIS.id })
      mockState.setTableResult('lab_orders', SAMPLE_LAB_ORDER)
    })

    it('should support complete blood panel workflow', async () => {
      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['hemograma', 'quimica-7', 'electrolitos'],
          panel_ids: ['panel-completo'],
          priority: 'routine',
          lab_type: 'in_house',
          fasting_status: 'fasted_12h',
          clinical_notes: 'Chequeo anual completo',
        })
      )

      expect(response.status).toBe(201)
    })

    it('should support urgent lab order', async () => {
      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['hemograma-urgente'],
          priority: 'stat',
          clinical_notes: 'Sospecha de intoxicación',
        })
      )

      expect(response.status).toBe(201)
    })

    it('should support external lab referral', async () => {
      const response = await POST(
        createPostRequest({
          pet_id: PETS.MAX_DOG.id,
          test_ids: ['histopatologia'],
          lab_type: 'external',
          clinical_notes: 'Muestra enviada a laboratorio externo',
        })
      )

      expect(response.status).toBe(201)
    })
  })
})
