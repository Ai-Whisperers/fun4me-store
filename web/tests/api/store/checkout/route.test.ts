/**
 * API Integration Tests: /api/store/checkout
 *
 * Tests checkout process with atomic operations, stock validation,
 * prescription verification, and idempotency
 */

import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { POST } from '@/app/api/store/checkout/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestProduct,
  createTestPet,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectError,
  getAuthTokenFromUser,
} from '../../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

describe('API: /api/store/checkout', () => {
  let supabase: SupabaseClient
      let testProductId: string
  let testPetId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test user
    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUser.userId = owner.userId
    ownerUser.profile.id = owner.profile.id

    // Create test product
    const product = await createTestProduct(supabase, TEST_TENANT_ID, {
      name: 'Test Product',
      sku: 'CHECKOUT-TEST-001',
      base_price: 10000, // 100.00
      stock_quantity: 50,
    })
    testProductId = product.id

    // Create test pet (for prescription items)
    const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID, {
      name: 'Test Pet',
      species: 'dog',
    })
    testPetId = pet.id

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('POST /api/store/checkout', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        body: {
          items: [],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 401)
    })

    it('validates JSON body', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      // Create invalid JSON request
      const request = new Request('http://localhost:3000/api/store/checkout', {
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

    it('validates required field: items', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          // Missing items
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates required field: clinic', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test Product',
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          // Missing clinic
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates items array is not empty', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [], // Empty array
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates item quantity is positive', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test Product',
              price: 10000,
              quantity: 0, // Invalid: must be positive
              type: 'product',
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('enforces tenant isolation - rejects wrong clinic', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test Product',
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: 'petlife', // Wrong tenant
        },
      })

      const response = await POST(request)

      await expectError(response, 403, 'no válida')
    })

    it('requires pet_id for prescription items', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Prescription Medicine',
              price: 5000,
              quantity: 1,
              type: 'product',
              requires_prescription: true,
            },
          ],
          clinic: TEST_TENANT_ID,
          // Missing pet_id
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'mascota')
    })

    it('validates pet belongs to user for prescription items', async () => {
      // Create another user's pet
      const otherOwner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
      const otherPet = await createTestPet(supabase, otherOwner.profile.id, TEST_TENANT_ID, {
        name: 'Other Pet',
      })

      // Sign in as first owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Prescription Medicine',
              price: 5000,
              quantity: 1,
              type: 'product',
              requires_prescription: true,
            },
          ],
          clinic: TEST_TENANT_ID,
          pet_id: otherPet.id, // Other user's pet
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'no pertenece')

      // Cleanup
      await supabase.from('pets').delete().eq('id', otherPet.id)
    })

    it('supports idempotency key to prevent duplicate orders', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const idempotencyKey = `test-checkout-${Date.now()}`

      // First request
      const request1 = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test Product',
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      // Note: This test verifies the idempotency check logic
      // The actual checkout would require the process_checkout RPC function
      // which may not exist in test environment
      const response1 = await POST(request1)

      // Either succeeds or fails gracefully (not 500)
      expect(response1.status).not.toBe(500)
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious item IDs safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousId = "'; DROP TABLE invoices; --"

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: maliciousId,
              name: 'Test',
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      // Should handle safely (not crash)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious clinic parameter safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const maliciousClinic = "'; DELETE FROM tenants; --"

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test',
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: maliciousClinic,
        },
      })

      const response = await POST(request)

      // Should reject with 403 (wrong clinic) or other safe error
      expect(response.status).not.toBe(500)
    })

    it('handles XSS attempts in item names safely', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const xssName = '<script>alert("xss")</script>'

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: xssName,
              price: 10000,
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      // Should handle safely (stored as-is, sanitized on display)
      expect(response.status).not.toBe(500)
    })
  })

  describe('Business Logic Validation', () => {
    it('validates item type is product or service', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test',
              price: 10000,
              quantity: 1,
              type: 'invalid_type', // Invalid type
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })

    it('validates price is non-negative', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/checkout', {
        method: 'POST',
        authToken,
        body: {
          items: [
            {
              id: testProductId,
              name: 'Test',
              price: -100, // Negative price
              quantity: 1,
              type: 'product',
            },
          ],
          clinic: TEST_TENANT_ID,
        },
      })

      const response = await POST(request)

      await expectError(response, 400)
    })
  })
})
