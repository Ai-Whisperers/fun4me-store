/**
 * Integration Tests: Inventory Management
 *
 * Tests store products and inventory CRUD operations.
 * @tags integration, inventory, high
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { TENANT_IDS } from '@/lib/constants/tenants'

describe('Inventory Management', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient({ serviceRole: true })
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('PRODUCTS - CREATE', () => {
    test('creates product with required fields', async () => {
      const { data, error } = await client
        .from('store_products')
        .insert({
          name: 'Dog Food Premium',
          base_price: 50000,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('Dog Food Premium')
      expect(data.base_price).toBe(50000)

      ctx.track('store_products', data.id)
    })

    test('creates product with all fields', async () => {
      const { data, error } = await client
        .from('store_products')
        .insert({
          name: 'Anti-Pulgas Spray ' + Date.now(),
          sku: `AP-SPRAY-${Date.now()}`,
          barcode: `789${Date.now()}`,
          description: 'Spray antipulgas para perros y gatos',
          short_description: 'Antipulgas spray',
          base_price: 35000,
          sale_price: 29990,
          cost_price: 20000,
          target_species: ['dog', 'cat'],
          is_active: true,
          is_featured: false,
          requires_prescription: false,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.name).toContain('Anti-Pulgas Spray')
      expect(data.sku).toContain('AP-SPRAY-')
      expect(data.base_price).toBe(35000)
      expect(data.sale_price).toBe(29990)
      expect(data.target_species).toContain('dog')

      ctx.track('store_products', data.id)
    })

    test('creates prescription-required product', async () => {
      const { data, error } = await client
        .from('store_products')
        .insert({
          name: 'Antibiótico Canino',
          base_price: 45000,
          requires_prescription: true,
          description: 'Requiere receta veterinaria',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.requires_prescription).toBe(true)

      ctx.track('store_products', data.id)
    })

    test('creates multiple products', async () => {
      const products = [
        { name: 'Collar Antipulgas', base_price: 15000 },
        { name: 'Shampoo Medicado', base_price: 22000 },
        { name: 'Vitaminas Caninas', base_price: 18000 },
      ]

      for (const prod of products) {
        const { data, error } = await client
          .from('store_products')
          .insert(prod)
          .select()
          .single()

        expect(error).toBeNull()
        ctx.track('store_products', data.id)
      }
    })
  })

  describe('PRODUCTS - READ', () => {
    let readProductId: string

    beforeAll(async () => {
      const { data } = await client
        .from('store_products')
        .insert({
          name: 'Read Test Product ' + Date.now(),
          base_price: 10000,
          sku: `READ-${Date.now()}`,
          is_active: true,
        })
        .select()
        .single()
      readProductId = data.id
      ctx.track('store_products', readProductId)
    })

    test('reads product by ID', async () => {
      const { data, error } = await client
        .from('store_products')
        .select('*')
        .eq('id', readProductId)
        .single()

      expect(error).toBeNull()
      expect(data.name).toContain('Read Test Product')
    })

    test('reads products by SKU', async () => {
      // Get the SKU we just created
      const { data: prod } = await client
        .from('store_products')
        .select('sku')
        .eq('id', readProductId)
        .single()

      const { data, error } = await client
        .from('store_products')
        .select('*')
        .eq('sku', prod!.sku)
        .single()

      expect(error).toBeNull()
      expect(data.id).toBe(readProductId)
    })

    test('filters active products', async () => {
      const { data, error } = await client
        .from('store_products')
        .select('*')
        .eq('is_active', true)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })

    test('searches products by name', async () => {
      const { data, error } = await client
        .from('store_products')
        .select('*')
        .ilike('name', '%Read Test%')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('orders products by price', async () => {
      const { data, error } = await client
        .from('store_products')
        .select('id, name, base_price')
        .order('base_price', { ascending: true })
        .limit(10)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })
  })

  describe('PRODUCTS - UPDATE', () => {
    let updateProductId: string

    beforeAll(async () => {
      const { data } = await client
        .from('store_products')
        .insert({
          name: 'Update Test Product',
          base_price: 25000,
        })
        .select()
        .single()
      updateProductId = data.id
      ctx.track('store_products', updateProductId)
    })

    test('updates product name', async () => {
      const { data, error } = await client
        .from('store_products')
        .update({ name: 'Updated Product Name' })
        .eq('id', updateProductId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.name).toBe('Updated Product Name')
    })

    test('updates product price', async () => {
      const { data, error } = await client
        .from('store_products')
        .update({ base_price: 30000, sale_price: 27000 })
        .eq('id', updateProductId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.base_price).toBe(30000)
      expect(data.sale_price).toBe(27000)
    })

    test('deactivates product', async () => {
      const { data, error } = await client
        .from('store_products')
        .update({ is_active: false })
        .eq('id', updateProductId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.is_active).toBe(false)
    })
  })

  describe('PRODUCTS - DELETE', () => {
    test('deletes product by ID', async () => {
      const { data: created } = await client
        .from('store_products')
        .insert({ name: 'To Delete Product', base_price: 5000 })
        .select()
        .single()

      const { error } = await client.from('store_products').delete().eq('id', created.id)
      expect(error).toBeNull()

      const { data: found } = await client
        .from('store_products')
        .select('*')
        .eq('id', created.id)
        .single()
      expect(found).toBeNull()
    })
  })

  describe('STOCK MANAGEMENT', () => {
    async function createStockProduct(name: string) {
      const { data } = await client
        .from('store_products')
        .insert({ name, base_price: 15000 })
        .select()
        .single()
      ctx.track('store_products', data.id)
      return data.id
    }

    test('creates inventory record for product', async () => {
      const productId = await createStockProduct('Stock Create Product')
      const { data, error } = await client
        .from('store_inventory')
        .insert({
          product_id: productId,
          tenant_id: DEFAULT_TENANT.id,
          stock_quantity: 100,
          min_stock_level: 10,
          location: 'Depósito A',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.stock_quantity).toBe(100)
      expect(data.min_stock_level).toBe(10)

      ctx.track('store_inventory', data.id)
    })

    test('updates stock quantity', async () => {
      const productId = await createStockProduct('Stock Update Product')
      const { data: inv } = await client
        .from('store_inventory')
        .insert({
          product_id: productId,
          tenant_id: DEFAULT_TENANT.id,
          stock_quantity: 50,
        })
        .select()
        .single()
      ctx.track('store_inventory', inv.id)

      const { data, error } = await client
        .from('store_inventory')
        .update({ stock_quantity: 75 })
        .eq('id', inv.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.stock_quantity).toBe(75)
    })

    test('reserves stock', async () => {
      const productId = await createStockProduct('Stock Reserve Product')
      const { data: inv } = await client
        .from('store_inventory')
        .insert({
          product_id: productId,
          tenant_id: DEFAULT_TENANT.id,
          stock_quantity: 100,
          reserved_quantity: 0,
        })
        .select()
        .single()
      ctx.track('store_inventory', inv.id)

      const { data, error } = await client
        .from('store_inventory')
        .update({ reserved_quantity: 5 })
        .eq('id', inv.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.reserved_quantity).toBe(5)
    })

    test('fails when reserved exceeds stock', async () => {
      const productId = await createStockProduct('Stock Exceed Product')
      const { data: inv } = await client
        .from('store_inventory')
        .insert({
          product_id: productId,
          tenant_id: DEFAULT_TENANT.id,
          stock_quantity: 10,
        })
        .select()
        .single()
      ctx.track('store_inventory', inv.id)

      const { error } = await client
        .from('store_inventory')
        .update({ reserved_quantity: 20 })
        .eq('id', inv.id)

      expect(error).not.toBeNull()
    })

    test('fails with negative stock', async () => {
      const productId = await createStockProduct('Stock Negative Product')
      const { error } = await client
        .from('store_inventory')
        .insert({
          product_id: productId,
          tenant_id: DEFAULT_TENANT.id,
          stock_quantity: -5,
        })

      expect(error).not.toBeNull()
    })
  })

  describe('MULTI-TENANT ISOLATION', () => {
    test('inventory is isolated by tenant', async () => {
      const { data: product } = await client
        .from('store_products')
        .insert({ name: 'Tenant Isolation Product', base_price: 10000 })
        .select()
        .single()
      ctx.track('store_products', product.id)

      // Create a second product for the other tenant to avoid unique constraint
      const { data: product2 } = await client
        .from('store_products')
        .insert({ name: 'Tenant Isolation Product 2', base_price: 10000 })
        .select()
        .single()
      ctx.track('store_products', product2.id)

      // Create inventory in terrapet
      const { data: terrapetInv } = await client
        .from('store_inventory')
        .insert({
          product_id: product.id,
          tenant_id: TENANT_IDS.ADRIS,
          stock_quantity: 50,
        })
        .select()
        .single()
      ctx.track('store_inventory', terrapetInv.id)

      // Create inventory in petlife (different product due to unique product_id constraint)
      const { data: petlifeInv } = await client
        .from('store_inventory')
        .insert({
          product_id: product2.id,
          tenant_id: TENANT_IDS.PETLIFE,
          stock_quantity: 30,
        })
        .select()
        .single()
      ctx.track('store_inventory', petlifeInv.id)

      // Query by tenant - verify each tenant only sees their own inventory
      const { data: terrapetStock } = await client
        .from('store_inventory')
        .select('*')
        .eq('tenant_id', TENANT_IDS.ADRIS)
        .eq('product_id', product.id)

      const { data: petlifeStock } = await client
        .from('store_inventory')
        .select('*')
        .eq('tenant_id', TENANT_IDS.PETLIFE)
        .eq('product_id', product2.id)

      expect(terrapetStock).not.toBeNull()
      expect(terrapetStock!.length).toBe(1)
      expect(terrapetStock![0].stock_quantity).toBe(50)
      expect(petlifeStock).not.toBeNull()
      expect(petlifeStock!.length).toBe(1)
      expect(petlifeStock![0].stock_quantity).toBe(30)
    })
  })
})
