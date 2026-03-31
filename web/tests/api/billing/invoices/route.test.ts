/**
 * API Integration Tests: /api/billing/invoices
 *
 * Tests authentication, authorization, tenant isolation, and platform invoice management
 */

import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { GET } from '@/app/api/billing/invoices/route'
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

describe('API: /api/billing/invoices', () => {
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

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/billing/invoices', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/billing/invoices')

      const response = await GET(request)

      await expectError(response, 401, 'autorizado')
    })

    it('requires admin role', async () => {
      // Sign in as owner (not admin)
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/billing/invoices', {
        authToken,
      })

      const response = await GET(request)

      await expectError(response, 403) // Insufficient role
    })

    it('enforces tenant isolation', async () => {
      // Create another admin in different tenant
      const otherAdmin = await createTestAuthUser(supabase, 'admin', 'petlife')

      // Sign in as other admin
      const { data: session } = await supabase.auth.signInWithPassword({
        email: otherAdmin.profile.id + '@test.local',
        password: 'test-password-123',
      })

      // Try to access TEST_TENANT_ID invoices
      const request = createTestRequest(
        `http://localhost:3000/api/billing/invoices?clinic=${TEST_TENANT_ID}`,
        {
          authToken,
        }
      )

      const response = await GET(request)

      await expectError(response, 403, 'otra clínica') // Cannot access other clinic's invoices
    })

    it('returns empty list when no invoices exist', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/invoices', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.invoices).toEqual([])
      expect(body.stats).toMatchObject({
        total_outstanding: 0,
        total_paid: 0,
        overdue_count: 0,
      })
      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      })
    })

    it('filters by status correctly', async () => {
      // Create test invoice
      const invoiceData = {
        tenant_id: TEST_TENANT_ID,
        invoice_number: `INV-TEST-${Date.now()}`,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        subtotal: 10000, // 100.00
        tax_rate: 10,
        tax_amount: 1000, // 10.00
        total: 11000, // 110.00
        status: 'paid',
        issued_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date().toISOString(),
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('platform_invoices')
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) throw invoiceError
      cleanupManager.track('platform_invoices', invoice.id)

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      // Filter by status=paid
      const request = createTestRequest(
        'http://localhost:3000/api/billing/invoices?status=paid',
        {
          authToken,
        }
      )

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.invoices.length).toBeGreaterThanOrEqual(1)
      expect(body.invoices[0].status).toBe('paid')
      expect(body.invoices[0].invoice_number).toBe(invoiceData.invoice_number)
    })

    it('supports pagination', async () => {
      // Create multiple test invoices
      for (let i = 0; i < 3; i++) {
        const { data: invoice } = await supabase
          .from('platform_invoices')
          .insert({
            tenant_id: TEST_TENANT_ID,
            invoice_number: `INV-PAGE-${Date.now()}-${i}`,
            period_start: '2024-01-01',
            period_end: '2024-01-31',
            subtotal: 10000,
            total: 11000,
            status: 'draft',
            issued_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (invoice) cleanupManager.track('platform_invoices', invoice.id)
      }

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      // Request page 1 with limit=2
      const request = createTestRequest(
        'http://localhost:3000/api/billing/invoices?page=1&limit=2',
        {
          authToken,
        }
      )

      const response = await GET(request)
      const body = await expectSuccess(response)

      expect(body.invoices.length).toBeLessThanOrEqual(2)
      expect(body.pagination.limit).toBe(2)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.total).toBeGreaterThanOrEqual(3)
    })

    it('calculates stats correctly', async () => {
      // Create invoices with different statuses
      const paidInvoice = {
        tenant_id: TEST_TENANT_ID,
        invoice_number: `INV-PAID-${Date.now()}`,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        subtotal: 10000,
        total: 11000,
        status: 'paid',
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      }

      const overdueInvoice = {
        tenant_id: TEST_TENANT_ID,
        invoice_number: `INV-OVERDUE-${Date.now()}`,
        period_start: '2024-02-01',
        period_end: '2024-02-28',
        subtotal: 20000,
        total: 22000,
        status: 'overdue',
        issued_at: new Date().toISOString(),
        due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      }

      const { data: paid } = await supabase
        .from('platform_invoices')
        .insert(paidInvoice)
        .select()
        .single()
      if (paid) cleanupManager.track('platform_invoices', paid.id)

      const { data: overdue } = await supabase
        .from('platform_invoices')
        .insert(overdueInvoice)
        .select()
        .single()
      if (overdue) cleanupManager.track('platform_invoices', overdue.id)

      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/invoices', {
        authToken,
      })

      const response = await GET(request)
      const body = await expectSuccess(response)

      // Verify stats
      expect(body.stats.total_paid).toBeGreaterThanOrEqual(11000) // At least the paid invoice
      expect(body.stats.total_outstanding).toBeGreaterThanOrEqual(22000) // At least the overdue invoice
      expect(body.stats.overdue_count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious status parameter safely', async () => {
      // Sign in as admin
      const authToken = await getAuthTokenFromUser(adminUser)

      const maliciousInputs = [
        "'; DROP TABLE platform_invoices; --",
        "1' OR '1'='1",
        'admin"--',
        '<script>alert("xss")</script>',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/billing/invoices?status=${encodeURIComponent(malicious)}`,
          {
            authToken,
          }
        )

        const response = await GET(request)

        // Should return safely (either 200 with empty results or handled gracefully)
        expect(response.status).toBeGreaterThanOrEqual(200)
        expect(response.status).toBeLessThan(500) // No server error
      }
    })
  })
})
