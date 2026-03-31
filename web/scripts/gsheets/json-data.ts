/**
 * JSON Data Loader for Google Sheets
 * Loads categories, brands, and products from JSON seed files
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to JSON data files
const DATA_DIR = join(__dirname, '../../db/seeds/data')

// ============================================================================
// INTERFACES
// ============================================================================

interface CategoryJson {
  slug: string
  name: string
  description: string
  examples?: string
  level: number
  display_order: number
  parent_slug: string | null
  image_url: string
  subcategories?: CategoryJson[]
}

interface CategoriesFile {
  categories: CategoryJson[]
}

interface BrandJson {
  slug: string
  name: string
  brand_type: string
  description: string
  tagline?: string
  logo_url: string
  website: string | null
  country_origin: string
  parent_company: string | null
  founded_year?: number
  specialties?: string[]
  market_segment?: string
  is_veterinary_exclusive?: boolean
  certifications?: string[]
  distribution_regions?: string[]
  local_distributor?: string
  social_media?: {
    facebook?: string
    instagram?: string
    youtube?: string
  }
  key_products?: string[]
  notes?: string
}

interface BrandsFile {
  brands: BrandJson[]
}

interface SupplierJson {
  slug: string
  name: string
  legal_name: string | null
  ruc: string | null
  type: 'Productos' | 'Servicios' | 'Ambos'
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string
  contact_name: string | null
  contact_position: string | null
  min_order_gs: number | null
  payment_terms: string | null
  delivery_days: number | null
  brands: string[]
  verified: boolean
  notes: string | null
  active: boolean
}

interface SuppliersFile {
  suppliers: SupplierJson[]
}

interface ProductVariant {
  size: string
  base_price: number
  cost_price: number
  sku_suffix: string
}

interface ProductJson {
  sku: string
  name: string
  description: string
  category_slug: string
  target_species: string[]
  requires_prescription?: boolean
  variants: ProductVariant[]
  image_url: string
  attributes: Record<string, any>
}

interface ProductsFile {
  brand_slug: string
  products: ProductJson[]
}

// ============================================================================
// FLATTENED TYPES FOR SPREADSHEET
// ============================================================================

export interface FlatCategory {
  slug: string
  name: string
  description: string
  examples: string
  level: number
  display_order: number
  parent_slug: string
  image_url: string
}

export interface FlatBrand {
  slug: string
  name: string
  brand_type: string
  description: string
  logo_url: string
  website: string
  country_origin: string
  parent_company: string
  founded_year: number | null
  specialties: string
  market_segment: string
  is_veterinary_exclusive: boolean
  local_distributor: string
  key_products: string
}

export interface FlatProduct {
  sku: string
  name: string
  description: string
  category_slug: string
  brand_slug: string
  target_species: string
  requires_prescription: boolean
  size: string
  base_price: number
  cost_price: number
  image_url: string
}

export interface FlatSupplier {
  slug: string
  name: string
  legal_name: string
  ruc: string
  type: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: string
  city: string
  contact_name: string
  contact_position: string
  min_order_gs: number
  payment_terms: string
  delivery_days: number
  brands: string
  verified: boolean
  notes: string
  active: boolean
}

// ============================================================================
// LOADERS
// ============================================================================

/**
 * Load and flatten categories from JSON
 * Converts hierarchical structure to flat list with parent references
 */
export function loadCategories(): FlatCategory[] {
  const filePath = join(DATA_DIR, 'categories.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: CategoriesFile = JSON.parse(content)

  const categories: FlatCategory[] = []

  function processCategory(cat: CategoryJson, parentSlug: string = ''): void {
    categories.push({
      slug: cat.slug,
      name: cat.name,
      description: cat.description || '',
      examples: cat.examples || '-',
      level: cat.level,
      display_order: cat.display_order,
      parent_slug: parentSlug,
      image_url: cat.image_url || '',
    })

    // Process subcategories
    if (cat.subcategories) {
      for (const subcat of cat.subcategories) {
        processCategory(
          {
            ...subcat,
            parent_slug: cat.slug,
          },
          cat.slug
        )
      }
    }
  }

  for (const category of data.categories) {
    processCategory(category)
  }

  // Sort by display_order
  categories.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    return a.display_order - b.display_order
  })

  return categories
}

/**
 * Load brands from JSON
 */
export function loadBrands(): FlatBrand[] {
  const filePath = join(DATA_DIR, 'brands.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: BrandsFile = JSON.parse(content)

  return data.brands.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    brand_type: brand.brand_type || '',
    description: brand.description || '',
    logo_url: brand.logo_url || '',
    website: brand.website || '',
    country_origin: brand.country_origin || '',
    parent_company: brand.parent_company || '',
    founded_year: brand.founded_year || null,
    specialties: brand.specialties?.join(', ') || '',
    market_segment: brand.market_segment || '',
    is_veterinary_exclusive: brand.is_veterinary_exclusive || false,
    local_distributor: brand.local_distributor || '',
    key_products: brand.key_products?.join(', ') || '',
  }))
}

/**
 * Load suppliers from JSON
 */
export function loadSuppliers(): FlatSupplier[] {
  const filePath = join(DATA_DIR, 'suppliers.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: SuppliersFile = JSON.parse(content)

  return data.suppliers.map((supplier) => ({
    slug: supplier.slug,
    name: supplier.name,
    legal_name: supplier.legal_name || '',
    ruc: supplier.ruc || '',
    type: supplier.type,
    phone: supplier.phone || '',
    whatsapp: supplier.whatsapp || '',
    email: supplier.email || '',
    website: supplier.website || '',
    address: supplier.address || '',
    city: supplier.city,
    contact_name: supplier.contact_name || '',
    contact_position: supplier.contact_position || '',
    min_order_gs: supplier.min_order_gs || 0,
    payment_terms: supplier.payment_terms || '',
    delivery_days: supplier.delivery_days || 0,
    brands: supplier.brands.join(', '),
    verified: supplier.verified,
    notes: supplier.notes || '',
    active: supplier.active,
  }))
}

/**
 * Load and flatten products from all JSON files
 * Expands variants into individual product rows
 */
export function loadProducts(): FlatProduct[] {
  const products: FlatProduct[] = []

  // Find all product files in the products/ subdirectory
  const PRODUCTS_DIR = join(DATA_DIR, 'products')
  const files = readdirSync(PRODUCTS_DIR).filter(
    (f) => f.startsWith('products-') && f.endsWith('.json')
  )

  for (const file of files) {
    const filePath = join(PRODUCTS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    const data: ProductsFile = JSON.parse(content)

    for (const product of data.products) {
      // Create one row per variant
      for (const variant of product.variants) {
        products.push({
          sku: product.sku + variant.sku_suffix,
          name: `${product.name}${variant.size ? ` ${variant.size}` : ''}`,
          description: product.description || '',
          category_slug: product.category_slug,
          brand_slug: data.brand_slug,
          target_species: product.target_species.join(', '),
          requires_prescription: product.requires_prescription || false,
          size: variant.size,
          base_price: variant.base_price,
          cost_price: variant.cost_price,
          image_url: product.image_url || '',
        })
      }
    }
  }

  // Sort by brand, then category, then name
  products.sort((a, b) => {
    if (a.brand_slug !== b.brand_slug) return a.brand_slug.localeCompare(b.brand_slug)
    if (a.category_slug !== b.category_slug) return a.category_slug.localeCompare(b.category_slug)
    return a.name.localeCompare(b.name)
  })

  return products
}

/**
 * Get summary of loaded data
 */
export function getDataSummary(): {
  categories: number
  brands: number
  suppliers: number
  products: number
} {
  return {
    categories: loadCategories().length,
    brands: loadBrands().length,
    suppliers: loadSuppliers().length,
    products: loadProducts().length,
  }
}

// CLI test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n=== JSON Data Loader Test ===\n')

  const categories = loadCategories()
  console.log(`Categories: ${categories.length}`)
  console.log('  Level 1:', categories.filter((c) => c.level === 1).length)
  console.log('  Level 2:', categories.filter((c) => c.level === 2).length)

  const brands = loadBrands()
  console.log(`\nBrands: ${brands.length}`)

  const suppliers = loadSuppliers()
  console.log(`\nSuppliers: ${suppliers.length}`)

  const products = loadProducts()
  console.log(`\nProducts (with variants): ${products.length}`)

  // Show sample
  console.log('\n--- Sample Category ---')
  console.log(categories[0])

  console.log('\n--- Sample Brand ---')
  console.log(brands[0])

  console.log('\n--- Sample Supplier ---')
  console.log(suppliers[0])

  console.log('\n--- Sample Product ---')
  console.log(products[0])
}
