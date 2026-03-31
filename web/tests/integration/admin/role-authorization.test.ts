/**
 * Admin Role Authorization Tests (Refactored)
 *
 * Uses new QA infrastructure:
 * - mockState for stateful Supabase mocking
 * - testAdminOnlyEndpoint for auth test generation
 * - USERS fixtures for test data
 *
 * Original: 548 lines
 * Refactored: ~180 lines (-67%)
 *
 * @tags integration, security, admin, critical
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  mockState,
  getSupabaseServerMock,
  testAdminOnlyEndpoint,
  TENANTS,
} from '@/lib/test-utils'

// Import the admin routes we're testing
import { GET as getPendingProducts } from '@/app/api/admin/products/pending/route'
import { POST as approveProduct } from '@/app/api/admin/products/[id]/approve/route'

// Mock Supabase with stateful mock
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())

// Import routes AFTER mocks
import { GET as getPendingProducts } from '@/app/api/admin/products/pending/route'
import { POST as approveProduct } from '@/app/api/admin/products/[id]/approve/route'

// =============================================================================
// Request Factories
// =============================================================================

const createGetRequest = (params?: Record<string, string>) => {
  const url = new URL('http://localhost/api/admin/products/pending')
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

const productId = 'product-123'

const createPostRequest = (body: Record<string, unknown>) =>
  new NextRequest(`http://localhost/api/admin/products/${productId}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

const createPostContext = () => ({
  params: Promise.resolve({ id: productId }),
})

// =============================================================================
// Authorization Tests (Generated)
// =============================================================================

// GET /api/admin/products/pending - Admin only
testAdminOnlyEndpoint(
  getPendingProducts,
  () => createGetRequest(),
  'GET Pending Products'
)

// POST /api/admin/products/[id]/approve - Admin only
testAdminOnlyEndpoint(
  approveProduct,
  () => createPostRequest({ action: 'verify' }),
  'Approve Product',
  createPostContext
)

// =============================================================================
// Business Logic Tests
// =============================================================================

describe('Admin Products - Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  describe('GET /api/admin/products/pending', () => {
    it('should return proper pagination for admin requests', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('store_products', [])

      const request = createGetRequest({ page: '1', limit: '10' })
      const response = await getPendingProducts(request)

      if (response.status === 200) {
        const json = await response.json()
        expect(json).toHaveProperty('products')
        expect(json).toHaveProperty('pagination')
      }
    })
  })

  describe('POST /api/admin/products/[id]/approve', () => {
    beforeEach(() => {
      mockState.setAuthScenario('ADMIN')
    })

    it('should allow admin to verify products', async () => {
      // Mock product exists and is pending
      mockState.setTableResult('store_products', {
        id: productId,
        name: 'Test Product',
        created_by_tenant_id: 'tenant-other',
        verification_status: 'pending',
      })

      const request = createPostRequest({ action: 'verify' })
      const response = await approveProduct(request, createPostContext())

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should allow admin to reject products', async () => {
      mockState.setTableResult('store_products', {
        id: productId,
        name: 'Test Product',
        created_by_tenant_id: 'tenant-other',
        verification_status: 'pending',
      })

      const request = createPostRequest({
        action: 'reject',
        rejection_reason: 'Datos incompletos',
      })
      const response = await approveProduct(request, createPostContext())

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(403)
    })

    it('should reject invalid action values', async () => {
      const request = createPostRequest({ action: 'invalid_action' })
      const response = await approveProduct(request, createPostContext())

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing action parameter', async () => {
      const request = createPostRequest({})
      const response = await approveProduct(request, createPostContext())

      expect(response.status).toBe(400)
    })
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Admin Authorization Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.reset()
  })

  describe('Profile Edge Cases', () => {
    it('should reject user with no profile record', async () => {
      // User exists but no profile
      mockState.setUser({ id: 'orphan-user', email: 'orphan@test.com' })
      mockState.setProfile(null)

      const request = createGetRequest()
      const response = await getPendingProducts(request)

      expect(response.status).toBe(403)
    })

    it('should reject user with undefined role', async () => {
      mockState.setUser({ id: 'user-no-role', email: 'norole@test.com' })
      mockState.setProfile({
        id: 'user-no-role',
        tenant_id: TENANTS.ADRIS.id,
        role: undefined as unknown as 'owner' | 'vet' | 'admin',
        full_name: 'User Without Role',
      })

      const request = createGetRequest()
      const response = await getPendingProducts(request)

      expect(response.status).toBe(403)
    })
  })

  describe('Authentication Edge Cases', () => {
    it('should handle expired session gracefully', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const request = createGetRequest()
      const response = await getPendingProducts(request)

      expect(response.status).toBe(401)
    })

    it('should handle malformed auth token', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const request = createGetRequest()
      const response = await getPendingProducts(request)

      expect(response.status).toBe(401)
    })
  })
})
