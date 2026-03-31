/**
 * TST-003: Owner Profile Management Tests - Pet Updates Section
 *
 * Tests for owner pet update and delete operations
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
import { GET, PATCH, DELETE } from '@/app/api/pets/[id]/route'

function createRequest(url: string, options?: { method?: string, body?: Record<string, unknown> }): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  const method = options?.method || (options?.body ? 'PATCH' : 'GET')
  if (options?.body) {
    return new NextRequest(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    })
  }
  return new NextRequest(fullUrl, { method })
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('TST-003: Pet Updates Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/pets/[id] - Get Pet', () => {
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await GET(createRequest('/api/pets/' + DEFAULT_PET.id), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(401)
    })

    it('should allow owner to view their own pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setUser({ id: DEFAULT_OWNER.id, email: DEFAULT_OWNER.email })
      mockState.setProfile({ id: DEFAULT_OWNER.id, tenant_id: DEFAULT_TENANT.id, role: 'owner' })
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: DEFAULT_OWNER.id })
      const response = await GET(createRequest('/api/pets/' + DEFAULT_PET.id), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(200)
    })

    it('should reject owner viewing other owner pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: 'other-owner-id' })
      const response = await GET(createRequest('/api/pets/' + DEFAULT_PET.id), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(403)
    })

    it('should allow staff to view any pet in same tenant', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { ...DEFAULT_PET, tenant_id: DEFAULT_TENANT.id })
      const response = await GET(createRequest('/api/pets/' + DEFAULT_PET.id), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', null)
      const response = await GET(createRequest('/api/pets/nonexistent'), createContext('nonexistent'))
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/pets/[id] - Update Pet', () => {
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await PATCH(createRequest('/api/pets/' + DEFAULT_PET.id, { body: { name: 'NewName' } }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(401)
    })

    it('should allow owner to update own pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setUser({ id: DEFAULT_OWNER.id, email: DEFAULT_OWNER.email })
      mockState.setProfile({ id: DEFAULT_OWNER.id, tenant_id: DEFAULT_TENANT.id, role: 'owner' })
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: DEFAULT_OWNER.id, name: 'NewName' })
      const response = await PATCH(createRequest('/api/pets/' + DEFAULT_PET.id, { body: { name: 'NewName' } }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(200)
    })

    it('should reject owner updating other owner pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: 'other-owner-id' })
      const response = await PATCH(createRequest('/api/pets/' + DEFAULT_PET.id, { body: { name: 'NewName' } }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(403)
    })

    it('should allow staff to update any pet in same tenant', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('pets', { ...DEFAULT_PET, tenant_id: DEFAULT_TENANT.id, name: 'NewName' })
      const response = await PATCH(createRequest('/api/pets/' + DEFAULT_PET.id, { body: { name: 'NewName' } }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /api/pets/[id] - Delete Pet', () => {
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await DELETE(createRequest('/api/pets/' + DEFAULT_PET.id, { method: 'DELETE' }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(401)
    })

    it('should allow owner to delete own pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setUser({ id: DEFAULT_OWNER.id, email: DEFAULT_OWNER.email })
      mockState.setProfile({ id: DEFAULT_OWNER.id, tenant_id: DEFAULT_TENANT.id, role: 'owner' })
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: DEFAULT_OWNER.id })
      const response = await DELETE(createRequest('/api/pets/' + DEFAULT_PET.id, { method: 'DELETE' }), createContext(DEFAULT_PET.id))
      expect([200, 204]).toContain(response.status)
    })

    it('should reject owner deleting other owner pet', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('pets', { ...DEFAULT_PET, owner_id: 'other-owner-id' })
      const response = await DELETE(createRequest('/api/pets/' + DEFAULT_PET.id, { method: 'DELETE' }), createContext(DEFAULT_PET.id))
      expect(response.status).toBe(403)
    })
  })
})
