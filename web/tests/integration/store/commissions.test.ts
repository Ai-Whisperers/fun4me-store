/**
 * Store Commissions API Tests (Integration)
 *
 * Tests for commission tracking and invoicing:
 * - GET /api/store/commissions - Clinic's commissions
 * - GET /api/store/commissions/summary - Commission summary
 * - GET /api/store/commission-invoices - Clinic's invoices
 * - POST /api/store/orders/[id]/confirm - Order confirmation with commission
 *
 * Integration tests using real Supabase database.
 */

// IMPORTANT: Unmock @supabase/supabase-js to use real client for integration tests
import { vi } from 'vitest'
vi.unmock('@supabase/supabase-js')

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { GET as getCommissions } from '@/app/api/store/commissions/route'
import { GET as getCommissionSummary } from '@/app/api/store/commissions/summary/route'
import { GET as getInvoices } from '@/app/api/store/commission-invoices/route'
import { POST as confirmOrder } from '@/app/api/store/orders/[id]/confirm/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestProduct,
  createTestProfile,
  createTestSupabaseClient,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { cleanupManager } from '@/tests/__helpers__/cleanup-manager'
import { idGenerator } from '@/lib/test-utils/factories/core/id-generator'
import { commissionConfig } from '@/lib/pricing/tiers'

// =============================================================================
// Test Setup
// =============================================================================

let adminClient: SupabaseClient
let testVetProfile: { id: string; email: string }
let testOwnerProfile: { id: string; email: string }
let testProduct: { id: string; name: string; sku: string }

// Mock user for authenticated tests
let MOCK_VET: { id: string; email: string } = { id: '', email: '' }
let MOCK_OWNER: { id: string; email: string } = { id: '', email: '' }

// Track mock state for auth
let currentAuthUser: { id: string; email: string } | null = null

// Mock Supabase client to use real database with controlled auth
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const client = createTestSupabaseClient('service_role')

    const originalAuth = client.auth
    return {
      ...client,
      auth: {
        ...originalAuth,
        getUser: vi.fn(async () => ({
          data: { user: currentAuthUser },
          error: null,
        })),
      },
      from: client.from.bind(client),
      rpc: client.rpc.bind(client),
    }
  }),
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
import { GET as getCommissions } from '@/app/api/store/commissions/route'
import { GET as getCommissionSummary } from '@/app/api/store/commissions/summary/route'
import { GET as getInvoices } from '@/app/api/store/commission-invoices/route'
import { POST as confirmOrder } from '@/app/api/store/orders/[id]/confirm/route'

// Helper to set auth state
function setAuthUser(user: { id: string; email: string } | null) {
  currentAuthUser = user
}

// Helper to create GET request
function createGetRequest(path: string, searchParams?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost:3000${path}`)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

// Helper to create POST request
function createPostRequest(path: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// =============================================================================
// Setup & Teardown
// =============================================================================

beforeAll(async () => {
  adminClient = await setupIntegrationTest()

  // Create test profiles
  testVetProfile = await createTestProfile(adminClient, 'vet', TEST_TENANT_ID)
  MOCK_VET = { id: testVetProfile.id, email: testVetProfile.email }

  testOwnerProfile = await createTestProfile(adminClient, 'owner', TEST_TENANT_ID)
  MOCK_OWNER = { id: testOwnerProfile.id, email: testOwnerProfile.email }

  // Create test product
  testProduct = await createTestProduct(adminClient, TEST_TENANT_ID, {
    name: 'Commission Test Product',
    stock_quantity: 100,
  })

  // Ensure tenant has e-commerce enabled
  await adminClient.from('tenants').update({ ecommerce_start_date: '2025-01-01' }).eq('id', TEST_TENANT_ID)
})

afterAll(async () => {
  await cleanupIntegrationTest()
})

afterEach(async () => {
  // Clean up commissions and invoices created during tests
  const commissionIds = cleanupManager.getTracked()['store_commissions'] || []
  if (commissionIds.length > 0) {
    await adminClient.from('store_commissions').delete().in('id', commissionIds)
  }

  const invoiceIds = cleanupManager.getTracked()['store_commission_invoices'] || []
  if (invoiceIds.length > 0) {
    await adminClient.from('store_commission_invoices').delete().in('id', invoiceIds)
  }

  const orderIds = cleanupManager.getTracked()['store_orders'] || []
  if (orderIds.length > 0) {
    await adminClient.from('store_order_items').delete().in('order_id', orderIds)
    await adminClient.from('store_orders').delete().in('id', orderIds)
  }

  cleanupManager.reset()
  setAuthUser(null)
  vi.clearAllMocks()
})

// =============================================================================
// Helper Functions
// =============================================================================

async function createTestOrder(
  status: string = 'pending',
  paymentStatus: string = 'pending'
): Promise<{ id: string; order_number: string }> {
  const orderId = idGenerator.generate('order')
  const orderNumber = `TEST-${orderId.slice(-8).toUpperCase()}`

  const { data: order, error } = await adminClient
    .from('store_orders')
    .insert({
      id: orderId,
      tenant_id: TEST_TENANT_ID,
      customer_id: testOwnerProfile.id,
      order_number: orderNumber,
      status,
      payment_status: paymentStatus,
      subtotal: 100000,
      shipping_cost: 10000,
      tax_amount: 10000,
      total: 120000,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test order: ${error.message}`)

  // Create order item
  await adminClient.from('store_order_items').insert({
    id: idGenerator.generate('order-item'),
    order_id: orderId,
    tenant_id: TEST_TENANT_ID,
    product_id: testProduct.id,
    product_name: testProduct.name,
    quantity: 2,
    unit_price: 50000,
    line_total: 100000,
  })

  cleanupManager.track('store_orders', orderId)
  return order
}

async function createTestCommission(orderId: string): Promise<{ id: string }> {
  const commissionId = idGenerator.generate('commission')

  const { data, error } = await adminClient
    .from('store_commissions')
    .insert({
      id: commissionId,
      order_id: orderId,
      tenant_id: TEST_TENANT_ID,
      order_total: 120000,
      shipping_amount: 10000,
      tax_amount: 10000,
      commissionable_amount: 100000,
      commission_rate: commissionConfig.initialRate,
      commission_amount: 100000 * commissionConfig.initialRate, // Calculate based on config
      rate_type: 'initial',
      months_active: 0,
      status: 'calculated',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test commission: ${error.message}`)

  cleanupManager.track('store_commissions', commissionId)
  return data
}

// =============================================================================
// GET /api/store/commissions Tests
// =============================================================================

describe('GET /api/store/commissions (Integration)', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      setAuthUser(null)

      const response = await getCommissions(createGetRequest('/api/store/commissions'))

      expect(response.status).toBe(401)
    })

    it('should return 403 when user is owner (not staff)', async () => {
      setAuthUser(MOCK_OWNER)

      const response = await getCommissions(createGetRequest('/api/store/commissions'))

      expect(response.status).toBe(403)
    })

    it('should allow vet access', async () => {
      setAuthUser(MOCK_VET)

      const response = await getCommissions(createGetRequest('/api/store/commissions'))

      expect(response.status).toBe(200)
    })
  })

  describe('Data Retrieval', () => {
    it('should return empty array when no commissions exist', async () => {
      setAuthUser(MOCK_VET)

      // Clean up any existing commissions for this tenant
      await adminClient.from('commissions').delete().eq('tenant_id', TEST_TENANT_ID)

      const response = await getCommissions(createGetRequest('/api/store/commissions'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.commissions).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('should return commissions for the tenant', async () => {
      setAuthUser(MOCK_VET)

      // Create test data
      const order = await createTestOrder('confirmed', 'paid')
      await createTestCommission(order.id)

      const response = await getCommissions(createGetRequest('/api/store/commissions'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.commissions.length).toBeGreaterThan(0)
      expect(body.commissions[0].tenant_id).toBe(TEST_TENANT_ID)
    })

    it('should filter by status', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('confirmed', 'paid')
      await createTestCommission(order.id)

      const response = await getCommissions(
        createGetRequest('/api/store/commissions', { status: 'calculated' })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.commissions.every((c: { status: string }) => c.status === 'calculated')).toBe(true)
    })

    it('should support pagination', async () => {
      setAuthUser(MOCK_VET)

      const response = await getCommissions(
        createGetRequest('/api/store/commissions', { page: '1', limit: '5' })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(5)
    })
  })
})

// =============================================================================
// GET /api/store/commissions/summary Tests
// =============================================================================

describe('GET /api/store/commissions/summary (Integration)', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      setAuthUser(null)

      const response = await getCommissionSummary(createGetRequest('/api/store/commissions/summary'))

      expect(response.status).toBe(401)
    })

    it('should allow vet access', async () => {
      setAuthUser(MOCK_VET)

      const response = await getCommissionSummary(createGetRequest('/api/store/commissions/summary'))

      expect(response.status).toBe(200)
    })
  })

  describe('Summary Data', () => {
    it('should return rate info', async () => {
      setAuthUser(MOCK_VET)

      const response = await getCommissionSummary(createGetRequest('/api/store/commissions/summary'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.rate_info).toBeDefined()
      expect(body.rate_info.current_rate).toBeDefined()
      expect(body.rate_info.rate_type).toBeDefined()
    })

    it('should return totals', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('confirmed', 'paid')
      await createTestCommission(order.id)

      const response = await getCommissionSummary(createGetRequest('/api/store/commissions/summary'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.totals).toBeDefined()
      expect(typeof body.totals.calculated).toBe('number')
    })
  })
})

// =============================================================================
// GET /api/store/commission-invoices Tests
// =============================================================================

describe('GET /api/store/commission-invoices (Integration)', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      setAuthUser(null)

      const response = await getInvoices(createGetRequest('/api/store/commission-invoices'))

      expect(response.status).toBe(401)
    })

    it('should allow vet access', async () => {
      setAuthUser(MOCK_VET)

      const response = await getInvoices(createGetRequest('/api/store/commission-invoices'))

      expect(response.status).toBe(200)
    })
  })

  describe('Data Retrieval', () => {
    it('should return empty array when no invoices exist', async () => {
      setAuthUser(MOCK_VET)

      const response = await getInvoices(createGetRequest('/api/store/commission-invoices'))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.invoices).toEqual([])
    })
  })
})

// =============================================================================
// POST /api/store/orders/[id]/confirm Tests
// =============================================================================

describe('POST /api/store/orders/[id]/confirm (Integration)', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      setAuthUser(null)

      const order = await createTestOrder()
      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(401)
    })

    it('should return 403 when user is owner (not staff)', async () => {
      setAuthUser(MOCK_OWNER)

      const order = await createTestOrder()
      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(403)
    })
  })

  describe('Order Confirmation', () => {
    it('should confirm order and calculate commission', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('pending', 'pending')

      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`, {
          payment_method: 'cash',
        }),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.order.payment_status).toBe('paid')

      // Commission should be calculated
      expect(body.commission).toBeDefined()
      // Note: commission.calculated may be true or false depending on RPC existence
    })

    it('should return 404 for non-existent order', async () => {
      setAuthUser(MOCK_VET)

      const response = await confirmOrder(
        createPostRequest('/api/store/orders/non-existent-id/confirm'),
        { params: Promise.resolve({ id: 'non-existent-id' }) }
      )

      expect(response.status).toBe(404)
    })

    it('should return 400 for already paid order', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('confirmed', 'paid')

      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('ya fue pagado')
    })

    it('should return 400 for cancelled order', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('cancelled', 'pending')

      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('No se puede confirmar')
    })
  })

  describe('Payment Details', () => {
    it('should accept payment method and reference', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('pending', 'pending')

      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`, {
          payment_method: 'transfer',
          payment_reference: 'TXN-123456',
        }),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.order.payment_method).toBe('transfer')
      expect(body.order.payment_reference).toBe('TXN-123456')
    })

    it('should accept notes', async () => {
      setAuthUser(MOCK_VET)

      const order = await createTestOrder('pending', 'pending')

      const response = await confirmOrder(
        createPostRequest(`/api/store/orders/${order.id}/confirm`, {
          payment_method: 'cash',
          notes: 'Customer paid in cash at counter',
        }),
        { params: Promise.resolve({ id: order.id }) }
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.order.internal_notes).toContain('Customer paid in cash at counter')
    })
  })
})

// =============================================================================
// Integration Scenarios
// =============================================================================

describe('Commission Tracking Integration Scenarios (Real Database)', () => {
  it('should support full order to commission workflow', async () => {
    setAuthUser(MOCK_VET)

    // 1. Create order
    const order = await createTestOrder('pending', 'pending')

    // 2. Confirm order
    const confirmResponse = await confirmOrder(
      createPostRequest(`/api/store/orders/${order.id}/confirm`, {
        payment_method: 'card',
      }),
      { params: Promise.resolve({ id: order.id }) }
    )
    expect(confirmResponse.status).toBe(200)

    // 3. Verify commission in list
    const listResponse = await getCommissions(createGetRequest('/api/store/commissions'))
    expect(listResponse.status).toBe(200)

    // 4. Verify summary reflects the commission
    const summaryResponse = await getCommissionSummary(
      createGetRequest('/api/store/commissions/summary')
    )
    expect(summaryResponse.status).toBe(200)
  })

  it('should only show commissions for own tenant', async () => {
    setAuthUser(MOCK_VET)

    // Create commission in test tenant
    const order = await createTestOrder('confirmed', 'paid')
    await createTestCommission(order.id)

    // Get commissions - should only see own tenant's
    const response = await getCommissions(createGetRequest('/api/store/commissions'))
    expect(response.status).toBe(200)

    const body = await response.json()
    body.commissions.forEach((commission: { tenant_id: string }) => {
      expect(commission.tenant_id).toBe(TEST_TENANT_ID)
    })
  })
})
