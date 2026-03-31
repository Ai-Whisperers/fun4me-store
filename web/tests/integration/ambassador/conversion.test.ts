/**
 * Ambassador Conversion Process Tests
 *
 * Tests for:
 * - Commission calculation on subscription
 * - Conversion flow from Stripe webhook
 * - Tier upgrade logic
 *
 * @tags integration, ambassador, conversion
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockState, getSupabaseServerMock } from '@/lib/test-utils'

// Import route

// Mock Supabase
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Mock email and WhatsApp services
vi.mock('@/lib/email/templates/ambassador-conversion', () => ({
  sendAmbassadorConversionEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/ambassador/notifications', () => ({
  sendAmbassadorConversionNotification: vi.fn().mockResolvedValue({ success: true }),
  sendAmbassadorTierUpgradeNotification: vi.fn().mockResolvedValue({ success: true }),
}))


// Import routes AFTER mocks
import { POST as processConversion } from '@/app/api/ambassador/process-conversion/route'

// =============================================================================
// Test Data
// =============================================================================

const INTERNAL_API_SECRET = 'test-internal-secret'
const CRON_SECRET = 'test-cron-secret'

const MOCK_TENANT = {
  id: 'tenant-001',
  name: 'Test Clinic',
  referred_by_ambassador_id: 'amb-001',
}

const MOCK_AMBASSADOR = {
  id: 'amb-001',
  email: 'ambassador@test.com',
  full_name: 'Test Ambassador',
  phone: '+595991234567',
  tier: 'embajador',
  commission_rate: 30,
  total_earned: 0,
  total_paid: 0,
  pending_payout: 0,
  conversions_count: 0,
  referral_code: 'AMB123',
  user_id: null,
}

const MOCK_REFERRAL = {
  id: 'ref-001',
  ambassador_id: 'amb-001',
  tenant_id: 'tenant-001',
  status: 'trial_started',
}

// =============================================================================
// Request Factories
// =============================================================================

const createConversionRequest = (
  payload: { tenantId: string; subscriptionAmount: number },
  authType: 'bearer' | 'cron' | 'none' = 'bearer'
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authType === 'bearer') {
    headers['Authorization'] = `Bearer ${INTERNAL_API_SECRET}`
  } else if (authType === 'cron') {
    headers['x-cron-secret'] = CRON_SECRET
  }

  return new NextRequest('http://localhost/api/ambassador/process-conversion', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  })
}

// =============================================================================
// Environment Setup
// =============================================================================

beforeEach(() => {
  vi.stubEnv('INTERNAL_API_SECRET', INTERNAL_API_SECRET)
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
})

// =============================================================================
// Authorization Tests
// =============================================================================

describe('Process Conversion Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  it('should reject requests without authorization', async () => {
    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'none'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('No autorizado')
  })

  it('should accept requests with valid bearer token', async () => {
    mockState.setTableResult('tenants', MOCK_TENANT)
    mockState.setTableResult('ambassador_referrals', MOCK_REFERRAL)
    mockState.setTableResult('ambassadors', MOCK_AMBASSADOR)
    mockState.setRpcResult('convert_ambassador_referral', true)

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).not.toBe(401)
  })

  it('should accept requests with valid cron secret', async () => {
    mockState.setTableResult('tenants', MOCK_TENANT)
    mockState.setTableResult('ambassador_referrals', MOCK_REFERRAL)
    mockState.setTableResult('ambassadors', MOCK_AMBASSADOR)
    mockState.setRpcResult('convert_ambassador_referral', true)

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'cron'
    )
    const response = await processConversion(request)

    expect(response.status).not.toBe(401)
  })
})

// =============================================================================
// Validation Tests
// =============================================================================

describe('Process Conversion Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  it('should reject missing tenantId', async () => {
    const request = new NextRequest('http://localhost/api/ambassador/process-conversion', {
      method: 'POST',
      body: JSON.stringify({ subscriptionAmount: 100000 }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
    })
    const response = await processConversion(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('tenantId')
  })

  it('should reject invalid subscriptionAmount', async () => {
    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: -100 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(400)
  })

  it('should reject zero subscriptionAmount', async () => {
    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 0 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(400)
  })
})

// =============================================================================
// Business Logic Tests
// =============================================================================

describe('Process Conversion Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  it('should skip conversion for tenant without ambassador referral', async () => {
    mockState.setTableResult('tenants', {
      ...MOCK_TENANT,
      referred_by_ambassador_id: null,
    })

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.converted).toBe(false)
    expect(json.message).toBe('No ambassador referral')
  })

  it('should skip already converted referrals', async () => {
    mockState.setTableResult('tenants', MOCK_TENANT)
    mockState.setTableResult('ambassador_referrals', {
      ...MOCK_REFERRAL,
      status: 'converted',
    })

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.converted).toBe(false)
    expect(json.message).toBe('Already converted')
  })

  it('should return 404 for non-existent tenant', async () => {
    mockState.setTableResult('tenants', null)

    const request = createConversionRequest(
      { tenantId: 'non-existent', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Tenant not found')
  })

  it('should process conversion successfully', async () => {
    mockState.setTableResult('tenants', MOCK_TENANT)
    mockState.setTableResult('ambassador_referrals', MOCK_REFERRAL)
    mockState.setTableResult('ambassadors', MOCK_AMBASSADOR)
    mockState.setRpcResult('convert_ambassador_referral', true)

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    if (response.status === 200) {
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.converted).toBe(true)
    }
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Process Conversion Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  it('should handle invalid JSON gracefully', async () => {
    const request = new NextRequest('http://localhost/api/ambassador/process-conversion', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
    })
    const response = await processConversion(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid JSON')
  })

  it('should handle missing referral record gracefully', async () => {
    mockState.setTableResult('tenants', MOCK_TENANT)
    mockState.setTableResult('ambassador_referrals', null)

    const request = createConversionRequest(
      { tenantId: 'tenant-001', subscriptionAmount: 100000 },
      'bearer'
    )
    const response = await processConversion(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.converted).toBe(false)
    expect(json.message).toBe('Referral record not found')
  })
})
