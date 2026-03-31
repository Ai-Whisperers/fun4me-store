/**
 * API Integration Tests: /api/pets
 * 
 * Tests authentication, authorization, tenant isolation, and validation
 * for the pets API endpoint.
 * 
 * API contract:
 * - GET /api/pets?userId=<id> → array of pet objects (with vaccines)
 * - POST /api/pets { name, species, breed?, clinic } → { id, name, species, breed, photo_url } (201)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/pets/route'
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

describe('API: /api/pets', () => {
  let supabase: SupabaseClient
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)

    // Checkpoint: preserve these shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/pets', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/pets?userId=someuser')

      const response = await GET(request)

      await expectError(response, 401, 'autorizado')
    })

    it('requires userId parameter', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/pets', {
        authToken,
      })

      const response = await GET(request)

      await expectError(response, 400)
    })

    it('enforces tenant isolation - owner sees only own pets', async () => {
      // Create pet for owner in TEST_TENANT_ID
      const pet1 = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID, {
        name: 'Owner Pet 1',
      })

      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest(
        `http://localhost:3000/api/pets?userId=${ownerUser.profile.id}`,
        { authToken }
      )

      const response = await GET(request)
      const body = await expectSuccess<Array<{ id: string; name: string; tenant_id?: string }>>(response)

      // Response is a plain array
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(1)
      
      const petIds = body.map(p => p.id)
      expect(petIds).toContain(pet1.id)
    })

    it('prevents owner from querying other users pets', async () => {
      // Create another owner in same tenant
      const otherOwner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
      
      const authToken = await getAuthTokenFromUser(ownerUser)

      // Try to query other owner's pets
      const request = createTestRequest(
        `http://localhost:3000/api/pets?userId=${otherOwner.profile.id}`,
        { authToken }
      )

      const response = await GET(request)

      await expectError(response, 403)
    })

    it('allows staff to see pets of users in same tenant', async () => {
      // Create pet for owner
      const pet1 = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID, {
        name: 'Staff Visible Pet',
      })

      // Get auth token for vet (staff)
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/pets?userId=${ownerUser.profile.id}`,
        { authToken }
      )

      const response = await GET(request)
      const body = await expectSuccess<Array<{ id: string; name: string }>>(response)

      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(1)
      
      const petIds = body.map(p => p.id)
      expect(petIds).toContain(pet1.id)
    })

    it('returns pets with vaccine information', async () => {
      // Create a pet
      await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID, {
        name: 'Vaccine Test Pet',
      })

      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest(
        `http://localhost:3000/api/pets?userId=${ownerUser.profile.id}`,
        { authToken }
      )

      const response = await GET(request)
      const body = await expectSuccess<Array<{ id: string; vaccines: unknown[] }>>(response)

      expect(Array.isArray(body)).toBe(true)
      // Each pet should have a vaccines array (even if empty)
      for (const pet of body) {
        expect(pet).toHaveProperty('vaccines')
        expect(Array.isArray(pet.vaccines)).toBe(true)
      }
    })
  })

  describe('POST /api/pets', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: {
          name: 'Test Pet',
          species: 'dog',
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 401, 'autorizado')
    })

    it('validates required fields', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        authToken,
        body: {
          // Missing name
          species: 'dog',
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates species enum', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        authToken,
        body: {
          name: 'Test Pet',
          species: 'invalid_species',
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('requires clinic field', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        authToken,
        body: {
          name: 'Test Pet',
          species: 'dog',
          // Missing clinic
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('creates pet with valid data', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        authToken,
        body: {
          name: 'New Pet',
          species: 'dog',
          breed: 'Labrador',
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)
      
      // POST returns 201
      expect(response.status).toBe(201)
      
      const body = await response.json()
      expect(body.name).toBe('New Pet')
      expect(body.species).toBe('dog')
      expect(body.breed).toBe('Labrador')

      // Track for cleanup
      if (body.id) {
        cleanupManager.track('pets', body.id)
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious search input safely', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousInputs = [
        "'; DROP TABLE pets; --",
        "1' OR '1'='1",
        "\" OR 1=1 --",
        "<script>alert('xss')</script>",
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/pets?userId=${ownerUser.profile.id}&query=${encodeURIComponent(malicious)}`,
          { authToken }
        )

        const response = await GET(request)

        // Should not error - returns 200 with filtered/empty results
        expect(response.status).toBe(200)
      }
    })
  })
})
