/**
 * Vaccine Reactions API Tests
 *
 * Tests for:
 * - GET /api/vaccine_reactions - List vaccine reactions
 * - POST /api/vaccine_reactions - Create vaccine reaction
 * - PUT /api/vaccine_reactions - Update vaccine reaction
 * - DELETE /api/vaccine_reactions - Delete vaccine reaction
 *
 * This route handles vaccine reaction tracking.
 * Owners can view/create reactions for their pets.
 * Staff can manage all reactions in their clinic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/vaccine_reactions/route'
import {
  mockState,
  TENANTS,
  USERS,
  PETS,
  resetAllMocks,
  createStatefulSupabaseMock,
  getAuthMock,
  createNextRequest,
  createJsonRequest,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper using centralized mock
vi.mock('@/lib/auth', () => getAuthMock())

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

// Helper to create GET request
function createGetReq(petId?: string): NextRequest {
  const params: Record<string, string> = {}
  if (petId) params.pet_id = petId
  return createNextRequest('/api/vaccine_reactions', {
    method: 'GET',
    searchParams: params,
  })
}

// Helper to create POST request
function createPostReq(body: Record<string, unknown>): NextRequest {
  return createJsonRequest('/api/vaccine_reactions', body, { method: 'POST' })
}

// Helper to create PUT request
function createPutReq(body: Record<string, unknown>): NextRequest {
  return createJsonRequest('/api/vaccine_reactions', body, { method: 'PUT' })
}

// Helper to create DELETE request
function createDeleteReq(body: { id?: string }): NextRequest {
  return createJsonRequest('/api/vaccine_reactions', body, { method: 'DELETE' })
}

// Sample vaccine reaction
const SAMPLE_REACTION = {
  id: 'reaction-001',
  pet_id: PETS.MAX.id,
  vaccine_id: 'vaccine-001',
  reaction_type: 'swelling',
  severity: 'mild',
  description: 'Hinchazón en zona de aplicación',
  occurred_at: '2026-01-01T10:00:00Z',
  reported_by: USERS.OWNER.id,
  created_at: '2026-01-01T12:00:00Z',
  pet: {
    id: PETS.MAX.id,
    name: PETS.MAX.name,
    owner_id: USERS.OWNER.id,
    tenant_id: TENANTS.ADRIS.id,
  },
  vaccine: {
    id: 'vaccine-001',
    vaccine_name: 'Rabia',
  },
}

const SAMPLE_SEVERE_REACTION = {
  ...SAMPLE_REACTION,
  id: 'reaction-002',
  reaction_type: 'anaphylaxis',
  severity: 'severe',
  description: 'Reacción anafiláctica severa',
}

// Sample pet for verification
const SAMPLE_PET = {
  id: PETS.MAX.id,
  owner_id: USERS.OWNER.id,
  tenant_id: TENANTS.ADRIS.id,
}

// ============================================================================
// GET Tests - List Vaccine Reactions
// ============================================================================

describe('GET /api/vaccine_reactions', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createGetReq())

      expect(response.status).toBe(401)
    })

    it('should allow owner to access', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('vaccine_reactions', [], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
    })

    it('should allow vet to access', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_reactions', [], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('vaccine_reactions', [], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
    })
  })

  describe('Role-Based Filtering', () => {
    it('should filter by owner_id for owner role', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
    })

    it('should filter by tenant_id for staff role', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should filter by pet_id', async () => {
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq(PETS.MAX.id))

      expect(response.status).toBe(200)
    })

    it('should return all reactions without pet_id filter', async () => {
      mockState.setTableResult('vaccine_reactions', [
        SAMPLE_REACTION,
        SAMPLE_SEVERE_REACTION,
      ], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.length).toBe(2)
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return array of reactions', async () => {
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
    })

    it('should include pet details', async () => {
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body[0].pet).toBeDefined()
      expect(body[0].pet.name).toBe(PETS.MAX.name)
    })

    it('should include vaccine details', async () => {
      mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body[0].vaccine).toBeDefined()
    })

    it('should return empty array when no reactions', async () => {
      mockState.setTableResult('vaccine_reactions', [], 'select')

      const response = await GET(createGetReq())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual([])
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('vaccine_reactions', new Error('Database error'))

      const response = await GET(createGetReq())

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al obtener reacciones')
    })
  })
})

// ============================================================================
// POST Tests - Create Vaccine Reaction
// ============================================================================

describe('POST /api/vaccine_reactions', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(401)
    })

    it('should allow owner to create for own pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('vaccine_reactions', { id: 'reaction-new' }, 'insert')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(201)
    })

    it('should allow vet to create', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
      mockState.setTableResult('vaccine_reactions', { id: 'reaction-new' }, 'insert')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when pet_id is missing', async () => {
      const response = await POST(createPostReq({
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('pet_id')
    })

    it('should return 400 when reaction_type is missing', async () => {
      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('reaction_type')
    })

    it('should return 400 for invalid JSON body', async () => {
      const response = await POST(new NextRequest('http://localhost:3000/api/vaccine_reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Pet Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 404 when pet not found', async () => {
      mockState.setTableResult('pets', null, 'select')

      const response = await POST(createPostReq({
        pet_id: 'non-existent-pet',
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('pet')
    })

    it('should return 403 when owner tries to create for another owner pet', async () => {
      mockState.setTableResult('pets', {
        ...SAMPLE_PET,
        owner_id: 'different-owner-id',
      }, 'select')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(403)
    })

    it('should return 403 when staff tries to create for different tenant', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', {
        ...SAMPLE_PET,
        tenant_id: TENANTS.PETLIFE.id,
      }, 'select')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(403)
    })
  })

  describe('Successful Creation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
    })

    it('should create reaction with required fields', async () => {
      mockState.setTableResult('vaccine_reactions', { id: 'reaction-new' }, 'insert')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(201)
    })

    it('should create reaction with all fields', async () => {
      mockState.setTableResult('vaccine_reactions', SAMPLE_REACTION, 'insert')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        vaccine_id: 'vaccine-001',
        reaction_type: 'swelling',
        severity: 'mild',
        description: 'Hinchazón en zona de aplicación',
        occurred_at: '2026-01-01T10:00:00Z',
      }))

      expect(response.status).toBe(201)
    })

    it('should default severity to mild', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-new',
        severity: 'mild',
      }, 'insert')

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(201)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', SAMPLE_PET, 'select')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('vaccine_reactions', new Error('Database error'))

      const response = await POST(createPostReq({
        pet_id: PETS.MAX.id,
        reaction_type: 'swelling',
      }))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al registrar reacción')
    })
  })
})

// ============================================================================
// PUT Tests - Update Vaccine Reaction
// ============================================================================

describe('PUT /api/vaccine_reactions', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await PUT(createPutReq({
        id: 'reaction-001',
        severity: 'moderate',
      }))

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 400 when id is missing', async () => {
      const response = await PUT(createPutReq({
        severity: 'moderate',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('id')
    })

    it('should return 400 for invalid JSON body', async () => {
      const response = await PUT(new NextRequest('http://localhost:3000/api/vaccine_reactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Reaction Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 404 when reaction not found', async () => {
      mockState.setTableResult('vaccine_reactions', null, 'select')

      const response = await PUT(createPutReq({
        id: 'non-existent-reaction',
        severity: 'moderate',
      }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('vaccine_reaction')
    })

    it('should return 403 when owner tries to update another owner reaction', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { owner_id: 'different-owner-id', tenant_id: TENANTS.ADRIS.id },
      }, 'select')

      const response = await PUT(createPutReq({
        id: 'reaction-001',
        severity: 'moderate',
      }))

      expect(response.status).toBe(403)
    })
  })

  describe('Successful Update', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should update reaction', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { owner_id: USERS.OWNER.id, tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableResult('vaccine_reactions', {
        ...SAMPLE_REACTION,
        severity: 'moderate',
      }, 'update')

      const response = await PUT(createPutReq({
        id: 'reaction-001',
        severity: 'moderate',
        description: 'Actualización',
      }))

      expect(response.status).toBe(200)
    })

    it('should allow staff to update clinic reactions', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { owner_id: USERS.OWNER.id, tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableResult('vaccine_reactions', SAMPLE_REACTION, 'update')

      const response = await PUT(createPutReq({
        id: 'reaction-001',
        severity: 'severe',
      }))

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('OWNER')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { owner_id: USERS.OWNER.id, tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableError('vaccine_reactions', new Error('Database error'))

      const response = await PUT(createPutReq({
        id: 'reaction-001',
        severity: 'moderate',
      }))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al actualizar')
    })
  })
})

// ============================================================================
// DELETE Tests - Delete Vaccine Reaction
// ============================================================================

describe('DELETE /api/vaccine_reactions', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to delete', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(403)
    })

    it('should allow vet to delete', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableResult('vaccine_reactions', { count: 1 }, 'delete')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(204)
    })

    it('should allow admin to delete', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableResult('vaccine_reactions', { count: 1 }, 'delete')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(204)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when id is missing', async () => {
      const response = await DELETE(createDeleteReq({}))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('id')
    })

    it('should return 400 for invalid JSON body', async () => {
      const response = await DELETE(new NextRequest('http://localhost:3000/api/vaccine_reactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Reaction Verification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when reaction not found', async () => {
      mockState.setTableResult('vaccine_reactions', null, 'select')

      const response = await DELETE(createDeleteReq({ id: 'non-existent' }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.resource).toBe('vaccine_reaction')
    })

    it('should return 403 when reaction belongs to different tenant', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { tenant_id: TENANTS.PETLIFE.id },
      }, 'select')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(403)
    })
  })

  describe('Successful Deletion', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should delete reaction', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableResult('vaccine_reactions', { count: 1 }, 'delete')

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(204)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableResult('vaccine_reactions', {
        id: 'reaction-001',
        pet: { tenant_id: TENANTS.ADRIS.id },
      }, 'select')
      mockState.setTableError('vaccine_reactions', new Error('Database error'))

      const response = await DELETE(createDeleteReq({ id: 'reaction-001' }))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al eliminar')
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Vaccine Reactions Integration', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support complete reaction workflow', async () => {
    // Owner reports reaction
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('pets', SAMPLE_PET, 'select')
    mockState.setTableResult('vaccine_reactions', { id: 'reaction-new' }, 'insert')

    const createResponse = await POST(createPostReq({
      pet_id: PETS.MAX.id,
      vaccine_id: 'vaccine-001',
      reaction_type: 'swelling',
      severity: 'mild',
    }))
    expect(createResponse.status).toBe(201)

    // Owner views reactions
    mockState.setTableResult('vaccine_reactions', [SAMPLE_REACTION], 'select')
    const listResponse = await GET(createGetReq(PETS.MAX.id))
    expect(listResponse.status).toBe(200)

    // Vet updates severity after examination
    mockState.setAuthScenario('VET')
    mockState.setTableResult('vaccine_reactions', {
      id: 'reaction-001',
      pet: { owner_id: USERS.OWNER.id, tenant_id: TENANTS.ADRIS.id },
    }, 'select')
    mockState.setTableResult('vaccine_reactions', {
      ...SAMPLE_REACTION,
      severity: 'moderate',
    }, 'update')

    const updateResponse = await PUT(createPutReq({
      id: 'reaction-001',
      severity: 'moderate',
      description: 'Actualizado tras examen',
    }))
    expect(updateResponse.status).toBe(200)
  })

  it('should handle severe reaction reporting', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('pets', SAMPLE_PET, 'select')
    mockState.setTableResult('vaccine_reactions', SAMPLE_SEVERE_REACTION, 'insert')

    const response = await POST(createPostReq({
      pet_id: PETS.MAX.id,
      vaccine_id: 'vaccine-001',
      reaction_type: 'anaphylaxis',
      severity: 'severe',
      description: 'Reacción anafiláctica - tratamiento administrado',
      occurred_at: new Date().toISOString(),
    }))

    expect(response.status).toBe(201)
  })

  it('should support contraindication tracking workflow', async () => {
    mockState.setAuthScenario('VET')

    // List reactions to check contraindications
    mockState.setTableResult('vaccine_reactions', [SAMPLE_SEVERE_REACTION], 'select')

    const response = await GET(createGetReq(PETS.MAX.id))

    expect(response.status).toBe(200)
    const reactions = await response.json()
    // Check for severe reactions that indicate contraindications
    const severeReactions = reactions.filter((r: any) => r.severity === 'severe')
    expect(severeReactions.length).toBeGreaterThan(0)
  })
})
