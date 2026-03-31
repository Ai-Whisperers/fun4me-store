/**
 * TST-003: Owner Profile Management Tests - Pet Creation Section
 *
 * Tests for owner pet creation operations:
 * - Create pet with minimal fields
 * - Create pet with all fields
 * - Validation errors
 *
 * @epic EPIC-17
 * @ticket TST-003
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getAuthMock,
  getSupabaseServerMock,
  resetAllMocks,
  DEFAULT_OWNER,
  DEFAULT_PET,
  DEFAULT_TENANT,
} from '@/lib/test-utils'

// Test fixtures
const NEW_PET_MINIMAL = {
  name: 'Max',
  species: 'dog',
  clinic: DEFAULT_TENANT.id,
}

const CREATED_PET = {
  id: 'new-pet-id',
  name: 'Max',
  species: 'dog',
  breed: null,
  photo_url: null,
}

// Mocks
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())
vi.mock('@/lib/auth', () => getAuthMock())
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Import routes after mocks
import { POST as CreatePet, GET as GetPets } from '@/app/api/pets/route'

function createRequest(url: string, options?: { body?: Record<string, unknown>, searchParams?: Record<string, string> }): NextRequest {
  const baseUrl = 'http://localhost:3000'
  let fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
  if (options?.searchParams) {
    const params = new URLSearchParams(options.searchParams)
    fullUrl += `?${params.toString()}`
  }
  if (options?.body) {
    return new NextRequest(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    })
  }
  return new NextRequest(fullUrl, { method: 'GET' })
}

async function getResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try { return JSON.parse(text) } catch (_error: unknown) { return { raw: text } }
}

describe('TST-003: Pet Creation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/pets - Create Pet', () => {
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await CreatePet(createRequest('/api/pets', { body: NEW_PET_MINIMAL }))
      expect(response.status).toBe(401)
    })

    it('should allow authenticated owner to create pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', CREATED_PET)
      const response = await CreatePet(createRequest('/api/pets', { body: NEW_PET_MINIMAL }))
      expect(response.status).toBe(201)
    })

    it('should reject missing name', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await CreatePet(createRequest('/api/pets', { body: { species: 'dog', clinic: DEFAULT_TENANT.id } }))
      expect(response.status).toBe(400)
    })

    it('should reject missing species', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await CreatePet(createRequest('/api/pets', { body: { name: 'Max', clinic: DEFAULT_TENANT.id } }))
      expect(response.status).toBe(400)
    })

    it('should reject missing clinic', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await CreatePet(createRequest('/api/pets', { body: { name: 'Max', species: 'dog' } }))
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/pets - List Pets', () => {
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await GetPets(createRequest('/api/pets', { searchParams: { userId: DEFAULT_OWNER.id } }))
      expect(response.status).toBe(401)
    })

    it('should require userId parameter', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetPets(createRequest('/api/pets'))
      expect(response.status).toBe(400)
    })

    it('should allow owner to list their own pets', async () => {
      mockState.setUser({ id: DEFAULT_OWNER.id, email: DEFAULT_OWNER.email })
      mockState.setProfile({ id: DEFAULT_OWNER.id, tenant_id: DEFAULT_TENANT.id, role: 'owner' })
      mockState.setTableResult('pets', [DEFAULT_PET])
      const response = await GetPets(createRequest('/api/pets', { searchParams: { userId: DEFAULT_OWNER.id } }))
      expect(response.status).toBe(200)
    })

    it('should reject owner listing other user pets', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetPets(createRequest('/api/pets', { searchParams: { userId: 'other-user-id' } }))
      expect(response.status).toBe(403)
    })

    it('should allow staff to list any user pets', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', [DEFAULT_PET])
      const response = await GetPets(createRequest('/api/pets', { searchParams: { userId: DEFAULT_OWNER.id } }))
      expect(response.status).toBe(200)
    })
  })
})
