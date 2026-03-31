/**
 * Consent Workflow API Tests
 *
 * Tests for:
 * - GET /api/consents - List consent documents
 * - POST /api/consents - Create consent document with signature
 *
 * This route handles consent document management.
 * Staff can create consent documents with digital signatures.
 * Owners can view their own consent documents.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/consents/route'
import {
  mockState,
  TENANTS,
  USERS,
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
import { GET, POST } from '@/app/api/consents/route'

// Helper to create GET request
function createGetRequest(params?: {
  pet_id?: string
  owner_id?: string
  category?: string
  status?: string
}): NextRequest {
  const searchParams = new URLSearchParams()
  if (params?.pet_id) searchParams.set('pet_id', params.pet_id)
  if (params?.owner_id) searchParams.set('owner_id', params.owner_id)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.status) searchParams.set('status', params.status)

  const url = searchParams.toString()
    ? `http://localhost:3000/api/consents?${searchParams.toString()}`
    : 'http://localhost:3000/api/consents'

  return new NextRequest(url, { method: 'GET' })
}

// Helper to create POST request
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample consent document
const SAMPLE_CONSENT_DOCUMENT = {
  id: 'consent-001',
  template_id: 'template-001',
  pet_id: PETS.MAX.id,
  owner_id: USERS.OWNER.id,
  signature_data: 'data:image/png;base64,signature',
  signed_by_id: USERS.VET.id,
  signed_at: '2026-01-01T10:00:00Z',
  status: 'active',
  created_at: '2026-01-01T10:00:00Z',
  pet: {
    id: PETS.MAX.id,
    name: PETS.MAX.name,
    owner_id: USERS.OWNER.id,
    tenant_id: TENANTS.ADRIS.id,
  },
  owner: {
    id: USERS.OWNER.id,
    full_name: 'Test Owner',
    email: 'owner@example.com',
  },
  template: {
    id: 'template-001',
    name: 'Consentimiento Quirúrgico',
    category: 'surgery',
  },
  signed_by_user: {
    id: USERS.VET.id,
    full_name: 'Test Vet',
  },
}

// Sample consent template
const SAMPLE_TEMPLATE = {
  id: 'template-001',
  requires_witness: false,
  can_be_revoked: true,
  default_expiry_days: 365,
}

// Sample pet
const SAMPLE_PET = {
  id: PETS.MAX.id,
  tenant_id: TENANTS.ADRIS.id,
  owner_id: USERS.OWNER.id,
}

// ============================================================================
// GET Tests - List Consent Documents
// ============================================================================

describe('GET /api/consents', () => {
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

    it('should allow owner to access', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('consent_documents', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow vet to access', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('consent_documents', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('consent_documents', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('Role-Based Filtering', () => {
    it('should filter by owner_id for owner role', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      // Owner should only see their own consent documents
      expect(Array.isArray(body)).toBe(true)
    })

    it('should filter by tenant_id for staff role', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should filter by pet_id', async () => {
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest({ pet_id: PETS.MAX.id }))

      expect(response.status).toBe(200)
    })

    it('should filter by owner_id', async () => {
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest({ owner_id: USERS.OWNER.id }))

      expect(response.status).toBe(200)
    })

    it('should filter by category', async () => {
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest({ category: 'surgery' }))

      expect(response.status).toBe(200)
    })

    it('should filter by status', async () => {
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest({ status: 'active' }))

      expect(response.status).toBe(200)
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return empty array when no documents', async () => {
      mockState.setTableResult('consent_documents', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual([])
    })

    it('should include related data in response', async () => {
      mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body[0].pet).toBeDefined()
      expect(body[0].owner).toBeDefined()
      expect(body[0].template).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('consent_documents', new Error('Database error'))

      const response = await GET(createGetRequest())

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// POST Tests - Create Consent Document
// ============================================================================

describe('POST /api/consents', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to create', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(403)
    })

    it('should allow vet to create', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('consent_templates', SAMPLE_TEMPLATE, 'select')
      mockState.setTableResult('consent_documents', { id: 'consent-new' }, 'insert')
      mockState.setTableResult('consent_audit_log', {}, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(201)
    })

    it('should allow admin to create', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('consent_templates', SAMPLE_TEMPLATE, 'select')
      mockState.setTableResult('consent_documents', { id: 'consent-new' }, 'insert')
      mockState.setTableResult('consent_audit_log', {}, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when template_id is missing', async () => {
      const response = await POST(createPostRequest({
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('template_id')
    })

    it('should return 400 when pet_id is missing', async () => {
      const response = await POST(createPostRequest({
        template_id: 'template-001',
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('pet_id')
    })

    it('should return 400 when owner_id is missing', async () => {
      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('owner_id')
    })

    it('should return 400 when signature_data is missing', async () => {
      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('signature_data')
    })

    it('should return 400 for invalid JSON body', async () => {
      const response = await POST(new NextRequest('http://localhost:3000/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Pet Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when pet not found', async () => {
      mockState.setTableResult('pets', null, 'select')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: 'non-existent-pet',
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('pet')
    })

    it('should return 403 when pet belongs to different tenant', async () => {
      mockState.setTableResult('pets', {
        ...SAMPLE_PET,
        tenant_id: TENANTS.PETLIFE.id, // Different tenant
      }, 'select')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(403)
    })

    it('should return 400 when owner does not match pet', async () => {
      mockState.setTableResult('pets', {
        ...SAMPLE_PET,
        owner_id: 'different-owner-id',
      }, 'select')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Owner does not match pet')
    })
  })

  describe('Template Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
    })

    it('should return 404 when template not found', async () => {
      mockState.setTableResult('consent_templates', null, 'select')

      const response = await POST(createPostRequest({
        template_id: 'non-existent-template',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('template')
    })

    it('should return 400 when witness signature required but missing', async () => {
      mockState.setTableResult('consent_templates', {
        ...SAMPLE_TEMPLATE,
        requires_witness: true,
      }, 'select')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('witness_signature_data')
    })
  })

  describe('Successful Creation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('consent_templates', SAMPLE_TEMPLATE, 'select')
      mockState.setTableResult('consent_audit_log', {}, 'insert')
    })

    it('should create consent document', async () => {
      mockState.setTableResult('consent_documents', { id: 'consent-new' }, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.id).toBe('consent-new')
    })

    it('should create consent with witness signature', async () => {
      mockState.setTableResult('consent_templates', {
        ...SAMPLE_TEMPLATE,
        requires_witness: true,
      }, 'select')
      mockState.setTableResult('consent_documents', {
        id: 'consent-new',
        witness_signature_data: 'witness-sig',
        witness_name: 'Test Witness',
      }, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
        witness_signature_data: 'data:image/png;base64,witness',
        witness_name: 'Test Witness',
      }))

      expect(response.status).toBe(201)
    })

    it('should create consent with custom expiry', async () => {
      mockState.setTableResult('consent_documents', {
        id: 'consent-new',
        expires_at: '2027-01-01T00:00:00Z',
      }, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
        expires_at: '2027-01-01T00:00:00Z',
      }))

      expect(response.status).toBe(201)
    })

    it('should create consent with field values', async () => {
      mockState.setTableResult('consent_documents', {
        id: 'consent-new',
        field_values: { procedure: 'Castration', anesthesia: 'General' },
      }, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
        field_values: { procedure: 'Castration', anesthesia: 'General' },
      }))

      expect(response.status).toBe(201)
    })

    it('should create consent with ID verification', async () => {
      mockState.setTableResult('consent_documents', {
        id: 'consent-new',
        id_verification_type: 'cedula',
        id_verification_number: '1234567',
      }, 'insert')

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
        id_verification_type: 'cedula',
        id_verification_number: '1234567',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('consent_templates', SAMPLE_TEMPLATE, 'select')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('consent_documents', new Error('Database error'))

      const response = await POST(createPostRequest({
        template_id: 'template-001',
        pet_id: PETS.MAX.id,
        owner_id: USERS.OWNER.id,
        signature_data: 'data:image/png;base64,signature',
      }))

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Consent Workflow Integration', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support complete consent workflow', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('pets', SAMPLE_PET, 'select')
    mockState.setTableResult('consent_templates', SAMPLE_TEMPLATE, 'select')
    mockState.setTableResult('consent_documents', { id: 'consent-new' }, 'insert')
    mockState.setTableResult('consent_audit_log', {}, 'insert')

    // Create consent
    const createResponse = await POST(createPostRequest({
      template_id: 'template-001',
      pet_id: PETS.MAX.id,
      owner_id: USERS.OWNER.id,
      signature_data: 'data:image/png;base64,signature',
    }))
    expect(createResponse.status).toBe(201)

    // List consents
    mockState.setTableResult('consent_documents', [SAMPLE_CONSENT_DOCUMENT])
    const listResponse = await GET(createGetRequest({ pet_id: PETS.MAX.id }))
    expect(listResponse.status).toBe(200)
    const consents = await listResponse.json()
    expect(consents.length).toBeGreaterThan(0)
  })

  it('should handle surgery consent with witness', async () => {
    mockState.setAuthScenario('ADMIN')
    mockState.setTableResult('pets', SAMPLE_PET, 'select')
    mockState.setTableResult('consent_templates', {
      ...SAMPLE_TEMPLATE,
      requires_witness: true,
    }, 'select')
    mockState.setTableResult('consent_documents', {
      id: 'consent-surgery',
      witness_signature_data: 'witness-sig',
    }, 'insert')
    mockState.setTableResult('consent_audit_log', {}, 'insert')

    const response = await POST(createPostRequest({
      template_id: 'template-001',
      pet_id: PETS.MAX.id,
      owner_id: USERS.OWNER.id,
      signature_data: 'data:image/png;base64,owner-signature',
      witness_signature_data: 'data:image/png;base64,witness-signature',
      witness_name: 'Dr. Test Witness',
      field_values: {
        procedure: 'Ovariohisterectomía',
        anesthesia_type: 'General Inhalatoria',
        risks_acknowledged: true,
      },
    }))

    expect(response.status).toBe(201)
  })
})
