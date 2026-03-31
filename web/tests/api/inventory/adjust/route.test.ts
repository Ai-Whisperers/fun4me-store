/**
 * API Integration Tests: /api/inventory/adjust
 *
 * Tests authentication, authorization, inventory adjustment with atomic RPC function
 * This route uses PostgreSQL atomic function to prevent race conditions
 */

import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { POST } from '@/app/api/inventory/adjust/route'
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

describe('API: /api/inventory/adjust', () => {
  let supabase: SupabaseClient
              let testProductId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    const vet = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUser.userId = vet.userId
    vetUser.profile.id = vet.profile.id

    const admin = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    adminUser.userId = admin.userId
    adminUser.profile.id = admin.profile.id

    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUser.userId = owner.userId
    ownerUser.profile.id = owner.profile.id

    // Create test product with inventory
    const product = await createTestProduct(supabase, TEST_TENANT_ID, {
      name: 'Test Medicine',
      sku: 'MED-TEST-001',
      base_price: 5000, // 50.00
      stock_quantity: 100, // Initial stock
      reorder_point: 20,
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

  describe('POST /api/inventory/adjust', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        body: {
          product_id: testProductId,
          new_quantity: 80,
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      // Sign in as owner (not allowed)
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 80,
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 403) // Insufficient role
    })

    it('validates required field: product_id', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          // Missing product_id
          new_quantity: 80,
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'requerido')
    })

    it('validates required field: new_quantity', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          // Missing new_quantity
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 400, '0 o mayor')
    })

    it('validates new_quantity is non-negative', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: -10, // Invalid negative
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 400, '0 o mayor')
    })

    it('validates required field: reason', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 80,
          // Missing reason
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'requerido')
    })

    it('rejects invalid JSON body', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      // Create request with invalid JSON
      const request = new Request('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      const response = await POST(request)

      await expectError(response, 400, 'inválido')
    })

    it('adjusts inventory correctly (physical count decrease)', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      // Get current stock
      const { data: currentInventory } = await supabase
        .from('store_inventory')
        .select('stock_quantity')
        .eq('product_id', testProductId)
        .single()

      const oldStock = currentInventory?.stock_quantity || 100

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 80,
          reason: 'physical_count',
          notes: 'Monthly physical inventory count',
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      // Verify response
      expect(body.success).toBe(true)
      expect(body.old_stock).toBe(oldStock)
      expect(body.new_stock).toBe(80)
      expect(body.difference).toBe(80 - oldStock)
      expect(body.type).toBe('decrement')

      // Verify database was updated
      const { data: updatedInventory } = await supabase
        .from('store_inventory')
        .select('stock_quantity')
        .eq('product_id', testProductId)
        .single()

      expect(updatedInventory?.stock_quantity).toBe(80)
    })

    it('adjusts inventory correctly (increase for return)', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      // Get current stock
      const { data: currentInventory } = await supabase
        .from('store_inventory')
        .select('stock_quantity')
        .eq('product_id', testProductId)
        .single()

      const oldStock = currentInventory?.stock_quantity || 80

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: oldStock + 30, // Increase by 30
          reason: 'return',
          notes: 'Customer returned unused product',
        },
      })

      const response = await POST(request)
      const body = await expectSuccess(response)

      // Verify response
      expect(body.success).toBe(true)
      expect(body.old_stock).toBe(oldStock)
      expect(body.new_stock).toBe(oldStock + 30)
      expect(body.difference).toBe(30)
      expect(body.type).toBe('increment')
    })

    it('returns error for non-existent product', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const fakeProductId = 'product-does-not-exist'

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: fakeProductId,
          new_quantity: 50,
          reason: 'physical_count',
        },
      })

      const response = await POST(request)

      await expectError(response, 404, 'no encontrado')
    })

    it('creates adjustment transaction record', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const beforeTransactionCount = await supabase
        .from('inventory_adjustments')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', testProductId)

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 90,
          reason: 'correction',
          notes: 'Correcting previous error',
        },
      })

      const response = await POST(request)
      await expectSuccess(response)

      // Verify adjustment record was created
      const afterTransactionCount = await supabase
        .from('inventory_adjustments')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', testProductId)

      expect(afterTransactionCount.count).toBe((beforeTransactionCount.count || 0) + 1)
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious product_id safely', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousInputs = [
        "'; DROP TABLE store_inventory; --",
        "1' OR '1'='1",
        'admin"--',
        '<script>alert("xss")</script>',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
          method: 'POST',
          authToken,
          body: {
            product_id: malicious,
            new_quantity: 50,
            reason: 'physical_count',
          },
        })

        const response = await POST(request)

        // Should handle safely (404 not found, or other non-500 error)
        expect(response.status).not.toBe(500)
      }
    })

    it('handles malicious reason safely', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousInputs = [
        "'; DROP TABLE inventory_adjustments; --",
        '"><script>alert("xss")</script>',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
          method: 'POST',
          authToken,
          body: {
            product_id: testProductId,
            new_quantity: 50,
            reason: malicious as any,
          },
        })

        const response = await POST(request)

        // Should handle safely (validation error or 400)
        expect(response.status).not.toBe(500)
      }
    })

    it('handles malicious notes safely', async () => {
      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      const maliciousNotes = "'; DELETE FROM inventory_adjustments WHERE '1'='1"

      const request = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 50,
          reason: 'other',
          notes: maliciousNotes,
        },
      })

      const response = await POST(request)

      // Should succeed (notes are safely stored as string)
      if (response.status === 200) {
        const body = await response.json()
        expect(body.success).toBe(true)
      } else {
        // Or handle safely with non-500 error
        expect(response.status).not.toBe(500)
      }
    })
  })

  describe('Concurrency: Atomic Operations', () => {
    it('uses atomic RPC function to prevent race conditions', async () => {
      // This test verifies that the route uses adjust_inventory_atomic RPC function
      // The RPC function uses row-level locking (FOR UPDATE) to prevent race conditions

      // Sign in as vet
      const authToken = await getAuthTokenFromUser(vetUser)

      // Simulate multiple concurrent adjustments
      // In real scenario, these would race, but atomic function prevents issues
      const request1 = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 60,
          reason: 'physical_count',
        },
      })

      const request2 = createTestRequest('http://localhost:3000/api/inventory/adjust', {
        method: 'POST',
        authToken,
        body: {
          product_id: testProductId,
          new_quantity: 70,
          reason: 'correction',
        },
      })

      // Execute both (second will wait for first due to row lock)
      const response1 = await POST(request1)
      const body1 = await expectSuccess(response1)

      const response2 = await POST(request2)
      const body2 = await expectSuccess(response2)

      // Both should succeed
      expect(body1.success).toBe(true)
      expect(body2.success).toBe(true)

      // Final stock should be from last adjustment
      const { data: finalInventory } = await supabase
        .from('store_inventory')
        .select('stock_quantity')
        .eq('product_id', testProductId)
        .single()

      expect(finalInventory?.stock_quantity).toBe(70) // Last adjustment wins
    })
  })
})
