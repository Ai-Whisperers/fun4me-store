import { describe, it, expect, beforeAll, afterAll, afterEach, vi} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  getAuthTokenFromUser,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { POST } from '@/app/api/billing/pay-invoice/route'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Mock Stripe integration
vi.mock('@/lib/billing/stripe', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({
    id: 'pi_test_123456',
    status: 'succeeded',
    client_secret: 'pi_test_123456_secret',
    latest_charge: 'ch_test_123456',
  }),
  toStripeAmount: vi.fn((amount: number) => Math.round(amount)),
}))

// Mock logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('API: /api/billing/pay-invoice', () => {
  let supabase: SupabaseClient
  let adminUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create users with different roles
    adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('POST /api/billing/pay-invoice', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: 'test-invoice-id' },
      })

      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires admin role', async () => {
      // Get owner auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      // Switch to owner user
      await supabase.auth.signInWithPassword({
        email: `owner-${ownerUser.userId}@test.local`,
        password: 'testpass123',
      })

      const { data: { session: ownerSession } } = await supabase.auth.getSession()
      const authToken = ownerSession?.access_token || ''

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: 'test-invoice-id' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)

      // Restore admin session
      if (session) {
        await supabase.auth.setSession(session)
      }
    })

    it('validates required field: invoice_id', async () => {
      // Get admin auth token
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: {},
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
      
      const data = await response.json()
      expect(data.error).toContain('invoice_id')
    })

    it('returns 404 for non-existent invoice', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: '00000000-0000-0000-0000-000000000000' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on invoices', async () => {
      // Create invoice for different tenant
      const { data: otherInvoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (otherInvoice) {
        cleanupManager.track('platform_invoices', otherInvoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: otherInvoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
      
      const data = await response.json()
      expect(data.error).toContain('otra clinica')
    })

    it('rejects payment for already paid invoice', async () => {
      // Create paid invoice
      const { data: paidInvoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paidInvoice) {
        cleanupManager.track('platform_invoices', paidInvoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: paidInvoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
      
      const data = await response.json()
      expect(data.error).toContain('pagada')
    })

    it('rejects payment for voided invoice', async () => {
      // Create void invoice
      const { data: voidInvoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'void',
        })
        .select()
        .single()

      if (voidInvoice) {
        cleanupManager.track('platform_invoices', voidInvoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: voidInvoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
      
      const data = await response.json()
      expect(data.error).toContain('anulada')
    })

    it('requires Stripe customer to be configured', async () => {
      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      // Ensure tenant has no Stripe customer
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: null })
        .eq('id', TEST_TENANT_ID)

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: invoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
      
      const data = await response.json()
      expect(data.error).toContain('Stripe')

      // Restore Stripe customer for other tests
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123456' })
        .eq('id', TEST_TENANT_ID)
    })

    it('requires payment method (default or specified)', async () => {
      // Ensure tenant has Stripe customer but no default payment method
      await supabase
        .from('tenants')
        .update({
          stripe_customer_id: 'cus_test_123456',
          default_payment_method_id: null,
        })
        .eq('id', TEST_TENANT_ID)

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: invoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
      
      const data = await response.json()
      expect(data.error).toContain('metodo de pago')
    })

    it('returns 404 for non-existent payment method', async () => {
      // Ensure tenant has Stripe customer
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123456' })
        .eq('id', TEST_TENANT_ID)

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: {
          invoice_id: invoice?.id,
          payment_method_id: '00000000-0000-0000-0000-000000000000',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on payment methods', async () => {
      // Ensure tenant has Stripe customer
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123456' })
        .eq('id', TEST_TENANT_ID)

      // Create payment method for different tenant
      const { data: otherPaymentMethod } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          stripe_payment_method_id: 'pm_test_other',
          display_name: 'Test Card',
          method_type: 'card',
          is_active: true,
        })
        .select()
        .single()

      if (otherPaymentMethod) {
        cleanupManager.track('tenant_payment_methods', otherPaymentMethod.id)
      }

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: {
          invoice_id: invoice?.id,
          payment_method_id: otherPaymentMethod?.id,
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('processes payment successfully with succeeded status', async () => {
      // Setup: Ensure tenant has Stripe customer
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123456' })
        .eq('id', TEST_TENANT_ID)

      // Create payment method
      const { data: paymentMethod } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: TEST_TENANT_ID,
          stripe_payment_method_id: 'pm_test_success',
          display_name: 'Test Card **** 4242',
          method_type: 'card',
          is_active: true,
        })
        .select()
        .single()

      if (paymentMethod) {
        cleanupManager.track('tenant_payment_methods', paymentMethod.id)
      }

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 100000,
          tax_amount: 5000,
          total: 105000,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: {
          invoice_id: invoice?.id,
          payment_method_id: paymentMethod?.id,
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      // Verify response structure
      expect(data.success).toBe(true)
      expect(data.message).toContain('exitosamente')
      expect(data.payment).toBeDefined()
      expect(data.payment.status).toBe('succeeded')
      expect(data.payment.amount).toBe(invoice?.total)
      expect(data.payment.currency).toBe('PYG')

      // Verify invoice updated to paid
      const { data: updatedInvoice } = await supabase
        .from('platform_invoices')
        .select('status, paid_at, payment_method')
        .eq('id', invoice?.id)
        .single()

      expect(updatedInvoice?.status).toBe('paid')
      expect(updatedInvoice?.paid_at).toBeTruthy()
      expect(updatedInvoice?.payment_method).toBeTruthy()

      // Verify transaction created
      const { data: transaction } = await supabase
        .from('billing_payment_transactions')
        .select('*')
        .eq('platform_invoice_id', invoice?.id)
        .single()

      if (transaction) {
        cleanupManager.track('billing_payment_transactions', transaction.id)
        expect(transaction.status).toBe('succeeded')
        expect(transaction.amount).toBe(invoice?.total)
        expect(transaction.completed_at).toBeTruthy()
      }
    })

    it('uses default payment method when not specified', async () => {
      // Create payment method and set as default
      const { data: paymentMethod } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: TEST_TENANT_ID,
          stripe_payment_method_id: 'pm_test_default',
          display_name: 'Default Card',
          method_type: 'card',
          is_active: true,
        })
        .select()
        .single()

      if (paymentMethod) {
        cleanupManager.track('tenant_payment_methods', paymentMethod.id)
      }

      await supabase
        .from('tenants')
        .update({
          stripe_customer_id: 'cus_test_123456',
          default_payment_method_id: paymentMethod?.id,
        })
        .eq('id', TEST_TENANT_ID)

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 50000,
          tax_amount: 2500,
          total: 52500,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      // Don't specify payment_method_id
      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: invoice?.id },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.payment.status).toBe('succeeded')
    })

    it('creates billing reminder notification on successful payment', async () => {
      // Setup payment method
      const { data: paymentMethod } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: TEST_TENANT_ID,
          stripe_payment_method_id: 'pm_test_reminder',
          display_name: 'Test Card',
          method_type: 'card',
          is_active: true,
        })
        .select()
        .single()

      if (paymentMethod) {
        cleanupManager.track('tenant_payment_methods', paymentMethod.id)
      }

      await supabase
        .from('tenants')
        .update({
          stripe_customer_id: 'cus_test_123456',
          default_payment_method_id: paymentMethod?.id,
        })
        .eq('id', TEST_TENANT_ID)

      // Create invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 75000,
          tax_amount: 3750,
          total: 78750,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
        method: 'POST',
        body: { invoice_id: invoice?.id },
        authToken,
      })

      const response = await POST(request)
      await expectSuccess(response)

      // Verify billing reminder created
      const { data: reminder } = await supabase
        .from('billing_reminders')
        .select('*')
        .eq('platform_invoice_id', invoice?.id)
        .eq('reminder_type', 'payment_confirmation')
        .single()

      if (reminder) {
        cleanupManager.track('billing_reminders', reminder.id)
        expect(reminder.channel).toBe('email')
        expect(reminder.subject).toContain('confirmado')
        expect(reminder.sent_at).toBeTruthy()
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious invoice_id safely', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const maliciousInputs = [
        "'; DROP TABLE platform_invoices; --",
        "1' OR '1'='1",
        'admin"--',
        "\" OR 1=1 --",
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
          method: 'POST',
          body: { invoice_id: malicious },
          authToken,
        })

        const response = await POST(request)

        // Should not crash (500), should handle gracefully
        expect(response.status).not.toBe(500)
        expect([400, 404]).toContain(response.status)
      }
    })

    it('handles malicious payment_method_id safely', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      // Create valid invoice
      const { data: invoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TEST_TENANT_ID,
          invoice_number: `INV-TEST-${Date.now()}`,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          subtotal: 10000,
          tax_amount: 500,
          total: 10500,
          currency: 'PYG',
          status: 'pending',
        })
        .select()
        .single()

      if (invoice) {
        cleanupManager.track('platform_invoices', invoice.id)
      }

      await supabase
        .from('tenants')
        .update({ stripe_customer_id: 'cus_test_123456' })
        .eq('id', TEST_TENANT_ID)

      const maliciousInputs = [
        "'; DROP TABLE tenant_payment_methods; --",
        "1' OR '1'='1",
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest('http://localhost:3000/api/billing/pay-invoice', {
          method: 'POST',
          body: {
            invoice_id: invoice?.id,
            payment_method_id: malicious,
          },
          authToken,
        })

        const response = await POST(request)

        // Should not crash, should handle gracefully
        expect(response.status).not.toBe(500)
        expect([400, 404]).toContain(response.status)
      }
    })
  })
})
