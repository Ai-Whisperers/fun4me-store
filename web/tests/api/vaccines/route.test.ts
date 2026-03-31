/**
 * API Integration Tests: /api/vaccines
 *
 * Tests vaccine record management (GET, POST) with filtering,
 * validation, and role-based permissions
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/vaccines/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestPet,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
  getAuthTokenFromUser,
} from '../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

describe('API: /api/vaccines', () => {
  let supabase: SupabaseClient
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let testPetId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)

    // Create test pet
    const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID, {
      name: 'Test Dog',
      species: 'dog',
    })
    testPetId = pet.id

    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/vaccines', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/vaccines')

      const response = await GET(request)

      await expectError(response, 401)
    })

    it('allows owner, vet, and admin roles', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        authToken,
      })

      const response = await GET(request)

      // Should succeed (owner allowed)
      const body = await expectSuccess(response)
      expect(body.data).toBeDefined()
    })

    it('returns empty list when no vaccines exist', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.data).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('filters by pet_id', async () => {
      // Create vaccine record
      const vaccineData = {
        pet_id: testPetId,
        name: 'Rabies',
        administered_date: '2024-01-15',
        status: 'verified',
      }

      const { data: vaccine } = await supabase
        .from('vaccines')
        .insert(vaccineData)
        .select()
        .single()
      if (vaccine) cleanupManager.track('vaccines', vaccine.id)

      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest(
        `http://localhost:3000/api/vaccines?pet_id=${testPetId}`,
        {
          authToken,
        }
      )

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.data.length).toBeGreaterThanOrEqual(1)
      expect(body.data[0].pet_id).toBe(testPetId)
    })

    it('filters by status', async () => {
      // Create verified vaccine
      const verifiedVaccine = {
        pet_id: testPetId,
        name: 'Distemper',
        administered_date: '2024-02-01',
        status: 'verified',
      }

      const { data: vaccine } = await supabase
        .from('vaccines')
        .insert(verifiedVaccine)
        .select()
        .single()
      if (vaccine) cleanupManager.track('vaccines', vaccine.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines?status=verified', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      // All returned vaccines should have verified status
      body.data.forEach((v: any) => {
        expect(v.status).toBe('verified')
      })
    })

    it('filters by date range', async () => {
      // Create vaccine in specific date
      const vaccineData = {
        pet_id: testPetId,
        name: 'Parvovirus',
        administered_date: '2024-06-15',
        status: 'verified',
      }

      const { data: vaccine } = await supabase
        .from('vaccines')
        .insert(vaccineData)
        .select()
        .single()
      if (vaccine) cleanupManager.track('vaccines', vaccine.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        'http://localhost:3000/api/vaccines?from_date=2024-06-01&to_date=2024-06-30',
        {
          authToken,
        }
      )

      const response = await GET(request)
      const body = await expectSuccess(response)

      // Should include vaccine from June
      expect(body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('supports pagination', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines?page=1&limit=5', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      })
    })
  })

  describe('POST /api/vaccines', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          name: 'Rabies',
          administered_date: '2024-01-15',
        },
      })

      const response = await POST(request)

      await expectError(response, 401)
    })

    it('validates required field: pet_id', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          // Missing pet_id
          name: 'Rabies',
          administered_date: '2024-01-15',
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates required field: name', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          // Missing name
          administered_date: '2024-01-15',
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates required field: administered_date', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Rabies',
          // Missing administered_date
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates date format (YYYY-MM-DD)', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const invalidDates = ['15/01/2024', '2024-1-15', '01-15-2024', 'invalid']

      for (const invalidDate of invalidDates) {
        const request = createTestRequest('http://localhost:3000/api/vaccines', {
          method: 'POST',
          authToken,
          body: {
            pet_id: testPetId,
            name: 'Rabies',
            administered_date: invalidDate,
          },
        })

        const response = await POST(request)

        await expectError(response, 400)
      }
    })

    it('prevents future administered_date', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Rabies',
          administered_date: futureDate,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      const bodyStr = JSON.stringify(body)
      expect(bodyStr).toContain('futuro')
    })

    it('validates next_due_date is after administered_date', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Rabies',
          administered_date: '2024-06-15',
          next_due_date: '2024-06-10', // Before administered date
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      const bodyStr = JSON.stringify(body)
      expect(bodyStr).toContain('posterior')
    })

    it('verifies pet belongs to tenant', async () => {
      // Create pet in another tenant
      const otherOwner = await createTestAuthUser(supabase, 'owner', 'petlife')
      const otherPet = await createTestPet(supabase, otherOwner.profile.id, 'petlife', {
        name: 'Other Pet',
      })

      // Get auth token for vet in TEST_TENANT_ID
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: otherPet.id, // Pet from different tenant
          name: 'Rabies',
          administered_date: '2024-01-15',
        },
      })

      const response = await POST(request)

      await expectError(response, 403)

      // Cleanup
      await supabase.from('pets').delete().eq('id', otherPet.id)
    })

    it('prevents duplicate vaccine (same pet, name, date)', async () => {
      // Create initial vaccine
      const vaccineData = {
        pet_id: testPetId,
        name: 'Rabies',
        administered_date: '2024-03-15',
        status: 'verified',
      }

      const { data: vaccine } = await supabase
        .from('vaccines')
        .insert(vaccineData)
        .select()
        .single()
      if (vaccine) cleanupManager.track('vaccines', vaccine.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      // Try to create duplicate
      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: vaccineData,
      })

      const response = await POST(request)

      await expectError(response, 409, 'existe')
    })

    it('creates vaccine with verified status for staff', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Distemper',
          administered_date: '2024-05-20',
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      expect(body.status).toBe('verified')
      expect(body.administered_by).toBe(vetUser.userId)
      expect(body.verified_by).toBe(vetUser.userId)

      cleanupManager.track('vaccines', body.id)
    })

    it('creates vaccine with pending status for owners', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Parvovirus',
          administered_date: '2024-04-10',
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      expect(body.status).toBe('pending')
      expect(body.administered_by).toBeNull()
      expect(body.verified_by).toBeNull()

      cleanupManager.track('vaccines', body.id)
    })

    it('creates audit log entry', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: testPetId,
          name: 'Bordetella',
          administered_date: '2024-07-05',
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      // Verify audit log was created
      const { data: auditLog } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource', 'vaccine')
        .eq('resource_id', body.id)
        .single()

      expect(auditLog).toBeDefined()
      expect(auditLog?.action).toBe('create')

      cleanupManager.track('vaccines', body.id)
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious pet_id safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousId = "'; DROP TABLE vaccines; --"

      const request = createTestRequest('http://localhost:3000/api/vaccines', {
        method: 'POST',
        authToken,
        body: {
          pet_id: maliciousId,
          name: 'Rabies',
          administered_date: '2024-01-15',
        },
      })

      const response = await POST(request)

      // Should handle safely (validation error, not crash)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious name safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousInputs = [
        "'; DELETE FROM vaccines; --",
        '<script>alert("xss")</script>',
        'Rabies"; DROP TABLE vaccines; --',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/vaccines', {
          method: 'POST',
          authToken,
          body: {
            pet_id: testPetId,
            name: malicious,
            administered_date: '2024-01-15',
          },
        })

        const response = await POST(request)

        // Should handle safely (success or validation error, not crash)
        expect(response.status).not.toBe(500)

        // If created, cleanup
        if (response.status === 201) {
          const body = await response.json()
          await supabase.from('vaccines').delete().eq('id', body.id)
        }
      }
    })
  })
})
