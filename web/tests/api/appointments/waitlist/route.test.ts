import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  getAuthTokenFromUser,
  createTestPet,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { GET, POST } from '@/app/api/appointments/waitlist/route'
import { TENANT_IDS } from '@/lib/constants/tenants';

describe('API: /api/appointments/waitlist', () => {
  let supabase: SupabaseClient
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let adminUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create users with different roles
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/appointments/waitlist', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist')

      const response = await GET(request)
      await expectError(response, 401)
    })

    it('returns empty waitlist when no entries exist', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('waitlist')
      expect(Array.isArray(data.waitlist)).toBe(true)
    })

    it('staff can see all waitlist entries', async () => {
      // Create pet and service for testing
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      // Create waitlist entry
      const { data: waitlistEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (waitlistEntry) {
        cleanupManager.track('appointment_waitlists', waitlistEntry.id)
      }

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.waitlist.length).toBeGreaterThan(0)
      expect(data.waitlist.some((entry: any) => entry.id === waitlistEntry?.id)).toBe(true)
    })

    it('owners only see their own pets waitlist entries', async () => {
      // Create pet for owner
      const ownerPet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', ownerPet.id)

      // Create pet for different owner
      const otherOwner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
      const otherPet = await createTestPet(supabase, otherOwner.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', otherPet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      // Create waitlist entries for both pets
      const { data: ownerEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: ownerPet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (ownerEntry) {
        cleanupManager.track('appointment_waitlists', ownerEntry.id)
      }

      const { data: otherEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: otherPet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: otherOwner.userId,
        })
        .select()
        .single()

      if (otherEntry) {
        cleanupManager.track('appointment_waitlists', otherEntry.id)
      }

      // Owner should only see their own pet's entry
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should only see owner's pet entry
      expect(data.waitlist.some((entry: any) => entry.id === ownerEntry?.id)).toBe(true)
      expect(data.waitlist.some((entry: any) => entry.id === otherEntry?.id)).toBe(false)
    })

    it('filters by status parameter', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      // Create entries with different statuses
      const { data: waitingEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (waitingEntry) {
        cleanupManager.track('appointment_waitlists', waitingEntry.id)
      }

      const { data: fulfilledEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-02',
          status: 'fulfilled',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (fulfilledEntry) {
        cleanupManager.track('appointment_waitlists', fulfilledEntry.id)
      }

      const authToken = await getAuthTokenFromUser(vetUser)

      // Filter by waiting status
      const request = createTestRequest(
        'http://localhost:3000/api/appointments/waitlist?status=waiting',
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should only return waiting entries
      expect(data.waitlist.every((entry: any) => entry.status === 'waiting')).toBe(true)
    })

    it('filters by date parameter', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const targetDate = '2026-03-15'

      const { data: entry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: targetDate,
          status: 'waiting',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (entry) {
        cleanupManager.track('appointment_waitlists', entry.id)
      }

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/waitlist?date=${targetDate}`,
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.waitlist.every((entry: any) => entry.preferred_date === targetDate)).toBe(true)
    })

    it('filters by pet_id parameter', async () => {
      const pet1 = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet1.id)

      const pet2 = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet2.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      // Create entries for both pets
      for (const pet of [pet1, pet2]) {
        const { data: entry } = await supabase
          .from('appointment_waitlists')
          .insert({
            tenant_id: TEST_TENANT_ID,
            pet_id: pet.id,
            service_id: service?.id,
            preferred_date: '2026-02-01',
            status: 'waiting',
            created_by: ownerUser.userId,
          })
          .select()
          .single()

        if (entry) {
          cleanupManager.track('appointment_waitlists', entry.id)
        }
      }

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/waitlist?pet_id=${pet1.id}`,
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should only return entries for specified pet
      expect(data.waitlist.every((entry: any) => entry.pet_id === pet1.id)).toBe(true)
    })

    it('enforces tenant isolation', async () => {
      // Create waitlist entry for different tenant
      const otherPet = await createTestPet(supabase, vetUser.profile.id, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const { data: otherEntry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          pet_id: otherPet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: vetUser.userId,
        })
        .select()
        .single()

      if (otherEntry) {
        cleanupManager.track('appointment_waitlists', otherEntry.id)
      }

      // Current tenant user shouldn't see other tenant's entries
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should not include the other tenant's entry
      expect(data.waitlist.some((entry: any) => entry.id === otherEntry?.id)).toBe(false)
    })
  })

  describe('POST /api/appointments/waitlist', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)
      await expectError(response, 401)
    })

    it('validates required fields', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {},
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('validates UUID format for pet_id', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: 'invalid-uuid',
          service_id: '00000000-0000-0000-0000-000000000000',
          preferred_date: '2026-02-01',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates date format (YYYY-MM-DD)', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          service_id: '00000000-0000-0000-0000-000000000000',
          preferred_date: '01/02/2026', // Wrong format
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates time format (HH:MM)', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          service_id: '00000000-0000-0000-0000-000000000000',
          preferred_date: '2026-02-01',
          preferred_time_start: '9:30 AM', // Wrong format
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent pet', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: '00000000-0000-0000-0000-000000000000',
          service_id: service?.id,
          preferred_date: '2026-02-01',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('owner cannot add other owners pets to waitlist', async () => {
      // Create pet for different owner
      const otherOwner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
      const otherPet = await createTestPet(supabase, otherOwner.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', otherPet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: otherPet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('staff can add any pet to waitlist', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.message).toContain('lista de espera')
      expect(data.waitlistEntry).toBeDefined()
      expect(data.waitlistEntry.pet_id).toBe(pet.id)

      if (data.waitlistEntry) {
        cleanupManager.track('appointment_waitlists', data.waitlistEntry.id)
      }
    })

    it('prevents duplicate waitlist entries (same pet, service, date)', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      // Create first entry
      const { data: entry } = await supabase
        .from('appointment_waitlists')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
          status: 'waiting',
          created_by: ownerUser.userId,
        })
        .select()
        .single()

      if (entry) {
        cleanupManager.track('appointment_waitlists', entry.id)
      }

      const authToken = await getAuthTokenFromUser(ownerUser)

      // Try to create duplicate
      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          service_id: service?.id,
          preferred_date: '2026-02-01',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 409)

      const data = await response.json()
      expect(data.error).toContain('lista de espera')
    })

    it('successfully adds pet to waitlist', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: service } = await supabase
        .from('services')
        .insert({
          tenant_id: TEST_TENANT_ID,
          name: `Test Service ${Date.now()}`,
          duration_minutes: 30,
          base_price: 50000,
        })
        .select()
        .single()

      if (service) {
        cleanupManager.track('services', service.id)
      }

      const authToken = await getAuthTokenFromUser(ownerUser)

      const requestBody = {
        pet_id: pet.id,
        service_id: service?.id,
        preferred_date: '2026-03-15',
        preferred_time_start: '10:00',
        preferred_time_end: '12:00',
        is_flexible_date: true,
        notify_via: ['email', 'whatsapp'],
        notes: 'Prefiero por la mañana',
      }

      const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
        method: 'POST',
        body: requestBody,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.message).toContain('lista de espera')
      expect(data.waitlistEntry).toBeDefined()
      expect(data.waitlistEntry.pet_id).toBe(pet.id)
      expect(data.waitlistEntry.service_id).toBe(service?.id)
      expect(data.waitlistEntry.preferred_date).toBe('2026-03-15')
      expect(data.waitlistEntry.is_flexible_date).toBe(true)

      if (data.waitlistEntry) {
        cleanupManager.track('appointment_waitlists', data.waitlistEntry.id)
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious status parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousInputs = [
        "'; DROP TABLE appointment_waitlists; --",
        "1' OR '1'='1",
        'waiting" OR 1=1 --',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/appointments/waitlist?status=${encodeURIComponent(malicious)}`,
          { authToken }
        )

        const response = await GET(request)

        // Should not crash, should handle gracefully
        expect(response.status).not.toBe(500)
      }
    })

    it('handles malicious pet_id in POST body safely', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousInputs = [
        "'; DROP TABLE pets; --",
        "1' OR '1'='1",
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/appointments/waitlist', {
          method: 'POST',
          body: {
            pet_id: malicious,
            service_id: '00000000-0000-0000-0000-000000000000',
            preferred_date: '2026-02-01',
          },
          authToken,
        })

        const response = await POST(request)

        // Should return validation error or 404, not crash
        expect(response.status).not.toBe(500)
        expect([400, 404]).toContain(response.status)
      }
    })
  })
})
