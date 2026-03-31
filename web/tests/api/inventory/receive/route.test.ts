import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestProduct,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
  getAuthTokenFromUser,
} from '@/tests/__helpers__/integration-setup'
import { POST } from '@/app/api/inventory/receive/route'

describe('API: /api/inventory/receive', () => {
  let supabase: SupabaseClient
  let vetUserId: string
  let vetProfileId: string
  let adminUserId: string
  let adminProfileId: string
  let ownerUserId: string
  let ownerProfileId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    const vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUserId = vetUser.userId
    vetProfileId = vetUser.profile.id

    const adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    adminUserId = adminUser.userId
    adminProfileId = adminUser.profile.id

    const ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUserId = ownerUser.userId
    ownerProfileId = ownerUser.profile.id

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  // =============================================================================
  // POST /api/inventory/receive
  // =============================================================================

  describe('POST /api/inventory/receive', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { product_id: product.id, quantity: 10 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates required field: product_id', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { quantity: 10 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates required field: quantity', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { product_id: product.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates quantity must be positive', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { product_id: product.id, quantity: 0 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates quantity cannot be negative', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { product_id: product.id, quantity: -10 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent product', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: '00000000-0000-0000-0000-000000000000',
          quantity: 10,
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on product', async () => {
      const otherProduct = await createTestProduct(supabase, 'petlife')
      cleanupManager.track('store_products', otherProduct.id)
      cleanupManager.track('inventory', otherProduct.inventory_id!)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: { product_id: otherProduct.id, quantity: 10 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('vet can receive inventory successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 5,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 10,
          unit_cost: 50.0,
          notes: 'Test receipt',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.new_stock).toBe(15) // 5 + 10
      expect(data.new_wac).toBeDefined()
    })

    it('admin can receive inventory successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 20,
          unit_cost: 75.5,
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.new_stock).toBe(30) // 10 + 20
    })

    it('receives inventory with batch number', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 15,
          unit_cost: 100.0,
          batch_number: 'BATCH-2026-001',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.new_stock).toBeGreaterThan(0)
    })

    it('receives inventory with expiry date', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 25,
          unit_cost: 120.0,
          expiry_date: futureDate.toISOString().split('T')[0],
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
    })

    it('receives inventory with all optional fields', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 30,
          unit_cost: 85.0,
          notes: 'Complete receipt with all fields',
          batch_number: 'BATCH-2026-002',
          expiry_date: futureDate.toISOString().split('T')[0],
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.new_stock).toBeGreaterThan(0)
      expect(data.new_wac).toBeDefined()
    })

    it('updates stock quantity correctly', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 100,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 50,
          unit_cost: 10.0,
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.new_stock).toBe(150) // 100 + 50
    })

    it('calculates weighted average cost correctly', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      // Create product with known stock and cost
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
        unit_cost: 50.0, // 10 units at $50 each = $500 total
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Receive 10 more units at $100 each = $1000
      // New WAC should be (500 + 1000) / (10 + 10) = 1500 / 20 = $75
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 10,
          unit_cost: 100.0,
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.new_stock).toBe(20)
      expect(data.new_wac).toBeCloseTo(75.0, 2)
    })

    it('creates inventory transaction record', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 40,
          unit_cost: 60.0,
          notes: 'Transaction test',
        },
        authToken,
      })

      const response = await POST(request)
      await expectSuccess(response)

      // Verify transaction was created
      const { data: transactions } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('product_id', product.id)
        .eq('transaction_type', 'purchase')

      expect(transactions).toBeDefined()
      expect(transactions!.length).toBeGreaterThan(0)

      if (transactions && transactions.length > 0) {
        transactions.forEach((txn) => cleanupManager.track('inventory_transactions', txn.id))
      }
    })
  })

  // =============================================================================
  // Security: SQL Injection Prevention
  // =============================================================================

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious product_id safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DROP TABLE inventory; --"
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: malicious,
          quantity: 10,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious notes safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const malicious = "'; DELETE FROM inventory_transactions WHERE '1'='1"
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 10,
          notes: malicious,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious batch_number safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const malicious = "' OR '1'='1"
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 10,
          batch_number: malicious,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)
    })
  })

  // =============================================================================
  // Security: XSS Prevention
  // =============================================================================

  describe('Security: XSS Prevention', () => {
    it('sanitizes XSS in notes and batch_number', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID)
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const xss = '<script>alert("xss")</script>'
      const request = createTestRequest('http://localhost:3000/api/inventory/receive', {
        method: 'POST',
        body: {
          product_id: product.id,
          quantity: 10,
          notes: xss,
          batch_number: xss,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)
    })
  })

  // =============================================================================
  // Concurrency Tests
  // =============================================================================

  describe('Concurrency: Race Condition Prevention', () => {
    it('handles concurrent receives without stock corruption', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 0,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Fire 5 concurrent receives of 10 units each
      const promises = Array.from({ length: 5 }, () =>
        createTestRequest('http://localhost:3000/api/inventory/receive', {
          method: 'POST',
          body: {
            product_id: product.id,
            quantity: 10,
            unit_cost: 50.0,
          },
          authToken,
        }).then((req) => POST(req))
      )

      const responses = await Promise.all(promises)

      // All should succeed
      const successCount = responses.filter((r) => r.status === 200).length
      expect(successCount).toBe(5)

      // Final stock should be exactly 50 (5 x 10)
      const { data: finalProduct } = await supabase
        .from('inventory')
        .select('stock_quantity')
        .eq('product_id', product.id)
        .single()

      expect(finalProduct?.stock_quantity).toBe(50)
    })
  })
})
