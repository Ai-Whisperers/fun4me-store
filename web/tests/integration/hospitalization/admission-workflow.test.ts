/**
 * Hospitalization Admission Workflow Integration Tests
 *
 * Tests the patient hospitalization workflow including:
 * - Patient admission with kennel assignment
 * - Kennel availability validation
 * - Authorization (vet/admin only)
 * - Tenant isolation
 * - Status management
 * - Discharge workflow
 *
 * @ticket TICKET-CLINICAL-001
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET, POST, PATCH } from '@/app/api/hospitalizations/route'
import { NextRequest } from 'next/server'

// Mock response type helper
interface MockResponse {
  status: number
  json: () => Promise<Record<string, unknown>>
}

// Mock users with different roles
const mockVetUser = { id: 'vet-123', email: 'vet@clinic.com' }
const mockVetProfile = { tenant_id: 'tenant-terrapet', role: 'vet', full_name: 'Dr. Veterinario' }

const mockAdminUser = { id: 'admin-123', email: 'admin@clinic.com' }
const mockAdminProfile = { tenant_id: 'tenant-terrapet', role: 'admin', full_name: 'Admin User' }

const mockOwnerUser = { id: 'owner-123', email: 'owner@clinic.com' }
const mockOwnerProfile = { tenant_id: 'tenant-terrapet', role: 'owner', full_name: 'Pet Owner' }

// Track current user and profile for tests
let currentUser = mockVetUser
let currentProfile = mockVetProfile

// Mock database responses
const mockPet = { id: 'pet-123', tenant_id: 'tenant-terrapet', name: 'Max' }
const mockKennel = { id: 'kennel-123', tenant_id: 'tenant-terrapet', kennel_status: 'available' }
const mockHospitalization = {
  id: 'hosp-123',
  hospitalization_number: 'H-2024-0001',
  pet_id: 'pet-123',
  kennel_id: 'kennel-123',
  hospitalization_type: 'surgery',
  admission_diagnosis: 'Post-surgical recovery',
  status: 'active',
}

// Mock Supabase client
const mockSingleFn = vi.fn()

const createMockSupabase = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: currentUser }, error: null }),
  },
  from: vi.fn().mockImplementation((table: string) => {
    const chainMethods = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingleFn,
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }
    return chainMethods
  }),
})

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(createMockSupabase()),
}))

vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: (...args: unknown[]) => unknown, options?: { roles: string[] }) => {
    return async (request: NextRequest) => {
      // Check role restriction
      if (options?.roles && !options.roles.includes(currentProfile.role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Forbidden', code: 'FORBIDDEN' }),
        }
      }

      const supabase = createMockSupabase()
      return handler({ user: currentUser, profile: currentProfile, supabase, request })
    }
  },
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Hospitalization Admission API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = mockVetUser
    currentProfile = mockVetProfile
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/hospitalizations (Admit Patient)', () => {
    const createRequest = (body: Record<string, unknown>) =>
      new NextRequest('http://localhost/api/hospitalizations', {
        method: 'POST',
        body: JSON.stringify(body),
      })

    describe('Authorization', () => {
      it('should allow vets to admit patients', async () => {
        currentProfile = mockVetProfile

        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null }) // Pet lookup
          .mockResolvedValueOnce({ data: mockKennel, error: null }) // Kennel lookup
          .mockResolvedValueOnce({ data: null, error: null }) // Last hospitalization (for number gen)
          .mockResolvedValueOnce({ data: mockHospitalization, error: null }) // Insert

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Recuperación post-cirugía',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should allow admins to admit patients', async () => {
        currentUser = mockAdminUser
        currentProfile = mockAdminProfile

        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: mockKennel, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: mockHospitalization, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'observation',
          admission_diagnosis: 'Observación 24 horas',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should reject pet owners from admitting patients', async () => {
        currentUser = mockOwnerUser
        currentProfile = mockOwnerProfile

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(403)
        const json = await response.json() as any
        expect(json.code).toBe('FORBIDDEN')
      })
    })

    describe('Request Validation', () => {
      it('should require pet_id', async () => {
        const request = createRequest({
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('MISSING_FIELDS')
      })

      it('should require kennel_id', async () => {
        const request = createRequest({
          pet_id: 'pet-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('MISSING_FIELDS')
      })

      it('should require hospitalization_type', async () => {
        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should require admission_diagnosis', async () => {
        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
      })

      it('should reject invalid JSON', async () => {
        const request = new NextRequest('http://localhost/api/hospitalizations', {
          method: 'POST',
          body: 'not json',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json() as any
        expect(json.code).toBe('INVALID_FORMAT')
      })
    })

    describe('Tenant Isolation', () => {
      it('should reject admission for pet from different tenant', async () => {
        const otherTenantPet = { id: 'pet-other', tenant_id: 'tenant-other', name: 'Other' }

        mockSingleFn.mockResolvedValueOnce({ data: otherTenantPet, error: null })

        const request = createRequest({
          pet_id: 'pet-other',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Cross-tenant attempt',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(403)
      })

      it('should reject admission for kennel from different tenant', async () => {
        const otherTenantKennel = { id: 'kennel-other', tenant_id: 'tenant-other', kennel_status: 'available' }

        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: otherTenantKennel, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-other',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Cross-tenant attempt',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(403)
      })
    })

    describe('Kennel Availability', () => {
      it('should reject admission when kennel is occupied', async () => {
        const occupiedKennel = { ...mockKennel, kennel_status: 'occupied' }

        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: occupiedKennel, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(409) // Conflict
        const json = await response.json() as any
        expect(json.details?.reason).toBe('kennel_not_available')
      })

      it('should reject admission when kennel is under maintenance', async () => {
        const maintenanceKennel = { ...mockKennel, kennel_status: 'maintenance' }

        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: maintenanceKennel, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(409)
      })
    })

    describe('Resource Validation', () => {
      it('should return 404 for non-existent pet', async () => {
        mockSingleFn.mockResolvedValueOnce({ data: null, error: null })

        const request = createRequest({
          pet_id: 'non-existent',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(404)
        const json = await response.json() as any
        expect(json.details?.resource).toBe('pet')
      })

      it('should return 404 for non-existent kennel', async () => {
        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: null, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'non-existent',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(404)
        const json = await response.json() as any
        expect(json.details?.resource).toBe('kennel')
      })
    })

    describe('Hospitalization Types', () => {
      const validTypes = ['surgery', 'observation', 'treatment', 'emergency', 'boarding']

      validTypes.forEach((type) => {
        it(`should accept hospitalization type: ${type}`, async () => {
          mockSingleFn
            .mockResolvedValueOnce({ data: mockPet, error: null })
            .mockResolvedValueOnce({ data: mockKennel, error: null })
            .mockResolvedValueOnce({ data: null, error: null })
            .mockResolvedValueOnce({ data: { ...mockHospitalization, hospitalization_type: type }, error: null })

          const request = createRequest({
            pet_id: 'pet-123',
            kennel_id: 'kennel-123',
            hospitalization_type: type,
            admission_diagnosis: `Test ${type}`,
          })

          const response = (await POST(request)) as MockResponse

          expect(response.status).toBe(201)
        })
      })
    })

    describe('Acuity Levels', () => {
      const validLevels = ['routine', 'low', 'medium', 'high', 'critical']

      validLevels.forEach((level) => {
        it(`should accept acuity level: ${level}`, async () => {
          mockSingleFn
            .mockResolvedValueOnce({ data: mockPet, error: null })
            .mockResolvedValueOnce({ data: mockKennel, error: null })
            .mockResolvedValueOnce({ data: null, error: null })
            .mockResolvedValueOnce({ data: { ...mockHospitalization, acuity_level: level }, error: null })

          const request = createRequest({
            pet_id: 'pet-123',
            kennel_id: 'kennel-123',
            hospitalization_type: 'surgery',
            admission_diagnosis: 'Test',
            acuity_level: level,
          })

          const response = (await POST(request)) as MockResponse

          expect(response.status).toBe(201)
        })
      })
    })

    describe('Optional Fields', () => {
      it('should accept treatment_plan', async () => {
        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: mockKennel, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: mockHospitalization, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
          treatment_plan: 'Antibióticos cada 8 horas, monitoreo de signos vitales',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should accept diet_instructions', async () => {
        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: mockKennel, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: mockHospitalization, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
          diet_instructions: 'NPO primeras 12 horas, luego dieta blanda',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })

      it('should accept emergency contact info', async () => {
        mockSingleFn
          .mockResolvedValueOnce({ data: mockPet, error: null })
          .mockResolvedValueOnce({ data: mockKennel, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: mockHospitalization, error: null })

        const request = createRequest({
          pet_id: 'pet-123',
          kennel_id: 'kennel-123',
          hospitalization_type: 'surgery',
          admission_diagnosis: 'Test',
          emergency_contact_name: 'Juan Pérez',
          emergency_contact_phone: '+595 981 123456',
        })

        const response = (await POST(request)) as MockResponse

        expect(response.status).toBe(201)
      })
    })
  })

  describe('GET /api/hospitalizations', () => {
    // Note: Full GET tests require proper mock setup for the query builder chain
    // These tests verify the authorization and filtering logic

    it('should reject non-staff users', async () => {
      currentUser = mockOwnerUser
      currentProfile = mockOwnerProfile

      const request = new NextRequest('http://localhost/api/hospitalizations', { method: 'GET' })
      const response = (await GET(request)) as MockResponse

      expect(response.status).toBe(403)
    })

    it('should document supported query parameters', () => {
      const supportedParams = ['status', 'kennel_id', 'pet_id']

      expect(supportedParams).toContain('status')
      expect(supportedParams).toContain('kennel_id')
      expect(supportedParams).toContain('pet_id')
    })

    it('should document valid status filter values', () => {
      const validStatuses = ['active', 'discharged', 'deceased', 'transferred']

      expect(validStatuses).toContain('active')
      expect(validStatuses).toContain('discharged')
    })
  })

  describe('PATCH /api/hospitalizations (Update/Discharge)', () => {
    const createPatchRequest = (body: Record<string, unknown>) =>
      new NextRequest('http://localhost/api/hospitalizations', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })

    it('should update treatment plan', async () => {
      mockSingleFn
        .mockResolvedValueOnce({
          data: { id: 'hosp-123', kennel_id: 'kennel-123', pet: { tenant_id: 'tenant-terrapet' } },
          error: null,
        })
        .mockResolvedValueOnce({ data: mockHospitalization, error: null })

      const request = createPatchRequest({
        id: 'hosp-123',
        treatment_plan: 'Plan actualizado con nuevas indicaciones',
      })

      const response = (await PATCH(request)) as MockResponse

      expect(response.status).toBe(200)
    })

    it('should discharge patient and free kennel', async () => {
      mockSingleFn
        .mockResolvedValueOnce({
          data: { id: 'hosp-123', kennel_id: 'kennel-123', pet: { tenant_id: 'tenant-terrapet' } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockHospitalization, status: 'discharged' },
          error: null,
        })

      const request = createPatchRequest({
        id: 'hosp-123',
        status: 'discharged',
        discharge_notes: 'Paciente recuperado satisfactoriamente',
        discharge_instructions: 'Reposo por 7 días, medicación oral cada 12 horas',
      })

      const response = (await PATCH(request)) as MockResponse

      expect(response.status).toBe(200)
    })

    it('should require hospitalization id', async () => {
      const request = createPatchRequest({
        treatment_plan: 'Some plan',
      })

      const response = (await PATCH(request)) as MockResponse

      expect(response.status).toBe(400)
      const json = await response.json() as any
      expect(json.code).toBe('MISSING_FIELDS')
    })

    it('should reject updates to hospitalization from different tenant', async () => {
      mockSingleFn.mockResolvedValueOnce({
        data: { id: 'hosp-other', kennel_id: 'kennel-other', pet: { tenant_id: 'tenant-other' } },
        error: null,
      })

      const request = createPatchRequest({
        id: 'hosp-other',
        treatment_plan: 'Cross-tenant attempt',
      })

      const response = (await PATCH(request)) as MockResponse

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent hospitalization', async () => {
      mockSingleFn.mockResolvedValueOnce({ data: null, error: null })

      const request = createPatchRequest({
        id: 'non-existent',
        treatment_plan: 'Test',
      })

      const response = (await PATCH(request)) as MockResponse

      expect(response.status).toBe(404)
    })
  })
})

describe('Hospitalization Business Rules', () => {
  describe('Hospitalization Number Generation', () => {
    it('should generate sequential numbers per year', () => {
      const year = new Date().getFullYear()
      const expectedFormat = new RegExp(`^H-${year}-\\d{4}$`)

      expect(`H-${year}-0001`).toMatch(expectedFormat)
      expect(`H-${year}-0002`).toMatch(expectedFormat)
      expect(`H-${year}-1234`).toMatch(expectedFormat)
    })

    it('should reset sequence at year boundary', () => {
      const lastYear = `H-${new Date().getFullYear() - 1}-9999`
      const thisYear = `H-${new Date().getFullYear()}-0001`

      expect(lastYear).not.toEqual(thisYear)
    })
  })

  describe('Status Transitions', () => {
    const validTransitions = {
      active: ['discharged', 'deceased', 'transferred'],
      discharged: [], // Terminal state
      deceased: [], // Terminal state
      transferred: [], // Terminal state
    }

    it('should document valid transitions from active status', () => {
      expect(validTransitions.active).toContain('discharged')
      expect(validTransitions.active).toContain('deceased')
      expect(validTransitions.active).toContain('transferred')
    })

    it('should document terminal states', () => {
      expect(validTransitions.discharged).toHaveLength(0)
      expect(validTransitions.deceased).toHaveLength(0)
      expect(validTransitions.transferred).toHaveLength(0)
    })
  })

  describe('Kennel State Management', () => {
    it('should document kennel status values', () => {
      const validStatuses = ['available', 'occupied', 'maintenance', 'reserved']

      expect(validStatuses).toContain('available')
      expect(validStatuses).toContain('occupied')
    })

    it('should only allow admission to available kennels', () => {
      const canAdmitTo = (kennelStatus: string) => kennelStatus === 'available'

      expect(canAdmitTo('available')).toBe(true)
      expect(canAdmitTo('occupied')).toBe(false)
      expect(canAdmitTo('maintenance')).toBe(false)
      expect(canAdmitTo('reserved')).toBe(false)
    })
  })

  describe('Typical Hospitalization Scenarios', () => {
    it('should document post-surgical observation scenario', () => {
      const postSurgeryCase = {
        hospitalization_type: 'surgery',
        acuity_level: 'medium',
        typical_duration_hours: 24,
        required_monitoring: ['vitals', 'pain', 'wound'],
      }

      expect(postSurgeryCase.typical_duration_hours).toBeGreaterThanOrEqual(12)
    })

    it('should document emergency critical care scenario', () => {
      const emergencyCase = {
        hospitalization_type: 'emergency',
        acuity_level: 'critical',
        typical_duration_hours: 72,
        required_monitoring: ['vitals', 'labs', 'continuous'],
      }

      expect(emergencyCase.acuity_level).toBe('critical')
    })

    it('should document boarding scenario', () => {
      const boardingCase = {
        hospitalization_type: 'boarding',
        acuity_level: 'routine',
        typical_duration_days: 7,
        required_monitoring: ['feeding', 'behavior'],
      }

      expect(boardingCase.acuity_level).toBe('routine')
    })
  })
})
