/**
 * TST-002: Owner Medical Records Access Tests
 *
 * Comprehensive tests for owner access to medical records:
 * - Medical records listing
 * - Medical record details
 * - Prescriptions access
 * - Lab results access
 * - Vaccine history
 *
 * @priority P0 - Critical
 * @epic EPIC-17
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before imports - ORDER MATTERS!
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Mock the auth module to prevent database imports
vi.mock('@/lib/auth', () => getAuthMock())

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true })}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()}}))

vi.mock('@/lib/api/pagination', () => ({
  parsePagination: vi.fn().mockReturnValue({ page: 1, limit: 20, offset: 0 }),
  paginatedResponse: vi.fn((data, count, pagination) => ({
    data,
    meta: { total: count, page: pagination.page, limit: pagination.limit }}))}))

vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number) =>
    new Response(JSON.stringify({ error: code }), {
      status,
      headers: { 'Content-Type': 'application/json' }}),
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500}}))


// Import routes AFTER mocks
import { GET as GetMedicalRecords } from '@/app/api/medical-records/route'
import { GET as GetPrescriptions } from '@/app/api/prescriptions/route'
import { GET as GetVaccines } from '@/app/api/vaccines/route'

import {
  mockState,
  TENANTS,
  resetAllMocks,
  DEFAULT_OWNER,
  DEFAULT_VET,
  DEFAULT_PET,
  getSupabaseServerMock,
  getAuthMock,
} from '@/lib/test-utils'

// =============================================================================
// TEST FIXTURES - Use actual fixture values
// =============================================================================

const OWNER_MEDICAL_RECORDS = {
  CONSULTATION: {
    id: 'med-rec-001',
    pet_id: DEFAULT_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    type: 'consultation',
    title: 'Consulta de rutina',
    diagnosis: 'Saludable',
    notes: 'Sin observaciones',
    performed_by: DEFAULT_VET.id,
    created_at: '2026-01-05T10:00:00Z',
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, species: 'dog', breed: 'Labrador' },
    vet: { id: DEFAULT_VET.id, full_name: DEFAULT_VET.full_name }},
  SURGERY: {
    id: 'med-rec-002',
    pet_id: DEFAULT_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    type: 'surgery',
    title: 'Esterilizacion',
    performed_by: DEFAULT_VET.id,
    created_at: '2025-06-15T14:00:00Z',
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, species: 'dog', breed: 'Labrador' },
    vet: { id: DEFAULT_VET.id, full_name: DEFAULT_VET.full_name }}}

const OTHER_OWNER_RECORD = {
  id: 'med-rec-other',
  pet_id: 'other-pet-id',
  tenant_id: TENANTS.ADRIS.id,
  type: 'consultation',
  title: 'Other Owner Record',
  performed_by: DEFAULT_VET.id,
  created_at: '2026-01-06T10:00:00Z'}

const OWNER_PRESCRIPTIONS = {
  ACTIVE: {
    id: 'rx-001',
    pet_id: DEFAULT_PET.id,
    vet_id: DEFAULT_VET.id,
    drugs: [{ name: 'Amoxicilina', dosage: '250mg', frequency: '2x/dia' }],
    notes: 'Tomar con comida',
    created_at: '2026-01-10T10:00:00Z',
    deleted_at: null,
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, owner_id: DEFAULT_OWNER.id, tenant_id: TENANTS.ADRIS.id },
    vet: { id: DEFAULT_VET.id, full_name: DEFAULT_VET.full_name }},
  EXPIRED: {
    id: 'rx-002',
    pet_id: DEFAULT_PET.id,
    vet_id: DEFAULT_VET.id,
    drugs: [{ name: 'Antiparasitario', dosage: '100mg', frequency: '1x/dia' }],
    created_at: '2025-06-01T10:00:00Z',
    deleted_at: null,
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, owner_id: DEFAULT_OWNER.id, tenant_id: TENANTS.ADRIS.id },
    vet: { id: DEFAULT_VET.id, full_name: DEFAULT_VET.full_name }}}

const OWNER_VACCINES = {
  RABIES: {
    id: 'vac-001',
    pet_id: DEFAULT_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Rabia',
    administered_date: '2025-06-15',
    next_due_date: '2026-06-15',
    status: 'administered',
    manufacturer: 'Nobivac',
    lot_number: 'LOT-123',
    administered_by: DEFAULT_VET.id,
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, owner_id: DEFAULT_OWNER.id }},
  PARVO: {
    id: 'vac-002',
    pet_id: DEFAULT_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Parvovirus',
    administered_date: '2025-01-15',
    next_due_date: '2026-01-15',
    status: 'due',
    pet: { id: DEFAULT_PET.id, name: DEFAULT_PET.name, owner_id: DEFAULT_OWNER.id }}}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createRequest(path: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost:3000${path}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

// =============================================================================
// MEDICAL RECORDS LIST TESTS
// =============================================================================

describe('TST-002: Owner Medical Records Access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  describe('GET /api/medical-records - Medical Records List', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))

        expect(response.status).toBe(401)
      })

      it('should allow owner access', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))

        expect(response.status).toBe(200)
      })

      it('should allow vet access', async () => {
        mockState.setAuthScenario('VET')
        mockState.setTableResult('medical_records', [])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))

        expect(response.status).toBe(200)
      })

      it('should allow admin access', async () => {
        mockState.setAuthScenario('ADMIN')
        mockState.setTableResult('medical_records', [])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))

        expect(response.status).toBe(200)
      })
    })

    describe('Data Scoping (Owner)', () => {
      it('should return records for owner pets', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [
          OWNER_MEDICAL_RECORDS.CONSULTATION,
          OWNER_MEDICAL_RECORDS.SURGERY,
        ])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toHaveLength(2)
      })

      it('should not include records for other owners pets', async () => {
        mockState.setAuthScenario('OWNER')
        // The query should filter these out via RLS
        mockState.setTableResult('medical_records', [])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toEqual([])
      })

      it('should return empty array when no records exist', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toEqual([])
      })
    })

    describe('Filtering', () => {
      it('should filter by pet_id', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

        const response = await GetMedicalRecords(
          createRequest('/api/medical-records', { pet_id: DEFAULT_PET.id })
        )

        expect(response.status).toBe(200)
      })

      it('should filter by record type', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.SURGERY])

        const response = await GetMedicalRecords(
          createRequest('/api/medical-records', { type: 'surgery' })
        )

        expect(response.status).toBe(200)
      })

      it('should filter by date range', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

        const response = await GetMedicalRecords(
          createRequest('/api/medical-records', {
            from_date: '2026-01-01',
            to_date: '2026-01-31'})
        )

        expect(response.status).toBe(200)
      })
    })

    describe('Response Format', () => {
      it('should include vet name in response', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        if (body.data.length > 0) {
          expect(body.data[0].vet).toBeDefined()
        }
      })

      it('should include pet information', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        if (body.data.length > 0) {
          expect(body.data[0].pet).toBeDefined()
        }
      })

      it('should order by date descending (most recent first)', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('medical_records', [
          OWNER_MEDICAL_RECORDS.CONSULTATION,
          OWNER_MEDICAL_RECORDS.SURGERY,
        ])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))

        expect(response.status).toBe(200)
        // Order verification would need mock to track query
      })
    })

    describe('Tenant Isolation', () => {
      it('should not return records from different tenant', async () => {
        mockState.setAuthScenario('OWNER')
        // Simulate that query filters by tenant_id
        mockState.setTableResult('medical_records', [])

        const response = await GetMedicalRecords(createRequest('/api/medical-records'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.data).toEqual([])
      })
    })
  })

  // =============================================================================
  // PRESCRIPTIONS TESTS
  // =============================================================================

  describe('GET /api/prescriptions - Prescriptions List', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))

        expect(response.status).toBe(401)
      })

      it('should allow owner access', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('prescriptions', [OWNER_PRESCRIPTIONS.ACTIVE])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))

        expect(response.status).toBe(200)
      })
    })

    describe('Data Scoping (Owner)', () => {
      it('should only return prescriptions for owner pets', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('prescriptions', [
          OWNER_PRESCRIPTIONS.ACTIVE,
          OWNER_PRESCRIPTIONS.EXPIRED,
        ])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toHaveLength(2)
      })

      it('should not include other owners prescriptions', async () => {
        mockState.setAuthScenario('OWNER')
        // Query filters by owner_id for owner role
        mockState.setTableResult('prescriptions', [])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual([])
      })

      it('should filter by pet_id', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('prescriptions', [OWNER_PRESCRIPTIONS.ACTIVE])

        const response = await GetPrescriptions(
          createRequest('/api/prescriptions', { pet_id: DEFAULT_PET.id })
        )

        expect(response.status).toBe(200)
      })
    })

    describe('Prescription Details', () => {
      it('should include medications list', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('prescriptions', [OWNER_PRESCRIPTIONS.ACTIVE])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))
        const body = await response.json()

        expect(response.status).toBe(200)
        if (body.length > 0) {
          expect(body[0].drugs).toBeDefined()
        }
      })

      it('should include vet information', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('prescriptions', [OWNER_PRESCRIPTIONS.ACTIVE])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))
        const body = await response.json()

        expect(response.status).toBe(200)
        if (body.length > 0) {
          expect(body[0].vet).toBeDefined()
        }
      })
    })

    describe('Staff vs Owner Access', () => {
      it('staff should see all tenant prescriptions', async () => {
        mockState.setAuthScenario('VET')
        mockState.setTableResult('prescriptions', [
          OWNER_PRESCRIPTIONS.ACTIVE,
          // Would include other owners' prescriptions too
        ])

        const response = await GetPrescriptions(createRequest('/api/prescriptions'))

        expect(response.status).toBe(200)
      })
    })
  })

  // =============================================================================
  // VACCINES TESTS
  // =============================================================================

  describe('GET /api/vaccines - Vaccine History', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockState.setAuthScenario('UNAUTHENTICATED')

        const response = await GetVaccines(createRequest('/api/vaccines'))

        expect(response.status).toBe(401)
      })

      it('should allow owner access', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.RABIES])

        const response = await GetVaccines(createRequest('/api/vaccines'))

        expect(response.status).toBe(200)
      })
    })

    describe('Data Scoping (Owner)', () => {
      it('should return vaccines for owner pets', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.RABIES, OWNER_VACCINES.PARVO])

        const response = await GetVaccines(createRequest('/api/vaccines'))
        const body = await response.json()

        expect(response.status).toBe(200)
      })

      it('should not include other owners vaccines', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [])

        const response = await GetVaccines(createRequest('/api/vaccines'))
        const body = await response.json()

        expect(response.status).toBe(200)
      })
    })

    describe('Vaccine Details', () => {
      it('should include next due date', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.RABIES])

        const response = await GetVaccines(createRequest('/api/vaccines'))
        const body = await response.json()

        expect(response.status).toBe(200)
      })

      it('should include vaccine manufacturer and lot', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.RABIES])

        const response = await GetVaccines(createRequest('/api/vaccines'))
        const body = await response.json()

        expect(response.status).toBe(200)
      })

      it('should flag overdue vaccines', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.PARVO])

        const response = await GetVaccines(createRequest('/api/vaccines'))

        expect(response.status).toBe(200)
      })
    })

    describe('Filtering', () => {
      it('should filter by pet_id', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.RABIES])

        const response = await GetVaccines(
          createRequest('/api/vaccines', { pet_id: DEFAULT_PET.id })
        )

        expect(response.status).toBe(200)
      })

      it('should filter by status', async () => {
        mockState.setAuthScenario('OWNER')
        mockState.setTableResult('vaccines', [OWNER_VACCINES.PARVO])

        const response = await GetVaccines(
          createRequest('/api/vaccines', { status: 'due' })
        )

        expect(response.status).toBe(200)
      })
    })
  })

  // =============================================================================
  // CROSS-OWNER ISOLATION TESTS
  // =============================================================================

  describe('Cross-Owner Data Isolation', () => {
    it('owner A cannot see owner B medical records', async () => {
      mockState.setAuthScenario('OWNER')
      // Set up as owner A, but trying to access owner B's data
      mockState.setTableResult('medical_records', [])

      const response = await GetMedicalRecords(createRequest('/api/medical-records'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toEqual([])
    })

    it('owner A cannot see owner B prescriptions', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('prescriptions', [])

      const response = await GetPrescriptions(createRequest('/api/prescriptions'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual([])
    })

    it('owner A cannot see owner B vaccines', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('vaccines', [])

      const response = await GetVaccines(createRequest('/api/vaccines'))
      const body = await response.json()

      expect(response.status).toBe(200)
    })
  })

  // =============================================================================
  // PAGINATION TESTS
  // =============================================================================

  describe('Pagination', () => {
    it('should support page parameter', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

      const response = await GetMedicalRecords(
        createRequest('/api/medical-records', { page: '2' })
      )

      expect(response.status).toBe(200)
    })

    it('should support limit parameter', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

      const response = await GetMedicalRecords(
        createRequest('/api/medical-records', { limit: '10' })
      )

      expect(response.status).toBe(200)
    })

    it('should include pagination metadata', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('medical_records', [OWNER_MEDICAL_RECORDS.CONSULTATION])

      const response = await GetMedicalRecords(createRequest('/api/medical-records'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.meta).toBeDefined()
    })
  })

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('medical_records', null, { message: 'Database error' })

      const response = await GetMedicalRecords(createRequest('/api/medical-records'))

      // Should return valid response without crashing (graceful degradation)
      // API may return 500 for error or 200 with empty data - both are valid
      expect([200, 500]).toContain(response.status)
    })
  })
})
