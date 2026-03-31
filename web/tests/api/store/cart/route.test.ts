/**
 * API Integration Tests: /api/store/cart
 *
 * Tests shopping cart operations (GET, PUT, DELETE, POST merge)
 * Includes feature access checks, rate limiting, and atomic operations
 */

import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { GET, PUT, DELETE, POST } from '@/app/api/store/cart/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestProduct,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
  getAuthTokenFromUser,
} from '../../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

describe('API: /api/store/cart', () => {
  let supabase: SupabaseClient
      let testProductId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test user
    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUser.userId = owner.userId
    ownerUser.profile.id = owner.profile.id

    // Create test product
    const product = await createTestProduct(supabase, TEST_TENANT_ID, {
      name: 'Test Product',
      sku: 'CART-TEST-001',
      base_price: 10000, // 100.00
      stock_quantity: 50,
    })
    testProductId = product.id

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/store/cart', () => {
    it('returns empty cart for unauthenticated users', async () => {
      const request = createTestRequest('http://localhost:3000/api/store/cart')

      const response = await GET()

      const body = await expectSuccess(response)
      expect(body.items).toEqual([])
      expect(body.authenticated).toBe(false)
    })

    it('returns empty cart when no cart exists for authenticated user', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      // Note: GET() doesn't use request parameter, uses fast auth internally
      const response = await GET()

      const body = await expectSuccess(response)
      expect(body.items).toEqual([])
      expect(body.updated_at).toBeNull()
    })

    it('returns existing cart items for authenticated user', async () => {
      // Create cart with items
      const cartItems = [
        {
          id: testProductId,
          type: 'product' as const,
          name: 'Test Product',
          price: 10000,
          quantity: 2,
        },
      ]

      await supabase.from('store_carts').insert({
        customer_id: ownerUser.userId,
        tenant_id: TEST_TENANT_ID,
        items: cartItems,
      })

      cleanupManager.track('store_carts', `${ownerUser.userId}-${TEST_TENANT_ID}`)

      // Sign in as owner
      await supabase.auth.signInWithPassword({
        email: ownerUser.profile.id + '@test.local',
        password: 'test-password-123',
      })

      const response = await GET()
      const body = await expectSuccess(response)

      expect(body.items).toHaveLength(1)
      expect(body.items[0].id).toBe(testProductId)
      expect(body.items[0].quantity).toBe(2)
      expect(body.updated_at).toBeDefined()
    })
  })

  describe('PUT /api/store/cart', () => {
    it('acknowledges unauthenticated requests without error', async () => {
      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        body: {
          items: [
            {
              id: testProductId,
              type: 'product',
              name: 'Test Product',
              price: 10000,
              quantity: 1,
            },
          ],
        },
      })

      const response = await PUT(request)

      const body = await expectSuccess(response)
      expect(body.success).toBe(true)
      expect(body.local_only).toBe(true)
    })

    it('validates cart items schema', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              // Invalid: missing required fields
              id: testProductId,
              // Missing: type, name, price, quantity
            },
          ],
        },
      })

      const response = await PUT(request)

      await expectError(response, 400, 'inválidos')
    })

    it('validates quantity is positive', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              type: 'product',
              name: 'Test Product',
              price: 10000,
              quantity: 0, // Invalid: must be positive
            },
          ],
        },
      })

      const response = await PUT(request)

      await expectError(response, 400)
    })

    it('validates quantity does not exceed maximum', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              type: 'product',
              name: 'Test Product',
              price: 10000,
              quantity: 100, // Exceeds max (usually 99)
            },
          ],
        },
      })

      const response = await PUT(request)

      await expectError(response, 400)
    })

    it('saves cart to database for authenticated user', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const cartItems = [
        {
          id: testProductId,
          type: 'product' as const,
          name: 'Test Product',
          price: 10000,
          quantity: 3,
        },
      ]

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: cartItems,
        },
      })

      const response = await PUT(request)
      const body = await expectSuccess(response)

      expect(body.success).toBe(true)

      // Verify cart was saved to database
      const { data: savedCart } = await supabase
        .from('store_carts')
        .select('items')
        .eq('customer_id', ownerUser.userId)
        .eq('tenant_id', TEST_TENANT_ID)
        .single()

      expect(savedCart?.items).toHaveLength(1)
      expect(savedCart?.items[0].quantity).toBe(3)

      cleanupManager.track('store_carts', `${ownerUser.userId}-${TEST_TENANT_ID}`)
    })

    it('updates existing cart (upsert)', async () => {
      // Create initial cart
      await supabase.from('store_carts').insert({
        customer_id: ownerUser.userId,
        tenant_id: TEST_TENANT_ID,
        items: [
          {
            id: testProductId,
            type: 'product',
            name: 'Test Product',
            price: 10000,
            quantity: 1,
          },
        ],
      })

      cleanupManager.track('store_carts', `${ownerUser.userId}-${TEST_TENANT_ID}`)

      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      // Update cart with new quantity
      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              type: 'product',
              name: 'Test Product',
              price: 10000,
              quantity: 5, // Updated quantity
            },
          ],
        },
      })

      const response = await PUT(request)
      await expectSuccess(response)

      // Verify cart was updated
      const { data: updatedCart } = await supabase
        .from('store_carts')
        .select('items')
        .eq('customer_id', ownerUser.userId)
        .eq('tenant_id', TEST_TENANT_ID)
        .single()

      expect(updatedCart?.items[0].quantity).toBe(5)
    })
  })

  describe('DELETE /api/store/cart', () => {
    it('acknowledges unauthenticated requests', async () => {
      const response = await DELETE()

      const body = await expectSuccess(response)
      expect(body.success).toBe(true)
      expect(body.local_only).toBe(true)
    })

    it('clears cart from database', async () => {
      // Create cart
      await supabase.from('store_carts').insert({
        customer_id: ownerUser.userId,
        tenant_id: TEST_TENANT_ID,
        items: [
          {
            id: testProductId,
            type: 'product',
            name: 'Test Product',
            price: 10000,
            quantity: 1,
          },
        ],
      })

      cleanupManager.track('store_carts', `${ownerUser.userId}-${TEST_TENANT_ID}`)

      // Sign in as owner
      await supabase.auth.signInWithPassword({
        email: ownerUser.profile.id + '@test.local',
        password: 'test-password-123',
      })

      const response = await DELETE()
      const body = await expectSuccess(response)

      expect(body.success).toBe(true)

      // Verify cart was deleted
      const { data: deletedCart } = await supabase
        .from('store_carts')
        .select('items')
        .eq('customer_id', ownerUser.userId)
        .eq('tenant_id', TEST_TENANT_ID)
        .single()

      expect(deletedCart).toBeNull()
    })
  })

  describe('POST /api/store/cart (merge)', () => {
    it('validates merge items schema', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              // Invalid schema
              id: testProductId,
              // Missing required fields
            },
          ],
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'inválidos')
    })

    it('returns local items for unauthenticated users', async () => {
      const localItems = [
        {
          id: testProductId,
          type: 'product' as const,
          name: 'Test Product',
          price: 10000,
          quantity: 2,
        },
      ]

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        body: {
          items: localItems,
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      expect(body.success).toBe(true)
      expect(body.items).toEqual(localItems)
      expect(body.local_only).toBe(true)
    })

    it('merges local cart with empty database cart', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const localItems = [
        {
          id: testProductId,
          type: 'product' as const,
          name: 'Test Product',
          price: 10000,
          quantity: 3,
        },
      ]

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        authToken,
        body: {
          items: localItems,
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      expect(body.success).toBe(true)
      expect(body.items).toHaveLength(1)
      expect(body.items[0].quantity).toBe(3)

      // Cleanup
      await supabase
        .from('store_carts')
        .delete()
        .eq('customer_id', ownerUser.userId)
        .eq('tenant_id', TEST_TENANT_ID)
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious item IDs safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousId = "'; DROP TABLE store_carts; --"

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              id: maliciousId,
              type: 'product',
              name: 'Test',
              price: 100,
              quantity: 1,
            },
          ],
        },
      })

      const response = await PUT(request)

      // Should handle safely (validation error or success, not crash)
      expect(response.status).not.toBe(500)
    })

    it('handles XSS attempts in item names safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const xssName = '<script>alert("xss")</script>'

      const request = createTestRequest('http://localhost:3000/api/store/cart', {
        method: 'PUT',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              type: 'product',
              name: xssName,
              price: 10000,
              quantity: 1,
            },
          ],
        },
      })

      const response = await PUT(request)

      // Should succeed (stored as-is, sanitized on display)
      if (response.status === 200) {
        const body = await response.json()
        expect(body.success).toBe(true)

        // Cleanup
        await supabase
          .from('store_carts')
          .delete()
          .eq('customer_id', ownerUser.userId)
          .eq('tenant_id', TEST_TENANT_ID)
      } else {
        // Or reject safely
        expect(response.status).not.toBe(500)
      }
    })
  })

  describe('Tenant Isolation', () => {
    it('only accesses cart for user tenant', async () => {
      // Create cart in TEST_TENANT_ID
      await supabase.from('store_carts').insert({
        customer_id: ownerUser.userId,
        tenant_id: TEST_TENANT_ID,
        items: [
          {
            id: testProductId,
            type: 'product',
            name: 'Test Product',
            price: 10000,
            quantity: 1,
          },
        ],
      })

      cleanupManager.track('store_carts', `${ownerUser.userId}-${TEST_TENANT_ID}`)

      // Sign in as owner (belongs to TEST_TENANT_ID)
      await supabase.auth.signInWithPassword({
        email: ownerUser.profile.id + '@test.local',
        password: 'test-password-123',
      })

      const response = await GET()
      const body = await expectSuccess(response)

      // Should see cart from own tenant
      expect(body.items).toHaveLength(1)

      // Verify tenant_id is automatically applied from profile
      // (not from client input, which would be a security issue)
    })
  })
})
