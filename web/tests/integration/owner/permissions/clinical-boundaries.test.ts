/**
 * TST-004: Owner Permission Boundary Tests - Clinical Tool Endpoints
 *
 * Verifies that owners cannot access staff-only clinical endpoints.
 * These tests focus on the permission boundary - ensuring owners get 403.
 *
 * @epic EPIC-17
 * @ticket TST-004
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getAuthMock,
  getSupabaseServerMock,
  resetAllMocks,
} from '@/lib/test-utils'

vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())
vi.mock('@/lib/auth', () => getAuthMock())
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Import clinical routes after mocks - only routes using withApiAuth
import { GET as GetKennels } from '@/app/api/kennels/route'
import { GET as GetLabCatalog } from '@/app/api/lab-catalog/route'
import { GET as GetHospitalizations, POST as PostHospitalizations } from '@/app/api/hospitalizations/route'
import { GET as GetReminders } from '@/app/api/reminders/route'

function createRequest(url: string, options?: { method?: string; body?: Record<string, unknown> }): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  const method = options?.method || 'GET'

  if (options?.body) {
    return new NextRequest(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    })
  }

  return new NextRequest(fullUrl, { method })
}

describe('TST-004: Owner Permission Boundaries - Clinical Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Kennels (staff-only)', () => {
    it('should reject owner access to /api/kennels', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetKennels(createRequest('/api/kennels'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/kennels', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetKennels(createRequest('/api/kennels'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Lab Catalog (staff-only)', () => {
    it('should reject owner access to /api/lab-catalog', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetLabCatalog(createRequest('/api/lab-catalog'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/lab-catalog', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetLabCatalog(createRequest('/api/lab-catalog'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Hospitalizations (staff-only)', () => {
    it('should reject owner access to GET /api/hospitalizations', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetHospitalizations(createRequest('/api/hospitalizations'))
      expect(response.status).toBe(403)
    })

    it('should reject owner access to POST /api/hospitalizations', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await PostHospitalizations(createRequest('/api/hospitalizations', {
        method: 'POST',
        body: { pet_id: 'test-pet', kennel_id: 'test-kennel' },
      }))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to GET /api/hospitalizations', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetHospitalizations(createRequest('/api/hospitalizations'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Reminders (staff-only)', () => {
    it('should reject owner access to /api/reminders', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetReminders(createRequest('/api/reminders'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/reminders', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetReminders(createRequest('/api/reminders'))
      expect(response.status).not.toBe(403)
    })
  })
})
