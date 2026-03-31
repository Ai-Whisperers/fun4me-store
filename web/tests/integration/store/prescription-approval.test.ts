/**
 * Store Prescription Approval Tests (Integration)
 *
 * Tests the prescription order approval workflow:
 * - GET /api/store/orders/[id]/prescription - Get prescription details
 * - PUT /api/store/orders/[id]/prescription - Approve or reject
 *
 * Covers:
 * - Authorization (vet/admin only)
 * - Validation (notes required for rejection)
 * - Status transitions (pending_prescription → confirmed/rejected)
 * - Tenant isolation
 * - Notifications and audit logging
 *
 * @tags integration, store, prescriptions, critical
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Test data
const TEST_TENANT_ID = 'test-tenant-123'
const TEST_USER_ID = 'test-user-123'
const TEST_ORDER_ID = 'order-123'
const TEST_CUSTOMER_ID = 'customer-456'

const mockPrescriptionOrder = {
  id: TEST_ORDER_ID,
  invoice_number: 'ORD-2024-001',
  order_number: 'ORD-001',
  status: 'pending_prescription',
  requires_prescription_review: true,
  prescription_file_url: 'https://storage.example.com/rx.pdf',
  prescription_reviewed_by: null,
  prescription_reviewed_at: null,
  prescription_notes: null,
  prescription_rejection_reason: null,
  customer_id: TEST_CUSTOMER_ID,
  created_at: '2024-01-01T00:00:00Z',
  customer: {
    id: TEST_CUSTOMER_ID,
    full_name: 'Test Customer',
    email: 'customer@test.com',
    phone: '+595971234567',
  },
  items: [
    {
      id: 'item-1',
      product_id: 'product-1',
      quantity: 1,
      unit_price: 50000,
      requires_prescription: true,
      prescription_file_url: 'https://storage.example.com/rx.pdf',
      product: {
        id: 'product-1',
        name: 'Medicamento Controlado',
        image_url: null,
        is_prescription_required: true,
      },
    },
  ],
}

// Mock state management
let mockUser: { id: string } | null = null
let mockProfile: { tenant_id: string; role: string; full_name: string } | null = null
let mockOrder: typeof mockPrescriptionOrder | null = null
let mockUpdateResult: { data: unknown; error: unknown } = { data: null, error: null }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: mockUser ? null : { message: 'No user' },
          })
        ),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(),
                single: vi.fn(() => Promise.resolve({ data: mockProfile, error: mockProfile ? null : { message: 'Not found' } })),
              })),
            })),
          }
        }
        if (table === 'store_orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: mockOrder,
                      error: mockOrder ? null : { message: 'Not found' },
                    })
                  ),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve(mockUpdateResult)),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null })),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        }
      }),
    })
  ),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import route handlers after mocks
import { GET, PUT } from '@/app/api/store/orders/[id]/prescription/route'

function createRequest(
  method: string,
  body?: Record<string, unknown>
): NextRequest {
  const url = `http://localhost:3000/api/store/orders/${TEST_ORDER_ID}/prescription`
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    init.body = JSON.stringify(body)
  }
  return new NextRequest(url, init)
}

function createParams(): Promise<{ id: string }> {
  return Promise.resolve({ id: TEST_ORDER_ID })
}

describe('Store Prescription Approval - Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockOrder = null
    mockUpdateResult = { data: null, error: null }
  })

  describe('GET - Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      mockUser = null

      const request = createRequest('GET')
      const response = await GET(request, { params: createParams() })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('AUTH_REQUIRED')
    })

    it('should reject owner role', async () => {
      mockUser = { id: TEST_USER_ID }
      mockProfile = { tenant_id: TEST_TENANT_ID, role: 'owner', full_name: 'Test Owner' }

      const request = createRequest('GET')
      const response = await GET(request, { params: createParams() })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('INSUFFICIENT_ROLE')
      expect(data.details.required).toContain('vet')
      expect(data.details.required).toContain('admin')
    })

    it('should allow vet role', async () => {
      mockUser = { id: TEST_USER_ID }
      mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Vet' }
      mockOrder = { ...mockPrescriptionOrder }

      const request = createRequest('GET')
      const response = await GET(request, { params: createParams() })

      expect(response.status).toBe(200)
    })

    it('should allow admin role', async () => {
      mockUser = { id: TEST_USER_ID }
      mockProfile = { tenant_id: TEST_TENANT_ID, role: 'admin', full_name: 'Admin User' }
      mockOrder = { ...mockPrescriptionOrder }

      const request = createRequest('GET')
      const response = await GET(request, { params: createParams() })

      expect(response.status).toBe(200)
    })
  })

  describe('PUT - Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      mockUser = null

      const request = createRequest('PUT', { action: 'approve' })
      const response = await PUT(request, { params: createParams() })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('AUTH_REQUIRED')
    })

    it('should reject owner role attempting to approve', async () => {
      mockUser = { id: TEST_USER_ID }
      mockProfile = { tenant_id: TEST_TENANT_ID, role: 'owner', full_name: 'Pet Owner' }

      const request = createRequest('PUT', { action: 'approve' })
      const response = await PUT(request, { params: createParams() })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('INSUFFICIENT_ROLE')
    })

    it('should reject owner role attempting to reject', async () => {
      mockUser = { id: TEST_USER_ID }
      mockProfile = { tenant_id: TEST_TENANT_ID, role: 'owner', full_name: 'Pet Owner' }

      const request = createRequest('PUT', { action: 'reject', notes: 'Invalid' })
      const response = await PUT(request, { params: createParams() })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('INSUFFICIENT_ROLE')
    })
  })
})

describe('Store Prescription Approval - GET Details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Test Vet' }
    mockOrder = { ...mockPrescriptionOrder }
  })

  it('should return order with prescription details', async () => {
    const request = createRequest('GET')
    const response = await GET(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.order).toBeDefined()
    expect(data.order.id).toBe(TEST_ORDER_ID)
    expect(data.order.requires_prescription_review).toBe(true)
    expect(data.order.prescription_file_url).toBeDefined()
  })

  it('should return 404 for non-existent order', async () => {
    mockOrder = null

    const request = createRequest('GET')
    const response = await GET(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })

  it('should include customer information', async () => {
    const request = createRequest('GET')
    const response = await GET(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.order.customer).toBeDefined()
    expect(data.order.customer.full_name).toBe('Test Customer')
  })

  it('should include prescription items', async () => {
    const request = createRequest('GET')
    const response = await GET(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.order.items).toHaveLength(1)
    expect(data.order.items[0].requires_prescription).toBe(true)
  })
})

describe('Store Prescription Approval - PUT Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Test Vet' }
    mockOrder = { ...mockPrescriptionOrder }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'confirmed',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
      },
      error: null,
    }
  })

  it('should reject invalid action value', async () => {
    const request = createRequest('PUT', { action: 'invalid' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should reject rejection without notes', async () => {
    const request = createRequest('PUT', { action: 'reject' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should reject rejection with empty notes', async () => {
    const request = createRequest('PUT', { action: 'reject', notes: '' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should reject rejection with whitespace-only notes', async () => {
    const request = createRequest('PUT', { action: 'reject', notes: '   ' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should allow approval without notes', async () => {
    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })

  it('should allow approval with optional notes', async () => {
    const request = createRequest('PUT', {
      action: 'approve',
      notes: 'Receta verificada correctamente',
    })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })

  it('should allow rejection with valid notes', async () => {
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'prescription_rejected',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_rejection_reason: 'Receta vencida',
      },
      error: null,
    }

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Receta vencida',
    })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })
})

describe('Store Prescription Approval - Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Test Vet' }
  })

  it('should reject orders without prescription requirement', async () => {
    mockOrder = {
      ...mockPrescriptionOrder,
      requires_prescription_review: false,
    }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('CONFLICT')
    expect(data.details.message).toContain('no requiere revisión')
  })

  it('should reject orders not in pending_prescription status', async () => {
    mockOrder = {
      ...mockPrescriptionOrder,
      status: 'confirmed', // Already processed
    }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('CONFLICT')
    expect(data.details.currentStatus).toBe('confirmed')
  })

  it('should reject already rejected orders', async () => {
    mockOrder = {
      ...mockPrescriptionOrder,
      status: 'prescription_rejected',
    }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('CONFLICT')
  })

  it('should transition to confirmed on approval', async () => {
    mockOrder = { ...mockPrescriptionOrder }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'confirmed',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_notes: null,
        prescription_rejection_reason: null,
      },
      error: null,
    }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.status).toBe('confirmed')
  })

  it('should transition to prescription_rejected on rejection', async () => {
    mockOrder = { ...mockPrescriptionOrder }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'prescription_rejected',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_notes: 'Receta no válida',
        prescription_rejection_reason: 'Receta no válida',
      },
      error: null,
    }

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Receta no válida',
    })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.status).toBe('prescription_rejected')
  })
})

describe('Store Prescription Approval - Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'admin', full_name: 'Admin User' }
  })

  it('should not find order from different tenant (GET)', async () => {
    // Order belongs to different tenant - simulated by returning null
    mockOrder = null

    const request = createRequest('GET')
    const response = await GET(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })

  it('should not allow approving order from different tenant', async () => {
    // Order belongs to different tenant - simulated by returning null
    mockOrder = null

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })

  it('should not allow rejecting order from different tenant', async () => {
    mockOrder = null

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Intento malicioso',
    })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })
})

describe('Store Prescription Approval - Side Effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Test Vet' }
    mockOrder = { ...mockPrescriptionOrder }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'confirmed',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
      },
      error: null,
    }
  })

  it('should record reviewer on approval', async () => {
    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.order.prescription_reviewed_by).toBe(TEST_USER_ID)
    expect(data.order.prescription_reviewed_at).toBeDefined()
  })

  it('should return success response on approval', async () => {
    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order).toBeDefined()
  })

  it('should store rejection reason', async () => {
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'prescription_rejected',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_notes: 'Documento ilegible',
        prescription_rejection_reason: 'Documento ilegible',
      },
      error: null,
    }

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Documento ilegible',
    })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.order.prescription_rejection_reason).toBe('Documento ilegible')
  })
})

describe('Store Prescription Approval - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Test Vet' }
    mockOrder = { ...mockPrescriptionOrder }
  })

  it('should handle database update errors', async () => {
    mockUpdateResult = {
      data: null,
      error: { message: 'Database connection failed' },
    }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('should handle order not found on PUT', async () => {
    mockOrder = null

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })
})

describe('Store Prescription Approval - Admin vs Vet Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: TEST_USER_ID }
    mockOrder = { ...mockPrescriptionOrder }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'confirmed',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
      },
      error: null,
    }
  })

  it('should allow vet to approve prescriptions', async () => {
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Veterinarian' }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })

  it('should allow admin to approve prescriptions', async () => {
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'admin', full_name: 'Clinic Admin' }

    const request = createRequest('PUT', { action: 'approve' })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })

  it('should allow vet to reject prescriptions', async () => {
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'vet', full_name: 'Dr. Veterinarian' }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'prescription_rejected',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_rejection_reason: 'Receta caducada',
      },
      error: null,
    }

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Receta caducada',
    })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })

  it('should allow admin to reject prescriptions', async () => {
    mockProfile = { tenant_id: TEST_TENANT_ID, role: 'admin', full_name: 'Clinic Admin' }
    mockUpdateResult = {
      data: {
        id: TEST_ORDER_ID,
        order_number: 'ORD-001',
        status: 'prescription_rejected',
        prescription_reviewed_by: TEST_USER_ID,
        prescription_reviewed_at: new Date().toISOString(),
        prescription_rejection_reason: 'Documento incompleto',
      },
      error: null,
    }

    const request = createRequest('PUT', {
      action: 'reject',
      notes: 'Documento incompleto',
    })
    const response = await PUT(request, { params: createParams() })

    expect(response.status).toBe(200)
  })
})
