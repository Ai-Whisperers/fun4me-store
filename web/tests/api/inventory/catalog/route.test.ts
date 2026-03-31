import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { GET } from '@/app/api/inventory/catalog/route'

describe('API: /api/inventory/catalog', () => {
  let supabase: SupabaseClient
  let globalProduct1Id: string
  let globalProduct2Id: string
  let globalProduct3Id: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create global catalog products (tenant_id = null, is_global_catalog = true)
    const { data: product1 } = await supabase
      .from('store_products')
      .insert({
        tenant_id: null,
        is_global_catalog: true,
        is_active: true,
        sku: 'GLOBAL-001',
        name: 'Global Product Alpha',
        description: 'Test global product 1',
        base_price: 100.0,
        target_species: ['dog', 'cat'],
        requires_prescription: false,
      })
      .select()
      .single()

    if (product1) {
      globalProduct1Id = product1.id
      cleanupManager.track('store_products', product1.id)
    }

    const { data: product2 } = await supabase
      .from('store_products')
      .insert({
        tenant_id: null,
        is_global_catalog: true,
        is_active: true,
        sku: 'GLOBAL-002',
        name: 'Global Product Beta',
        description: 'Test global product 2',
        base_price: 150.0,
        target_species: ['dog'],
        requires_prescription: true,
      })
      .select()
      .single()

    if (product2) {
      globalProduct2Id = product2.id
      cleanupManager.track('store_products', product2.id)
    }

    const { data: product3 } = await supabase
      .from('store_products')
      .insert({
        tenant_id: null,
        is_global_catalog: true,
        is_active: true,
        sku: 'GLOBAL-003',
        name: 'Global Product Gamma',
        description: 'Test global product 3',
        base_price: 200.0,
        target_species: ['cat'],
        requires_prescription: false,
      })
      .select()
      .single()

    if (product3) {
      globalProduct3Id = product3.id
      cleanupManager.track('store_products', product3.id)
    }

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  // =============================================================================
  // GET /api/inventory/catalog
  // =============================================================================

  describe('GET /api/inventory/catalog', () => {
    it('requires clinic parameter', async () => {
      const request = createTestRequest('http://localhost:3000/api/inventory/catalog')
      const response = await GET(request)
      await expectError(response, 400)
    })

    it('returns global catalog products', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('products')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.products)).toBe(true)
    })

    it('only returns global catalog products (tenant_id = null)', async () => {
      // Create a clinic-specific product (should NOT appear in catalog)
      const { data: clinicProduct } = await supabase
        .from('store_products')
        .insert({
          tenant_id: TEST_TENANT_ID,
          is_global_catalog: false,
          is_active: true,
          sku: 'CLINIC-001',
          name: 'Clinic Specific Product',
          base_price: 50.0,
        })
        .select()
        .single()

      if (clinicProduct) cleanupManager.track('store_products', clinicProduct.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Verify clinic product is NOT in results
      expect(data.products.some((p: any) => p.id === clinicProduct?.id)).toBe(false)

      // Verify global products ARE in results
      const productIds = data.products.map((p: any) => p.id)
      expect(productIds).toContain(globalProduct1Id)
    })

    it('only returns active products', async () => {
      // Create inactive global product (should NOT appear)
      const { data: inactiveProduct } = await supabase
        .from('store_products')
        .insert({
          tenant_id: null,
          is_global_catalog: true,
          is_active: false,
          sku: 'GLOBAL-INACTIVE',
          name: 'Inactive Global Product',
          base_price: 75.0,
        })
        .select()
        .single()

      if (inactiveProduct) cleanupManager.track('store_products', inactiveProduct.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.products.some((p: any) => p.id === inactiveProduct?.id)).toBe(false)
    })

    it('excludes soft-deleted products', async () => {
      // Create soft-deleted global product (should NOT appear)
      const { data: deletedProduct } = await supabase
        .from('store_products')
        .insert({
          tenant_id: null,
          is_global_catalog: true,
          is_active: true,
          sku: 'GLOBAL-DELETED',
          name: 'Deleted Global Product',
          base_price: 80.0,
          deleted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (deletedProduct) cleanupManager.track('store_products', deletedProduct.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.products.some((p: any) => p.id === deletedProduct?.id)).toBe(false)
    })

    it('supports search by name', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=Alpha`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.products.length > 0) {
        expect(data.products.some((p: any) => p.name.includes('Alpha'))).toBe(true)
      }
      expect(data.filters.applied.search).toBe('Alpha')
    })

    it('supports search by SKU', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=GLOBAL-001`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.products.length > 0) {
        expect(data.products.some((p: any) => p.sku === 'GLOBAL-001')).toBe(true)
      }
    })

    it('supports pagination with default limit (24)', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(24)
      expect(data.pagination.total).toBeGreaterThanOrEqual(0)
      expect(data.pagination.pages).toBeGreaterThanOrEqual(0)
    })

    it('supports custom page number', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&page=2`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination.page).toBe(2)
    })

    it('supports custom limit', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&limit=10`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination.limit).toBe(10)
      expect(data.products.length).toBeLessThanOrEqual(10)
    })

    it('calculates pagination metadata correctly', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&limit=2`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      const { total, pages, page, limit } = data.pagination
      expect(pages).toBe(Math.ceil(total / limit))
      expect(data.pagination.hasNext).toBe(page < pages)
      expect(data.pagination.hasPrev).toBe(page > 1)
    })

    it('hides assigned products by default', async () => {
      // Assign globalProduct1 to the clinic
      const { data: assignment } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: globalProduct1Id,
          sale_price: 120.0,
          is_active: true,
        })
        .select()
        .single()

      if (assignment) cleanupManager.track('clinic_product_assignments', assignment.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Assigned product should NOT appear in results
      expect(data.products.some((p: any) => p.id === globalProduct1Id)).toBe(false)
    })

    it('shows assigned products when show_assigned=true', async () => {
      // Assign globalProduct2 to the clinic
      const { data: assignment } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: globalProduct2Id,
          sale_price: 180.0,
          is_active: true,
        })
        .select()
        .single()

      if (assignment) cleanupManager.track('clinic_product_assignments', assignment.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&show_assigned=true`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Assigned product SHOULD appear in results
      const assignedProduct = data.products.find((p: any) => p.id === globalProduct2Id)
      expect(assignedProduct).toBeDefined()
      expect(assignedProduct.is_assigned).toBe(true)
      expect(assignedProduct.assignment).toBeDefined()
      expect(assignedProduct.assignment.sale_price).toBe(180.0)
    })

    it('includes assignment metadata when product is assigned', async () => {
      // Assign globalProduct3 to the clinic
      const { data: assignment } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: globalProduct3Id,
          sale_price: 250.0,
          is_active: false,
        })
        .select()
        .single()

      if (assignment) cleanupManager.track('clinic_product_assignments', assignment.id)

      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&show_assigned=true`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      const assignedProduct = data.products.find((p: any) => p.id === globalProduct3Id)
      if (assignedProduct) {
        expect(assignedProduct.assignment).toBeDefined()
        expect(assignedProduct.assignment.sale_price).toBe(250.0)
        expect(assignedProduct.assignment.is_active).toBe(false)
      }
    })

    it('returns product with all expected fields', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.products.length > 0) {
        const product = data.products[0]
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('sku')
        expect(product).toHaveProperty('name')
        expect(product).toHaveProperty('description')
        expect(product).toHaveProperty('base_price')
        expect(product).toHaveProperty('target_species')
        expect(product).toHaveProperty('requires_prescription')
        expect(product).toHaveProperty('is_assigned')
        expect(product).toHaveProperty('assignment')
      }
    })

    it('sorts products by name ascending', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&limit=100`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.products.length > 1) {
        const names = data.products.map((p: any) => p.name)
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
        expect(names).toEqual(sortedNames)
      }
    })

    it('handles empty results gracefully', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=NONEXISTENT_PRODUCT_XYZ123`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.products).toEqual([])
      expect(data.pagination.total).toBe(0)
      expect(data.pagination.pages).toBe(0)
    })

    it('returns filters metadata', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=test&show_assigned=true`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.filters).toBeDefined()
      expect(data.filters.applied).toBeDefined()
      expect(data.filters.applied.search).toBe('test')
      expect(data.filters.applied.show_assigned).toBe(true)
    })
  })

  // =============================================================================
  // Security: SQL Injection Prevention
  // =============================================================================

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious clinic parameter safely', async () => {
      const malicious = "'; DROP TABLE store_products; --"
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${encodeURIComponent(malicious)}`
      )
      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious search parameter safely', async () => {
      const malicious = "' OR '1'='1"
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=${encodeURIComponent(malicious)}`
      )
      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious category parameter safely', async () => {
      const malicious = "'; DELETE FROM store_categories WHERE '1'='1"
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&category=${encodeURIComponent(malicious)}`
      )
      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious brand parameter safely', async () => {
      const malicious = "' UNION SELECT * FROM users --"
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&brand=${encodeURIComponent(malicious)}`
      )
      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })
  })

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles invalid page number gracefully', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&page=-1`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination.page).toBeLessThanOrEqual(1)
    })

    it('handles invalid limit gracefully', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&limit=0`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination.limit).toBeGreaterThan(0)
    })

    it('handles very large page number', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&page=999999`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.products).toEqual([])
    })

    it('handles empty search string', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&search=`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.filters.applied.search).toBeNull()
    })

    it('handles show_assigned with invalid value', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/inventory/catalog?clinic=${TEST_TENANT_ID}&show_assigned=invalid`
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.filters.applied.show_assigned).toBe(false)
    })
  })
})
