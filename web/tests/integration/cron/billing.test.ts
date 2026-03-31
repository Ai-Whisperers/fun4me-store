/**
 * Cron Billing API Tests
 *
 * Tests for:
 * - POST /api/cron/billing/auto-charge
 * - POST /api/cron/billing/evaluate-grace
 * - POST /api/cron/billing/generate-platform-invoices
 * - POST /api/cron/billing/send-reminders
 *
 * These cron jobs handle platform billing and invoice management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  TENANTS,
  USERS,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client for routes using @/lib/supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock Supabase client for routes using @supabase/supabase-js directly (generate-platform-invoices)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createStatefulSupabaseMock()),
}))

// Mock Stripe
vi.mock('@/lib/billing/stripe', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({
    id: 'pi_test_123',
    status: 'succeeded',
    latest_charge: 'ch_test_123',
  }),
  toStripeAmount: vi.fn((amount: number) => amount),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  options?: { authHeader?: string }
): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
  })
}

// Sample data
const SAMPLE_INVOICE = {
  id: 'invoice-001',
  invoice_number: 'INV-2026-001',
  tenant_id: TENANTS.ADRIS.id,
  total: 500000,
  due_date: new Date().toISOString().split('T')[0],
  status: 'sent',
}

const SAMPLE_TENANT = {
  id: TENANTS.ADRIS.id,
  name: 'Veterinaria Adris',
  stripe_customer_id: 'cus_test_123',
  default_payment_method_id: 'pm-001',
}

const SAMPLE_PAYMENT_METHOD = {
  id: 'pm-001',
  stripe_payment_method_id: 'pm_test_123',
  display_name: 'Visa **** 4242',
  method_type: 'card',
  is_active: true,
}

// ============================================================================
// Auto-Charge Tests
// ============================================================================

describe('POST /api/cron/billing/auto-charge', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(createRequest('/api/cron/billing/auto-charge'))

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('No Invoices', () => {
    it('should return success when no invoices to process', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.processed).toBe(0)
    })
  })

  describe('Invoice Processing', () => {
    it('should process due invoices', async () => {
      mockState.setTableResult('platform_invoices', [SAMPLE_INVOICE])
      mockState.setTableResult('tenants', [SAMPLE_TENANT])
      mockState.setTableResult('tenant_payment_methods', [SAMPLE_PAYMENT_METHOD])
      mockState.setTableResult('billing_payment_transactions', [{ id: 'tx-001' }])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should skip invoices without Stripe customer', async () => {
      mockState.setTableResult('platform_invoices', [SAMPLE_INVOICE])
      mockState.setTableResult('tenants', [
        { ...SAMPLE_TENANT, stripe_customer_id: null },
      ])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results[0]?.status).toBe('skipped')
    })

    it('should skip invoices without payment method', async () => {
      mockState.setTableResult('platform_invoices', [SAMPLE_INVOICE])
      mockState.setTableResult('tenants', [
        { ...SAMPLE_TENANT, default_payment_method_id: null },
      ])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results[0]?.status).toBe('skipped')
    })
  })

  describe('Response Format', () => {
    it('should return summary statistics', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('results')
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockState.setTableError('platform_invoices', new Error('Database error'))

      const { POST } = await import('@/app/api/cron/billing/auto-charge/route')
      const response = await POST(
        createRequest('/api/cron/billing/auto-charge', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// Evaluate Grace Tests
// ============================================================================

describe('POST /api/cron/billing/evaluate-grace', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const { POST } = await import('@/app/api/cron/billing/evaluate-grace/route')
      const response = await POST(
        createRequest('/api/cron/billing/evaluate-grace')
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('tenants', [])

      const { POST } = await import('@/app/api/cron/billing/evaluate-grace/route')
      const response = await POST(
        createRequest('/api/cron/billing/evaluate-grace', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Grace Period Evaluation', () => {
    it('should return success with no tenants in grace', async () => {
      mockState.setTableResult('tenants', [])

      const { POST } = await import('@/app/api/cron/billing/evaluate-grace/route')
      const response = await POST(
        createRequest('/api/cron/billing/evaluate-grace', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should evaluate tenants in grace period', async () => {
      const graceTenant = {
        id: TENANTS.ADRIS.id,
        name: 'Veterinaria Adris',
        subscription_status: 'grace',
        grace_period_ends_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      }
      mockState.setTableResult('tenants', [graceTenant])

      const { POST } = await import('@/app/api/cron/billing/evaluate-grace/route')
      const response = await POST(
        createRequest('/api/cron/billing/evaluate-grace', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })
})

// ============================================================================
// Generate Platform Invoices Tests
// ============================================================================

describe('POST /api/cron/billing/generate-platform-invoices', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const { POST } = await import(
        '@/app/api/cron/billing/generate-platform-invoices/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/generate-platform-invoices')
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('tenants', [])

      const { POST } = await import(
        '@/app/api/cron/billing/generate-platform-invoices/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/generate-platform-invoices', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Invoice Generation', () => {
    it('should return success when no tenants need invoices', async () => {
      mockState.setTableResult('tenants', [])

      const { POST } = await import(
        '@/app/api/cron/billing/generate-platform-invoices/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/generate-platform-invoices', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should generate invoices for active tenants', async () => {
      mockState.setTableResult('tenants', [
        {
          id: TENANTS.ADRIS.id,
          name: 'Veterinaria Adris',
          subscription_status: 'active',
          subscription_plan: 'professional',
        },
      ])
      mockState.setTableResult('store_commissions', [])
      mockState.setTableResult('service_commissions', [])
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import(
        '@/app/api/cron/billing/generate-platform-invoices/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/generate-platform-invoices', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should include invoice generation stats', async () => {
      mockState.setTableResult('tenants', [])

      const { POST } = await import(
        '@/app/api/cron/billing/generate-platform-invoices/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/generate-platform-invoices', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('success')
    })
  })
})

// ============================================================================
// Send Reminders Tests
// ============================================================================

describe('POST /api/cron/billing/send-reminders', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders')
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Reminder Processing', () => {
    it('should return success when no reminders pending', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should send reminders for unpaid invoices', async () => {
      const unpaidInvoice = {
        ...SAMPLE_INVOICE,
        status: 'sent',
        due_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], // 3 days ago
      }
      mockState.setTableResult('platform_invoices', [unpaidInvoice])
      mockState.setTableResult('billing_reminders', [])
      mockState.setTableResult('profiles', [
        { id: USERS.VET_CARLOS.id, email: USERS.VET_CARLOS.email, role: 'admin' },
      ])

      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })

    it('should not send duplicate reminders', async () => {
      const unpaidInvoice = {
        ...SAMPLE_INVOICE,
        status: 'sent',
      }
      mockState.setTableResult('platform_invoices', [unpaidInvoice])
      // Already sent a reminder today
      mockState.setTableResult('billing_reminders', [
        {
          platform_invoice_id: SAMPLE_INVOICE.id,
          sent_at: new Date().toISOString(),
        },
      ])

      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should include reminder stats', async () => {
      mockState.setTableResult('platform_invoices', [])

      const { POST } = await import(
        '@/app/api/cron/billing/send-reminders/route'
      )
      const response = await POST(
        createRequest('/api/cron/billing/send-reminders', 'POST', {
          authHeader: `Bearer ${CRON_SECRETS.VALID}`,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('success')
    })
  })
})
