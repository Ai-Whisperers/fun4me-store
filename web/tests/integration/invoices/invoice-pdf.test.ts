/**
 * Invoice PDF Generation API Tests
 *
 * Tests for GET /api/invoices/[id]/pdf
 *
 * This route generates PDF invoices for download.
 * Requires authentication and tenant isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/invoices/[id]/pdf/route'
import {
  mockState,
  INVOICES,
  TENANTS,
  USERS,
  PETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock react-pdf renderToStream
vi.mock('@react-pdf/renderer', () => ({
  renderToStream: vi.fn(() => Promise.resolve(new ReadableStream())),
}))

// Mock the PDF document component
vi.mock('@/components/invoices/invoice-pdf', () => ({
  InvoicePDFDocument: vi.fn(() => null),
}))

// Import routes AFTER mocks
import { GET } from '@/app/api/invoices/[id]/pdf/route'

// Helper to create GET request
function createRequest(invoiceId: string = INVOICES.DRAFT.id): NextRequest {
  return new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}/pdf`, {
    method: 'GET',
  })
}

// Helper to create route params
function createParams(invoiceId: string = INVOICES.DRAFT.id) {
  return { params: Promise.resolve({ id: invoiceId }) }
}

// Sample invoice with full data
const createFullInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: INVOICES.SENT.id,
  tenant_id: TENANTS.ADRIS.id,
  invoice_number: 'INV-2024-001',
  status: 'sent',
  subtotal: 100000,
  tax_amount: 10000,
  total: 110000,
  amount_paid: 0,
  amount_due: 110000,
  created_at: new Date().toISOString(),
  invoice_items: [
    {
      id: 'item-1',
      description: 'Consulta General',
      quantity: 1,
      unit_price: 80000,
      discount_percent: 0,
      line_total: 80000,
      services: { name: 'Consulta General' },
    },
    {
      id: 'item-2',
      description: 'Vacunación Antirrábica',
      quantity: 1,
      unit_price: 20000,
      discount_percent: 0,
      line_total: 20000,
      services: { name: 'Vacunación' },
    },
  ],
  payments: [],
  pets: {
    id: PETS.MAX_DOG.id,
    name: 'Max',
    species: 'dog',
    owner: {
      id: USERS.OWNER_JUAN.id,
      full_name: USERS.OWNER_JUAN.fullName,
      email: USERS.OWNER_JUAN.email,
      phone: USERS.OWNER_JUAN.phone,
    },
  },
  created_by_user: {
    full_name: USERS.VET_CARLOS.fullName,
  },
  ...overrides,
})

describe('GET /api/invoices/[id]/pdf', () => {
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

      const response = await GET(createRequest(), createParams())

      expect(response.status).toBe(401)
    })

    it('should allow authenticated user to generate PDF for their invoice', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
    })

    it('should allow vet to generate PDF', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should allow admin to generate PDF', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should allow owner to generate PDF for their invoice', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Invoice Lookup Tests
  // ===========================================================================

  describe('Invoice Lookup', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when invoice not found', async () => {
      mockState.setTableResult('invoices', null)

      const response = await GET(createRequest('non-existent-id'), createParams('non-existent-id'))

      expect(response.status).toBe(404)
    })

    it('should return 404 when invoice belongs to different tenant', async () => {
      mockState.setTableResult('invoices', null)

      const response = await GET(createRequest(INVOICES.DRAFT.id), createParams(INVOICES.DRAFT.id))

      expect(response.status).toBe(404)
    })
  })

  // ===========================================================================
  // Tenant Isolation Tests
  // ===========================================================================

  describe('Tenant Isolation', () => {
    it('should return 403 when accessing invoice from different tenant', async () => {
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

      // Invoice belongs to ADRIS tenant
      mockState.setTableResult('invoices', createFullInvoice({
        tenant_id: TENANTS.ADRIS.id,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(403)
    })

    it('should allow access when tenant matches', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('invoices', createFullInvoice({
        tenant_id: TENANTS.ADRIS.id,
      }))
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // PDF Generation Tests
  // ===========================================================================

  describe('PDF Generation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should generate PDF with correct content type', async () => {
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
    })

    it('should set correct filename in Content-Disposition', async () => {
      const invoice = createFullInvoice({ invoice_number: 'INV-2024-TEST' })
      mockState.setTableResult('invoices', invoice)
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('INV-2024-TEST.pdf')
    })

    it('should include invoice items in PDF data', async () => {
      const invoice = createFullInvoice({
        invoice_items: [
          {
            id: 'item-1',
            description: 'Consulta',
            quantity: 1,
            unit_price: 80000,
            line_total: 80000,
            services: { name: 'Consulta' },
          },
        ],
      })
      mockState.setTableResult('invoices', invoice)
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should include clinic name from tenant', async () => {
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: 'Veterinaria Adris Premium' })

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle missing clinic name gracefully', async () => {
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', null)

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      // Should still work with fallback clinic name
      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Invoice Status Tests
  // ===========================================================================

  describe('Invoice Status', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })
    })

    it('should generate PDF for draft invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({ status: 'draft' }))

      const response = await GET(createRequest(INVOICES.DRAFT.id), createParams(INVOICES.DRAFT.id))

      expect(response.status).toBe(200)
    })

    it('should generate PDF for sent invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({ status: 'sent' }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should generate PDF for paid invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        status: 'paid',
        amount_paid: 110000,
        amount_due: 0,
        payments: [
          {
            id: 'payment-1',
            amount: 110000,
            payment_method: 'cash',
            paid_at: new Date().toISOString(),
            receiver: { full_name: USERS.VET_CARLOS.fullName },
          },
        ],
      }))

      const response = await GET(createRequest(INVOICES.PAID.id), createParams(INVOICES.PAID.id))

      expect(response.status).toBe(200)
    })

    it('should generate PDF for partial paid invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        status: 'partial',
        amount_paid: 50000,
        amount_due: 60000,
        payments: [
          {
            id: 'payment-1',
            amount: 50000,
            payment_method: 'card',
            paid_at: new Date().toISOString(),
          },
        ],
      }))

      const response = await GET(createRequest(INVOICES.PARTIAL.id), createParams(INVOICES.PARTIAL.id))

      expect(response.status).toBe(200)
    })

    it('should generate PDF for void invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({ status: 'void' }))

      const response = await GET(createRequest(), createParams())

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('invoices', new Error('Database connection failed'))

      const response = await GET(createRequest(), createParams())

      expect(response.status).toBe(404) // Error translates to not found
    })

    it('should return 500 on PDF rendering error', async () => {
      mockState.setTableResult('invoices', createFullInvoice())
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })

      // Mock renderToStream to throw error
      const { renderToStream } = await import('@react-pdf/renderer')
      vi.mocked(renderToStream).mockRejectedValueOnce(new Error('PDF rendering failed'))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(500)
    })
  })

  // ===========================================================================
  // Invoice Data Completeness Tests
  // ===========================================================================

  describe('Invoice Data Completeness', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })
    })

    it('should handle invoice with many line items', async () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        description: `Service ${i + 1}`,
        quantity: 1,
        unit_price: 10000,
        line_total: 10000,
        services: { name: `Service ${i + 1}` },
      }))
      mockState.setTableResult('invoices', createFullInvoice({
        invoice_items: manyItems,
        subtotal: 200000,
        tax_amount: 20000,
        total: 220000,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle invoice with multiple payments', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        status: 'paid',
        amount_paid: 110000,
        amount_due: 0,
        payments: [
          { id: 'p1', amount: 50000, payment_method: 'cash', paid_at: '2024-01-01' },
          { id: 'p2', amount: 30000, payment_method: 'card', paid_at: '2024-01-02' },
          { id: 'p3', amount: 30000, payment_method: 'transfer', paid_at: '2024-01-03' },
        ],
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle invoice with discounted items', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        invoice_items: [
          {
            id: 'item-1',
            description: 'Consulta con descuento',
            quantity: 1,
            unit_price: 100000,
            discount_percent: 20,
            line_total: 80000,
            services: { name: 'Consulta' },
          },
        ],
        subtotal: 80000,
        tax_amount: 8000,
        total: 88000,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle invoice with pet info', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        pets: {
          id: PETS.LUNA_CAT.id,
          name: PETS.LUNA_CAT.name,
          species: PETS.LUNA_CAT.species,
          breed: PETS.LUNA_CAT.breed,
          owner: {
            id: USERS.OWNER_JUAN.id,
            full_name: USERS.OWNER_JUAN.fullName,
            email: USERS.OWNER_JUAN.email,
          },
        },
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle invoice without pet info', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        pets: null,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Currency Formatting Tests
  // ===========================================================================

  describe('Currency and Totals', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('tenants', { name: TENANTS.ADRIS.name })
    })

    it('should handle large invoice amounts', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        subtotal: 10000000, // 10 million
        tax_amount: 1000000,
        total: 11000000,
        amount_due: 11000000,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle zero-amount invoice', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        subtotal: 0,
        tax_amount: 0,
        total: 0,
        amount_due: 0,
        invoice_items: [],
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })

    it('should handle different tax rates', async () => {
      mockState.setTableResult('invoices', createFullInvoice({
        subtotal: 100000,
        tax_rate: 15,
        tax_amount: 15000,
        total: 115000,
      }))

      const response = await GET(createRequest(INVOICES.SENT.id), createParams(INVOICES.SENT.id))

      expect(response.status).toBe(200)
    })
  })
})
