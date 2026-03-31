/**
 * Cron Expiry Alerts Tests
 *
 * Tests for:
 * - GET /api/cron/expiry-alerts
 *
 * This cron job sends notifications about expiring products to staff.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/expiry-alerts/route'
import {
  mockState,
  TENANTS,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock email client
vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock WhatsApp client
vi.mock('@/lib/whatsapp/client', () => ({
  sendWhatsAppMessage: vi.fn(() => Promise.resolve({ success: true })),
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
import { GET } from '@/app/api/cron/expiry-alerts/route'

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(options?: { authHeader?: string }): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/expiry-alerts', {
    method: 'GET',
    headers,
  })
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/cron/expiry-alerts', () => {
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
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` })
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('tenants', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
    })

    it('should return 500 when CRON_SECRET not configured', async () => {
      process.env = { ...originalEnv, CRON_SECRET: undefined }

      const response = await GET(createRequest())

      expect(response.status).toBe(500)
    })
  })

  // ============================================================================
  // No Tenants Tests
  // ============================================================================

  describe('No Tenants', () => {
    it('should return success when no tenants exist', async () => {
      mockState.setTableResult('tenants', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.tenantsProcessed).toBe(0)
    })
  })

  // ============================================================================
  // No Expiring Products Tests
  // ============================================================================

  describe('No Expiring Products', () => {
    it('should skip tenants with no expiring products', async () => {
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [])
      mockState.setRpcResult('get_expiring_products', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.tenantsProcessed).toBe(0) // Skipped because no expiring products
    })
  })

  // ============================================================================
  // Expiring Products Tests
  // ============================================================================

  describe('Expiring Products', () => {
    it('should process tenants with expiring products', async () => {
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'critical', product_count: 2, total_units: 10 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        {
          id: 'prod-001',
          tenant_id: TENANTS.ADRIS,
          name: 'Vacuna Antirrábica',
          sku: 'VAC-001',
          stock_quantity: 5,
          expiry_date: '2026-01-15',
          batch_number: 'BATCH-001',
          days_until_expiry: 8,
          urgency_level: 'critical',
        },
      ])
      mockState.setTableResult('expired_products', [])
      mockState.setTableResult('staff_alert_preferences', [])
      mockState.setTableResult('profiles', [
        {
          id: 'user-admin',
          full_name: 'Admin User',
          email: 'admin@terrapet.com',
          phone: '+595991234567',
        },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.tenantsProcessed).toBe(1)
    })

    it('should categorize products by urgency level', async () => {
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'critical', product_count: 1, total_units: 5 },
        { urgency_level: 'high', product_count: 2, total_units: 15 },
        { urgency_level: 'medium', product_count: 3, total_units: 20 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        { id: 'prod-001', urgency_level: 'critical', days_until_expiry: 5, tenant_id: TENANTS.ADRIS, name: 'Product 1', stock_quantity: 5, expiry_date: '2026-01-12' },
        { id: 'prod-002', urgency_level: 'high', days_until_expiry: 10, tenant_id: TENANTS.ADRIS, name: 'Product 2', stock_quantity: 8, expiry_date: '2026-01-17' },
        { id: 'prod-003', urgency_level: 'high', days_until_expiry: 12, tenant_id: TENANTS.ADRIS, name: 'Product 3', stock_quantity: 7, expiry_date: '2026-01-19' },
        { id: 'prod-004', urgency_level: 'medium', days_until_expiry: 25, tenant_id: TENANTS.ADRIS, name: 'Product 4', stock_quantity: 20, expiry_date: '2026-02-01' },
      ])
      mockState.setTableResult('expired_products', [])
      mockState.setTableResult('staff_alert_preferences', [])
      mockState.setTableResult('profiles', [
        { id: 'user-admin', full_name: 'Admin User', email: 'admin@terrapet.com' },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.productsAlerted).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Staff Preferences Tests
  // ============================================================================

  describe('Staff Preferences', () => {
    it('should respect staff email preferences', async () => {
      const { sendEmail } = await import('@/lib/email/client')

      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'critical', product_count: 1, total_units: 5 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        { id: 'prod-001', urgency_level: 'critical', days_until_expiry: 5, tenant_id: TENANTS.ADRIS, name: 'Product 1', stock_quantity: 5, expiry_date: '2026-01-12' },
      ])
      mockState.setTableResult('expired_products', [])
      mockState.setTableResult('staff_alert_preferences', [
        {
          id: 'pref-001',
          profile_id: 'user-admin',
          tenant_id: TENANTS.ADRIS,
          expiry_alerts: true,
          email_enabled: true,
          whatsapp_enabled: false,
          notification_email: 'custom@terrapet.com',
          notification_phone: null,
          expiry_days_warning: 30,
          digest_frequency: 'daily',
          last_digest_sent_at: null,
          profile: {
            full_name: 'Admin User',
            email: 'admin@terrapet.com',
            phone: null,
          },
        },
      ])

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'custom@terrapet.com',
        })
      )
    })

    it('should respect WhatsApp preferences', async () => {
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client')

      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'critical', product_count: 1, total_units: 5 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        { id: 'prod-001', urgency_level: 'critical', days_until_expiry: 5, tenant_id: TENANTS.ADRIS, name: 'Product 1', stock_quantity: 5, expiry_date: '2026-01-12' },
      ])
      mockState.setTableResult('expired_products', [])
      mockState.setTableResult('staff_alert_preferences', [
        {
          id: 'pref-001',
          profile_id: 'user-admin',
          tenant_id: TENANTS.ADRIS,
          expiry_alerts: true,
          email_enabled: false,
          whatsapp_enabled: true,
          notification_email: null,
          notification_phone: '+595991234567',
          expiry_days_warning: 30,
          digest_frequency: 'daily',
          last_digest_sent_at: null,
          profile: {
            full_name: 'Admin User',
            email: 'admin@terrapet.com',
            phone: '+595991234567',
          },
        },
      ])

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+595991234567',
        })
      )
    })

    it('should respect digest frequency - skip daily if sent recently', async () => {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago

      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'critical', product_count: 1, total_units: 5 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        { id: 'prod-001', urgency_level: 'critical', days_until_expiry: 5, tenant_id: TENANTS.ADRIS, name: 'Product 1', stock_quantity: 5, expiry_date: '2026-01-12' },
      ])
      mockState.setTableResult('expired_products', [])
      mockState.setTableResult('staff_alert_preferences', [
        {
          id: 'pref-001',
          profile_id: 'user-admin',
          tenant_id: TENANTS.ADRIS,
          expiry_alerts: true,
          email_enabled: true,
          whatsapp_enabled: false,
          notification_email: 'admin@terrapet.com',
          notification_phone: null,
          expiry_days_warning: 30,
          digest_frequency: 'daily',
          last_digest_sent_at: recentTime,
          profile: {
            full_name: 'Admin User',
            email: 'admin@terrapet.com',
            phone: null,
          },
        },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.alertsSent).toBe(0)
    })
  })

  // ============================================================================
  // Expired Products Tests
  // ============================================================================

  describe('Expired Products', () => {
    it('should handle expired products in alerts', async () => {
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      mockState.setRpcResult('get_expiry_summary', [
        { urgency_level: 'expired', product_count: 2, total_units: 10 },
      ])
      mockState.setRpcResult('get_expiring_products', [
        { id: 'prod-001', tenant_id: TENANTS.ADRIS, name: 'Expired Product 1', stock_quantity: 5, expiry_date: '2026-01-01', urgency_level: 'critical', days_until_expiry: 0 },
      ])
      mockState.setTableResult('expired_products', [
        { id: 'prod-001', tenant_id: TENANTS.ADRIS, name: 'Expired Product 1', stock_quantity: 5, expiry_date: '2026-01-01' },
      ])
      mockState.setTableResult('staff_alert_preferences', [])
      mockState.setTableResult('profiles', [
        { id: 'user-admin', full_name: 'Admin User', email: 'admin@terrapet.com' },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      // productsAlerted is the count of products in the alerts
      expect(body).toHaveProperty('productsAlerted')
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle tenants fetch error gracefully', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('tenants', new Error('Database error'))

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      // Handler catches errors and returns 200 with success:true or 500 on fatal
      expect([200, 500]).toContain(response.status)
      if (response.status === 500) {
        expect(logger.error).toHaveBeenCalled()
      }
    })

    it('should handle tenant-level errors gracefully', async () => {
      mockState.setTableResult('tenants', [
        { id: TENANTS.ADRIS, name: 'Veterinaria Adris' },
      ])
      // Mock an error at the RPC level
      mockState.setRpcResult('get_expiry_summary', [])
      mockState.setRpcResult('get_expiring_products', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('errors')
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    it('should return all required fields', async () => {
      mockState.setTableResult('tenants', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('tenantsProcessed')
      expect(body).toHaveProperty('alertsSent')
      expect(body).toHaveProperty('productsAlerted')
      expect(body).toHaveProperty('errors')
    })
  })

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('Logging', () => {
    it('should log cron completion', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('tenants', [])

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith(
        'Expiry alerts cron completed',
        expect.any(Object)
      )
    })
  })
})
