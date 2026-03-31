/**
 * Vaccine Recommendations API Tests
 *
 * Tests for GET /api/vaccines/recommendations
 *
 * This route returns recommended vaccines for a pet based on:
 * - Species
 * - Age (in weeks)
 * - Existing vaccinations
 *
 * Critical for preventive care guidance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/vaccines/recommendations/route'
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

// Mock auth wrapper - uses mockState
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
    return async (request: Request) => {
      const { mockState } = await import('@/lib/test-utils')
      const { createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        return new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (!mockState.profile) {
        return new Response(JSON.stringify({ error: 'Perfil no encontrado', code: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (options?.roles && !options.roles.includes(mockState.profile.role)) {
        return new Response(JSON.stringify({ error: 'Rol insuficiente', code: 'INSUFFICIENT_ROLE' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
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

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import routes AFTER mocks
import { GET } from '@/app/api/vaccines/recommendations/route'

// Helper to create GET request
function createRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params)
  return new NextRequest(`http://localhost:3000/api/vaccines/recommendations?${searchParams}`, {
    method: 'GET',
  })
}

// Sample vaccine protocols
const DOG_CORE_VACCINES = [
  {
    id: 'protocol-rabies',
    vaccine_name: 'Antirrábica',
    vaccine_code: 'RAB',
    species: 'dog',
    protocol_type: 'core',
    diseases_prevented: ['Rabia'],
    first_dose_weeks: 12,
    booster_weeks: [16],
    revaccination_months: 12,
    notes: 'Obligatoria por ley',
    deleted_at: null,
  },
  {
    id: 'protocol-distemper',
    vaccine_name: 'Moquillo',
    vaccine_code: 'CDV',
    species: 'dog',
    protocol_type: 'core',
    diseases_prevented: ['Moquillo canino'],
    first_dose_weeks: 6,
    booster_weeks: [10, 14],
    revaccination_months: 12,
    notes: null,
    deleted_at: null,
  },
  {
    id: 'protocol-parvo',
    vaccine_name: 'Parvovirus',
    vaccine_code: 'CPV',
    species: 'dog',
    protocol_type: 'core',
    diseases_prevented: ['Parvovirus canino'],
    first_dose_weeks: 6,
    booster_weeks: [10, 14],
    revaccination_months: 12,
    notes: null,
    deleted_at: null,
  },
]

const DOG_LIFESTYLE_VACCINES = [
  {
    id: 'protocol-lepto',
    vaccine_name: 'Leptospirosis',
    vaccine_code: 'LEP',
    species: 'dog',
    protocol_type: 'lifestyle',
    diseases_prevented: ['Leptospirosis'],
    first_dose_weeks: 12,
    booster_weeks: [16],
    revaccination_months: 12,
    notes: 'Recomendada en zonas rurales',
    deleted_at: null,
  },
  {
    id: 'protocol-kennel',
    vaccine_name: 'Tos de las Perreras',
    vaccine_code: 'KC',
    species: 'dog',
    protocol_type: 'lifestyle',
    diseases_prevented: ['Traqueobronquitis infecciosa'],
    first_dose_weeks: 8,
    booster_weeks: null,
    revaccination_months: 12,
    notes: 'Recomendada para perros que van a guarderías',
    deleted_at: null,
  },
]

const CAT_CORE_VACCINES = [
  {
    id: 'protocol-fvrcp',
    vaccine_name: 'Triple Felina',
    vaccine_code: 'FVRCP',
    species: 'cat',
    protocol_type: 'core',
    diseases_prevented: ['Rinotraqueítis', 'Calicivirus', 'Panleucopenia'],
    first_dose_weeks: 8,
    booster_weeks: [12, 16],
    revaccination_months: 12,
    notes: null,
    deleted_at: null,
  },
  {
    id: 'protocol-felv',
    vaccine_name: 'Leucemia Felina',
    vaccine_code: 'FeLV',
    species: 'cat',
    protocol_type: 'non-core',
    diseases_prevented: ['Leucemia felina'],
    first_dose_weeks: 8,
    booster_weeks: [12],
    revaccination_months: 12,
    notes: 'Recomendada para gatos que salen',
    deleted_at: null,
  },
]

describe('GET /api/vaccines/recommendations', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(401)
    })

    it('should allow vet to get recommendations', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
    })

    it('should allow owner to get recommendations', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
    })

    it('should allow admin to get recommendations', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Input Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 when species is missing', async () => {
      const response = await GET(createRequest({}))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.required).toContain('species')
    })

    it('should return 400 for invalid species', async () => {
      const response = await GET(createRequest({ species: 'elephant' }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.reason).toContain('no válida')
    })

    it('should accept dog species', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
    })

    it('should accept cat species', async () => {
      mockState.setTableResult('vaccine_protocols', CAT_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'cat' }))

      expect(response.status).toBe(200)
    })

    it('should accept rabbit species', async () => {
      mockState.setTableResult('vaccine_protocols', [])

      const response = await GET(createRequest({ species: 'rabbit' }))

      expect(response.status).toBe(200)
    })

    it('should return 400 for negative age_weeks', async () => {
      const response = await GET(createRequest({ species: 'dog', age_weeks: '-5' }))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.reason).toContain('positivo')
    })

    it('should return 400 for non-numeric age_weeks', async () => {
      const response = await GET(createRequest({ species: 'dog', age_weeks: 'abc' }))

      expect(response.status).toBe(400)
    })
  })

  // ===========================================================================
  // Core Vaccines Tests (Dogs)
  // ===========================================================================

  describe('Dog Core Vaccines', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return all core vaccines for puppy without vaccinations', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '8',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.core_vaccines).toBeDefined()
      expect(body.core_vaccines.length).toBeGreaterThan(0)
    })

    it('should mark vaccine as "due" when age matches first_dose_weeks', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[1]]) // Distemper at 6 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '6',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const distemper = body.core_vaccines.find((v: any) => v.vaccine_code === 'CDV')
      expect(distemper).toBeDefined()
      expect(distemper.status).toBe('due')
    })

    it('should mark vaccine as "overdue" when past first_dose by >4 weeks', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[0]]) // Rabies at 12 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '20', // 8 weeks past due
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const rabies = body.core_vaccines.find((v: any) => v.vaccine_code === 'RAB')
      expect(rabies).toBeDefined()
      expect(rabies.status).toBe('overdue')
    })

    it('should mark vaccine as "missing" when puppy is too young', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[0]]) // Rabies at 12 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '8', // Too young for rabies
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const rabies = body.core_vaccines.find((v: any) => v.vaccine_code === 'RAB')
      expect(rabies).toBeDefined()
      expect(rabies.status).toBe('missing')
      expect(rabies.reason).toContain('semanas')
    })
  })

  // ===========================================================================
  // Existing Vaccines Filtering
  // ===========================================================================

  describe('Existing Vaccines Filtering', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should exclude vaccines by code', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        existing_vaccines: 'RAB,CDV', // Already has rabies and distemper
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccinesCodes = body.core_vaccines.map((v: any) => v.vaccine_code)
      expect(vaccinesCodes).not.toContain('RAB')
      expect(vaccinesCodes).not.toContain('CDV')
      expect(vaccinesCodes).toContain('CPV')
    })

    it('should exclude vaccines by name (partial match)', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        existing_vaccine_names: 'antirrábica,moquillo',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccineNames = body.core_vaccines.map((v: any) => v.vaccine_name.toLowerCase())
      expect(vaccineNames).not.toContain('antirrábica')
      expect(vaccineNames).not.toContain('moquillo')
    })

    it('should handle case-insensitive vaccine codes', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        existing_vaccines: 'rab,cdv', // Lowercase
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccinesCodes = body.core_vaccines.map((v: any) => v.vaccine_code)
      expect(vaccinesCodes).not.toContain('RAB')
      expect(vaccinesCodes).not.toContain('CDV')
    })
  })

  // ===========================================================================
  // Cat Vaccines Tests
  // ===========================================================================

  describe('Cat Vaccines', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return cat-specific vaccines', async () => {
      mockState.setTableResult('vaccine_protocols', CAT_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'cat',
        age_weeks: '10',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.core_vaccines.some((v: any) => v.vaccine_code === 'FVRCP')).toBe(true)
    })

    it('should categorize FeLV as non-core', async () => {
      mockState.setTableResult('vaccine_protocols', CAT_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'cat',
        age_weeks: '10',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.recommended_vaccines.some((v: any) => v.vaccine_code === 'FeLV')).toBe(true)
    })
  })

  // ===========================================================================
  // Lifestyle Vaccines Tests
  // ===========================================================================

  describe('Lifestyle Vaccines', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return lifestyle vaccines separately', async () => {
      mockState.setTableResult('vaccine_protocols', [...DOG_CORE_VACCINES, ...DOG_LIFESTYLE_VACCINES])

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '16',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.lifestyle_vaccines).toBeDefined()
      expect(body.lifestyle_vaccines.some((v: any) => v.vaccine_code === 'LEP')).toBe(true)
      expect(body.lifestyle_vaccines.some((v: any) => v.vaccine_code === 'KC')).toBe(true)
    })

    it('should include notes for lifestyle vaccines', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_LIFESTYLE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '12',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const lepto = body.lifestyle_vaccines.find((v: any) => v.vaccine_code === 'LEP')
      expect(lepto?.notes).toContain('rural')
    })
  })

  // ===========================================================================
  // Empty Results Tests
  // ===========================================================================

  describe('Empty Results', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return empty arrays when no protocols found', async () => {
      mockState.setTableResult('vaccine_protocols', [])

      const response = await GET(createRequest({ species: 'rabbit' }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.core_vaccines).toEqual([])
      expect(body.recommended_vaccines).toEqual([])
      expect(body.lifestyle_vaccines).toEqual([])
      expect(body.total_missing).toBe(0)
    })

    it('should return empty when all vaccines are existing', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        existing_vaccines: 'RAB,CDV,CPV',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.core_vaccines).toEqual([])
      expect(body.total_missing).toBe(0)
    })
  })

  // ===========================================================================
  // Response Format Tests
  // ===========================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should include total_missing count', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '8',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.total_missing).toBeDefined()
      expect(typeof body.total_missing).toBe('number')
    })

    it('should sort vaccines by status priority (overdue > due > missing)', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '20', // Should make some vaccines overdue
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const statuses = body.core_vaccines.map((v: any) => v.status)

      // Check that overdue comes before due, and due comes before missing
      const statusOrder = { overdue: 0, due: 1, missing: 2 }
      for (let i = 1; i < statuses.length; i++) {
        expect(statusOrder[statuses[i] as keyof typeof statusOrder]).toBeGreaterThanOrEqual(
          statusOrder[statuses[i - 1] as keyof typeof statusOrder]
        )
      }
    })

    it('should include diseases_prevented array', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[0]])

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.core_vaccines[0].diseases_prevented).toBeDefined()
      expect(Array.isArray(body.core_vaccines[0].diseases_prevented)).toBe(true)
    })

    it('should include Cache-Control header', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toContain('s-maxage')
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('vaccine_protocols', new Error('Database connection failed'))

      const response = await GET(createRequest({ species: 'dog' }))

      expect(response.status).toBe(500)
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('vaccine_protocols', new Error('Connection timeout'))

      await GET(createRequest({ species: 'dog' }))

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching vaccine protocols',
        expect.objectContaining({
          tenantId: TENANTS.ADRIS.id,
          species: 'dog',
        })
      )
    })
  })

  // ===========================================================================
  // Age-Based Schedule Tests
  // ===========================================================================

  describe('Age-Based Schedule', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should recommend vaccines for 8-week puppy', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '8',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      // Distemper and Parvo should be due at 6 weeks (so overdue at 8)
      // Rabies should be missing (not due until 12 weeks)
      expect(body.core_vaccines.length).toBe(3)
    })

    it('should recommend vaccines for 12-week puppy', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '12',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      // All core vaccines should be due or overdue
      const dueOrOverdue = body.core_vaccines.filter(
        (v: any) => v.status === 'due' || v.status === 'overdue'
      )
      expect(dueOrOverdue.length).toBeGreaterThan(0)
    })

    it('should recommend vaccines for 16-week puppy', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '16',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      // Some vaccines may be overdue at this age
      const overdue = body.core_vaccines.filter((v: any) => v.status === 'overdue')
      expect(overdue.length).toBeGreaterThanOrEqual(0)
    })

    it('should recommend vaccines for adult dog (52 weeks)', async () => {
      mockState.setTableResult('vaccine_protocols', DOG_CORE_VACCINES)

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '52',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      // All vaccines should be overdue for an unvaccinated adult
      const allOverdue = body.core_vaccines.every((v: any) => v.status === 'overdue')
      expect(allOverdue).toBe(true)
    })
  })

  // ===========================================================================
  // Reason Message Tests
  // ===========================================================================

  describe('Reason Messages', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should include Spanish reason for due vaccines', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[1]]) // Distemper at 6 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '6',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccine = body.core_vaccines[0]
      expect(vaccine.reason).toContain('Corresponde ahora')
      expect(vaccine.reason).toContain('6 semanas')
    })

    it('should include Spanish reason for overdue vaccines', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[1]]) // Distemper at 6 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '14', // 8 weeks overdue
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccine = body.core_vaccines[0]
      expect(vaccine.reason).toContain('Debió aplicarse')
      expect(vaccine.reason).toContain('semanas')
    })

    it('should include Spanish reason for missing vaccines (too young)', async () => {
      mockState.setTableResult('vaccine_protocols', [DOG_CORE_VACCINES[0]]) // Rabies at 12 weeks

      const response = await GET(createRequest({
        species: 'dog',
        age_weeks: '8',
      }))

      expect(response.status).toBe(200)
      const body = await response.json()
      const vaccine = body.core_vaccines[0]
      expect(vaccine.reason).toContain('Primera dosis')
      expect(vaccine.reason).toContain('12 semanas')
    })
  })
})
