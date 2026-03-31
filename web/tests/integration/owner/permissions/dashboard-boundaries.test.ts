/**
 * TST-004: Owner Permission Boundary Tests - Dashboard Endpoints
 *
 * Verifies that owners cannot access staff-only dashboard endpoints.
 * All these endpoints require vet or admin role.
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
  DEFAULT_TENANT,
  DEFAULT_VET,
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

// Import dashboard routes after mocks
import { GET as GetStats } from '@/app/api/dashboard/stats/route'
import { GET as GetTodayAppointments } from '@/app/api/dashboard/today-appointments/route'
import { GET as GetWaitingRoom } from '@/app/api/dashboard/waiting-room/route'
import { GET as GetRevenue } from '@/app/api/dashboard/revenue/route'
import { GET as GetMyPatients } from '@/app/api/dashboard/my-patients/route'
import { GET as GetDashboardAppointments } from '@/app/api/dashboard/appointments/route'
import { GET as GetInventory } from '@/app/api/dashboard/inventory/route'
import { GET as GetExpiringProducts } from '@/app/api/dashboard/expiring-products/route'
import { GET as GetInventoryAlerts } from '@/app/api/dashboard/inventory-alerts/route'

function createRequest(url: string): NextRequest {
  const baseUrl = 'http://localhost:3000'
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  return new NextRequest(fullUrl, { method: 'GET' })
}

describe('TST-004: Owner Permission Boundaries - Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Dashboard Stats (staff-only)', () => {
    it('should reject owner access to /api/dashboard/stats', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetStats(createRequest('/api/dashboard/stats'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/stats', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetStats(createRequest('/api/dashboard/stats'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Today Appointments (staff-only)', () => {
    it('should reject owner access to /api/dashboard/today-appointments', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetTodayAppointments(createRequest('/api/dashboard/today-appointments'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/today-appointments', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetTodayAppointments(createRequest('/api/dashboard/today-appointments'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Waiting Room (staff-only)', () => {
    it('should reject owner access to /api/dashboard/waiting-room', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetWaitingRoom(createRequest('/api/dashboard/waiting-room'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/waiting-room', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetWaitingRoom(createRequest('/api/dashboard/waiting-room'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Revenue (admin-only)', () => {
    it('should reject owner access to /api/dashboard/revenue', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetRevenue(createRequest('/api/dashboard/revenue'))
      expect(response.status).toBe(403)
    })

    it('should reject vet access to /api/dashboard/revenue', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetRevenue(createRequest('/api/dashboard/revenue'))
      expect(response.status).toBe(403)
    })

    it('should allow admin access to /api/dashboard/revenue', async () => {
      mockState.setAuthScenario('ADMIN')
      const response = await GetRevenue(createRequest('/api/dashboard/revenue'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('My Patients (staff-only)', () => {
    it('should reject owner access to /api/dashboard/my-patients', async () => {
      mockState.setAuthScenario('OWNER')
      // This route checks vetId param first, then auth - returns 401 for non-staff role
      const response = await GetMyPatients(createRequest('/api/dashboard/my-patients?vetId=' + DEFAULT_VET.id))
      expect(response.status).toBe(401)
    })

    it('should allow vet access to /api/dashboard/my-patients', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetMyPatients(createRequest('/api/dashboard/my-patients?vetId=' + DEFAULT_VET.id))
      expect(response.status).not.toBe(401)
    })
  })

  describe('Dashboard Appointments (staff-only)', () => {
    it('should reject owner access to /api/dashboard/appointments', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetDashboardAppointments(createRequest('/api/dashboard/appointments'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/appointments', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetDashboardAppointments(createRequest('/api/dashboard/appointments'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Dashboard Inventory (staff-only)', () => {
    it('should reject owner access to /api/dashboard/inventory', async () => {
      mockState.setAuthScenario('OWNER')
      // This route requires clinic param and returns 403 for non-staff role
      const response = await GetInventory(createRequest('/api/dashboard/inventory?clinic=' + DEFAULT_TENANT.id))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/inventory', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetInventory(createRequest('/api/dashboard/inventory?clinic=' + DEFAULT_TENANT.id))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Expiring Products (staff-only)', () => {
    it('should reject owner access to /api/dashboard/expiring-products', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetExpiringProducts(createRequest('/api/dashboard/expiring-products'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/expiring-products', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetExpiringProducts(createRequest('/api/dashboard/expiring-products'))
      expect(response.status).not.toBe(403)
    })
  })

  describe('Inventory Alerts (staff-only)', () => {
    it('should reject owner access to /api/dashboard/inventory-alerts', async () => {
      mockState.setAuthScenario('OWNER')
      const response = await GetInventoryAlerts(createRequest('/api/dashboard/inventory-alerts'))
      expect(response.status).toBe(403)
    })

    it('should allow vet access to /api/dashboard/inventory-alerts', async () => {
      mockState.setAuthScenario('VET')
      const response = await GetInventoryAlerts(createRequest('/api/dashboard/inventory-alerts'))
      expect(response.status).not.toBe(403)
    })
  })
})
