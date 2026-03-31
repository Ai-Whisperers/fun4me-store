/**
 * TST-004: Owner Permission Boundary Tests - Analytics Endpoints
 *
 * Verifies that owners cannot access staff/admin-only analytics endpoints.
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

// Import analytics routes after mocks
import { GET as GetAnalytics } from '@/app/api/analytics/route'
import { GET as GetAnalyticsCustomers } from '@/app/api/analytics/customers/route'
import { GET as GetAnalyticsPatients } from '@/app/api/analytics/patients/route'
import { GET as GetAnalyticsOperations } from '@/app/api/analytics/operations/route'
import { GET as GetAnalyticsExport } from '@/app/api/analytics/export/route'
import { GET as GetStoreAnalytics } from '@/app/api/analytics/store/route'

function createRequest(url: string): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  return new NextRequest(fullUrl, { method: 'GET' })
}

describe('TST-004: Owner Permission Boundaries - Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Main Analytics (staff-only)', () => {
    it('should reject owner access to /api/analytics', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetAnalytics(createRequest('/api/analytics'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetAnalytics(createRequest('/api/analytics'))
      expect(response.status).not.toBe(403)
    })

    it('should allow admin access to /api/analytics', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetAnalytics(createRequest('/api/analytics'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Customer Analytics (staff-only)', () => {
    it('should reject owner access to /api/analytics/customers', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetAnalyticsCustomers(createRequest('/api/analytics/customers'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics/customers', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetAnalyticsCustomers(createRequest('/api/analytics/customers'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Patient Analytics (staff-only)', () => {
    it('should reject owner access to /api/analytics/patients', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetAnalyticsPatients(createRequest('/api/analytics/patients'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics/patients', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetAnalyticsPatients(createRequest('/api/analytics/patients'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Operations Analytics (staff-only)', () => {
    it('should reject owner access to /api/analytics/operations', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetAnalyticsOperations(createRequest('/api/analytics/operations'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics/operations', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetAnalyticsOperations(createRequest('/api/analytics/operations'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Analytics Export (staff-only)', () => {
    it('should reject owner access to /api/analytics/export', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetAnalyticsExport(createRequest('/api/analytics/export'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics/export', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetAnalyticsExport(createRequest('/api/analytics/export'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Store Analytics (staff-only)', () => {
    it('should reject owner access to /api/analytics/store', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetStoreAnalytics(createRequest('/api/analytics/store'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/analytics/store', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetStoreAnalytics(createRequest('/api/analytics/store'))
      expect(response.status).not.toBe(403)
    })
  })
})
