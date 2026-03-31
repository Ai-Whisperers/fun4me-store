/**
 * TST-004: Owner Permission Boundary Tests - Finance & Settings Endpoints
 *
 * Verifies that owners cannot access admin-only finance and settings endpoints.
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

// Import finance routes after mocks
import { GET as GetExpenses, POST as PostExpenses } from '@/app/api/finance/expenses/route'
import { GET as GetPL } from '@/app/api/finance/pl/route'
import { POST as PostInvoices } from '@/app/api/invoices/route'
import { GET as GetSettingsGeneral, PUT as PutSettingsGeneral } from '@/app/api/settings/general/route'
import { GET as GetSettingsBranding, PUT as PutSettingsBranding } from '@/app/api/settings/branding/route'
import { GET as GetClients } from '@/app/api/clients/route'

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

describe('TST-004: Owner Permission Boundaries - Finance & Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Expenses (staff-only)', () => {
    it('should reject owner access to /api/finance/expenses', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetExpenses(createRequest('/api/finance/expenses'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/finance/expenses', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetExpenses(createRequest('/api/finance/expenses'))
      expect(response.status).not.toBe(403)
    })

    it('should allow admin access to /api/finance/expenses', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetExpenses(createRequest('/api/finance/expenses'))
      expect(response.status).not.toBe(403)
    })

    it('should reject owner POST to /api/finance/expenses', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await PostExpenses(createRequest('/api/finance/expenses', {
        method: 'POST',
        body: { amount: 100, category: 'supplies' },
      }))
      expect(response.status).toBe(403)
    })
  })

  describe('Profit/Loss (staff-only)', () => {
    it('should reject owner access to /api/finance/pl', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetPL(createRequest('/api/finance/pl'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/finance/pl', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetPL(createRequest('/api/finance/pl'))
      expect(response.status).not.toBe(403)
    })

    it('should allow admin access to /api/finance/pl', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetPL(createRequest('/api/finance/pl'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Invoices (staff-only)', () => {
    it('should reject owner POST to /api/invoices', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await PostInvoices(createRequest('/api/invoices', {
        method: 'POST',
        body: { client_id: 'test' },
      }))
      expect(response.status).toBe(403)
    })

    it('should allow vet POST to /api/invoices', async () => {
      mockState.setAuthScenario('VET')
      const response = await PostInvoices(createRequest('/api/invoices', {
        method: 'POST',
        body: { client_id: 'test' },
      }))
      expect(response.status).not.toBe(403)
    })
  })

  describe('General Settings (admin-only)', () => {
    it('should reject owner access to /api/settings/general', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetSettingsGeneral(createRequest('/api/settings/general'))
      expect(response.status).toBe(403)
    })

    it('should reject vet access to /api/settings/general', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetSettingsGeneral(createRequest('/api/settings/general'))
      expect(response.status).toBe(403)
    })

    it('should allow admin access to /api/settings/general', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetSettingsGeneral(createRequest('/api/settings/general'))
      expect(response.status).not.toBe(403)
    })

    it('should reject owner PUT to /api/settings/general', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await PutSettingsGeneral(createRequest('/api/settings/general', {
        method: 'PUT',
        body: { name: 'Test' },
      }))
      expect(response.status).toBe(403)
    })
  })

  describe('Branding Settings (admin-only)', () => {
    it('should reject owner access to /api/settings/branding', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetSettingsBranding(createRequest('/api/settings/branding'))
      expect(response.status).toBe(403)
    })

    it('should reject vet access to /api/settings/branding', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetSettingsBranding(createRequest('/api/settings/branding'))
      expect(response.status).toBe(403)
    })

    it('should allow admin access to /api/settings/branding', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetSettingsBranding(createRequest('/api/settings/branding'))
      expect(response.status).not.toBe(403)
    })

    it('should reject owner PUT to /api/settings/branding', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await PutSettingsBranding(createRequest('/api/settings/branding', {
        method: 'PUT',
        body: { logo_url: 'http://example.com/logo.png' },
      }))
      expect(response.status).toBe(403)
    })
  })

  describe('Clients (staff-only)', () => {
    it('should reject owner access to /api/clients', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetClients(createRequest('/api/clients'))
      expect(response.status).toBe(403)
    })
    // Note: "allow vet" test skipped due to internal rate limiting in route
  })
})
