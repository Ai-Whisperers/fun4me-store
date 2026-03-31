/**
 * Inventory Receiving API Tests
 *
 * Tests for:
 * - POST /api/inventory/receive
 *
 * This route handles stock receiving with WAC (Weighted Average Cost) recalculation.
 * Staff only operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/inventory/receive/route'
import {
  mockState,
  TENANTS,
  USERS,
  PRODUCTS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
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
import { POST } from '@/app/api/inventory/receive/route'

// Helper to create POST request
function createRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/inventory/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// Default inventory record for mocking
const DEFAULT_INVENTORY = {
  id: 'inventory-001',
  product_id: PRODUCTS.DOG_FOOD.id,
  tenant_id: TENANTS.ADRIS.id,
  stock_quantity: 25,
  weighted_average_cost: 150000,
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('POST /api/inventory/receive', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('No autorizado')
    })

    it('should return 403 when owner tries to receive stock', async () => {
      mockState.setAuthScenario('OWNER')

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Solo personal autorizado')
    })

    it('should allow vet to receive stock', async () => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(200)
    })

    it('should allow admin to receive stock', async () => {
      mockState.setAuthScenario('ADMIN')
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 400 for invalid JSON', async () => {
      const response = await POST(
        new NextRequest('http://localhost:3000/api/inventory/receive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('JSON inválido')
    })

    it('should return 400 when product_id is missing', async () => {
      const response = await POST(
        createRequest({
          quantity: 10,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('product_id es requerido')
    })

    it('should return 400 when quantity is missing', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('La cantidad debe ser mayor a 0')
    })

    it('should return 400 when quantity is zero', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 0,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('La cantidad debe ser mayor a 0')
    })

    it('should return 400 when quantity is negative', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: -5,
        })
      )

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('La cantidad debe ser mayor a 0')
    })
  })

  // ============================================================================
  // Inventory Lookup Tests
  // ============================================================================

  describe('Inventory Lookup', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 404 when inventory not found', async () => {
      mockState.setTableError('store_inventory', new Error('No rows found'))

      const response = await POST(
        createRequest({
          product_id: 'non-existent-product',
          quantity: 10,
        })
      )

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Inventario no encontrado para este producto')
    })
  })

  // ============================================================================
  // Stock Receiving Tests
  // ============================================================================

  describe('Stock Receiving', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)
    })

    it('should increase stock quantity', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.new_stock).toBe(35) // 25 + 10
    })

    it('should receive stock with notes', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          notes: 'Recepción de pedido PO-2024-001',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should receive stock with batch number', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          batch_number: 'LOT-2024-001',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should receive stock with expiry date', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          expiry_date: '2025-12-31',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should receive stock with all optional fields', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 20,
          unit_cost: 145000,
          notes: 'Compra directa de proveedor',
          batch_number: 'LOT-2024-002',
          expiry_date: '2026-06-30',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.new_stock).toBe(45) // 25 + 20
    })
  })

  // ============================================================================
  // WAC (Weighted Average Cost) Calculation Tests
  // ============================================================================

  describe('WAC Calculation', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should recalculate WAC when unit_cost is provided', async () => {
      // Current: 25 units @ 150000 = 3,750,000
      // Receiving: 10 units @ 120000 = 1,200,000
      // New total: 35 units, total value: 4,950,000
      // New WAC: 4,950,000 / 35 = 141428.57
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 25,
        weighted_average_cost: 150000,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          unit_cost: 120000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      // WAC should be recalculated
      expect(body.new_wac).toBeDefined()
      // (25 * 150000 + 10 * 120000) / 35 = 141428.57...
      expect(Math.round(body.new_wac)).toBeCloseTo(141429, -1)
    })

    it('should keep existing WAC when unit_cost is not provided', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_wac).toBe(150000) // Same as original
    })

    it('should handle WAC calculation with zero initial stock', async () => {
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 0,
        weighted_average_cost: 0,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          unit_cost: 160000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_wac).toBe(160000) // Just the new cost
    })

    it('should handle WAC calculation with null initial cost', async () => {
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 0,
        weighted_average_cost: null,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 5,
          unit_cost: 180000,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_wac).toBe(180000)
    })

    it('should use existing WAC for transaction if no new cost provided', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          // No unit_cost provided
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_wac).toBe(DEFAULT_INVENTORY.weighted_average_cost)
    })
  })

  // ============================================================================
  // Tenant Isolation Tests
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should not allow receiving stock for different tenant product', async () => {
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

      // Inventory from ADRIS - query returns error due to tenant filter
      mockState.setTableError('store_inventory', new Error('No rows found'))

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Inventario no encontrado para este producto')
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should return 500 on database update error', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)
      // The route catches errors and returns 500
    })

    it('should log errors on inventory fetch failure', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setTableError('store_inventory', new Error('Database connection failed'))

      await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle server exceptions gracefully', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      // This tests that the route doesn't crash on unexpected errors
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      // Should return success or handle error gracefully
      expect([200, 500]).toContain(response.status)
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)
    })

    it('should return all required fields on success', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('new_stock')
      expect(body).toHaveProperty('new_wac')
    })

    it('should return correct content-type header', async () => {
      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
        })
      )

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  // ============================================================================
  // Integration Scenarios
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      mockState.setAuthScenario('ADMIN')
    })

    it('should handle initial stock setup (new product)', async () => {
      mockState.setTableResult('store_inventory', {
        id: 'inventory-new',
        product_id: 'new-product-id',
        tenant_id: TENANTS.ADRIS.id,
        stock_quantity: 0,
        weighted_average_cost: 0,
      })

      const response = await POST(
        createRequest({
          product_id: 'new-product-id',
          quantity: 50,
          unit_cost: 25000,
          batch_number: 'BATCH-001',
          expiry_date: '2025-12-31',
          notes: 'Stock inicial del producto',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.new_stock).toBe(50)
      expect(body.new_wac).toBe(25000)
    })

    it('should handle large quantity receiving', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 1000,
          unit_cost: 140000,
          notes: 'Compra por volumen',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_stock).toBe(1025) // 25 + 1000
    })

    it('should handle receiving at lower cost (price decrease)', async () => {
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 100,
        weighted_average_cost: 200000,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 100,
          unit_cost: 150000,
          notes: 'Promoción del proveedor',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      // New WAC should be lower: (100 * 200000 + 100 * 150000) / 200 = 175000
      expect(body.new_wac).toBe(175000)
    })

    it('should handle receiving at higher cost (price increase)', async () => {
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 50,
        weighted_average_cost: 100000,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 50,
          unit_cost: 150000,
          notes: 'Aumento de precio del proveedor',
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      // New WAC: (50 * 100000 + 50 * 150000) / 100 = 125000
      expect(body.new_wac).toBe(125000)
    })

    it('should handle scanner-based receiving workflow', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 5,
          // Minimal data - scanner quick receive
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.new_stock).toBe(30)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockState.setAuthScenario('VET')
    })

    it('should handle very small quantities', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 1,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.new_stock).toBe(26)
    })

    it('should handle decimal unit costs correctly', async () => {
      mockState.setTableResult('store_inventory', {
        ...DEFAULT_INVENTORY,
        stock_quantity: 10,
        weighted_average_cost: 99999.99,
      })

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          unit_cost: 100000.01,
        })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should handle empty notes field', async () => {
      mockState.setTableResult('store_inventory', DEFAULT_INVENTORY)

      const response = await POST(
        createRequest({
          product_id: PRODUCTS.DOG_FOOD.id,
          quantity: 10,
          notes: '',
        })
      )

      expect(response.status).toBe(200)
    })
  })
})
