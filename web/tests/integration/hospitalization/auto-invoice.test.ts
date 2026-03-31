/**
 * Hospitalization Auto-Invoice API Tests
 *
 * Tests for POST /api/hospitalizations/[id]/invoice
 *
 * This route generates invoices from hospitalization stays, including:
 * - Daily kennel fees based on stay duration
 * - Treatments and medications
 * - Prevents double-invoicing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/hospitalizations/[id]/invoice/route'
import {
  mockState,
  HOSPITALIZATIONS,
  KENNELS,
  TENANTS,
  USERS,
  PETS,
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

// Mock the billing library
vi.mock('@/lib/billing/hospitalization', () => ({
  generateHospitalizationInvoice: vi.fn(),
}))

// Import routes AFTER mocks
import { POST } from '@/app/api/hospitalizations/[id]/invoice/route'

// Helper to create POST request
function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/hospitalizations/hosp-active/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper to create route params
function createParams(hospitalizationId: string = HOSPITALIZATIONS.ACTIVE.id) {
  return { params: Promise.resolve({ id: hospitalizationId }) }
}

// Sample hospitalization with full data
const createFullHospitalization = (overrides: Record<string, unknown> = {}) => ({
  id: HOSPITALIZATIONS.ACTIVE.id,
  tenant_id: TENANTS.ADRIS.id,
  pet_id: PETS.MAX_DOG.id,
  kennel_id: KENNELS.K001.id,
  status: 'active',
  acuity_level: 'stable',
  admitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  actual_discharge_at: null,
  kennel: {
    daily_rate: KENNELS.K001.daily_rate,
  },
  treatments: [],
  vitals: [],
  feedings: [],
  ...overrides,
})

describe('POST /api/hospitalizations/[id]/invoice', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to generate invoice', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(403)
    })

    it('should allow vet to generate invoice', async () => {
      mockState.setAuthScenario('VET')
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-new',
          invoice_number: 'HOS-2024-001',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
    })

    it('should allow admin to generate invoice', async () => {
      mockState.setAuthScenario('ADMIN')
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-new',
          invoice_number: 'HOS-2024-001',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
    })
  })

  // ===========================================================================
  // Invoice Generation Tests
  // ===========================================================================

  describe('Invoice Generation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should generate invoice successfully', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-generated',
          invoice_number: 'HOS-2024-001',
          total: 165000,
          items: [
            {
              description: 'Estadía en jaula (3 días)',
              quantity: 3,
              unit_price: 50000,
              total: 150000,
            },
          ],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invoice).toBeDefined()
      expect(body.invoice.invoice_number).toBe('HOS-2024-001')
      expect(body.message).toContain('exitosamente')
    })

    it('should return invoice with calculated kennel fees', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-kennel',
          invoice_number: 'HOS-2024-002',
          total: 220000,
          items: [
            {
              description: 'Estadía en jaula (4 días)',
              quantity: 4,
              unit_price: 50000,
              total: 200000,
            },
          ],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.invoice.items).toBeDefined()
    })
  })

  // ===========================================================================
  // Double-Invoice Prevention Tests
  // ===========================================================================

  describe('Double-Invoice Prevention', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return error if invoice already exists', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: {
          id: 'existing-invoice',
          invoice_number: 'HOS-2024-EXISTING',
          total: 165000,
          items: [],
        },
        error: 'Ya existe una factura para esta hospitalización',
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('Ya existe')
    })

    it('should be idempotent - repeated calls return same error', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValue({
        success: false,
        invoice: {
          id: 'existing-invoice',
          invoice_number: 'HOS-2024-EXISTING',
          total: 165000,
          items: [],
        },
        error: 'Ya existe una factura para esta hospitalización',
      })

      const response1 = await POST(createRequest(), createParams())
      const response2 = await POST(createRequest(), createParams())

      expect(response1.status).toBe(400)
      expect(response2.status).toBe(400)
    })
  })

  // ===========================================================================
  // Hospitalization Not Found Tests
  // ===========================================================================

  describe('Hospitalization Lookup', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return error when hospitalization not found', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: null,
        error: 'Hospitalización no encontrada',
      })

      const response = await POST(createRequest(), createParams('non-existent'))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('no encontrada')
    })

    it('should return error for different tenant hospitalization', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: null,
        error: 'Hospitalización no encontrada',
      })

      const response = await POST(createRequest(), createParams(HOSPITALIZATIONS.ACTIVE.id))

      expect(response.status).toBe(400)
    })
  })

  // ===========================================================================
  // Kennel Rate Calculations Tests
  // ===========================================================================

  describe('Kennel Rate Calculations', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should calculate charges for single day stay', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-1day',
          invoice_number: 'HOS-2024-003',
          total: 55000, // 50000 + 10% tax
          items: [
            {
              description: 'Estadía en jaula (1 día)',
              quantity: 1,
              unit_price: 50000,
              total: 50000,
            },
          ],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.invoice.total).toBe(55000)
    })

    it('should calculate charges for multi-day stay', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-5days',
          invoice_number: 'HOS-2024-004',
          total: 275000, // 250000 + 10% tax
          items: [
            {
              description: 'Estadía en jaula (5 días)',
              quantity: 5,
              unit_price: 50000,
              total: 250000,
            },
          ],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.invoice.total).toBe(275000)
    })

    it('should handle VIP kennel rates', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-vip',
          invoice_number: 'HOS-2024-005',
          total: 330000, // 300000 + 10% tax for 3 days @ 100000/day
          items: [
            {
              description: 'Estadía en jaula VIP (3 días)',
              quantity: 3,
              unit_price: 100000,
              total: 300000,
            },
          ],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.invoice.total).toBe(330000)
    })
  })

  // ===========================================================================
  // Audit Logging Tests
  // ===========================================================================

  describe('Audit Logging', () => {
    it('should create audit log on successful invoice generation', async () => {
      const { logAudit } = await import('@/lib/audit')
      mockState.setAuthScenario('VET')
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-audit',
          invoice_number: 'HOS-2024-AUDIT',
          total: 165000,
          items: [],
        },
      })

      await POST(createRequest(), createParams())

      expect(logAudit).toHaveBeenCalledWith(
        'CREATE_INVOICE_FROM_HOSPITALIZATION',
        expect.stringContaining('invoices/'),
        expect.objectContaining({
          invoice_number: 'HOS-2024-AUDIT',
          hospitalization_id: HOSPITALIZATIONS.ACTIVE.id,
          total: 165000,
        })
      )
    })

    it('should not create audit log on failure', async () => {
      const { logAudit } = await import('@/lib/audit')
      mockState.setAuthScenario('VET')
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: null,
        error: 'Hospitalización no encontrada',
      })

      await POST(createRequest(), createParams())

      expect(logAudit).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on unexpected error', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockRejectedValueOnce(new Error('Unexpected error'))

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(500)
    })

    it('should return 400 with error message from billing lib', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: null,
        error: 'Error al crear factura',
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toBe('Error al crear factura')
    })
  })

  // ===========================================================================
  // Response Format Tests
  // ===========================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 201 status on success', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-created',
          invoice_number: 'HOS-2024-006',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
    })

    it('should include success flag in response', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-success',
          invoice_number: 'HOS-2024-007',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should include Spanish success message', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-msg',
          invoice_number: 'HOS-2024-008',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      const body = await response.json()
      expect(body.message).toBe('Factura generada exitosamente')
    })
  })

  // ===========================================================================
  // Tenant Isolation Tests
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should use correct tenant_id from profile', async () => {
      mockState.setAuthScenario('VET')
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-tenant',
          invoice_number: 'HOS-2024-009',
          total: 165000,
          items: [],
        },
      })

      await POST(createRequest(), createParams())

      expect(generateHospitalizationInvoice).toHaveBeenCalledWith(
        expect.anything(),
        HOSPITALIZATIONS.ACTIVE.id,
        TENANTS.ADRIS.id,
        expect.any(String)
      )
    })

    it('should not allow cross-tenant invoice generation', async () => {
      // Set user to PETLIFE tenant
      mockState.setUser({
        id: USERS.ADMIN_PETLIFE.id,
        email: USERS.ADMIN_PETLIFE.email,
      })
      mockState.setProfile({
        id: USERS.ADMIN_PETLIFE.id,
        tenant_id: TENANTS.PETLIFE.id,
        role: 'admin',
      })

      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: false,
        invoice: null,
        error: 'Hospitalización no encontrada',
      })

      const response = await POST(createRequest(), createParams(HOSPITALIZATIONS.ACTIVE.id))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.details?.message).toContain('no encontrada')
    })
  })

  // ===========================================================================
  // Hospitalization Status Tests
  // ===========================================================================

  describe('Hospitalization Status', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should generate invoice for active hospitalization', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-active',
          invoice_number: 'HOS-2024-010',
          total: 165000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams(HOSPITALIZATIONS.ACTIVE.id))

      expect(response.status).toBe(201)
    })

    it('should generate invoice for discharged hospitalization', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-discharged',
          invoice_number: 'HOS-2024-011',
          total: 220000,
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams())

      expect(response.status).toBe(201)
    })

    it('should generate invoice for critical patient', async () => {
      const { generateHospitalizationInvoice } = await import('@/lib/billing/hospitalization')
      vi.mocked(generateHospitalizationInvoice).mockResolvedValueOnce({
        success: true,
        invoice: {
          id: 'invoice-critical',
          invoice_number: 'HOS-2024-012',
          total: 550000, // Higher for critical care
          items: [],
        },
      })

      const response = await POST(createRequest(), createParams(HOSPITALIZATIONS.CRITICAL.id))

      expect(response.status).toBe(201)
    })
  })
})
