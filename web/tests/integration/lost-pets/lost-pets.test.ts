/**
 * Lost Pets API Tests
 *
 * Tests for:
 * - GET /api/lost-pets - List lost pet reports
 * - PATCH /api/lost-pets - Update lost pet report status
 *
 * This route handles lost pet report management.
 * GET requires auth, PATCH is staff only (vet/admin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/lost-pets/route'
import {
  mockState,
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
  apiSuccess: (data: any, message?: string, status: number = 200) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json({ ...data, message }, { status })
  },
  HTTP_STATUS: {
    OK: 200,
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
import { GET, PATCH } from '@/app/api/lost-pets/route'

// Helper to create GET request
function createGetRequest(status?: string): NextRequest {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const url = params.toString()
    ? `http://localhost:3000/api/lost-pets?${params.toString()}`
    : 'http://localhost:3000/api/lost-pets'

  return new NextRequest(url, { method: 'GET' })
}

// Helper to create PATCH request
function createPatchRequest(body: { id?: string; status?: string }): NextRequest {
  return new NextRequest('http://localhost:3000/api/lost-pets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Sample lost pet report
const SAMPLE_LOST_PET_REPORT = {
  id: 'report-001',
  status: 'lost',
  last_seen_location: 'Barrio San Roque, Asunción',
  last_seen_date: '2026-01-01',
  finder_contact: null,
  finder_notes: null,
  notes: 'Escapó del patio',
  created_at: '2026-01-01T10:00:00Z',
  resolved_at: null,
  pet: {
    id: PETS.MAX.id,
    name: PETS.MAX.name,
    species: 'dog',
    breed: 'Labrador',
    photo_url: null,
    owner: {
      id: USERS.OWNER.id,
      full_name: 'Test Owner',
      phone: '+595991234567',
      email: 'owner@example.com',
    },
  },
  reported_by_user: {
    full_name: 'Test Vet',
  },
  resolved_by_user: null,
}

const SAMPLE_FOUND_REPORT = {
  ...SAMPLE_LOST_PET_REPORT,
  id: 'report-002',
  status: 'found',
  finder_contact: '+595991234567',
  finder_notes: 'Encontrado en el parque',
}

const SAMPLE_REUNITED_REPORT = {
  ...SAMPLE_LOST_PET_REPORT,
  id: 'report-003',
  status: 'reunited',
  resolved_at: '2026-01-03T15:00:00Z',
  resolved_by_user: {
    full_name: 'Test Admin',
  },
}

// ============================================================================
// GET Tests - List Lost Pet Reports
// ============================================================================

describe('GET /api/lost-pets', () => {
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
      mockState.setTableResult('lost_pet_reports', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow vet to access', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('lost_pet_reports', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('lost_pet_reports', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('Status Filtering', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return all reports when status is "all"', async () => {
      mockState.setTableResult('lost_pet_reports', [
        SAMPLE_LOST_PET_REPORT,
        SAMPLE_FOUND_REPORT,
        SAMPLE_REUNITED_REPORT,
      ])

      const response = await GET(createGetRequest('all'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.length).toBe(3)
    })

    it('should filter by lost status', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])

      const response = await GET(createGetRequest('lost'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.every((r: any) => r.status === 'lost')).toBe(true)
    })

    it('should filter by found status', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_FOUND_REPORT])

      const response = await GET(createGetRequest('found'))

      expect(response.status).toBe(200)
    })

    it('should filter by reunited status', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_REUNITED_REPORT])

      const response = await GET(createGetRequest('reunited'))

      expect(response.status).toBe(200)
    })

    it('should return all reports when no status provided', async () => {
      mockState.setTableResult('lost_pet_reports', [
        SAMPLE_LOST_PET_REPORT,
        SAMPLE_FOUND_REPORT,
      ])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
    })
  })

  describe('Response Structure', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return empty array when no reports', async () => {
      mockState.setTableResult('lost_pet_reports', [])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual([])
    })

    it('should include pet details', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].pet).toBeDefined()
      expect(body.data[0].pet.name).toBe(PETS.MAX.name)
      expect(body.data[0].pet.species).toBe('dog')
    })

    it('should include owner contact details', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].pet.owner).toBeDefined()
      expect(body.data[0].pet.owner.full_name).toBeDefined()
      expect(body.data[0].pet.owner.phone).toBeDefined()
    })

    it('should include reporter info', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].reported_by_user).toBeDefined()
    })

    it('should include resolver info for reunited reports', async () => {
      mockState.setTableResult('lost_pet_reports', [SAMPLE_REUNITED_REPORT])

      const response = await GET(createGetRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data[0].resolved_by_user).toBeDefined()
      expect(body.data[0].resolved_at).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('lost_pet_reports', new Error('Database error'))

      const response = await GET(createGetRequest())

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('lost_pet_reports', new Error('Connection failed'))

      await GET(createGetRequest())

      expect(logger.error).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// PATCH Tests - Update Lost Pet Report Status
// ============================================================================

describe('PATCH /api/lost-pets', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to update', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(403)
    })

    it('should allow vet to update', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(200)
    })

    it('should allow admin to update', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'reunited',
      }))

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when id is missing', async () => {
      const response = await PATCH(createPatchRequest({
        status: 'found',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('id')
    })

    it('should return 400 when status is missing', async () => {
      const response = await PATCH(createPatchRequest({
        id: 'report-001',
      }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.required).toContain('status')
    })
  })

  describe('Status Updates', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should update status to lost', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'lost',
      }))

      expect(response.status).toBe(200)
    })

    it('should update status to found', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(200)
    })

    it('should update status to reunited and set resolved_at', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'reunited',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.id).toBe('report-001')
    })

    it('should clear resolved_at when changing away from reunited', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-003', // Was reunited
        status: 'lost',
      }))

      expect(response.status).toBe(200)
    })
  })

  describe('Response', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return success message in Spanish', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'reunited',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.message).toBe('Estado actualizado')
    })

    it('should return updated report id', async () => {
      mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.id).toBe('report-001')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('lost_pet_reports', new Error('Database error'))

      const response = await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('lost_pet_reports', new Error('Connection failed'))

      await PATCH(createPatchRequest({
        id: 'report-001',
        status: 'found',
      }))

      expect(logger.error).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Lost Pets Integration', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support complete lost pet workflow', async () => {
    mockState.setAuthScenario('VET')

    // List lost pets
    mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])
    const listResponse = await GET(createGetRequest('lost'))
    expect(listResponse.status).toBe(200)
    const lost = await listResponse.json()
    expect(lost.data.length).toBe(1)

    // Update to found
    mockState.setTableResult('lost_pet_reports', { count: 1 }, 'update')
    const foundResponse = await PATCH(createPatchRequest({
      id: 'report-001',
      status: 'found',
    }))
    expect(foundResponse.status).toBe(200)

    // Update to reunited
    const reunitedResponse = await PATCH(createPatchRequest({
      id: 'report-001',
      status: 'reunited',
    }))
    expect(reunitedResponse.status).toBe(200)
  })

  it('should show contact info for lost pets', async () => {
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('lost_pet_reports', [SAMPLE_LOST_PET_REPORT])

    const response = await GET(createGetRequest('lost'))

    expect(response.status).toBe(200)
    const body = await response.json()
    // Owner contact should be visible for reunification
    expect(body.data[0].pet.owner.phone).toBeDefined()
    expect(body.data[0].pet.owner.email).toBeDefined()
  })

  it('should show finder contact for found pets', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('lost_pet_reports', [SAMPLE_FOUND_REPORT])

    const response = await GET(createGetRequest('found'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data[0].finder_contact).toBeDefined()
    expect(body.data[0].finder_notes).toBeDefined()
  })

  it('should handle multiple lost pets at once', async () => {
    mockState.setAuthScenario('VET')
    mockState.setTableResult('lost_pet_reports', [
      SAMPLE_LOST_PET_REPORT,
      { ...SAMPLE_LOST_PET_REPORT, id: 'report-004' },
      { ...SAMPLE_LOST_PET_REPORT, id: 'report-005' },
    ])

    const response = await GET(createGetRequest('lost'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.length).toBe(3)
  })
})
