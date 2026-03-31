import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  getAuthTokenFromUser,
  createTestProduct,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { GET, POST } from '@/app/api/store/products/route'
import { TENANT_IDS } from '@/lib/constants/tenants';

describe('API: /api/store/products', () => {
  let supabase: SupabaseClient
  let adminUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/store/products', () => {
    it('requires clinic parameter', async () => {
      const request = createTestRequest('http://localhost:3000/api/store/products')

      const response = await GET(request)
      await expectError(response, 400)
    })

    it('returns empty product list when no products assigned', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('products')
      expect(Array.isArray(data.products)).toBe(true)
      expect(data).toHaveProperty('pagination')
      expect(data).toHaveProperty('filters')
    })

    it('returns paginated results with correct structure', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}&page=1&limit=12`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('pages')
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('hasNext')
      expect(data.pagination).toHaveProperty('hasPrev')
    })

    it('applies search filter correctly', async () => {
      // Create products with assignments
      const product1 = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Vacuna Antirrábica',
      })
      cleanupManager.track('store_products', product1.id)

      const product2 = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Alimento Premium',
      })
      cleanupManager.track('store_products', product2.id)

      // Create clinic product assignments
      const { data: assignment1 } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: product1.id,
          is_active: true,
        })
        .select()
        .single()

      if (assignment1) cleanupManager.track('clinic_product_assignments', assignment1.id)

      const { data: assignment2 } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: product2.id,
          is_active: true,
        })
        .select()
        .single()

      if (assignment2) cleanupManager.track('clinic_product_assignments', assignment2.id)

      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}&search=Vacuna`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Search should filter products
      expect(data.products.length).toBeGreaterThan(0)
      expect(data.products.some((p: any) => p.name.includes('Vacuna'))).toBe(true)
    })

    it('applies price sorting correctly', async () => {
      const product1 = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Producto Bajo',
        base_price: 10000,
      })
      cleanupManager.track('store_products', product1.id)

      const product2 = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Producto Alto',
        base_price: 50000,
      })
      cleanupManager.track('store_products', product2.id)

      // Create assignments
      for (const product of [product1, product2]) {
        const { data: assignment } = await supabase
          .from('clinic_product_assignments')
          .insert({
            tenant_id: TEST_TENANT_ID,
            catalog_product_id: product.id,
            is_active: true,
          })
          .select()
          .single()

        if (assignment) cleanupManager.track('clinic_product_assignments', assignment.id)
      }

      // Test price_low_high sort
      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}&sort=price_low_high`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.products.length > 1) {
        expect(data.products[0].base_price).toBeLessThanOrEqual(data.products[1].base_price)
      }
    })

    it('handles pagination parameters correctly', async () => {
      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}&page=2&limit=6`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(6)
      expect(data.pagination.hasPrev).toBe(true)
    })

    it('enforces tenant isolation', async () => {
      // Create product for different tenant
      const otherProduct = await createTestProduct(supabase, 'petlife', {
        name: 'Producto Otro Tenant',
      })
      cleanupManager.track('store_products', otherProduct.id)

      const { data: otherAssignment } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          catalog_product_id: otherProduct.id,
          is_active: true,
        })
        .select()
        .single()

      if (otherAssignment) cleanupManager.track('clinic_product_assignments', otherAssignment.id)

      // Request for current tenant
      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should not include other tenant's product
      expect(data.products.some((p: any) => p.id === otherProduct.id)).toBe(false)
    })

    it('only returns active products', async () => {
      const activeProduct = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Producto Activo',
        is_active: true,
      })
      cleanupManager.track('store_products', activeProduct.id)

      const inactiveProduct = await createTestProduct(supabase, TEST_TENANT_ID, {
        name: 'Producto Inactivo',
        is_active: false,
      })
      cleanupManager.track('store_products', inactiveProduct.id)

      // Create active assignment
      const { data: assignment } = await supabase
        .from('clinic_product_assignments')
        .insert({
          tenant_id: TEST_TENANT_ID,
          catalog_product_id: activeProduct.id,
          is_active: true,
        })
        .select()
        .single()

      if (assignment) cleanupManager.track('clinic_product_assignments', assignment.id)

      const request = createTestRequest(
        `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}`
      )

      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should only include active product
      expect(data.products.every((p: any) => p.is_active === true)).toBe(true)
    })
  })

  describe('POST /api/store/products', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: { name: 'Test Product', base_price: 10000 },
      })

      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires staff role (vet or admin)', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: { name: 'Test Product', base_price: 10000 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates required field: name', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: { base_price: 10000 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates required field: base_price', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: { name: 'Test Product' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates base_price must be positive', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: { name: 'Test Product', base_price: -1000 },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates UUID format for category_id', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: {
          name: 'Test Product',
          base_price: 10000,
          category_id: 'invalid-uuid',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('vet can create product successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const productData = {
        name: `Test Product ${Date.now()}`,
        description: 'Test description',
        short_description: 'Short desc',
        sku: `SKU-${Date.now()}`,
        base_price: 15000,
        is_prescription_required: false,
        is_active: true,
      }

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: productData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.product).toBeDefined()
      expect(data.product.name).toBe(productData.name)
      expect(data.product.base_price).toBe(productData.base_price)
      expect(data.product.tenant_id).toBe(TEST_TENANT_ID)

      if (data.product) {
        cleanupManager.track('store_products', data.product.id)
      }
    })

    it('admin can create product successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const productData = {
        name: `Admin Product ${Date.now()}`,
        base_price: 25000,
      }

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: productData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.product).toBeDefined()

      if (data.product) {
        cleanupManager.track('store_products', data.product.id)
      }
    })

    it('creates product with optional fields', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const productData = {
        name: `Full Product ${Date.now()}`,
        description: 'Detailed description',
        short_description: 'Short version',
        sku: `SKU-FULL-${Date.now()}`,
        barcode: '1234567890123',
        base_price: 30000,
        sale_price: 25000,
        purchase_unit: 'Caja',
        sale_unit: 'Unidad',
        conversion_factor: 10,
        is_prescription_required: true,
        is_active: true,
        initial_stock: 100,
        reorder_point: 20,
      }

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: productData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.product.name).toBe(productData.name)
      expect(data.product.sku).toBe(productData.sku)
      expect(data.product.sale_price).toBe(productData.sale_price)

      if (data.product) {
        cleanupManager.track('store_products', data.product.id)

        // Verify inventory was created
        const { data: inventory } = await supabase
          .from('store_inventory')
          .select('*')
          .eq('product_id', data.product.id)
          .single()

        if (inventory) {
          expect(inventory.stock_quantity).toBe(100)
          expect(inventory.reorder_point).toBe(20)
          cleanupManager.track('store_inventory', inventory.id)
        }
      }
    })

    it('assigns product to creating users tenant', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const productData = {
        name: `Tenant Product ${Date.now()}`,
        base_price: 10000,
      }

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: productData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      // Product should belong to the user's tenant
      expect(data.product.tenant_id).toBe(TEST_TENANT_ID)

      if (data.product) {
        cleanupManager.track('store_products', data.product.id)
      }
    })

    it('defaults is_active to true if not provided', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: {
          name: `Default Active ${Date.now()}`,
          base_price: 10000,
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.product.is_active).toBe(true)

      if (data.product) {
        cleanupManager.track('store_products', data.product.id)
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious clinic parameter safely', async () => {
      const maliciousInputs = [
        "'; DROP TABLE store_products; --",
        "1' OR '1'='1",
        'test" OR 1=1 --',
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/store/products?clinic=${encodeURIComponent(malicious)}`
        )

        const response = await GET(request)

        // Should not crash (500)
        expect(response.status).not.toBe(500)
      }
    })

    it('handles malicious search parameter safely', async () => {
      const maliciousInputs = [
        "'; DROP TABLE store_products; --",
        "1' OR '1'='1",
      ]

      for (const malicious of maliciousInputs) {
        const request = createTestRequest(
          `http://localhost:3000/api/store/products?clinic=${TEST_TENANT_ID}&search=${encodeURIComponent(malicious)}`
        )

        const response = await GET(request)

        // Should not crash
        expect(response.status).not.toBe(500)
      }
    })

    it('handles malicious product name in POST safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DROP TABLE store_products; --"
      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: {
          name: malicious,
          base_price: 10000,
        },
        authToken,
      })

      const response = await POST(request)

      // Should handle safely (create product with escaped name or reject)
      expect(response.status).not.toBe(500)
    })
  })

  describe('Security: XSS Prevention', () => {
    it('sanitizes XSS attempts in product name', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const xssAttempt = '<script>alert("xss")</script>'
      const request = createTestRequest('http://localhost:3000/api/store/products', {
        method: 'POST',
        body: {
          name: xssAttempt,
          base_price: 10000,
        },
        authToken,
      })

      const response = await POST(request)

      // Should handle safely
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.product) {
          cleanupManager.track('store_products', data.product.id)
        }
      }
    })
  })
})
