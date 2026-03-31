/**
 * Reorder Suggestions API Tests
 *
 * Tests for:
 * - GET /api/inventory/reorder-suggestions
 *
 * This route returns products at or below their reorder point with urgency levels.
 * Staff only operations (vet/admin).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/inventory/reorder-suggestions/route'
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

// Import routes AFTER mocks
import { GET } from '@/app/api/inventory/reorder-suggestions/route'

// Helper to create request with query params
function createRequest(groupBySupplier?: boolean): NextRequest {
  const params = new URLSearchParams()
  if (groupBySupplier !== undefined) {
    params.set('groupBySupplier', String(groupBySupplier))
  }

  const url = params.toString()
    ? `http://localhost:3000/api/inventory/reorder-suggestions?${params.toString()}`
    : 'http://localhost:3000/api/inventory/reorder-suggestions'

  return new NextRequest(url, { method: 'GET' })
}

// Sample inventory data with nested relations
const SAMPLE_INVENTORY_LOW_STOCK = {
  id: 'inv-001',
  product_id: PRODUCTS.DOG_FOOD.id,
  stock_quantity: 5,
  available_quantity: 3,
  min_stock_level: 10,
  reorder_point: 15,
  reorder_quantity: 50,
  weighted_average_cost: 150000,
  store_products: {
    id: PRODUCTS.DOG_FOOD.id,
    name: PRODUCTS.DOG_FOOD.name,
    sku: PRODUCTS.DOG_FOOD.sku,
    image_url: null,
    default_supplier_id: 'supplier-001',
    category_id: 'cat-001',
    store_categories: { name: 'Alimentos' },
    suppliers: { id: 'supplier-001', name: 'Proveedor Principal' },
  },
}

const SAMPLE_INVENTORY_OUT_OF_STOCK = {
  id: 'inv-002',
  product_id: PRODUCTS.OUT_OF_STOCK.id,
  stock_quantity: 0,
  available_quantity: 0,
  min_stock_level: 5,
  reorder_point: 10,
  reorder_quantity: 20,
  weighted_average_cost: 65000,
  store_products: {
    id: PRODUCTS.OUT_OF_STOCK.id,
    name: PRODUCTS.OUT_OF_STOCK.name,
    sku: PRODUCTS.OUT_OF_STOCK.sku,
    image_url: null,
    default_supplier_id: 'supplier-002',
    category_id: 'cat-002',
    store_categories: { name: 'Accesorios' },
    suppliers: { id: 'supplier-002', name: 'Accesorios Pet' },
  },
}

const SAMPLE_INVENTORY_NO_SUPPLIER = {
  id: 'inv-003',
  product_id: 'product-003',
  stock_quantity: 2,
  available_quantity: 2,
  min_stock_level: 5,
  reorder_point: 8,
  reorder_quantity: 30,
  weighted_average_cost: 45000,
  store_products: {
    id: 'product-003',
    name: 'Producto Sin Proveedor',
    sku: 'PROD-003',
    image_url: null,
    default_supplier_id: null,
    category_id: 'cat-001',
    store_categories: { name: 'Varios' },
    suppliers: null,
  },
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/inventory/reorder-suggestions', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await GET(createRequest())

      expect(response.status).toBe(401)
    })

    it('should return 403 when owner tries to access', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await GET(createRequest())

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.message).toBe('Acceso denegado')
    })

    it('should allow vet to access suggestions', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('store_inventory', [])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
    })

    it('should allow admin to access suggestions', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('store_inventory', [])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Empty Results Tests
  // ============================================================================

  describe('Empty Results', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return empty array when no products need reordering', async () => {
      mockState.setTableResult('store_inventory', [])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.suggestions).toEqual([])
      expect(body.summary.total_products).toBe(0)
    })

    it('should return empty grouped when no products need reordering', async () => {
      mockState.setTableResult('store_inventory', [])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.grouped).toEqual([])
    })
  })

  // ============================================================================
  // Urgency Level Tests
  // ============================================================================

  describe('Urgency Levels', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should mark out of stock as critical urgency', async () => {
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY_OUT_OF_STOCK])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.suggestions[0].urgency).toBe('critical')
    })

    it('should mark below min_stock_level as low urgency', async () => {
      const lowStockItem = {
        ...SAMPLE_INVENTORY_LOW_STOCK,
        available_quantity: 5, // Below min_stock_level of 10
      }
      mockState.setTableResult('store_inventory', [lowStockItem])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.suggestions[0].urgency).toBe('low')
    })

    it('should mark at reorder point as reorder urgency', async () => {
      const reorderItem = {
        ...SAMPLE_INVENTORY_LOW_STOCK,
        available_quantity: 12, // Above min_stock_level but below reorder_point
      }
      mockState.setTableResult('store_inventory', [reorderItem])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.suggestions[0].urgency).toBe('reorder')
    })
  })

  // ============================================================================
  // Flat List Response Tests
  // ============================================================================

  describe('Flat List Response', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return flat list when groupBySupplier=false', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_LOW_STOCK,
        SAMPLE_INVENTORY_OUT_OF_STOCK,
      ])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('suggestions')
      expect(body).not.toHaveProperty('grouped')
      expect(body.suggestions.length).toBe(2)
    })

    it('should include all required fields in suggestion', async () => {
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY_LOW_STOCK])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()
      const suggestion = body.suggestions[0]

      expect(suggestion).toHaveProperty('id')
      expect(suggestion).toHaveProperty('name')
      expect(suggestion).toHaveProperty('sku')
      expect(suggestion).toHaveProperty('stock_quantity')
      expect(suggestion).toHaveProperty('available_quantity')
      expect(suggestion).toHaveProperty('min_stock_level')
      expect(suggestion).toHaveProperty('reorder_point')
      expect(suggestion).toHaveProperty('reorder_quantity')
      expect(suggestion).toHaveProperty('weighted_average_cost')
      expect(suggestion).toHaveProperty('supplier_id')
      expect(suggestion).toHaveProperty('supplier_name')
      expect(suggestion).toHaveProperty('urgency')
      expect(suggestion).toHaveProperty('category_name')
    })

    it('should include summary in response', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_LOW_STOCK,
        SAMPLE_INVENTORY_OUT_OF_STOCK,
      ])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.summary).toHaveProperty('total_products')
      expect(body.summary).toHaveProperty('critical_count')
      expect(body.summary).toHaveProperty('low_count')
    })
  })

  // ============================================================================
  // Grouped Response Tests
  // ============================================================================

  describe('Grouped Response', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return grouped by supplier by default', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_LOW_STOCK,
        SAMPLE_INVENTORY_OUT_OF_STOCK,
      ])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('grouped')
      expect(body.grouped.length).toBe(2) // Two different suppliers
    })

    it('should group products by same supplier', async () => {
      const sameSupplierItems = [
        SAMPLE_INVENTORY_LOW_STOCK,
        {
          ...SAMPLE_INVENTORY_OUT_OF_STOCK,
          store_products: {
            ...SAMPLE_INVENTORY_OUT_OF_STOCK.store_products,
            default_supplier_id: 'supplier-001', // Same supplier
            suppliers: { id: 'supplier-001', name: 'Proveedor Principal' },
          },
        },
      ]
      mockState.setTableResult('store_inventory', sameSupplierItems)

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.grouped.length).toBe(1)
      expect(body.grouped[0].products.length).toBe(2)
    })

    it('should handle products without supplier', async () => {
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY_NO_SUPPLIER])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.grouped[0].supplier_name).toBe('Sin proveedor asignado')
      expect(body.grouped[0].supplier_id).toBeNull()
    })

    it('should calculate total cost per supplier group', async () => {
      mockState.setTableResult('store_inventory', [SAMPLE_INVENTORY_LOW_STOCK])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.grouped[0].total_cost).toBeGreaterThan(0)
      expect(body.grouped[0].total_items).toBeGreaterThan(0)
    })

    it('should include extended summary for grouped response', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_LOW_STOCK,
        SAMPLE_INVENTORY_OUT_OF_STOCK,
      ])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.summary).toHaveProperty('total_estimated_cost')
    })

    it('should sort suppliers by product count descending', async () => {
      const multiSupplierItems = [
        SAMPLE_INVENTORY_LOW_STOCK,
        {
          ...SAMPLE_INVENTORY_LOW_STOCK,
          id: 'inv-004',
          store_products: {
            ...SAMPLE_INVENTORY_LOW_STOCK.store_products,
            id: 'product-004',
          },
        },
        SAMPLE_INVENTORY_OUT_OF_STOCK, // Different supplier with 1 product
      ]
      mockState.setTableResult('store_inventory', multiSupplierItems)

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      // First group should have more products
      expect(body.grouped[0].products.length).toBeGreaterThanOrEqual(body.grouped[1].products.length)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database error', async () => {
      mockState.setTableError('store_inventory', new Error('Database error'))

      const response = await GET(createRequest())

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.message).toBe('Error al consultar productos')
    })
  })

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      mockState.setAuthScenario('ADMIN')
    })

    it('should support procurement workflow', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_LOW_STOCK,
        SAMPLE_INVENTORY_OUT_OF_STOCK,
      ])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      // Should have data needed to create purchase orders
      for (const group of body.grouped) {
        expect(group.supplier_id || group.supplier_name).toBeDefined()
        expect(group.total_cost).toBeDefined()
        expect(group.products.length).toBeGreaterThan(0)
      }
    })

    it('should identify critical items needing immediate attention', async () => {
      mockState.setTableResult('store_inventory', [
        SAMPLE_INVENTORY_OUT_OF_STOCK,
        SAMPLE_INVENTORY_LOW_STOCK,
      ])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.summary.critical_count).toBe(1)
      expect(body.summary.low_count).toBe(1)
    })

    it('should handle inventory with null reorder_point', async () => {
      const nullReorderPoint = {
        ...SAMPLE_INVENTORY_LOW_STOCK,
        reorder_point: null,
        available_quantity: 3, // Below min_stock_level
      }
      mockState.setTableResult('store_inventory', [nullReorderPoint])

      const response = await GET(createRequest(false))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.suggestions.length).toBe(1)
    })

    it('should use default reorder quantity when not set', async () => {
      const noReorderQty = {
        ...SAMPLE_INVENTORY_LOW_STOCK,
        reorder_quantity: null,
      }
      mockState.setTableResult('store_inventory', [noReorderQty])

      const response = await GET(createRequest(true))

      expect(response.status).toBe(200)
      const body = await response.json()

      // Should use default quantity of 10 for calculations
      expect(body.grouped[0].total_items).toBe(10)
    })
  })
})
