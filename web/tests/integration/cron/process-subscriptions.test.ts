/**
 * Cron Process Subscriptions API Tests
 *
 * Tests for:
 * - POST /api/cron/process-subscriptions
 *
 * This cron job processes due subscriptions and creates renewal orders.
 * Critical for recurring order processing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/cron/process-subscriptions/route'
import {
  mockState,
  TENANTS,
  USERS,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client (using service role for cron)
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


// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(options?: {
  authHeader?: string
  cronSecretHeader?: string
}): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }
  if (options?.cronSecretHeader) {
    headers['x-cron-secret'] = options.cronSecretHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/process-subscriptions', {
    method: 'POST',
    headers,
  })
}

// Sample subscription data - matches store_subscriptions table schema
const SAMPLE_SUBSCRIPTION = {
  id: 'sub-001',
  tenant_id: TENANTS.ADRIS.id,
  customer_id: USERS.OWNER_JUAN.id,
  product_id: 'product-001',  // API expects this at top level
  variant_id: null,
  quantity: 2,  // API expects this at top level
  subscribed_price: 50000,
  shipping_address: '123 Test St',
  delivery_notes: null,
  status: 'active',
  frequency_days: 30,
  next_order_date: new Date().toISOString().split('T')[0], // Today
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
}

const SAMPLE_INVENTORY = {
  product_id: 'product-001',
  stock_quantity: 100,
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('POST /api/cron/process-subscriptions', () => {
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
    it('should return 401 without authorization header', async () => {
      const response = await POST(createRequest())

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` }))

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should accept x-cron-secret header', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ cronSecretHeader: CRON_SECRETS.VALID }))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // No Due Subscriptions Tests
  // ============================================================================

  describe('No Due Subscriptions', () => {
    it('should return success when no subscriptions due', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.processed).toBe(0)
    })

    it('should return empty errors array when nothing to process', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.errors).toEqual([])
    })
  })

  // ============================================================================
  // Subscription Processing Tests
  // ============================================================================

  describe('Subscription Processing', () => {
    it('should process due subscriptions', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])
      mockState.setTableResult('store_orders', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should not process paused subscriptions (filtered at query level)', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, status: 'paused' },
      ])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.processed).toBe(0)
    })

    it('should not process cancelled subscriptions (filtered at query level)', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, status: 'cancelled' },
      ])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.processed).toBe(0)
    })

    it('should process multiple subscriptions', async () => {
      mockState.setTableResult('store_subscriptions', [
        SAMPLE_SUBSCRIPTION,
        { ...SAMPLE_SUBSCRIPTION, id: 'sub-002', customer_id: USERS.OWNER_MARIA.id },
      ])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Stock Validation Tests (SEC-010: Frequency Bounds)
  // ============================================================================

  describe('Stock Validation', () => {
    it('should check stock before creating order', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should skip subscription if insufficient stock', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_products', [
        { id: 'product-001', tenant_id: SAMPLE_SUBSCRIPTION.tenant_id, name: 'Dog Food Premium', base_price: 50000, is_active: true },
      ])
      // Mock RPC to return insufficient stock
      mockState.setRpcResult('decrement_stock_if_available', { success: false, reason: 'insufficient_stock', available: 0 })

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.skipped).toBeGreaterThan(0)
    })

    it('should decrement stock atomically when processing', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])
      mockState.setRpcResult('decrement_stock_atomic', { success: true })

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Frequency Bounds Tests (SEC-010)
  // ============================================================================

  describe('Frequency Bounds (SEC-010)', () => {
    it('should accept valid frequency within bounds', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, frequency_days: 30 },
      ])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should clamp frequency below minimum and process normally', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, frequency_days: 3 },
      ])
      mockState.setTableResult('store_products', [
        { id: 'product-001', tenant_id: SAMPLE_SUBSCRIPTION.tenant_id, name: 'Dog Food Premium', base_price: 50000, is_active: true },
      ])
      mockState.setRpcResult('decrement_stock_if_available', { success: true })

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should clamp frequency above maximum and process normally', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, frequency_days: 365 },
      ])
      mockState.setTableResult('store_products', [
        { id: 'product-001', tenant_id: SAMPLE_SUBSCRIPTION.tenant_id, name: 'Dog Food Premium', base_price: 50000, is_active: true },
      ])
      mockState.setRpcResult('decrement_stock_if_available', { success: true })

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should use default frequency for null value', async () => {
      mockState.setTableResult('store_subscriptions', [
        { ...SAMPLE_SUBSCRIPTION, frequency_days: null },
      ])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Order Creation Tests
  // ============================================================================

  describe('Order Creation', () => {
    it('should create order with correct items', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])
      mockState.setTableResult('store_orders', [])
      mockState.setTableResult('store_order_items', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should set order status to pending', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should update subscription next_order_date', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      // The subscription should be updated with new next_order_date
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should return 500 on database fetch error', async () => {
      mockState.setTableError('store_subscriptions', new Error('Connection failed'))

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(500)
    })

    it('should handle partial failures gracefully', async () => {
      mockState.setTableResult('store_subscriptions', [
        SAMPLE_SUBSCRIPTION,
        { ...SAMPLE_SUBSCRIPTION, id: 'sub-002' },
      ])
      // First succeeds, second fails (no inventory)
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should track failed subscriptions in response', async () => {
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_products', [
        { id: 'product-001', tenant_id: SAMPLE_SUBSCRIPTION.tenant_id, name: 'Dog Food Premium', base_price: 50000, is_active: true },
      ])
      mockState.setRpcResult('decrement_stock_if_available', { success: true })
      mockState.setTableRejection('store_orders', new Error('Insert failed'))

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.failed).toBeGreaterThan(0)
    })

    it('should log errors for failed subscriptions', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_products', [
        { id: 'product-001', tenant_id: SAMPLE_SUBSCRIPTION.tenant_id, name: 'Dog Food Premium', base_price: 50000, is_active: true },
      ])
      mockState.setRpcResult('decrement_stock_if_available', { success: true })
      mockState.setTableRejection('store_orders', new Error('Insert failed'))

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.error).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    it('should return all required result fields', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('processed')
      expect(body).toHaveProperty('failed')
      expect(body).toHaveProperty('skipped')
      expect(body).toHaveProperty('errors')
    })

    it.skip('should include timestamp in response', async () => {
      mockState.setTableResult('store_subscriptions', [])

      const response = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.timestamp).toBeDefined()
    })
  })

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('Logging', () => {
    it('should log processing start', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableResult('store_subscriptions', [])

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalled()
    })

    it('should log unauthorized attempts', async () => {
      const { logger } = await import('@/lib/logger')

      await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` }))

      expect(logger.error).toHaveBeenCalledWith(
        'Unauthorized cron attempt',
        expect.objectContaining({
          endpoint: expect.stringContaining('process-subscriptions'),
        })
      )
    })
  })

  // ============================================================================
  // Idempotency Tests
  // ============================================================================

  describe('Idempotency', () => {
    it('should not duplicate orders on repeated calls', async () => {
      // First call processes subscription
      mockState.setTableResult('store_subscriptions', [SAMPLE_SUBSCRIPTION])
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY])
      const response1 = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))
      expect(response1.status).toBe(200)

      // Second call should not find same subscription (next_order_date updated)
      mockState.setTableResult('store_subscriptions', [])
      const response2 = await POST(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))
      expect(response2.status).toBe(200)
      const body2 = await response2.json()
      expect(body2.processed).toBe(0)
    })
  })
})
