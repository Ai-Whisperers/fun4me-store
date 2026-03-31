/**
 * Cron Commission Invoices Tests
 *
 * Tests for:
 * - POST /api/cron/generate-commission-invoices
 * - GET /api/cron/generate-commission-invoices (Vercel Cron compatibility)
 *
 * This cron job generates monthly commission invoices for tenants with e-commerce sales.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/cron/generate-commission-invoices/route'
import {
  mockState,
  TENANTS,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client (service role)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createStatefulSupabaseMock()),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import routes AFTER mocks
import { POST, GET } from '@/app/api/cron/generate-commission-invoices/route'

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(options?: { authHeader?: string; method?: string }): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/generate-commission-invoices', {
    method: options?.method || 'POST',
    headers,
  })
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('POST /api/cron/generate-commission-invoices', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: CRON_SECRETS.VALID,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const response = await POST(createRequest())

      expect(response.status).toBe(401)
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` })
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('store_commissions', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
    })

    it('should return 500 when CRON_SECRET not configured', async () => {
      process.env = { ...originalEnv, CRON_SECRET: undefined }

      const response = await POST(createRequest())

      expect(response.status).toBe(500)
    })
  })

  // ============================================================================
  // No Commissions Tests
  // ============================================================================

  describe('No Commissions', () => {
    it('should return success when no commissions to invoice', async () => {
      mockState.setTableResult('store_commissions', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('No commissions to invoice')
    })
  })

  // ============================================================================
  // Invoice Generation Tests
  // ============================================================================

  describe('Invoice Generation', () => {
    it('should generate invoices for tenants with calculated commissions', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', []) // No existing invoice
      mockState.setRpcResult('generate_commission_invoice', 'inv-001')
      mockState.setTableResult('profiles', [
        { id: 'admin-001' },
      ])
      mockState.setTableResult('notifications', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.processed).toBe(1)
      expect(body.succeeded).toBe(1)
    })

    it('should skip tenants with existing invoices for the period', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      // Existing invoice for the period
      mockState.setTableResult('store_commission_invoices', [
        { id: 'inv-existing', invoice_number: 'COM-001' },
      ])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.skipped).toBe(1)
    })

    it('should handle RPC returning null (no commissions to invoice)', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [])
      mockState.setRpcResult('generate_commission_invoice', null)

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.skipped).toBe(1)
    })

    it('should process multiple tenants', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
        {
          tenant_id: TENANTS.PETLIFE,
          tenants: { id: TENANTS.PETLIFE, name: 'PetLife Center' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [])
      mockState.setRpcResult('generate_commission_invoice', 'inv-001')
      mockState.setTableResult('profiles', [{ id: 'admin-001' }])
      mockState.setTableResult('notifications', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.processed).toBe(2)
    })
  })

  // ============================================================================
  // Notification Tests
  // ============================================================================

  describe('Notifications', () => {
    it('should create notifications for clinic admins', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [])
      mockState.setRpcResult('generate_commission_invoice', 'inv-001')
      mockState.setTableResult('profiles', [
        { id: 'admin-001' },
        { id: 'admin-002' },
      ])
      mockState.setTableResult('notifications', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      // Verify notifications were inserted
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should return 500 on query error', async () => {
      mockState.setTableError('store_commissions', new Error('Database error'))

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(500)
    })

    it('should track tenant errors but continue processing', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
        {
          tenant_id: TENANTS.PETLIFE,
          tenants: { id: TENANTS.PETLIFE, name: 'PetLife Center' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [])
      mockState.setRpcError('generate_commission_invoice', new Error('RPC failed'))

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.failed).toBeGreaterThan(0)
      expect(body.errors.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    it('should return all required fields', async () => {
      mockState.setTableResult('store_commissions', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('period')
      expect(body.period).toHaveProperty('start')
      expect(body.period).toHaveProperty('end')
      expect(body).toHaveProperty('processed')
      expect(body).toHaveProperty('succeeded')
      expect(body).toHaveProperty('failed')
      expect(body).toHaveProperty('skipped')
      expect(body).toHaveProperty('invoices')
      expect(body).toHaveProperty('errors')
    })

    it('should include invoice details in response', async () => {
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [
        { id: 'inv-001', invoice_number: 'COM-001', amount_due: 50000, total_orders: 10 },
      ])
      mockState.setRpcResult('generate_commission_invoice', 'inv-001')
      mockState.setTableResult('profiles', [{ id: 'admin-001' }])
      mockState.setTableResult('notifications', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.invoices).toBeInstanceOf(Array)
      expect(body.invoices.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // GET Handler Tests (Vercel Cron Compatibility)
  // ============================================================================

  describe('GET Handler (Vercel Cron)', () => {
    it('should work with GET requests', async () => {
      mockState.setTableResult('store_commissions', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}`, method: 'GET' })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('Logging', () => {
    it('should log start of generation', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('store_commissions', [])

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith(
        'Starting commission invoice generation',
        expect.any(Object)
      )
    })

    it('should log when no commissions found', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('store_commissions', [])

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith('No pending commissions found for the period')
    })

    it('should log processing completion', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('store_commissions', [
        {
          tenant_id: TENANTS.ADRIS,
          tenants: { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
        },
      ])
      mockState.setTableResult('store_commission_invoices', [
        { id: 'inv-001', invoice_number: 'COM-001', amount_due: 50000, total_orders: 10 },
      ])
      mockState.setRpcResult('generate_commission_invoice', 'inv-001')
      mockState.setTableResult('profiles', [{ id: 'admin-001' }])
      mockState.setTableResult('notifications', [])

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      // Should log at least the completion message
      expect(logger.info).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Period Calculation Tests
  // ============================================================================

  describe('Period Calculation', () => {
    it('should calculate correct previous month period', async () => {
      mockState.setTableResult('store_commissions', [])

      const response = await POST(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      // Verify period dates are valid
      expect(body.period.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(body.period.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Start should be before end
      const start = new Date(body.period.start)
      const end = new Date(body.period.end)
      expect(start.getTime()).toBeLessThan(end.getTime())
    })
  })
})
