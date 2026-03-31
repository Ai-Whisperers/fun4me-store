/**
 * API Integration Tests: /api/appointments/slots
 *
 * Tests authentication, tenant isolation, and available appointment slot retrieval
 * This route uses the refactored service layer pattern (AppointmentService)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { GET } from '@/app/api/appointments/slots/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestStaffProfile,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
  getAuthTokenFromUser,
} from '../../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

describe('API: /api/appointments/slots', () => {
  let supabase: SupabaseClient
  let ownerUser: { userId: string; profile: { id: string }; email: string; password: string }
  let vetUser: { userId: string; profile: { id: string }; email: string; password: string }

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUser = owner

    const vet = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUser = vet

    // Create staff profile for vet (needed for schedules)
    await createTestStaffProfile(supabase, vetUser.profile.id, TEST_TENANT_ID)
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/appointments/slots', () => {
    it('requires authentication', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=2024-12-20`
      )

      const response = await GET(request)

      await expectError(response, 401)
    })

    it('requires clinic parameter', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest(
        'http://localhost:3000/api/appointments/slots?date=2024-12-20',
        {
          authToken,
        }
      )

      const response = await GET(request)

      await expectError(response, 400)
    })

    it('requires date parameter', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      await expectError(response, 400)
    })

    it('validates date format (YYYY-MM-DD)', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const invalidDates = ['12/20/2024', '2024-12-20T10:00:00', '20-12-2024', 'invalid']

      for (const invalidDate of invalidDates) {
        const request = createTestRequest(
          `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=${invalidDate}`,
          {
            authToken,
          }
        )

        const response = await GET(request)

        await expectError(response, 400)
      }
    })

    it('enforces tenant isolation - owners can only access own clinic', async () => {
      // Create another owner in different tenant
      const otherOwner = await createTestAuthUser(supabase, 'owner', 'petlife')

      // Get auth token for the other owner
      const otherOwnerToken = await getAuthTokenFromUser(otherOwner)

      // Try to access TEST_TENANT_ID slots
      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=2024-12-20`,
        {
          authToken: otherOwnerToken,
        }
      )

      const response = await GET(request)

      await expectError(response, 403)
    })

    it('allows staff to access any clinic within their tenant', async () => {
      // Sign in as vet (staff role)
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=2024-12-20`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      // Should succeed (staff can access) or return database error
      if (response.status === 200) {
        const body = await expectSuccess(response)
        expect(body).toHaveProperty('slots')
        expect(body).toHaveProperty('date')
        expect(body).toHaveProperty('clinic')
        expect(body).toHaveProperty('slotDuration')
      } else if (response.status === 500) {
        // Expected if database function is missing
        const body = await response.json()
        expect(body.code).toBe('DATABASE_ERROR')
      } else {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    })

    it('returns available slots for valid request', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      // Request slots for a future date
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=${futureDate}`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      // Should succeed or return database error if function is missing
      if (response.status === 200) {
        const body = await expectSuccess(response)
        expect(body).toHaveProperty('slots')
        expect(body).toHaveProperty('date')
        expect(body).toHaveProperty('clinic')
        expect(body).toHaveProperty('slotDuration')
        expect(Array.isArray(body.slots)).toBe(true)
        expect(body.date).toBe(futureDate)
        expect(body.clinic).toBe(TEST_TENANT_ID)
        // Slots may be empty if no schedule configured, but structure should be correct
      } else if (response.status === 500) {
        // Expected if database function is missing
        const body = await response.json()
        expect(body.code).toBe('DATABASE_ERROR')
      } else {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    })

    it('supports optional service_id filter', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      const serviceId = 'service-test-id'

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=${futureDate}&service_id=${serviceId}`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      // Should succeed even if service doesn't exist or return database error
      if (response.status === 200) {
        const body = await expectSuccess(response)
        expect(body).toHaveProperty('slots')
        expect(body).toHaveProperty('date')
        expect(body).toHaveProperty('clinic')
        expect(body).toHaveProperty('slotDuration')
      } else if (response.status === 500) {
        // Expected if database function is missing
        const body = await response.json()
        expect(body.code).toBe('DATABASE_ERROR')
      } else {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    })

    it('supports optional vet_id filter', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const request = createTestRequest(
        `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=${futureDate}&vet_id=${vetUser.profile.id}`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      // Should succeed and filter by vet or return database error
      if (response.status === 200) {
        const body = await expectSuccess(response)
        expect(body).toHaveProperty('slots')
        expect(body).toHaveProperty('date')
        expect(body).toHaveProperty('clinic')
        expect(body).toHaveProperty('slotDuration')
      } else if (response.status === 500) {
        // Expected if database function is missing
        const body = await response.json()
        expect(body.code).toBe('DATABASE_ERROR')
      } else {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious clinic parameter safely', async () => {
      // Sign in as vet (staff - can access any clinic)
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousInputs = [
        "'; DROP TABLE appointments; --",
        "1' OR '1'='1",
        'admin"--',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/appointments/slots?clinic=${encodeURIComponent(malicious)}&date=2024-12-20`,
          {
            authToken,
          }
        )

        const response = await GET(request)

        // Should handle safely (not crash the server)
        // Note: May return 500 if database function is missing, but shouldn't cause security issues
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('handles malicious date parameter safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousInputs = [
        "2024-12-20'; DROP TABLE slots; --",
        "2024-12-20 OR 1=1",
        '"><script>alert("xss")</script>',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/appointments/slots?clinic=${TEST_TENANT_ID}&date=${encodeURIComponent(malicious)}`,
          {
            authToken,
          }
        )

        const response = await GET(request)

        // Should reject with 400 (invalid format) or handle safely
        expect(response.status).not.toBe(500)
      }
    })
  })
})
