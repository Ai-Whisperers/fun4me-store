/**
 * API Integration Tests: /api/billing/payment-methods
 *
 * Tests authentication, authorization, and payment method management
 * Integrates with Stripe for payment method validation
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi} from 'vitest'
import { GET, POST } from '@/app/api/billing/payment-methods/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
  getAuthTokenFromUser,
} from '../../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

// Mock Stripe functions
vi.mock('@/lib/billing/stripe', () => ({
  getPaymentMethod: vi.fn(),
  formatCardBrand: vi.fn((brand: string) => brand),
  getPaymentMethodDisplayName: vi.fn(() => 'Visa •••• 4242'),
  setDefaultPaymentMethod: vi.fn(),
}))

describe('API: /api/billing/payment-methods', () => {
  let supabase: SupabaseClient
              beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    const admin = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    adminUser.userId = admin.userId
    adminUser.profile.id = admin.profile.id

    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUser.userId = owner.userId
    ownerUser.profile.id = owner.profile.id

    const vet = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUser.userId = vet.userId
    vetUser.profile.id = vet.profile.id

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
    vi.clearAllMocks()
  })

  describe('GET /api/billing/payment-methods', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods')

      const response = await GET(request)

      await expectError(response, 401)
    })

    it('requires admin role', async () => {
      // Sign in as owner (not admin)
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        authToken,
      })

      const response = await GET(request)

      await expectError(response, 403) // Insufficient role
    })

    it('requires admin role - vet should be denied', async () => {
      // Sign in as vet (not admin)
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        authToken,
      })

      const response = await GET(request)

      await expectError(response, 403)
    })

    it('returns empty list when no payment methods exist', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.payment_methods).toEqual([])
      expect(body.count).toBe(0)
    })

    it('returns payment methods sorted by default first', async () => {
      // Create test payment methods
      const method1 = {
        tenant_id: TEST_TENANT_ID,
        method_type: 'card',
        display_name: 'Visa •••• 1234',
        card_brand: 'visa',
        card_last_four: '1234',
        card_exp_month: 12,
        card_exp_year: 2025,
        is_default: false,
        is_active: true,
        stripe_payment_method_id: 'pm_test_123',
      }

      const method2 = {
        tenant_id: TEST_TENANT_ID,
        method_type: 'card',
        display_name: 'Mastercard •••• 5678',
        card_brand: 'mastercard',
        card_last_four: '5678',
        card_exp_month: 6,
        card_exp_year: 2026,
        is_default: true, // Default
        is_active: true,
        stripe_payment_method_id: 'pm_test_456',
      }

      const { data: pm1 } = await supabase
        .from('tenant_payment_methods')
        .insert(method1)
        .select()
        .single()
      if (pm1) cleanupManager.track('tenant_payment_methods', pm1.id)

      const { data: pm2 } = await supabase
        .from('tenant_payment_methods')
        .insert(method2)
        .select()
        .single()
      if (pm2) cleanupManager.track('tenant_payment_methods', pm2.id)

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.payment_methods.length).toBe(2)
      expect(body.count).toBe(2)
      // Default should be first
      expect(body.payment_methods[0].is_default).toBe(true)
      expect(body.payment_methods[0].card_last_four).toBe('5678')
    })

    it('only returns active payment methods', async () => {
      // Create inactive payment method
      const inactiveMethod = {
        tenant_id: TEST_TENANT_ID,
        method_type: 'card',
        display_name: 'Deleted Card',
        card_brand: 'visa',
        card_last_four: '9999',
        is_default: false,
        is_active: false, // Inactive
        stripe_payment_method_id: 'pm_test_deleted',
      }

      const { data: pm } = await supabase
        .from('tenant_payment_methods')
        .insert(inactiveMethod)
        .select()
        .single()
      if (pm) cleanupManager.track('tenant_payment_methods', pm.id)

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      // Should not include inactive method
      expect(body.payment_methods).toEqual([])
      expect(body.count).toBe(0)
    })
  })

  describe('POST /api/billing/payment-methods', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        method: 'POST',
        body: {
          stripe_payment_method_id: 'pm_test_123',
        },
      })

      const response = await POST(request)

      await expectError(response, 401)
    })

    it('requires admin role', async () => {
      // Sign in as owner
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        method: 'POST',
        authToken,
        body: {
          stripe_payment_method_id: 'pm_test_123',
        },
      })

      const response = await POST(request)

      await expectError(response, 403)
    })

    it('validates required field: stripe_payment_method_id', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        method: 'POST',
        authToken,
        body: {
          // Missing stripe_payment_method_id
          set_as_default: false,
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'requerido')
    })

    it('returns error when tenant has no Stripe customer', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      // Ensure tenant has no stripe_customer_id
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: null })
        .eq('id', TEST_TENANT_ID)

      const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
        method: 'POST',
        authToken,
        body: {
          stripe_payment_method_id: 'pm_test_123',
        },
      })

      const response = await POST(request)

      await expectError(response, 400, 'Stripe')
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious stripe_payment_method_id safely', async () => {
      const { getPaymentMethod } = await import('@/lib/billing/stripe')
      vi.mocked(getPaymentMethod).mockResolvedValue(null) // Simulate not found

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      // Set up tenant with Stripe customer
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123' })
        .eq('id', TEST_TENANT_ID)

      const maliciousInputs = [
        "'; DROP TABLE tenant_payment_methods; --",
        "1' OR '1'='1",
        'pm_test"; DELETE FROM tenants; --',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/billing/payment-methods', {
          method: 'POST',
          authToken,
          body: {
            stripe_payment_method_id: malicious,
          },
        })

        const response = await POST(request)

        // Should handle safely (404 not found or other non-500 error)
        expect(response.status).not.toBe(500)
      }
    })
  })
})
