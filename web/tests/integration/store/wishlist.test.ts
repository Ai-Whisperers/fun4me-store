/**
 * Wishlist API Tests
 *
 * Tests for:
 * - GET /api/store/wishlist
 * - POST /api/store/wishlist
 * - DELETE /api/store/wishlist
 *
 * This route handles user wishlist management.
 * GET returns empty for unauthenticated, wishlist items for authenticated.
 * POST/DELETE require authentication.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/app/api/store/wishlist/route'
import {
  mockState,
  PRODUCTS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, ...options?.details },
      { status }
    )
  },
  HTTP_STATUS: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock auth to avoid database connection
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
    return async (request: Request) => {
      const { mockState, createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
      }

      if (!mockState.profile) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Perfil no encontrado' },
        })
      }

      // Check role if specified
      const roles = options?.roles
      if (roles && roles.length > 0 && !roles.includes(mockState.profile.role)) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Create mock context - withApiAuth passes context as single object
      const mockSupabase = createStatefulSupabaseMock()
      const context = {
        user: mockState.user,
        profile: mockState.profile,
        supabase: mockSupabase,
        tenantId: mockState.profile.tenant_id,
        request: request,
      }

      // Handler receives the context object directly
      return handler(context)
    }
  },
}))


// Helper to create GET request
function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/store/wishlist', {
    method: 'GET',
  })
}

// Helper to create POST request
function createPostRequest(body: { productId?: string }): NextRequest {
  return new NextRequest('http://localhost:3000/api/store/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create DELETE request
function createDeleteRequest(productId?: string): NextRequest {
  const params = new URLSearchParams()
  if (productId) params.set('productId', productId)

  return new NextRequest(`http://localhost:3000/api/store/wishlist?${params.toString()}`, {
    method: 'DELETE',
  })
}

// Sample wishlist item with product details
const SAMPLE_WISHLIST_ITEM = {
  id: 'wishlist-001',
  product_id: PRODUCTS.DOG_FOOD.id,
  created_at: '2026-01-01T10:00:00Z',
  store_products: {
    id: PRODUCTS.DOG_FOOD.id,
    name: PRODUCTS.DOG_FOOD.name,
    sku: PRODUCTS.DOG_FOOD.sku,
    short_description: 'Premium dog food',
    base_price: PRODUCTS.DOG_FOOD.base_price,
    sale_price: null,
    image_url: null,
    is_active: true,
  },
}

const SAMPLE_WISHLIST_ITEM_2 = {
  id: 'wishlist-002',
  product_id: PRODUCTS.CAT_TREATS.id,
  created_at: '2026-01-02T10:00:00Z',
  store_products: {
    id: PRODUCTS.CAT_TREATS.id,
    name: PRODUCTS.CAT_TREATS.name,
    sku: PRODUCTS.CAT_TREATS.sku,
    short_description: 'Delicious cat treats',
    base_price: PRODUCTS.CAT_TREATS.base_price,
    sale_price: null,
    image_url: null,
    is_active: true,
  },
}

// ============================================================================
// GET Tests - Load Wishlist
// ============================================================================

describe('GET /api/store/wishlist', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return empty wishlist for unauthenticated users', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.items).toEqual([])
      expect(body.productIds).toEqual([])
      expect(body.authenticated).toBe(false)
    })

    it('should return wishlist for authenticated users', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', [SAMPLE_WISHLIST_ITEM])

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.items.length).toBe(1)
      expect(body.productIds).toContain(PRODUCTS.DOG_FOOD.id)
    })
  })

  describe('Profile Handling', () => {
    it('should return empty wishlist when user has no profile', async () => {
      mockState.setAuthScenario('OWNER')
      // Override profile to null
      mockState.setProfile(null)

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.items).toEqual([])
      expect(body.no_profile).toBe(true)
    })
  })

  describe('Wishlist Loading', () => {
    it('should return empty wishlist when no items', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', [])

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.items).toEqual([])
      expect(body.productIds).toEqual([])
    })

    it('should return multiple wishlist items', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', [
        SAMPLE_WISHLIST_ITEM,
        SAMPLE_WISHLIST_ITEM_2,
      ])

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.items.length).toBe(2)
      expect(body.productIds.length).toBe(2)
    })

    it('should include product details in items', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', [SAMPLE_WISHLIST_ITEM])

      const response = await GET()

      expect(response.status).toBe(200)
      const body = await response.json()
      const item = body.items[0]

      expect(item.store_products).toBeDefined()
      expect(item.store_products.name).toBe(PRODUCTS.DOG_FOOD.name)
      expect(item.store_products.base_price).toBe(PRODUCTS.DOG_FOOD.base_price)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableError('store_wishlist', new Error('Database error'))

      const response = await GET()

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al cargar lista de deseos')
    })
  })
})

// ============================================================================
// POST Tests - Add to Wishlist
// ============================================================================

describe('POST /api/store/wishlist', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(401)
    })

    it('should allow owner to add to wishlist', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', { id: 'wishlist-new' })

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.added).toBe(true)
    })

    it('should allow vet to add to wishlist', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('store_wishlist', { id: 'wishlist-new' })

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(200)
    })
  })

  describe('Validation', () => {
    it('should return 400 when productId is missing', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(createPostRequest({}))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('ID de producto requerido')
    })
  })

  describe('Profile Handling', () => {
    it('should return 404 when user has no profile', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setProfile(null)

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.message).toBe('Perfil no encontrado')
    })
  })

  describe('Duplicate Handling', () => {
    it('should handle duplicate silently with added=false', async () => {
      mockState.setAuthScenario('OWNER')
      // Simulate unique constraint violation
      mockState.setTableError('store_wishlist', Object.assign(new Error('Duplicate'), { code: '23505' }))

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.added).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableError('store_wishlist', new Error('Database error'))

      const response = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al agregar a lista de deseos')
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setAuthScenario('OWNER')
      mockState.setTableError('store_wishlist', new Error('Connection failed'))

      await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))

      expect(logger.error).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// DELETE Tests - Remove from Wishlist
// ============================================================================

describe('DELETE /api/store/wishlist', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))

      expect(response.status).toBe(401)
    })

    it('should allow owner to remove from wishlist', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', { count: 1 })

      const response = await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Validation', () => {
    it('should return 400 when productId is missing', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await DELETE(createDeleteRequest())

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('ID de producto requerido')
    })
  })

  describe('Successful Removal', () => {
    it('should remove item from wishlist', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', { count: 1 })

      const response = await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should succeed even if item not found', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableResult('store_wishlist', { count: 0 })

      const response = await DELETE(createDeleteRequest('non-existent-product'))

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockState.setAuthScenario('OWNER')
      mockState.setTableError('store_wishlist', new Error('Database error'))

      const response = await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al eliminar de lista de deseos')
    })

    it('should log database errors', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setAuthScenario('OWNER')
      mockState.setTableError('store_wishlist', new Error('Connection failed'))

      await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))

      expect(logger.error).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('Wishlist Integration Scenarios', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  it('should support add then view workflow', async () => {
    mockState.setAuthScenario('OWNER')

    // Add item
    mockState.setTableResult('store_wishlist', { id: 'wishlist-new' })
    const addResponse = await POST(createPostRequest({ productId: PRODUCTS.DOG_FOOD.id }))
    expect(addResponse.status).toBe(200)

    // View wishlist
    mockState.setTableResult('store_wishlist', [SAMPLE_WISHLIST_ITEM])
    const viewResponse = await GET()
    expect(viewResponse.status).toBe(200)
    const body = await viewResponse.json()
    expect(body.productIds).toContain(PRODUCTS.DOG_FOOD.id)
  })

  it('should support remove then view workflow', async () => {
    mockState.setAuthScenario('OWNER')

    // Remove item
    mockState.setTableResult('store_wishlist', { count: 1 })
    const removeResponse = await DELETE(createDeleteRequest(PRODUCTS.DOG_FOOD.id))
    expect(removeResponse.status).toBe(200)

    // View wishlist (empty)
    mockState.setTableResult('store_wishlist', [])
    const viewResponse = await GET()
    expect(viewResponse.status).toBe(200)
    const body = await viewResponse.json()
    expect(body.items).toEqual([])
  })

  it('should include inactive products in wishlist', async () => {
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('store_wishlist', [{
      ...SAMPLE_WISHLIST_ITEM,
      store_products: {
        ...SAMPLE_WISHLIST_ITEM.store_products,
        is_active: false,
      },
    }])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items[0].store_products.is_active).toBe(false)
  })

  it('should include sale price when available', async () => {
    mockState.setAuthScenario('OWNER')
    mockState.setTableResult('store_wishlist', [{
      ...SAMPLE_WISHLIST_ITEM,
      store_products: {
        ...SAMPLE_WISHLIST_ITEM.store_products,
        sale_price: 120000,
      },
    }])

    const response = await GET()

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.items[0].store_products.sale_price).toBe(120000)
  })
})
