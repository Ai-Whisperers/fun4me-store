/**
 * Store Seeder
 *
 * Seeds e-commerce data: brands, categories, products, inventory.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { JsonSeeder, SeederOptions, SeederResult } from './base-seeder'
import { createSeederResult } from '../utils/reporting'
import {
  StoreBrandSchema,
  StoreBrand,
  StoreCategorySchema,
  StoreCategory,
  SupplierSchema,
  Supplier,
  StoreProductSchema,
  StoreProduct,
  StoreInventorySchema,
  StoreInventory,
} from '@/lib/test-utils/schemas'
import { upsertWithIdempotency, batchUpsertWithIdempotency } from '../utils/idempotency'

/**
 * Store Brands Seeder
 */
export class StoreBrandSeeder extends JsonSeeder<StoreBrand> {
  getTableName(): string {
    return 'store_brands'
  }

  getSchema() {
    return StoreBrandSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/03-store/brands.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { brands?: unknown[] }
    return data.brands || []
  }
}

/**
 * Store Categories Seeder
 *
 * Handles nested category structure from JSON and flattens it for DB insert.
 */
export class StoreCategorySeeder extends JsonSeeder<StoreCategory> {
  getTableName(): string {
    return 'store_categories'
  }

  getSchema() {
    return StoreCategorySchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/03-store/categories.json'
  }

  /**
   * Extract and flatten nested category tree
   */
  extractData(json: unknown): unknown[] {
    const data = json as { categories?: unknown[] }
    if (!data.categories || !Array.isArray(data.categories)) return []

    // Recursively flatten the category tree
    const flatten = (cats: unknown[], parentSlug: string | null = null): unknown[] => {
      if (!cats || !Array.isArray(cats)) return []

      const result: unknown[] = []
      for (const cat of cats) {
        const record = cat as Record<string, unknown>
        // Extract subcategories before adding to result
        const subcategories = record.subcategories as unknown[] | undefined

        // Create a clean record without subcategories
        const cleanRecord = { ...record }
        delete cleanRecord.subcategories

        result.push(cleanRecord)

        // Recursively add subcategories
        if (subcategories && Array.isArray(subcategories)) {
          result.push(...flatten(subcategories, record.slug as string))
        }
      }
      return result
    }

    return flatten(data.categories)
  }

  /**
   * Pre-process to strip non-DB columns and sort by level
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    const dbColumns = [
      'id',
      'tenant_id',
      'name',
      'slug',
      'description',
      'parent_id',
      'parent_slug',
      'level',
      'display_order',
      'image_url',
      'icon',
      'is_active',
    ]

    const cleaned = data.map((item) => {
      const record = item as Record<string, unknown>
      const result: Record<string, unknown> = {}

      for (const col of dbColumns) {
        if (col in record) {
          result[col] = record[col]
        }
      }

      return result
    })

    // Sort by level to ensure parents are inserted before children
    return cleaned.sort((a, b) => {
      const aLevel = ((a as Record<string, unknown>).level as number) || 0
      const bLevel = ((b as Record<string, unknown>).level as number) || 0
      return aLevel - bLevel
    })
  }
}

/**
 * Suppliers Seeder
 *
 * Transforms JSON format to match DB schema (contact fields -> contact_info JSONB)
 */
export class SupplierSeeder extends JsonSeeder<Supplier> {
  getTableName(): string {
    return 'suppliers'
  }

  getSchema() {
    return SupplierSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/03-store/suppliers.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { suppliers?: unknown[] }
    return data.suppliers || []
  }

  /**
   * Pre-process to transform JSON fields to DB schema:
   * - Combine contact fields into contact_info JSONB
   * - Map ruc -> tax_id
   * - Map type -> supplier_type
   * - Map min_order_gs -> minimum_order_amount
   * - Map delivery_days -> delivery_time_days
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    return data.map((item) => {
      const record = item as Record<string, unknown>

      // Build contact_info JSONB from individual fields
      const contactInfo: Record<string, unknown> = {}
      if (record.phone) contactInfo.phone = record.phone
      if (record.whatsapp) contactInfo.whatsapp = record.whatsapp
      if (record.email) contactInfo.email = record.email
      if (record.address) contactInfo.address = record.address
      if (record.city) contactInfo.city = record.city
      if (record.contact_name) contactInfo.contact_person = record.contact_name
      if (record.contact_position) contactInfo.contact_position = record.contact_position

      // Map supplier_type
      let supplierType = 'products'
      if (record.type === 'Servicios') supplierType = 'services'
      else if (record.type === 'Ambos' || record.type === 'Both') supplierType = 'both'

      return {
        name: record.name,
        legal_name: record.legal_name,
        tax_id: record.ruc || record.tax_id,
        contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : null,
        website: record.website,
        supplier_type: supplierType,
        minimum_order_amount: record.min_order_gs || record.minimum_order_amount,
        payment_terms: record.payment_terms,
        delivery_time_days: record.delivery_days || record.delivery_time_days,
        is_active: record.active !== false && record.is_active !== false,
      }
    })
  }
}

/**
 * Store Products Seeder
 *
 * Loads products from multiple JSON files in the products directory.
 * Handles variant expansion and brand/category slug resolution.
 */
export class StoreProductSeeder extends JsonSeeder<StoreProduct> {
  getTableName(): string {
    return 'store_products'
  }

  getSchema() {
    return StoreProductSchema
  }

  getJsonPath(): string {
    // Not used - we load multiple files
    return 'db/seeds/data/03-store/products'
  }

  extractData(_json: unknown): unknown[] {
    // Not used - see loadData
    return []
  }

  async loadData(): Promise<unknown[]> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const productsDir = path.resolve(process.cwd(), 'db/seeds/data/03-store/products')
    const allProducts: unknown[] = []

    try {
      const files = await fs.readdir(productsDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))

      for (const file of jsonFiles) {
        const filePath = path.join(productsDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const json = JSON.parse(content) as { products?: unknown[]; brand_slug?: string }

        if (json.products) {
          // Attach file-level brand_slug to each product
          const products = json.products.map((p) => ({
            ...(p as Record<string, unknown>),
            _brand_slug: json.brand_slug,
          }))
          allProducts.push(...products)
        }
      }
    } catch (e) {
      this.log(`Error loading products: ${e}`)
    }

    return allProducts
  }

  /**
   * Pre-process to:
   * 1. Expand variants into individual product records
   * 2. Look up brand_id and category_id from slugs
   * 3. Strip non-DB columns
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    // Look up brands by slug
    const { data: brands } = await this.client.from('store_brands').select('id, slug')
    const brandMap = new Map((brands || []).map((b) => [b.slug, b.id]))

    // Look up categories by slug
    const { data: categories } = await this.client.from('store_categories').select('id, slug')
    const categoryMap = new Map((categories || []).map((c) => [c.slug, c.id]))

    const dbColumns = [
      'sku',
      'barcode',
      'name',
      'description',
      'short_description',
      'category_id',
      'brand_id',
      'purchase_unit',
      'sale_unit',
      'conversion_factor',
      'purchase_price',
      'base_price',
      'sale_price',
      'cost_price',
      'default_supplier_id',
      'image_url',
      'images',
      'weight_grams',
      'dimensions',
      'attributes',
      'target_species',
      'is_active',
      'is_featured',
      'requires_prescription',
      'display_order',
    ]

    const result: unknown[] = []

    for (const item of data) {
      const record = item as Record<string, unknown>
      const variants = record.variants as unknown[] | undefined

      // Resolve brand_id from slug
      const brandSlug = record._brand_slug || record.brand_slug
      const brandId = brandSlug ? brandMap.get(brandSlug as string) : null

      // Resolve category_id from slug
      const categoryId = record.category_slug
        ? categoryMap.get(record.category_slug as string)
        : null

      // If has variants, expand each variant as a product
      if (variants && Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
          const v = variant as Record<string, unknown>
          const cleaned: Record<string, unknown> = {}

          // Copy allowed fields from product
          for (const col of dbColumns) {
            if (col in record && col !== 'variants') {
              cleaned[col] = record[col]
            }
          }

          // Override with variant fields
          if (v.base_price != null) cleaned.base_price = v.base_price
          if (v.cost_price != null) cleaned.cost_price = v.cost_price
          if (v.sale_price != null) cleaned.sale_price = v.sale_price
          if (v.sku_suffix) {
            cleaned.sku = `${record.sku}-${v.sku_suffix}`
          }

          // Add resolved IDs
          if (brandId) cleaned.brand_id = brandId
          if (categoryId) cleaned.category_id = categoryId

          result.push(cleaned)
        }
      } else {
        // No variants - use product as-is
        const cleaned: Record<string, unknown> = {}

        for (const col of dbColumns) {
          if (col in record) {
            cleaned[col] = record[col]
          }
        }

        if (brandId) cleaned.brand_id = brandId
        if (categoryId) cleaned.category_id = categoryId

        result.push(cleaned)
      }
    }

    return result
  }
}

/**
 * Store Inventory Seeder
 *
 * Creates inventory records for products in a specific tenant.
 * Also creates clinic_product_assignments for store visibility.
 *
 * Loads ALL files matching pattern: {tenant_id}*.json
 * This allows multiple product files per tenant (e.g., terrapet.json, terrapet-real.json)
 */
export class StoreInventorySeeder extends JsonSeeder<StoreInventory> {
  // Track processed data for postProcess to create assignments
  private processedProducts: Array<{
    product_id: string
    sale_price: number | null
    min_stock_level: number
    location: string | null
  }> = []

  getTableName(): string {
    return 'store_inventory'
  }

  getSchema() {
    return StoreInventorySchema
  }

  getJsonPath(): string {
    // Not used - we load multiple files in loadData()
    return `db/seeds/data/03-store/tenant-products/${this.getTenantId()}.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { products?: unknown[] }
    return data.products || []
  }

  /**
   * Override loadData to load ALL files matching tenant pattern
   * This supports multiple product files per tenant (e.g., terrapet.json, terrapet-real.json)
   */
  async loadData(): Promise<unknown[]> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const tenantId = this.getTenantId()
    const dir = path.resolve(process.cwd(), 'db/seeds/data/03-store/tenant-products')
    const allProducts: unknown[] = []

    try {
      const files = await fs.readdir(dir)
      // Match files starting with tenant ID (e.g., terrapet.json, terrapet-real.json)
      const tenantFiles = files.filter(
        (f) => f.startsWith(tenantId) && f.endsWith('.json')
      )

      this.log(`Found ${tenantFiles.length} product files for tenant ${tenantId}: ${tenantFiles.join(', ')}`)

      for (const file of tenantFiles) {
        const filePath = path.join(dir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const json = JSON.parse(content) as { products?: unknown[] }

        if (json.products && Array.isArray(json.products)) {
          this.log(`  Loading ${json.products.length} products from ${file}`)
          allProducts.push(...json.products)
        }
      }
    } catch (e) {
      this.log(`Error loading tenant products: ${e}`)
    }

    return allProducts
  }

  /**
   * Pre-process to look up product IDs by SKU
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    // Get all SKUs from data (filter out any without SKU)
    const skus = data
      .map((item) => (item as Record<string, unknown>).sku as string)
      .filter(Boolean)

    if (skus.length === 0) {
      this.log('No valid SKUs found in data')
      return []
    }

    // Look up product IDs and base prices
    const { data: products } = await this.client
      .from('store_products')
      .select('id, sku, base_price')
      .in('sku', skus)

    if (!products || products.length === 0) {
      this.log('No products found for inventory')
      return []
    }

    const skuToProduct = new Map(products.map((p) => [p.sku, p]))

    // Clear previous processed products
    this.processedProducts = []

    const result = data
      .map((item) => {
        const record = item as Record<string, unknown>
        const sku = record.sku as string
        const product = skuToProduct.get(sku)

        if (!product) {
          return null // Skip - product not found
        }

        // Track for postProcess to create assignments
        this.processedProducts.push({
          product_id: product.id,
          sale_price: (record.sale_price as number) ?? product.base_price ?? null,
          min_stock_level: (record.min_stock_level as number) ?? 5,
          location: (record.location as string) ?? null,
        })

        return {
          product_id: product.id,
          tenant_id: this.getTenantId(),
          stock_quantity: record.initial_stock ?? 0,
          min_stock_level: record.min_stock_level ?? 5,
          location: record.location ?? null,
        }
      })
      .filter(Boolean)

    this.log(`Prepared ${result.length} inventory records, ${this.processedProducts.length} for assignments`)
    return result
  }

  /**
   * Post-process to create clinic_product_assignments for store visibility
   * Products without assignments won't appear in the store!
   */
  protected async postProcess(_created: StoreInventory[]): Promise<void> {
    if (this.processedProducts.length === 0) {
      this.log('No products to create assignments for')
      return
    }

    const tenantId = this.getTenantId()

    // Get existing assignments to avoid duplicates
    const productIds = this.processedProducts.map((p) => p.product_id)
    const { data: existingAssignments } = await this.client
      .from('clinic_product_assignments')
      .select('catalog_product_id')
      .eq('tenant_id', tenantId)
      .in('catalog_product_id', productIds)

    const existingProductIds = new Set(
      (existingAssignments || []).map((a) => a.catalog_product_id)
    )

    // Filter to only new assignments
    const newAssignments = this.processedProducts
      .filter((p) => !existingProductIds.has(p.product_id))
      .map((p) => ({
        tenant_id: tenantId,
        catalog_product_id: p.product_id,
        sale_price: p.sale_price,
        min_stock_level: p.min_stock_level,
        location: p.location,
        is_active: true,
      }))

    if (newAssignments.length === 0) {
      this.log('All products already have assignments')
      return
    }

    this.log(`Creating ${newAssignments.length} clinic_product_assignments...`)

    // Insert in batches of 50
    const batchSize = 50
    let created = 0
    let errors = 0

    for (let i = 0; i < newAssignments.length; i += batchSize) {
      const batch = newAssignments.slice(i, i + batchSize)
      const { error } = await this.client.from('clinic_product_assignments').insert(batch)

      if (error) {
        this.log(`  Error inserting assignments batch: ${error.message}`)
        errors++
      } else {
        created += batch.length
      }
    }

    this.log(`  Created ${created} assignments, ${errors} batch errors`)
  }
}

/**
 * Composite seeder for all store data
 */
export class AllStoreSeeder {
  private client: SupabaseClient
  private options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  async seed(): Promise<SeederResult[]> {
    const results: SeederResult[] = []

    // Seed in dependency order
    const seeders = [
      new StoreBrandSeeder(this.client, this.options),
      new StoreCategorySeeder(this.client, this.options),
      new SupplierSeeder(this.client, this.options),
      new StoreProductSeeder(this.client, this.options),
    ]

    // These don't need tenant_id
    for (const seeder of seeders) {
      try {
        const result = await seeder.seed()
        results.push(result)
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (!error.message.includes('ENOENT')) {
          results.push(createSeederResult(seeder.getTableName(), 0, 0, [{ error }], [], new Date()))
        }
      }
    }

    // Inventory needs tenant_id
    if (this.options.tenantId) {
      try {
        const inventorySeeder = new StoreInventorySeeder(this.client, this.options)
        const result = await inventorySeeder.seed()
        results.push(result)
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (!error.message.includes('ENOENT')) {
          results.push(createSeederResult('store_inventory', 0, 0, [{ error }], [], new Date()))
        }
      }
    }

    return results
  }
}
