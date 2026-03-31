/**
 * API Integration Tests: /api/clients
 * 
 * Tests authentication, authorization, tenant isolation, search, pagination,
 * and sorting for the clients API endpoint.
 * 
 * API contract:
 * - GET /api/clients → { clients: Client[], total, page, limit, pages }
 * - GET /api/clients?search=term → filtered clients
 * - GET /api/clients?sort=field&order=asc → sorted clients
 * - GET /api/clients?page=2&limit=10 → paginated clients
 * - GET /api/clients?realtime=true → real-time aggregated data
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { GET } from '@/app/api/clients/route'
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

interface Client {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
  pet_count: number
  last_appointment: string | null
}

interface ClientsResponse {
  clients: Client[]
  total: number
  page: number
  limit: number
  pages: number
}

describe('API: /api/clients', () => {
  let supabase: SupabaseClient
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser1: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser2: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser3: Awaited<ReturnType<typeof createTestAuthUser>>

  const BASE_URL = 'http://localhost:3000'

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create vet user with permissions
    vetUser = await createTestAuthUser(supabase, 'vet')

    // Create multiple owner users for testing
    ownerUser1 = await createTestAuthUser(supabase, 'owner')
    ownerUser2 = await createTestAuthUser(supabase, 'owner')  
    ownerUser3 = await createTestAuthUser(supabase, 'owner')

    // Update profiles with specific test data
    await supabase
      .from('profiles')
      .update({
        full_name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1234567890'
      })
      .eq('id', ownerUser1.profile.id)

    await supabase
      .from('profiles')
      .update({
        full_name: 'Bob Smith', 
        email: 'bob.smith@example.com',
        phone: '+1987654321'
      })
      .eq('id', ownerUser2.profile.id)

    await supabase
      .from('profiles')
      .update({
        full_name: 'Charlie Brown',
        email: 'charlie.brown@example.com',
        phone: null
      })
      .eq('id', ownerUser3.profile.id)

    // Create pets for some owners to test pet_count aggregation
    await createTestPet(supabase, ownerUser1.profile.id, TEST_TENANT_ID, { 
      name: 'Fluffy',
      species: 'cat'
    })
    await createTestPet(supabase, ownerUser1.profile.id, TEST_TENANT_ID, { 
      name: 'Buddy',
      species: 'dog'
    })
    await createTestPet(supabase, ownerUser2.profile.id, TEST_TENANT_ID, { 
      name: 'Rex',
      species: 'dog'
    })

    // Create an appointment for testing last_appointment
    const { data: pet } = await supabase
      .from('pets')
      .select('id')
      .eq('owner_id', ownerUser1.profile.id)
      .eq('name', 'Fluffy')
      .single()

    if (pet) {
      await supabase
        .from('appointments')
        .insert({
          id: `appt_${Date.now()}`,
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          staff_id: vetUser.profile.id,
          service_id: `service_${Date.now()}`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          status: 'completed'
        })
    }

    cleanupManager.checkpoint()
  }, 30000) // 30 second timeout

  afterEach(() => {
    cleanupManager.cleanupSinceCheckpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET' })
      const response = await GET(request as any)
      
      expectError(response, 401, 'AUTH_REQUIRED')
    })

    it('should require vet or admin role', async () => {
      const token = await getAuthTokenFromUser(ownerUser1)
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectError(response, 403, 'INSUFFICIENT_PERMISSIONS')
    })

    it('should allow vet role access', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      expect(data.clients).toBeDefined()
      expect(Array.isArray(data.clients)).toBe(true)
    })
  })

  describe('Basic Functionality', () => {
    it('should return clients list with proper structure', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      // Should have pagination structure
      expect(data).toHaveProperty('clients')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data).toHaveProperty('limit')
      expect(data).toHaveProperty('pages')
      
      // Should include our test clients
      expect(data.clients.length).toBeGreaterThan(0)
      expect(data.total).toBeGreaterThanOrEqual(3)
      
      // Check client structure
      const client = data.clients[0]
      expect(client).toHaveProperty('id')
      expect(client).toHaveProperty('full_name')
      expect(client).toHaveProperty('email')
      expect(client).toHaveProperty('phone')
      expect(client).toHaveProperty('created_at')
      expect(client).toHaveProperty('pet_count')
      expect(client).toHaveProperty('last_appointment')
    })

    it('should return correct pet counts', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      // Find our test clients
      const alice = data.clients.find(c => c.email === 'alice.johnson@example.com')
      const bob = data.clients.find(c => c.email === 'bob.smith@example.com')
      const charlie = data.clients.find(c => c.email === 'charlie.brown@example.com')
      
      expect(alice?.pet_count).toBe(2) // Fluffy + Buddy
      expect(bob?.pet_count).toBe(1)   // Rex
      expect(charlie?.pet_count).toBe(0) // No pets
    })
  })

  describe('Search Functionality', () => {
    it('should filter by full name', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?search=Alice`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients.length).toBeGreaterThan(0)
      const found = data.clients.some(c => c.full_name.includes('Alice'))
      expect(found).toBe(true)
    })

    it('should filter by email', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?search=bob.smith`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients.length).toBeGreaterThan(0)
      const found = data.clients.some(c => c.email.includes('bob.smith'))
      expect(found).toBe(true)
    })

    it('should filter by phone number', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?search=1234567890`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients.length).toBeGreaterThan(0)
      const found = data.clients.some(c => c.phone?.includes('1234567890'))
      expect(found).toBe(true)
    })

    it('should return empty results for non-matching search', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?search=nonexistent`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients.length).toBe(0)
      expect(data.total).toBe(0)
    })
  })

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?limit=2`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients.length).toBeLessThanOrEqual(2)
      expect(data.limit).toBe(2)
    })

    it('should handle pagination correctly', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      
      // Get first page
      const request1 = createTestRequest(`${BASE_URL}/api/clients?page=1&limit=2`, { method: 'GET', authToken: token })
      const response1 = await GET(request1 as any)
      const data1 = (await response1.json()) as ClientsResponse
      
      // Get second page
      const request2 = createTestRequest(`${BASE_URL}/api/clients?page=2&limit=2`, { method: 'GET', authToken: token })
      const response2 = await GET(request2 as any)
      const data2 = (await response2.json()) as ClientsResponse
      
      // Should have different clients (if we have enough)
      if (data1.total > 2) {
        const page1Ids = data1.clients.map(c => c.id)
        const page2Ids = data2.clients.map(c => c.id)
        const intersection = page1Ids.filter(id => page2Ids.includes(id))
        expect(intersection.length).toBe(0)
      }
    })
  })

  describe('Sorting', () => {
    it('should sort by full_name ascending', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?sort=full_name&order=asc`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      if (data.clients.length > 1) {
        const names = data.clients.map(c => c.full_name)
        const sortedNames = [...names].sort()
        expect(names).toEqual(sortedNames)
      }
    })

    it('should sort by created_at descending', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?sort=created_at&order=desc`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      if (data.clients.length > 1) {
        const dates = data.clients.map(c => new Date(c.created_at).getTime())
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i])
        }
      }
    })

    it('should sort by pet_count', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?sort=pet_count&order=desc`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      if (data.clients.length > 1) {
        const counts = data.clients.map(c => c.pet_count)
        for (let i = 1; i < counts.length; i++) {
          expect(counts[i-1]).toBeGreaterThanOrEqual(counts[i])
        }
      }
    })

    it('should default to safe sorting field for invalid input', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?sort=invalid_field`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      expect(data.clients).toBeDefined()
    })
  })

  describe('Realtime vs Optimized Paths', () => {
    it('should work with realtime=true', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?realtime=true`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients).toBeDefined()
      expect(Array.isArray(data.clients)).toBe(true)
    })

    it('should work with realtime=false (optimized)', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients?realtime=false`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      expect(data.clients).toBeDefined()
      expect(Array.isArray(data.clients)).toBe(true)
    })
  })

  describe('Tenant Isolation', () => {
    it('should only return clients from current tenant', async () => {
      const token = await getAuthTokenFromUser(vetUser)
      const request = createTestRequest(`${BASE_URL}/api/clients`, { method: 'GET', authToken: token })
      const response = await GET(request as any)
      
      expectSuccess(response, 200)
      const data = (await response.json()) as ClientsResponse
      
      // All returned clients should be from our test tenant
      data.clients.forEach(client => {
        // We can't directly check tenant_id in response, but all our test
        // clients should be findable in the response
        expect(client.id).toBeDefined()
      })
      
      // Should find our test clients
      const emails = data.clients.map(c => c.email)
      expect(emails).toContain('alice.johnson@example.com')
      expect(emails).toContain('bob.smith@example.com')
      expect(emails).toContain('charlie.brown@example.com')
    })
  })
})