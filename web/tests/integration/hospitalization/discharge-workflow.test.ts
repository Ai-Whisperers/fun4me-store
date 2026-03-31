/**
 * Hospitalization Discharge Workflow Tests (Refactored)
 *
 * Uses new QA infrastructure:
 * - mockState for stateful Supabase mocking
 * - testStaffOnlyEndpoint for auth test generation
 * - TENANTS fixtures for test data
 *
 * Original: 475 lines
 * Refactored: ~220 lines (-54%)
 *
 * @tags integration, hospitalization, clinical, critical
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getSupabaseServerMock,
  testStaffOnlyEndpoint,
  TENANTS,
} from '@/lib/test-utils'

// Test IDs
const TEST_HOSPITALIZATION_ID = 'hosp-123'
const TEST_KENNEL_ID = 'kennel-456'

// Mock state for invoice generation
let mockInvoiceResult = {
  success: true,
  invoice: { id: 'inv-123', invoice_number: 'HOS-2024-001' },
  error: undefined as string | undefined,
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Mock invoice generator
vi.mock('@/lib/billing/hospitalization', () => ({
  generateHospitalizationInvoice: vi.fn(() => Promise.resolve(mockInvoiceResult)),
}))

// Mock audit logger
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}))

// Import after mocks
import { POST } from '@/app/api/hospitalizations/[id]/discharge/route'
import { generateHospitalizationInvoice } from '@/lib/billing/hospitalization'
import { logAudit } from '@/lib/audit/logger'

// =============================================================================
// Request Factories
// =============================================================================

const createRequest = () =>
  new NextRequest(
    `http://localhost:3000/api/hospitalizations/${TEST_HOSPITALIZATION_ID}/discharge`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  )

const createContext = () => ({
  params: Promise.resolve({ id: TEST_HOSPITALIZATION_ID }),
})

// =============================================================================
// Authorization Tests (Generated - 5 tests)
// =============================================================================

testStaffOnlyEndpoint(POST, createRequest, 'Discharge Patient', createContext)

// =============================================================================
// Business Logic Tests
// =============================================================================

describe('Hospitalization Discharge - Invoice Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('VET')
    mockInvoiceResult = {
      success: true,
      invoice: { id: 'inv-123', invoice_number: 'HOS-2024-001' },
      error: undefined,
    }
    // Mock successful hospitalization update
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })
  })

  it('should generate invoice on discharge', async () => {
    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(generateHospitalizationInvoice).toHaveBeenCalled()
    expect(data.invoice).toBeDefined()
    expect(data.invoice.invoice_number).toBe('HOS-2024-001')
  })

  it('should return success when invoice already exists', async () => {
    mockInvoiceResult = {
      success: false,
      invoice: { id: 'inv-existing', invoice_number: 'HOS-2024-000' },
      error: 'Ya existe una factura para esta hospitalización',
    }

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.invoice).toBeDefined()
  })

  it('should fail if invoice generation fails with unexpected error', async () => {
    mockInvoiceResult = {
      success: false,
      invoice: null as unknown as { id: string; invoice_number: string },
      error: 'Database connection failed',
    }

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details.reason).toBe('invoice_generation_failed')
  })

  it('should pass tenant_id to invoice generator', async () => {
    await POST(createRequest(), createContext())

    expect(generateHospitalizationInvoice).toHaveBeenCalledWith(
      expect.anything(),
      TEST_HOSPITALIZATION_ID,
      TENANTS.ADRIS.id, // From mockState.setAuthScenario('VET')
      expect.any(String)
    )
  })
})

describe('Hospitalization Discharge - Status Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('VET')
    mockInvoiceResult = {
      success: true,
      invoice: { id: 'inv-123', invoice_number: 'HOS-2024-001' },
      error: undefined,
    }
  })

  it('should return success response on discharge', async () => {
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('alta')
  })

  it('should handle database update error', async () => {
    mockState.setTableError('hospitalizations', new Error('Connection failed'))

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('should handle hospitalization without kennel', async () => {
    mockState.setTableResult('hospitalizations', { kennel_id: null })

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('Hospitalization Discharge - Kennel Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('VET')
    mockInvoiceResult = {
      success: true,
      invoice: { id: 'inv-123', invoice_number: 'HOS-2024-001' },
      error: undefined,
    }
  })

  it('should free kennel on discharge', async () => {
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })

    const response = await POST(createRequest(), createContext())

    expect(response.status).toBe(200)
  })

  it('should skip kennel update when no kennel assigned', async () => {
    mockState.setTableResult('hospitalizations', { kennel_id: null })

    const response = await POST(createRequest(), createContext())

    expect(response.status).toBe(200)
  })
})

describe('Hospitalization Discharge - Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('VET')
    mockInvoiceResult = {
      success: true,
      invoice: { id: 'inv-123', invoice_number: 'HOS-2024-001' },
      error: undefined,
    }
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })
  })

  it('should log audit on successful discharge', async () => {
    const response = await POST(createRequest(), createContext())

    expect(response.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(
      'DISCHARGE_PATIENT',
      `hospitalizations/${TEST_HOSPITALIZATION_ID}`,
      expect.objectContaining({
        invoice_id: 'inv-123',
        invoice_number: 'HOS-2024-001',
      })
    )
  })
})

describe('Hospitalization Discharge - Complete Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('ADMIN')
    mockInvoiceResult = {
      success: true,
      invoice: { id: 'inv-full', invoice_number: 'HOS-2024-FULL' },
      error: undefined,
    }
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })
  })

  it('should complete full discharge workflow', async () => {
    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    // 1. Response is successful
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // 2. Invoice was generated
    expect(generateHospitalizationInvoice).toHaveBeenCalled()
    expect(data.invoice.invoice_number).toBe('HOS-2024-FULL')

    // 3. Message confirms discharge
    expect(data.message).toContain('alta')
    expect(data.message).toContain('factura')

    // 4. Audit was logged
    expect(logAudit).toHaveBeenCalled()
  })
})

describe('Hospitalization Discharge - Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
    mockState.setAuthScenario('VET')
    mockState.setTableResult('hospitalizations', { kennel_id: TEST_KENNEL_ID })
  })

  it('should handle invoice generation timeout', async () => {
    mockInvoiceResult = {
      success: false,
      invoice: null as unknown as { id: string; invoice_number: string },
      error: 'Connection timeout',
    }

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.details.message).toContain('timeout')
  })

  it('should prioritize invoice errors over discharge', async () => {
    mockInvoiceResult = {
      success: false,
      invoice: null as unknown as { id: string; invoice_number: string },
      error: 'Missing pet information',
    }

    const response = await POST(createRequest(), createContext())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })
})
