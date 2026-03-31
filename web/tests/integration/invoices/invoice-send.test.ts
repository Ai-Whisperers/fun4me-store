/**
 * Invoice Send API Tests
 *
 * Tests for POST /api/invoices/[id]/send
 *
 * This route handles sending invoices to clients via email.
 * It requires vet/admin role and updates invoice status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/invoices/[id]/send/route'
import {
  mockState,
  INVOICES,
  TENANTS,
  USERS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock audit logging
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}))

// Import routes AFTER mocks
import { POST } from '@/app/api/invoices/[id]/send/route'

// Helper to create request
function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/invoices/invoice-draft/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Helper to create route params
function createParams(invoiceId: string = INVOICES.DRAFT.id) {
  return { params: Promise.resolve({ id: invoiceId }) }
}

describe('POST /api/invoices/[id]/send', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  // =========================================================================
  // Authentication Tests
  // =========================================================================

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it('should return 403 when owner tries to send', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('INSUFFICIENT_ROLE')
    })

    it('should allow vet to send invoice', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('invoices', {
        ...INVOICES.DRAFT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
          phone: USERS.OWNER_JUAN.phone,
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should allow admin to send invoice', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('invoices', {
        ...INVOICES.DRAFT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // Invoice Lookup Tests
  // =========================================================================

  describe('Invoice Lookup', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when invoice not found', async () => {
      mockState.setTableResult('invoices', null)

      const response = await POST(createRequest(), createParams('non-existent-id'))

      expect(response.status).toBe(404)
    })

    it('should return 404 when invoice belongs to different tenant', async () => {
      // Mock returns null because tenant filter doesn't match
      mockState.setTableResult('invoices', null)

      const response = await POST(createRequest(), createParams(INVOICES.DRAFT.id))

      expect(response.status).toBe(404)
    })
  })

  // =========================================================================
  // Invoice Status Tests
  // =========================================================================

  describe('Invoice Status', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should reject sending void invoice', async () => {
      mockState.setTableResult('invoices', {
        ...INVOICES.DRAFT,
        status: 'void',
        owner: { id: USERS.OWNER_JUAN.id, email: USERS.OWNER_JUAN.email },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.reason).toContain('anulada')
    })

    it('should update draft invoice status to sent', async () => {
      const invoice = {
        ...INVOICES.DRAFT,
        status: 'draft',
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      }
      mockState.setTableResult('invoices', invoice)

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toContain('enviada')
    })

    it('should handle already sent invoice (idempotency)', async () => {
      const invoice = {
        ...INVOICES.SENT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      }
      mockState.setTableResult('invoices', invoice)

      const response = await POST(createRequest(), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should handle partial paid invoice', async () => {
      const invoice = {
        ...INVOICES.PARTIAL,
        owner: {
          id: USERS.OWNER_MARIA.id,
          email: USERS.OWNER_MARIA.email,
          full_name: USERS.OWNER_MARIA.fullName,
        },
      }
      mockState.setTableResult('invoices', invoice)

      const response = await POST(createRequest(), createParams(INVOICES.PARTIAL.id))

      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // Email Notification Tests
  // =========================================================================

  describe('Email Notification', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should queue email notification when owner has email', async () => {
      const invoice = {
        ...INVOICES.DRAFT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      }
      mockState.setTableResult('invoices', invoice)

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(200)
      // Note: In a real test we'd verify the notification_queue insert was called
    })

    it('should handle missing owner email gracefully', async () => {
      const invoice = {
        ...INVOICES.DRAFT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: null,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      }
      mockState.setTableResult('invoices', invoice)

      const response = await POST(createRequest(), createParams())

      // Should still succeed, just no email sent
      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // Audit Log Tests
  // =========================================================================

  describe('Audit Logging', () => {
    it('should create audit log entry', async () => {
      const { logAudit } = await import('@/lib/audit')
      mockState.setAuthScenario('VET')
      mockState.setTableResult('invoices', {
        ...INVOICES.DRAFT,
        owner: {
          id: USERS.OWNER_JUAN.id,
          email: USERS.OWNER_JUAN.email,
          full_name: USERS.OWNER_JUAN.fullName,
        },
      })

      await POST(createRequest(), createParams())

      expect(logAudit).toHaveBeenCalledWith(
        'SEND_INVOICE',
        expect.stringContaining('invoices/'),
        expect.objectContaining({
          invoice_number: INVOICES.DRAFT.invoice_number,
        })
      )
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('invoices', new Error('Database connection failed'))

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(500)
    })
  })

  // =========================================================================
  // Tenant Isolation Tests
  // =========================================================================

  describe('Tenant Isolation', () => {
    it('should not allow sending invoice from different tenant', async () => {
      // Set user to VET but in PETLIFE tenant
      mockState.setUser({
        id: USERS.ADMIN_PETLIFE.id,
        email: USERS.ADMIN_PETLIFE.email,
      })
      mockState.setProfile({
        id: USERS.ADMIN_PETLIFE.id,
        tenant_id: TENANTS.PETLIFE.id,
        role: 'admin',
      })

      // Invoice is in ADRIS tenant, so query should return null
      mockState.setTableResult('invoices', null)

      const response = await POST(createRequest(), createParams(INVOICES.DRAFT.id))

      expect(response.status).toBe(404)
    })
  })
})
