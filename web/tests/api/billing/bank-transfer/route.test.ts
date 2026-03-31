import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
  getAuthTokenFromUser,
} from '@/tests/__helpers__/integration-setup'
import { GET } from '@/app/api/billing/bank-transfer/route'
import { TENANT_IDS } from '@/lib/constants/tenants';

describe('API: /api/billing/bank-transfer', () => {
  let supabase: SupabaseClient
  let adminUserId: string
  let adminProfileId: string
  let ownerUserId: string
  let ownerProfileId: string
  let vetUserId: string
  let vetProfileId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create users with different roles
    const adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    adminUserId = adminUser.userId
    adminProfileId = adminUser.profile.id

    const ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUserId = ownerUser.userId
    ownerProfileId = ownerUser.profile.id

    const vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUserId = vetUser.userId
    vetProfileId = vetUser.profile.id

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/billing/bank-transfer', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer')

      const response = await GET(request)
      await expectError(response, 401)
    })

    it('requires admin role', async () => {
      // Test with owner user
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      await expectError(response, 403)
    })

    it('denies access to veterinarians', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      await expectError(response, 403)
    })

    it('returns bank account information for admin', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Verify response structure
      expect(data).toHaveProperty('bank_accounts')
      expect(data).toHaveProperty('instructions')
      expect(data).toHaveProperty('tenant_name')
      expect(data).toHaveProperty('support_email')
      expect(data).toHaveProperty('support_phone')

      // Verify bank accounts array
      expect(Array.isArray(data.bank_accounts)).toBe(true)
      expect(data.bank_accounts.length).toBeGreaterThan(0)
    })

    it('includes primary bank account details', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      const primaryAccount = data.bank_accounts[0]
      expect(primaryAccount).toHaveProperty('bank_name')
      expect(primaryAccount).toHaveProperty('bank_code')
      expect(primaryAccount).toHaveProperty('account_type')
      expect(primaryAccount).toHaveProperty('account_number')
      expect(primaryAccount).toHaveProperty('account_holder')
      expect(primaryAccount).toHaveProperty('ruc')
      expect(primaryAccount).toHaveProperty('alias')
      expect(primaryAccount).toHaveProperty('swift_code')
      expect(primaryAccount).toHaveProperty('currency')

      // Verify account holder is Vetic
      expect(primaryAccount.account_holder).toContain('Vetic')
      expect(primaryAccount.currency).toBe('PYG')
    })

    it('includes transfer instructions in Spanish', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.instructions).toHaveProperty('title')
      expect(data.instructions).toHaveProperty('steps')
      expect(data.instructions).toHaveProperty('important_notes')

      // Verify instructions are in Spanish
      expect(data.instructions.title).toContain('Transferencia')
      expect(Array.isArray(data.instructions.steps)).toBe(true)
      expect(data.instructions.steps.length).toBeGreaterThan(0)
      expect(Array.isArray(data.instructions.important_notes)).toBe(true)
      expect(data.instructions.important_notes.length).toBeGreaterThan(0)
    })

    it('returns basic reference code without invoice_id', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should have null invoice_reference when no invoice_id provided
      expect(data.invoice_reference).toBeNull()

      // Instructions should include tenant-based reference
      const referenceInstruction = data.instructions.steps.find((step: string) =>
        step.includes('VETIC-')
      )
      expect(referenceInstruction).toBeDefined()
      expect(referenceInstruction).toContain(TEST_TENANT_ID.substring(0, 8).toUpperCase())
    })

    it('includes invoice reference when invoice_id provided', async () => {
      // Create an invoice
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

      const request = createTestRequest(
        `http://localhost:3000/api/billing/bank-transfer?invoice_id=${invoice?.id}`,
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should include invoice reference
      expect(data.invoice_reference).not.toBeNull()
      expect(data.invoice_reference).toHaveProperty('invoice_number')
      expect(data.invoice_reference).toHaveProperty('amount')
      expect(data.invoice_reference).toHaveProperty('reference_code')

      expect(data.invoice_reference.invoice_number).toBe(invoice?.invoice_number)
      expect(data.invoice_reference.amount).toBe(invoice?.total)
      expect(data.invoice_reference.reference_code).toContain('VETIC-')
      expect(data.invoice_reference.reference_code).toContain(invoice?.invoice_number)
    })

    it('enforces tenant isolation on invoice lookup', async () => {
      // Create invoice for different tenant
      const { data: otherInvoice } = await supabase
        .from('platform_invoices')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
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

      if (otherInvoice) {
        cleanupManager.track('platform_invoices', otherInvoice.id)
      }

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest(
        `http://localhost:3000/api/billing/bank-transfer?invoice_id=${otherInvoice?.id}`,
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should not include invoice reference (tenant mismatch)
      expect(data.invoice_reference).toBeNull()
    })

    it('handles non-existent invoice_id gracefully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest(
        'http://localhost:3000/api/billing/bank-transfer?invoice_id=00000000-0000-0000-0000-000000000000',
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should return null invoice_reference (not found)
      expect(data.invoice_reference).toBeNull()

      // Should still return bank account info
      expect(data.bank_accounts).toBeDefined()
      expect(data.instructions).toBeDefined()
    })

    it('includes support contact information', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.support_email).toBeDefined()
      expect(data.support_email).toContain('@')
      expect(data.support_phone).toBeDefined()
      expect(data.support_phone).toContain('+595')
    })

    it('returns tenant name for reference', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.tenant_name).toBeDefined()
      expect(typeof data.tenant_name).toBe('string')
    })

    it('masks sensitive account number details', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Account numbers should be masked with X
      data.bank_accounts.forEach((account: any) => {
        expect(account.account_number).toContain('X')
      })
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
        '<script>alert("xss")</script>',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/billing/bank-transfer?invoice_id=${encodeURIComponent(malicious)}`,
          { authToken }
        )

        const response = await GET(request)

        // Should not crash (500), should handle gracefully
        expect(response.status).not.toBe(500)
        expect(response.status).toBe(200) // Returns successfully with null invoice_reference
      }
    })

    it('sanitizes query parameters in response', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const xssAttempt = '<script>alert("xss")</script>'
      const request = createTestRequest(
        `http://localhost:3000/api/billing/bank-transfer?invoice_id=${encodeURIComponent(xssAttempt)}`,
        { authToken }
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Response should not contain unescaped script tags
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('<script>')
      expect(responseText).not.toContain('alert(')
    })
  })

  describe('Response Format Validation', () => {
    it('returns consistent response structure', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Verify all required fields exist
      const requiredFields = [
        'bank_accounts',
        'instructions',
        'invoice_reference',
        'tenant_name',
        'support_email',
        'support_phone',
      ]

      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field)
      })

      // Verify bank_accounts structure
      expect(Array.isArray(data.bank_accounts)).toBe(true)
      data.bank_accounts.forEach((account: any) => {
        expect(account).toHaveProperty('bank_name')
        expect(account).toHaveProperty('account_number')
        expect(account).toHaveProperty('account_holder')
        expect(account).toHaveProperty('currency')
      })

      // Verify instructions structure
      expect(data.instructions).toHaveProperty('title')
      expect(Array.isArray(data.instructions.steps)).toBe(true)
      expect(Array.isArray(data.instructions.important_notes)).toBe(true)
    })

    it('returns multiple bank account options', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/billing/bank-transfer', {
        authToken,
      })

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should have at least primary account, possibly secondary
      expect(data.bank_accounts.length).toBeGreaterThanOrEqual(1)

      // If multiple accounts, verify they're different
      if (data.bank_accounts.length > 1) {
        const firstAccount = data.bank_accounts[0]
        const secondAccount = data.bank_accounts[1]
        expect(firstAccount.bank_code).not.toBe(secondAccount.bank_code)
      }
    })
  })
})
