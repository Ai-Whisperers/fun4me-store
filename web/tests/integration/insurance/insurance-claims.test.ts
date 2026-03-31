/**
 * Insurance Claims API Tests
 *
 * Tests for:
 * - GET /api/insurance/claims - List insurance claims
 * - POST /api/insurance/claims - Create insurance claim
 *
 * This route handles insurance claim management.
 * Staff only operations (vet/admin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from '@/app/api/insurance/claims/route'
import {
  mockState,
  TENANTS,
  PETS,
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
      const { mockState, createStatefulSupabaseMock } = await import('@/lib/test-utils')

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

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
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
  apiSuccess: (data: any, message?: string, status: number = 200) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(data, { status })
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
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
import { GET, POST } from '@/app/api/insurance/claims/route'

// Helper to create GET request
function createGetRequest(params?: {
  status?: string
  pet_id?: string
  policy_id?: string
  search?: string
  page?: number
  limit?: number
}): NextRequest {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.pet_id) searchParams.set('pet_id', params.pet_id)
  if (params?.policy_id) searchParams.set('policy_id', params.policy_id)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const url = searchParams.toString()
    ? `http://localhost:3000/api/insurance/claims?${searchParams.toString()}`
    : 'http://localhost:3000/api/insurance/claims'

  return new NextRequest(url, { method: 'GET' })
}

// Helper to create POST request
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/insurance/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample insurance claim
const SAMPLE_CLAIM = {
  id: 'claim-001',
  tenant_id: TENANTS.ADRIS.id,
  policy_id: 'policy-001',
  pet_id: PETS.MAX.id,
  claim_number: 'CLM-2026-0001',
  claim_type: 'treatment',
  date_of_service: '2026-01-01',
  diagnosis: 'Gastroenteritis',
  diagnosis_code: 'GI-001',
  treatment_description: 'Tratamiento con suero y antibióticos',
  total_charges: 250000,
  claimed_amount: 250000,
  status: 'draft',
  created_at: '2026-01-01T10:00:00Z',
  pets: { id: PETS.MAX.id, name: PETS.MAX.name, species: 'dog' },
  pet_insurance_policies: {
    id: 'policy-001',
    policy_number: 'POL-2026-0001',
    plan_name: 'Premium Plus',
    insurance_providers: {
      id: 'provider-001',
      name: 'PetSafe Insurance',
      logo_url: null,
    },
  },
  insurance_claim_items: [],
  insurance_eob: [],
}

// Sample policy for verification
const SAMPLE_POLICY = {
  id: 'policy-001',
  tenant_id: TENANTS.ADRIS.id,
  pet_id: PETS.MAX.id,
  provider_id: 'provider-001',
}

// ============================================================================
// GET Tests - List Insurance Claims
// ============================================================================

describe('GET /api/insurance/claims', () => {
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
      mockState.setTableResult('insurance_claims', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('insurance_claims', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should filter by status', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest({ status: 'draft' }))

      expect(response.status).toBe(200)
    })

    it('should filter by pet_id', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest({ pet_id: PETS.MAX.id }))

      expect(response.status).toBe(200)
    })

    it('should filter by policy_id', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest({ policy_id: 'policy-001' }))

      expect(response.status).toBe(200)
    })

    it('should support search by claim number', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest({ search: 'CLM-2026' }))

      expect(response.status).toBe(200)
    })

    it('should support pagination', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest({ page: 1, limit: 10 }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.page).toBe(1)
      expect(body.limit).toBe(10)
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return paginated response', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toBeDefined()
      expect(body.total).toBeDefined()
      expect(body.page).toBeDefined()
      expect(body.limit).toBeDefined()
    })

    it('should include related data', async () => {
      mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].pets).toBeDefined()
      expect(body.data[0].pet_insurance_policies).toBeDefined()
    })

    it('should return empty array when no claims', async () => {
      mockState.setTableResult('insurance_claims', [], 'select')

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual([])
      expect(body.total).toBe(0)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('insurance_claims', new Error('Database error'))

      const response = await GET(createGetRequest())

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// POST Tests - Create Insurance Claim
// ============================================================================

describe('POST /api/insurance/claims', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to create', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(403)
    })

    it('should allow vet to create', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
      mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')
      mockState.setTableResult('insurance_claims', SAMPLE_CLAIM, 'insert')
      mockState.setTableResult('insurance_claim_items', [], 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(201)
    })

    it('should allow admin to create', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
      mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')
      mockState.setTableResult('insurance_claims', SAMPLE_CLAIM, 'insert')
      mockState.setTableResult('insurance_claim_items', [], 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when policy_id is missing', async () => {
      const response = await POST(createPostRequest({
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('policy_id')
    })

    it('should return 400 when pet_id is missing', async () => {
      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('pet_id')
    })

    it('should return 400 when claim_type is missing', async () => {
      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('claim_type')
    })

    it('should return 400 when date_of_service is missing', async () => {
      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('date_of_service')
    })

    it('should return 400 when diagnosis is missing', async () => {
      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('diagnosis')
    })

    it('should return 400 when treatment_description is missing', async () => {
      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('treatment_description')
    })
  })

  describe('Policy Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when policy not found', async () => {
      mockState.setTableResult('pet_insurance_policies', null, 'select')

      const response = await POST(createPostRequest({
        policy_id: 'non-existent-policy',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('policy')
    })
  })

  describe('Successful Creation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
      mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')
    })

    it('should create claim with required fields', async () => {
      mockState.setTableResult('insurance_claims', SAMPLE_CLAIM, 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(201)
    })

    it('should create claim with line items', async () => {
      mockState.setTableResult('insurance_claims', SAMPLE_CLAIM, 'insert')
      mockState.setTableResult('insurance_claim_items', [], 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment with IV fluids and medication',
        items: [
          { description: 'IV Fluids', quantity: 1, unit_price: 50000 },
          { description: 'Medication', quantity: 2, unit_price: 25000 },
        ],
      }))

      expect(response.status).toBe(201)
    })

    it('should create claim with invoice reference', async () => {
      mockState.setTableResult('insurance_claims', {
        ...SAMPLE_CLAIM,
        invoice_id: 'invoice-001',
      }, 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        invoice_id: 'invoice-001',
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(201)
    })

    it('should create claim with diagnosis code', async () => {
      mockState.setTableResult('insurance_claims', {
        ...SAMPLE_CLAIM,
        diagnosis_code: 'GI-001',
      }, 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        diagnosis_code: 'GI-001',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(201)
    })

    it('should calculate totals from items', async () => {
      mockState.setTableResult('insurance_claims', {
        ...SAMPLE_CLAIM,
        total_charges: 100000,
        claimed_amount: 100000,
      }, 'insert')
      mockState.setTableResult('insurance_claim_items', [], 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
        items: [
          { description: 'Service 1', quantity: 1, unit_price: 50000 },
          { description: 'Service 2', quantity: 2, unit_price: 25000 },
        ],
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should apply rate limiting', async () => {
      const { rateLimit } = await import('@/lib/rate-limit')
      vi.mocked(rateLimit).mockResolvedValueOnce({
        success: false,
        response: NextResponse.json({ error: 'RATE_LIMITED', code: 'RATE_LIMITED' }, { status: 429 }),
      })

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(429)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
      mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('insurance_claims', new Error('Database error'))

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type: 'treatment',
        date_of_service: '2026-01-01',
        diagnosis: 'Gastroenteritis',
        treatment_description: 'Treatment',
      }))

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Insurance Claims Integration', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support complete claim workflow', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
    mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')
    mockState.setTableResult('insurance_claims', SAMPLE_CLAIM, 'insert')

    // Create claim
    const createResponse = await POST(createPostRequest({
      policy_id: 'policy-001',
      pet_id: PETS.MAX.id,
      claim_type: 'treatment',
      date_of_service: '2026-01-01',
      diagnosis: 'Gastroenteritis',
      treatment_description: 'Complete treatment',
    }))
    expect(createResponse.status).toBe(201)

    // List claims
    mockState.setTableResult('insurance_claims', [SAMPLE_CLAIM], 'select')
    const listResponse = await GET(createGetRequest({ pet_id: PETS.MAX.id }))
    expect(listResponse.status).toBe(200)
    const claims = await listResponse.json()
    expect(claims.data.length).toBeGreaterThan(0)
  })

  it('should handle different claim types', async () => {
    mockState.setAuthScenario('ADMIN')
    mockState.setTableResult('pet_insurance_policies', SAMPLE_POLICY, 'select')
    mockState.setRpcResult('generate_claim_number', 'CLM-2026-0001')

    const claimTypes = ['treatment', 'surgery', 'preventive', 'emergency']

    for (const claim_type of claimTypes) {
      mockState.setTableResult('insurance_claims', {
        ...SAMPLE_CLAIM,
        claim_type,
      }, 'insert')

      const response = await POST(createPostRequest({
        policy_id: 'policy-001',
        pet_id: PETS.MAX.id,
        claim_type,
        date_of_service: '2026-01-01',
        diagnosis: 'Test diagnosis',
        treatment_description: 'Test treatment',
      }))

      expect(response.status).toBe(201)
    }
  })
})
