/**
 * Functionality Tests: Store - Product Browsing
 *
 * Tests product catalog and store browsing functionality.
 * @tags functionality, store, e-commerce, high
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'

describe('Store - Product Browsing', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  // Test products setup
  const testProducts = [
    { name: 'Dog Food Premium', category: 'Alimentos', price: 75000, stock: 50 },
    { name: 'Cat Food Deluxe', category: 'Alimentos', price: 65000, stock: 30 },
    { name: 'Anti-Pulgas Spray', category: 'Farmacia', price: 45000, stock: 25 },
    { name: 'Vitaminas Caninas', category: 'Farmacia', price: 55000, stock: 40 },
    { name: 'Collar Ajustable', category: 'Accesorios', price: 25000, stock: 100 },
    { name: 'Correa Premium', category: 'Accesorios', price: 35000, stock: 60 },
    { name: 'Shampoo Hipoalergénico', category: 'Higiene', price: 28000, stock: 45 },
    { name: 'Pelota Masticable', category: 'Juguetes', price: 15000, stock: 80 },
  ]

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()

    // Create test products
    for (const product of testProducts) {
      const { data } = await client
        .from('products')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          ...product,
        })
        .select()
        .single()

      if (data) {
        ctx.track('products', data.id)
      }
    }
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('PRODUCT LISTING', () => {
    test('lists all available products', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .gt('stock', 0)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(testProducts.length)
    })

    test('returns product with all display fields', async () => {
      const { data, error } = await client
        .from('products')
        .select('id, name, category, price, stock, description, image_url')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!).toHaveProperty('id')
      expect(data!).toHaveProperty('name')
      expect(data!).toHaveProperty('category')
      expect(data!).toHaveProperty('price')
      expect(data!).toHaveProperty('stock')
    })

    test('excludes out-of-stock products when filtering', async () => {
      // Create out of stock product
      const { data: outOfStock } = await client
        .from('products')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          name: 'Out of Stock Item',
          category: 'Test',
          price: 10000,
          stock: 0,
        })
        .select()
        .single()
      expect(outOfStock).not.toBeNull()
      ctx.track('products', outOfStock!.id)

      // Query available products
      const { data } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .gt('stock', 0)

      expect(data).not.toBeNull()
      expect(data!.some((p: { id: string }) => p.id === outOfStock!.id)).toBe(false)
    })
  })

  describe('CATEGORY FILTERING', () => {
    test('filters products by Alimentos category', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('category', 'Alimentos')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
      expect(data!.every((p: { category: string }) => p.category === 'Alimentos')).toBe(true)
    })

    test('filters products by Farmacia category', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('category', 'Farmacia')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { category: string }) => p.category === 'Farmacia')).toBe(true)
    })

    test('filters products by Accesorios category', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('category', 'Accesorios')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { category: string }) => p.category === 'Accesorios')).toBe(true)
    })

    test('gets all available categories', async () => {
      const { data, error } = await client
        .from('products')
        .select('category')
        .eq('tenant_id', DEFAULT_TENANT.id)

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      const categories = [...new Set(data!.map((p: { category: string }) => p.category))]
      expect(categories.length).toBeGreaterThan(0)
    })

    test('returns empty for non-existent category', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('category', 'NonExistentCategory')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBe(0)
    })
  })

  describe('PRICE SORTING', () => {
    test('sorts products by price ascending', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .order('price', { ascending: true })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      for (let i = 1; i < data!.length; i++) {
        expect(data![i].price).toBeGreaterThanOrEqual(data![i - 1].price)
      }
    })

    test('sorts products by price descending', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .order('price', { ascending: false })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      for (let i = 1; i < data!.length; i++) {
        expect(data![i].price).toBeLessThanOrEqual(data![i - 1].price)
      }
    })
  })

  describe('PRICE RANGE FILTERING', () => {
    test('filters products under 30000', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .lt('price', 30000)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { price: number }) => p.price < 30000)).toBe(true)
    })

    test('filters products between 30000 and 60000', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .gte('price', 30000)
        .lte('price', 60000)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { price: number }) => p.price >= 30000 && p.price <= 60000)).toBe(true)
    })

    test('filters products over 60000', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .gt('price', 60000)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { price: number }) => p.price > 60000)).toBe(true)
    })
  })

  describe('PRODUCT SEARCH', () => {
    test('searches products by name containing "Dog"', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .ilike('name', '%Dog%')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { name: string }) => p.name.toLowerCase().includes('dog'))).toBe(true)
    })

    test('searches products by name containing "Premium"', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .ilike('name', '%Premium%')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('search is case-insensitive', async () => {
      const { data: uppercase } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .ilike('name', '%FOOD%')

      const { data: lowercase } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .ilike('name', '%food%')

      expect(uppercase).not.toBeNull()
      expect(lowercase).not.toBeNull()
      expect(uppercase!.length).toBe(lowercase!.length)
    })

    test('returns empty for non-matching search', async () => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .ilike('name', '%XYZ123NonExistent%')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBe(0)
    })
  })

  describe('PAGINATION', () => {
    test('paginates results with limit', async () => {
      const pageSize = 3

      const { data: page1 } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .range(0, pageSize - 1)
        .order('name')

      const { data: page2 } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .range(pageSize, pageSize * 2 - 1)
        .order('name')

      expect(page1).not.toBeNull()
      expect(page1!.length).toBeLessThanOrEqual(pageSize)

      // Pages should not overlap
      if (page1!.length > 0 && page2 && page2.length > 0) {
        const page1Ids = page1!.map((p: { id: string }) => p.id)
        const hasOverlap = page2.some((p: { id: string }) => page1Ids.includes(p.id))
        expect(hasOverlap).toBe(false)
      }
    })

    test('gets total count for pagination', async () => {
      const { count, error } = await client
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', DEFAULT_TENANT.id)

      expect(error).toBeNull()
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('PRODUCT DETAILS', () => {
    test('gets single product by ID', async () => {
      // First get any product
      const { data: products } = await client
        .from('products')
        .select('id')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .limit(1)

      expect(products).not.toBeNull()
      if (products!.length > 0) {
        const { data, error } = await client
          .from('products')
          .select('*')
          .eq('id', products![0].id)
          .single()

        expect(error).toBeNull()
        expect(data).not.toBeNull()
        expect(data!.id).toBe(products![0].id)
      }
    })

    test('returns null for non-existent product ID', async () => {
      const { data } = await client
        .from('products')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()

      expect(data).toBeNull()
    })
  })
})
