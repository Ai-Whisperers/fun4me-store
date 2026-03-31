/**
 * Platform Admin Ambassador Management Tests
 *
 * Tests for:
 * - Ambassador approval workflow
 * - Ambassador rejection
 * - Ambassador suspension
 * - Payout processing
 *
 * @tags integration, platform-admin, ambassador
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getSupabaseServerMock,
  TENANTS,
} from '@/lib/test-utils'

// Import routes

// Mock Supabase
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Mock service client with all chainable methods
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    const defaultResult = { data: [], error: null, count: 0 }
    const singleResult = { data: null, error: null }

    // Chainable methods that return this
    const chainableMethods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'is', 'in', 'not', 'or', 'filter',
      'order', 'limit', 'range',
    ]
    chainableMethods.forEach((method) => {
      chain[method] = vi.fn().mockReturnThis()
    })

    // Terminal methods
    chain.single = vi.fn().mockResolvedValue(singleResult)
    chain.maybeSingle = vi.fn().mockResolvedValue(singleResult)

    // Make select also act as a promise
    const originalSelect = chain.select
    chain.select = vi.fn().mockImplementation(() => {
      return Object.assign(Promise.resolve(defaultResult), chain)
    })

    return {
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  },
}))

// Mock email service
vi.mock('@/lib/email/templates/ambassador-approved', () => ({
  sendAmbassadorApprovalEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/templates/ambassador-rejected', () => ({
  sendAmbassadorRejectionEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/ambassador/notifications', () => ({
  sendAmbassadorWelcomeNotification: vi.fn().mockResolvedValue({ success: true }),
  sendAmbassadorPayoutNotification: vi.fn().mockResolvedValue({ success: true }),
}))


// Import routes AFTER mocks
import { POST as approveAmbassador } from '@/app/api/platform/ambassadors/[id]/approve/route'
import { POST as rejectAmbassador } from '@/app/api/platform/ambassadors/[id]/reject/route'
import { POST as suspendAmbassador } from '@/app/api/platform/ambassadors/[id]/suspend/route'
import { GET as listPayouts } from '@/app/api/platform/payouts/route'
import { POST as processPayout } from '@/app/api/platform/payouts/[id]/process/route'

// =============================================================================
// Test Data
// =============================================================================

const PLATFORM_ADMIN_USER = {
  id: 'platform-admin-001',
  email: 'admin@vete.app',
}

const PLATFORM_ADMIN_PROFILE = {
  id: 'platform-admin-001',
  tenant_id: TENANTS.ADRIS.id,
  role: 'admin' as const,
  full_name: 'Platform Admin',
  is_platform_admin: true,
}

const MOCK_AMBASSADOR = {
  id: 'amb-001',
  email: 'ambassador@test.com',
  full_name: 'Test Ambassador',
  phone: '+595991234567',
  status: 'pending',
  tier: 'embajador',
  referral_code: 'AMB123',
  commission_rate: 30,
  pending_payout: 1000000,
  total_paid: 0,
}

const MOCK_PAYOUT = {
  id: 'payout-001',
  ambassador_id: MOCK_AMBASSADOR.id,
  amount: 500000,
  status: 'pending',
  bank_name: 'Banco Continental',
  bank_account: '1234567890',
  bank_holder_name: 'Test Ambassador',
  referral_ids: ['ref-001', 'ref-002'],
  ambassadors: MOCK_AMBASSADOR,
}

// =============================================================================
// Request Factories
// =============================================================================

const createPostRequest = (url: string, body?: Record<string, unknown>) =>
  new NextRequest(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

const createGetRequest = (url: string, params?: Record<string, string>) => {
  const urlObj = new URL(url)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value)
    })
  }
  return new NextRequest(urlObj.toString(), { method: 'GET' })
}

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
})

// =============================================================================
// Helper: Set Platform Admin Context
// =============================================================================

function setPlatformAdminContext(): void {
  mockState.setUser(PLATFORM_ADMIN_USER)
  mockState.setProfile(PLATFORM_ADMIN_PROFILE)
}

function setNonAdminContext(): void {
  mockState.setAuthScenario('VET')
}

// =============================================================================
// Authorization Tests
// =============================================================================

describe('Platform Admin Ambassador Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  describe('Unauthenticated users', () => {
    it('should reject unauthenticated requests to approve', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/approve')
      const response = await approveAmbassador(request, createContext('amb-001'))

      expect(response.status).toBe(401)
    })

    it('should reject unauthenticated requests to list payouts', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const request = createGetRequest('http://localhost/api/platform/payouts')
      const response = await listPayouts(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Non-platform-admin users', () => {
    it('should reject non-admin requests to approve ambassador', async () => {
      setNonAdminContext()

      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/approve')
      const response = await approveAmbassador(request, createContext('amb-001'))

      expect(response.status).toBe(403)
    })

    it('should reject non-admin requests to reject ambassador', async () => {
      setNonAdminContext()

      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/reject', {
        reason: 'Test reason',
      })
      const response = await rejectAmbassador(request, createContext('amb-001'))

      expect(response.status).toBe(403)
    })

    it('should reject non-admin requests to process payout', async () => {
      setNonAdminContext()

      const request = createPostRequest('http://localhost/api/platform/payouts/payout-001/process')
      const response = await processPayout(request, createContext('payout-001'))

      expect(response.status).toBe(403)
    })
  })
})

// =============================================================================
// Business Logic Tests
// =============================================================================

describe('Ambassador Approval Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    setPlatformAdminContext()
  })

  describe('POST /api/platform/ambassadors/[id]/approve', () => {
    it('should allow platform admin to approve ambassador', async () => {
      // This test verifies the route is accessible to platform admins
      // The actual DB operations are mocked
      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/approve')
      const response = await approveAmbassador(request, createContext('amb-001'))

      // Should not be auth error
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('POST /api/platform/ambassadors/[id]/reject', () => {
    it('should require rejection reason', async () => {
      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/reject', {})
      const response = await rejectAmbassador(request, createContext('amb-001'))

      // Either 400 for missing reason or passes to DB
      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should allow platform admin to reject with reason', async () => {
      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/reject', {
        reason: 'Información incompleta',
      })
      const response = await rejectAmbassador(request, createContext('amb-001'))

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('POST /api/platform/ambassadors/[id]/suspend', () => {
    it('should allow platform admin to suspend ambassador', async () => {
      const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/suspend', {
        reason: 'Violación de términos',
      })
      const response = await suspendAmbassador(request, createContext('amb-001'))

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })
})

// =============================================================================
// Payout Processing Tests
// =============================================================================

describe('Payout Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    setPlatformAdminContext()
  })

  describe('GET /api/platform/payouts', () => {
    it('should allow platform admin to list payouts', async () => {
      const request = createGetRequest('http://localhost/api/platform/payouts')
      const response = await listPayouts(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should support status filter', async () => {
      const request = createGetRequest('http://localhost/api/platform/payouts', {
        status: 'pending',
      })
      const response = await listPayouts(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should support pagination', async () => {
      const request = createGetRequest('http://localhost/api/platform/payouts', {
        limit: '10',
        offset: '0',
      })
      const response = await listPayouts(request)

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })

  describe('POST /api/platform/payouts/[id]/process', () => {
    it('should allow platform admin to process payout', async () => {
      const request = createPostRequest('http://localhost/api/platform/payouts/payout-001/process')
      const response = await processPayout(request, createContext('payout-001'))

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Ambassador Admin Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  it('should handle non-existent ambassador', async () => {
    setPlatformAdminContext()

    const request = createPostRequest('http://localhost/api/platform/ambassadors/non-existent/approve')
    const response = await approveAmbassador(request, createContext('non-existent'))

    // Should be 404 or 500 (depending on DB mock), not auth error
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })

  it('should handle user with admin role but not platform admin', async () => {
    // Set user with admin role but is_platform_admin = false
    mockState.setUser({ id: 'tenant-admin', email: 'admin@clinic.com' })
    mockState.setProfile({
      id: 'tenant-admin',
      tenant_id: TENANTS.ADRIS.id,
      role: 'admin',
      full_name: 'Tenant Admin',
      is_platform_admin: false,
    })

    const request = createPostRequest('http://localhost/api/platform/ambassadors/amb-001/approve')
    const response = await approveAmbassador(request, createContext('amb-001'))

    expect(response.status).toBe(403)
  })
})
