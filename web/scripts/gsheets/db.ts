/**
 * Database connection for Google Sheets data fetching
 */

import pg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
function loadEnv() {
  const envPaths = [join(__dirname, '..', '..', '.env.local'), join(__dirname, '..', '..', '.env')]

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#][^=]*)=(.*)$/)
        if (match && !process.env[match[1].trim()]) {
          let value = match[2].trim()
          value = value.replace(/^["']|["']$/g, '')
          process.env[match[1].trim()] = value
        }
      }
    }
  }
}

loadEnv()

export async function getClient(): Promise<pg.Client> {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL not set')
  }
  const client = new Client({ connectionString })
  await client.connect()
  return client
}

export interface SupplierContactInfo {
  phone?: string
  whatsapp?: string
  email?: string
  secondary_email?: string
  pets_email?: string
  address?: string
  city?: string
  country?: string
  contact_person?: string
  contact_position?: string
  note?: string
  brands?: string[]
  bank_account?: string
}

export interface Supplier {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  contact_info: SupplierContactInfo | null
  website: string | null
  supplier_type: string
  minimum_order_amount: number | null
  payment_terms: string | null
  delivery_time_days: number | null
  verification_status: string | null
  is_active: boolean
}

export interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  country_origin: string | null
  website: string | null
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  level: number
  is_active: boolean
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  category_name: string | null
  brand_name: string | null
  purchase_unit: string
  sale_unit: string
  conversion_factor: number
  purchase_price: number
  base_price: number
  supplier_name: string | null
  target_species: string[]
  requires_prescription: boolean
  is_active: boolean
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const client = await getClient()
  try {
    const result = await client.query(`
      SELECT
        id, name, legal_name, tax_id, contact_info, website,
        supplier_type, minimum_order_amount, payment_terms,
        delivery_time_days, verification_status, is_active
      FROM suppliers
      WHERE is_active = true
      ORDER BY name
    `)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function fetchBrands(): Promise<Brand[]> {
  const client = await getClient()
  try {
    const result = await client.query(`
      SELECT id, name, slug, description, country_origin, website, is_active
      FROM store_brands
      WHERE is_active = true
      ORDER BY name
    `)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const client = await getClient()
  try {
    const result = await client.query(`
      SELECT id, name, slug, description, parent_id, level, is_active
      FROM store_categories
      WHERE is_active = true
      ORDER BY level, name
    `)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const client = await getClient()
  try {
    const result = await client.query(`
      SELECT
        p.id, p.sku, p.name, p.description,
        c.name as category_name,
        b.name as brand_name,
        p.purchase_unit, p.sale_unit, p.conversion_factor,
        p.purchase_price, p.base_price,
        s.name as supplier_name,
        p.target_species, p.requires_prescription, p.is_active
      FROM store_products p
      LEFT JOIN store_categories c ON p.category_id = c.id
      LEFT JOIN store_brands b ON p.brand_id = b.id
      LEFT JOIN suppliers s ON p.default_supplier_id = s.id
      WHERE p.is_active = true
      ORDER BY p.name
    `)
    return result.rows
  } finally {
    await client.end()
  }
}
