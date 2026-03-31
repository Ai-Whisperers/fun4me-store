#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * SEED.TS - API-Based Database Seeding
 * =============================================================================
 * Comprehensive seed script using factory pattern and direct Supabase API.
 * Replaces the legacy SQL-based seeding approach.
 *
 * Usage:
 *   npx tsx db/seeds/scripts/seed.ts                    # Full demo seed
 *   npx tsx db/seeds/scripts/seed.ts --type basic       # Basic clinic setup
 *   npx tsx db/seeds/scripts/seed.ts --type reference   # Reference data only
 *   npx tsx db/seeds/scripts/seed.ts --type full        # Full with store data
 *   npx tsx db/seeds/scripts/seed.ts --tenant petlife   # Seed specific tenant
 *   npx tsx db/seeds/scripts/seed.ts --clear            # Clear tenant data first
 *
 * =============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

// Factory imports - loaded dynamically to avoid module resolution issues
let OwnerFactory: any
let PetFactory: any
let createPredefinedOwners: any
let createPetsForOwner: any
let createAppointmentHistory: any
let createInvoiceHistory: any
let createLoyaltyForPersona: any
let setMode: any

async function loadFactories(): Promise<void> {
  const factories = await import('../../../lib/test-utils/factories/index.js')
  const context = await import('../../../lib/test-utils/context.js')

  OwnerFactory = factories.OwnerFactory
  PetFactory = factories.PetFactory
  createPredefinedOwners = factories.createPredefinedOwners
  createPetsForOwner = factories.createPetsForOwner
  createAppointmentHistory = factories.createAppointmentHistory
  createInvoiceHistory = factories.createInvoiceHistory
  createLoyaltyForPersona = factories.createLoyaltyForPersona
  setMode = context.setMode
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

interface SeedConfig {
  type: 'basic' | 'reference' | 'full' | 'demo'
  tenants: string[]
  clearFirst: boolean
  verbose: boolean
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

let supabase: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (supabase) return supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    // Try loading from .env.local
    const envPath = join(__dirname, '..', '..', '..', '.env.local')
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#][^=]*)=(.*)$/)
        if (match && !process.env[match[1].trim()]) {
          let value = match[2].trim().replace(/^["']|["']$/g, '')
          process.env[match[1].trim()] = value
        }
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return supabase
}

// =============================================================================
// SCHEMA COLUMN DEFINITIONS (only insert these columns)
// =============================================================================

const SCHEMA_COLUMNS = {
  diagnosis_codes: ['code', 'term', 'standard', 'category', 'description', 'species', 'severity'],
  drug_dosages: [
    'name',
    'species',
    'dose_mg_per_kg',
    'dose_range_min',
    'dose_range_max',
    'route',
    'frequency',
    'notes',
    'contraindications',
    'category',
  ],
  growth_standards: [
    'species',
    'breed',
    'breed_category',
    'gender',
    'age_weeks',
    'weight_kg',
    'percentile',
  ],
  lab_test_catalog: [
    'code',
    'name',
    'category',
    'description',
    'sample_type',
    'unit',
    'reference_min',
    'reference_max',
    'turnaround_hours',
    'price',
  ],
  insurance_providers: [
    'code',
    'name',
    'contact_email',
    'contact_phone',
    'website',
    'claim_process',
    'notes',
  ],
  services: [
    'name',
    'description',
    'category',
    'base_price',
    'duration_minutes',
    'is_active',
    'requires_appointment',
    'currency',
  ],
  payment_methods: ['name', 'type', 'is_active', 'processing_fee_percent', 'notes'],
  kennels: ['code', 'name', 'kennel_type', 'size', 'daily_rate', 'current_status', 'notes'],
  store_brands: [
    'slug',
    'name',
    'logo_url',
    'website',
    'description',
    'country_origin',
    'is_active',
    'is_global_catalog',
  ],
  store_categories: [
    'slug',
    'name',
    'description',
    'parent_id',
    'level',
    'display_order',
    'is_active',
    'is_global_catalog',
  ],
  suppliers: [
    'name',
    'legal_name',
    'tax_id',
    'contact_info',
    'website',
    'supplier_type',
    'payment_terms',
    'delivery_time_days',
    'is_active',
  ],
  store_products: [
    'sku',
    'name',
    'description',
    'brand_id',
    'category_id',
    'base_price',
    'purchase_unit',
    'sale_unit',
    'weight_grams',
    'requires_prescription',
    'is_active',
    'barcode',
    'image_url',
    'is_global_catalog',
  ],
}

/**
 * Filter object to only include valid schema columns
 */
function filterColumns<T extends Record<string, any>>(
  data: T[],
  tableName: keyof typeof SCHEMA_COLUMNS
): Partial<T>[] {
  const validColumns = SCHEMA_COLUMNS[tableName]
  if (!validColumns) return data

  return data.map((item) => {
    const filtered: Record<string, any> = {}
    for (const col of validColumns) {
      if (col in item) {
        filtered[col] = item[col]
      }
    }
    return filtered as Partial<T>
  })
}

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const DiagnosisCodeSchema = z.object({
  code: z.string().min(1),
  term: z.string().min(1),
  standard: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  species: z.array(z.string()).optional(),
  severity: z.string().optional(),
})

const DrugDosageSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  dose_mg_per_kg: z.number().optional(),
  dose_range_min: z.number().optional(),
  dose_range_max: z.number().optional(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  contraindications: z.union([z.string(), z.array(z.string())]).optional(), // Can be string or array
  category: z.string().optional(),
})

const GrowthStandardSchema = z.object({
  species: z.string().min(1),
  breed: z.string().optional(),
  breed_category: z.string().optional(),
  gender: z.string().optional(),
  age_weeks: z.number().int().min(0),
  weight_kg: z.number().positive(),
  percentile: z.union([z.number(), z.string()]).optional(), // Can be number or string (e.g., "p50")
})

const ServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  base_price: z.number().min(0),
  duration_minutes: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  requires_appointment: z.boolean().optional(),
  currency: z.string().optional(),
})

const PaymentMethodSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  is_active: z.boolean().optional(),
  processing_fee_percent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

const KennelSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kennel_type: z.string().optional(),
  size: z.string().optional(),
  daily_rate: z.number().min(0).optional(),
  current_status: z.string().optional(),
  notes: z.string().optional(),
})

const BrandSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  logo_url: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional(),
  country_origin: z.string().optional(),
  is_active: z.boolean().optional(),
  is_global_catalog: z.boolean().optional(),
})

const CategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  parent_slug: z.string().optional().nullable(), // Can be null for root categories
  level: z.number().int().min(0).optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  is_global_catalog: z.boolean().optional(),
})

const SupplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  website: z.string().url().optional().nullable(),
  payment_terms: z.string().optional(),
  lead_time_days: z.number().int().min(0).optional(),
})

const ProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  brand_slug: z.string().optional().nullable(),
  category_slug: z.string().optional().nullable(),
  base_price: z.number().min(0).optional(), // Optional - some products may not have base price
  purchase_unit: z.string().optional().nullable(),
  sale_unit: z.string().optional().nullable(),
  weight_grams: z.number().int().min(0).optional().nullable(),
  requires_prescription: z.boolean().optional(),
  is_active: z.boolean().optional(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(), // Removed URL validation - may be placeholder or missing
  is_global_catalog: z.boolean().optional(),
})

const InsuranceProviderSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  website: z.string().url().optional().nullable(),
  claim_process: z.string().optional(),
  notes: z.string().optional(),
})

const TenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().optional(),
  domain: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  is_active: z.boolean().optional(),
})

interface ValidationResult<T> {
  valid: T[]
  errors: Array<{ index: number; issues: z.ZodIssue[] }>
}

/**
 * Validates an array of items against a Zod schema
 * Returns both valid items and a list of validation errors
 */
function validateArray<T>(
  data: unknown[],
  schema: z.ZodType<T>,
  context: string
): ValidationResult<T> {
  const valid: T[] = []
  const errors: Array<{ index: number; issues: z.ZodIssue[] }> = []

  for (let i = 0; i < data.length; i++) {
    const result = schema.safeParse(data[i])
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push({ index: i, issues: result.error.issues })
    }
  }

  if (errors.length > 0) {
    console.warn(`  ⚠️  ${context}: ${errors.length}/${data.length} records failed validation`)
    // Show first 3 errors as examples
    for (const err of errors.slice(0, 3)) {
      const fieldErrors = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      console.warn(`      Record ${err.index}: ${fieldErrors}`)
    }
    if (errors.length > 3) {
      console.warn(`      ... and ${errors.length - 3} more errors`)
    }
  }

  return { valid, errors }
}

// =============================================================================
// JSON DATA LOADERS
// =============================================================================

function loadJSON<T>(path: string): T | null {
  if (!existsSync(path)) {
    console.warn(`  ⚠️  File not found: ${path}`)
    return null
  }
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as T
  } catch (e) {
    console.error(`  ❌ Error loading ${path}: ${e}`)
    return null
  }
}

// =============================================================================
// REFERENCE DATA SEEDING
// =============================================================================

async function seedReferenceData(verbose: boolean = false): Promise<void> {
  console.log('\n📚 Seeding reference data...')
  const client = getClient()

  // Diagnosis codes
  const diagnosisData = loadJSON<{ diagnosis_codes: any[] }>(
    join(DATA_DIR, '01-reference', 'diagnosis-codes.json')
  )
  if (diagnosisData?.diagnosis_codes) {
    const { valid } = validateArray(
      diagnosisData.diagnosis_codes,
      DiagnosisCodeSchema,
      'Diagnosis codes'
    )
    const filtered = filterColumns(valid, 'diagnosis_codes')
    const { error } = await client.from('diagnosis_codes').upsert(filtered, { onConflict: 'code' })
    if (error) {
      console.error(`  ❌ Diagnosis codes: ${error.message}`)
    } else {
      console.log(`  ✅ Diagnosis codes: ${filtered.length} records`)
    }
  }

  // Drug dosages
  const drugData = loadJSON<{ drug_dosages: any[] }>(
    join(DATA_DIR, '01-reference', 'drug-dosages.json')
  )
  if (drugData?.drug_dosages) {
    const { valid } = validateArray(drugData.drug_dosages, DrugDosageSchema, 'Drug dosages')
    const filtered = filterColumns(valid, 'drug_dosages')
    const { error } = await client
      .from('drug_dosages')
      .upsert(filtered, { onConflict: 'name,species' })
    if (error) {
      console.error(`  ❌ Drug dosages: ${error.message}`)
    } else {
      console.log(`  ✅ Drug dosages: ${filtered.length} records`)
    }
  }

  // Growth standards - upsert on unique constraint (species, breed_category, gender, age_weeks, percentile)
  const growthData = loadJSON<{ growth_standards: any[] }>(
    join(DATA_DIR, '01-reference', 'growth-standards.json')
  )
  if (growthData?.growth_standards) {
    const { valid } = validateArray(
      growthData.growth_standards,
      GrowthStandardSchema,
      'Growth standards'
    )
    const filtered = filterColumns(valid, 'growth_standards')

    // Deduplicate by unique key combination (later entries override earlier)
    const deduped = new Map<string, any>()
    for (const record of filtered) {
      const key = `${record.species || ''}|${record.breed_category || ''}|${record.gender || ''}|${record.age_weeks || 0}|${record.percentile || ''}`
      deduped.set(key, record)
    }
    const uniqueRecords = Array.from(deduped.values())

    const { error } = await client
      .from('growth_standards')
      .upsert(uniqueRecords, { onConflict: 'species,breed_category,gender,age_weeks,percentile' })
    if (error) {
      console.error(`  ❌ Growth standards: ${error.message}`)
    } else {
      console.log(`  ✅ Growth standards: ${uniqueRecords.length} records`)
    }
  }

  // Lab tests - skip for now as they are tenant-specific
  // Lab tests need tenant_id which we don't have in reference data
  console.log(`  ⏭️  Lab tests: skipped (requires tenant context)`)

  // Vaccine protocols - Skip if table doesn't exist (vaccine_schedules may not be in schema)
  // This data can be seeded manually or the table needs to be created
  console.log(`  ⏭️  Vaccine protocols: skipped (table not in current schema)`)

  // Insurance providers
  const insuranceData = loadJSON<{ insurance_providers: any[] }>(
    join(DATA_DIR, '01-reference', 'insurance-providers.json')
  )
  if (insuranceData?.insurance_providers) {
    const { valid } = validateArray(
      insuranceData.insurance_providers,
      InsuranceProviderSchema,
      'Insurance providers'
    )
    const filtered = filterColumns(valid, 'insurance_providers')
    const { error } = await client
      .from('insurance_providers')
      .upsert(filtered, { onConflict: 'code' })
    if (error) {
      console.error(`  ❌ Insurance providers: ${error.message}`)
    } else {
      console.log(`  ✅ Insurance providers: ${filtered.length} records`)
    }
  }
}

// =============================================================================
// TENANT/CLINIC SEEDING
// =============================================================================

async function seedTenant(tenantId: string): Promise<void> {
  console.log(`\n🏢 Seeding tenant: ${tenantId}`)
  const client = getClient()

  // Load and upsert tenant
  const tenantsData = loadJSON<{ tenants: any[] }>(join(DATA_DIR, '00-core', 'tenants.json'))

  const tenant = tenantsData?.tenants?.find((t: any) => t.id === tenantId)
  if (tenant) {
    // Validate tenant data
    const result = TenantSchema.safeParse(tenant)
    if (!result.success) {
      console.error(`  ❌ Tenant ${tenantId}: validation failed`)
      result.error.issues.forEach((i) => console.error(`      ${i.path.join('.')}: ${i.message}`))
      return
    }

    const { error } = await client.from('tenants').upsert(tenant, { onConflict: 'id' })
    if (error) {
      console.error(`  ❌ Tenant ${tenantId}: ${error.message}`)
    } else {
      console.log(`  ✅ Tenant: ${tenant.name}`)
    }
  }
}

async function seedClinicData(tenantId: string, verbose: boolean = false): Promise<void> {
  console.log(`\n🏥 Seeding clinic data for: ${tenantId}`)
  const client = getClient()

  // Services
  const servicesData = loadJSON<{ services: any[] }>(
    join(DATA_DIR, '02-clinic', tenantId, 'services.json')
  )
  if (servicesData?.services) {
    const { valid } = validateArray(servicesData.services, ServiceSchema, 'Services')
    const filtered = filterColumns(valid, 'services')
    const services = filtered.map((s: any) => ({
      ...s,
      tenant_id: tenantId,
    }))
    const { error } = await client
      .from('services')
      .upsert(services, { onConflict: 'tenant_id,name' })
    if (error) {
      console.error(`  ❌ Services: ${error.message}`)
    } else {
      console.log(`  ✅ Services: ${services.length} records`)
    }
  }

  // Payment methods - delete and insert (no unique constraint)
  const paymentData = loadJSON<{ payment_methods: any[] }>(
    join(DATA_DIR, '02-clinic', tenantId, 'payment-methods.json')
  )
  if (paymentData?.payment_methods) {
    const { valid } = validateArray(
      paymentData.payment_methods,
      PaymentMethodSchema,
      'Payment methods'
    )
    const filtered = filterColumns(valid, 'payment_methods')
    const methods = filtered.map((m: any) => ({
      ...m,
      tenant_id: tenantId,
    }))
    // Clear existing for tenant and insert fresh
    await client.from('payment_methods').delete().eq('tenant_id', tenantId)
    const { error } = await client.from('payment_methods').insert(methods)
    if (error) {
      console.error(`  ❌ Payment methods: ${error.message}`)
    } else {
      console.log(`  ✅ Payment methods: ${methods.length} records`)
    }
  }

  // Kennels
  const kennelsData = loadJSON<{ kennels: any[] }>(
    join(DATA_DIR, '02-clinic', tenantId, 'kennels.json')
  )
  if (kennelsData?.kennels) {
    const { valid } = validateArray(kennelsData.kennels, KennelSchema, 'Kennels')
    const filtered = filterColumns(valid, 'kennels')
    const kennels = filtered.map((k: any) => ({
      ...k,
      tenant_id: tenantId,
    }))
    const { error } = await client.from('kennels').upsert(kennels, { onConflict: 'tenant_id,code' })
    if (error) {
      console.error(`  ❌ Kennels: ${error.message}`)
    } else {
      console.log(`  ✅ Kennels: ${kennels.length} records`)
    }
  }

  // Global templates (consent, message, time-off types)
  await seedGlobalTemplates(tenantId, verbose)
}

async function seedGlobalTemplates(tenantId: string, verbose: boolean = false): Promise<void> {
  const client = getClient()

  // Consent templates - check if global templates exist first (code is globally unique)
  const consentData = loadJSON<{ consent_templates: any[] }>(
    join(DATA_DIR, '02-templates', 'consent-templates.json')
  )
  if (consentData?.consent_templates) {
    // Check if global templates already exist
    const { count: existingCount } = await client
      .from('consent_templates')
      .select('*', { count: 'exact', head: true })
      .is('tenant_id', null)

    if (existingCount && existingCount > 0) {
      console.log(`  ✅ Consent templates: ${existingCount} global templates exist`)
    } else {
      // Insert as global templates (tenant_id = null) if none exist
      const { error } = await client.from('consent_templates').insert(consentData.consent_templates)
      if (error) {
        console.error(`  ❌ Consent templates: ${error.message}`)
      } else {
        console.log(`  ✅ Consent templates: ${consentData.consent_templates.length} records`)
      }
    }
  }

  // Message templates
  const messageData = loadJSON<{ message_templates: any[] }>(
    join(DATA_DIR, '02-templates', 'message-templates.json')
  )
  if (messageData?.message_templates) {
    const templates = messageData.message_templates.map((t: any) => ({
      ...t,
      tenant_id: tenantId,
    }))
    const { error } = await client
      .from('message_templates')
      .upsert(templates, { onConflict: 'tenant_id,name' })
    if (error) {
      console.error(`  ❌ Message templates: ${error.message}`)
    } else {
      console.log(`  ✅ Message templates: ${templates.length} records`)
    }
  }

  // Time-off types
  const timeOffData = loadJSON<{ time_off_types: any[] }>(
    join(DATA_DIR, '02-templates', 'time-off-types.json')
  )
  if (timeOffData?.time_off_types) {
    const types = timeOffData.time_off_types.map((t: any) => ({
      ...t,
      tenant_id: tenantId,
    }))
    const { error } = await client
      .from('time_off_types')
      .upsert(types, { onConflict: 'tenant_id,name' })
    if (error) {
      console.error(`  ❌ Time-off types: ${error.message}`)
    } else {
      console.log(`  ✅ Time-off types: ${types.length} records`)
    }
  }
}

// =============================================================================
// STORE DATA SEEDING
// =============================================================================

async function seedStoreData(tenants: string[], verbose: boolean = false): Promise<void> {
  console.log('\n🛒 Seeding store data...')
  const client = getClient()

  // Brands (global)
  const brandsData = loadJSON<{ brands: any[] }>(join(DATA_DIR, '03-store', 'brands.json'))
  if (brandsData?.brands) {
    const { valid } = validateArray(brandsData.brands, BrandSchema, 'Brands')
    const filtered = filterColumns(valid, 'store_brands')
    const { error } = await client.from('store_brands').upsert(filtered, { onConflict: 'slug' })
    if (error) {
      console.error(`  ❌ Brands: ${error.message}`)
    } else {
      console.log(`  ✅ Brands: ${filtered.length} records`)
    }
  }

  // Categories (global) - need to resolve parent_slug to parent_id
  const categoriesData = loadJSON<{ categories: any[] }>(
    join(DATA_DIR, '03-store', 'categories.json')
  )
  if (categoriesData?.categories) {
    const { valid } = validateArray(categoriesData.categories, CategorySchema, 'Categories')
    // First pass: insert categories without parent_id
    const categories = valid.map((c: any) => {
      const cat: any = {}
      for (const col of SCHEMA_COLUMNS.store_categories) {
        if (col in c && col !== 'parent_id') {
          cat[col] = c[col]
        }
      }
      cat.is_global_catalog = true
      return cat
    })

    const { error: firstPassError } = await client
      .from('store_categories')
      .upsert(categories, { onConflict: 'slug' })

    if (firstPassError) {
      console.error(`  ❌ Categories: ${firstPassError.message}`)
    } else {
      // Second pass: update parent_id for categories with parent_slug
      const { data: allCats } = await client.from('store_categories').select('id, slug')
      const slugToId = new Map((allCats || []).map((c: any) => [c.slug, c.id]))

      for (const cat of valid) {
        if (cat.parent_slug && slugToId.has(cat.parent_slug)) {
          await client
            .from('store_categories')
            .update({ parent_id: slugToId.get(cat.parent_slug) })
            .eq('slug', cat.slug)
        }
      }
      console.log(`  ✅ Categories: ${categories.length} records`)
    }
  }

  // Suppliers (global) - transform flat contact fields to contact_info jsonb
  const suppliersData = loadJSON<{ suppliers: any[] }>(join(DATA_DIR, '03-store', 'suppliers.json'))
  if (suppliersData?.suppliers) {
    const { valid } = validateArray(suppliersData.suppliers, SupplierSchema, 'Suppliers')
    const suppliers = valid.map((s: any) => {
      const supplier: any = {
        name: s.name,
        is_active: true,
      }
      // Build contact_info from flat fields
      const contactInfo: any = {}
      if (s.email) contactInfo.email = s.email
      if (s.phone) contactInfo.phone = s.phone
      if (s.address) contactInfo.address = s.address
      if (s.contact_name) contactInfo.contact_name = s.contact_name
      if (Object.keys(contactInfo).length > 0) {
        supplier.contact_info = contactInfo
      }
      if (s.payment_terms) supplier.payment_terms = s.payment_terms
      if (s.lead_time_days) supplier.delivery_time_days = s.lead_time_days
      if (s.website) supplier.website = s.website
      return supplier
    })

    // Clear and insert since we don't have tenant_id in supplier data
    await client.from('suppliers').delete().is('tenant_id', null)
    const { error } = await client.from('suppliers').insert(suppliers)
    if (error) {
      console.error(`  ❌ Suppliers: ${error.message}`)
    } else {
      console.log(`  ✅ Suppliers: ${suppliers.length} records`)
    }
  }

  // Products (from multiple files)
  await seedProducts(verbose)

  // Tenant-specific product assignments
  for (const tenantId of tenants) {
    await seedTenantProducts(tenantId, verbose)
  }
}

async function seedProducts(verbose: boolean = false): Promise<void> {
  const client = getClient()
  const productsDir = join(DATA_DIR, '03-store', 'products')

  if (!existsSync(productsDir)) {
    console.warn('  ⚠️  Products directory not found')
    return
  }

  const { readdirSync } = await import('fs')
  const files = readdirSync(productsDir).filter((f) => f.endsWith('.json'))

  // First, get brand and category lookups
  const { data: brands } = await client.from('store_brands').select('id, slug')
  const { data: categories } = await client.from('store_categories').select('id, slug')

  const brandMap = new Map((brands || []).map((b: any) => [b.slug, b.id]))
  const categoryMap = new Map((categories || []).map((c: any) => [c.slug, c.id]))

  // Collect all products from all files and deduplicate by SKU
  const allProducts = new Map<string, any>()
  let totalValidationErrors = 0

  for (const file of files) {
    const data = loadJSON<{ products: any[] }>(join(productsDir, file))
    if (data?.products && data.products.length > 0) {
      // Validate products from this file
      const { valid, errors } = validateArray(data.products, ProductSchema, `Products (${file})`)
      totalValidationErrors += errors.length

      for (const p of valid) {
        const product: any = { is_global_catalog: true }
        // Copy valid columns
        for (const col of SCHEMA_COLUMNS.store_products) {
          if (col in p) {
            product[col] = (p as any)[col]
          }
        }
        // Resolve slugs to IDs
        if (p.brand_slug && brandMap.has(p.brand_slug)) {
          product.brand_id = brandMap.get(p.brand_slug)
        }
        if (p.category_slug && categoryMap.has(p.category_slug)) {
          product.category_id = categoryMap.get(p.category_slug)
        }
        // Deduplicate by SKU (later entries override earlier)
        if (product.sku) {
          allProducts.set(product.sku, product)
        }
      }
    }
  }

  // Insert all deduplicated products in batches
  const products = Array.from(allProducts.values())
  let totalInserted = 0
  const batchSize = 100

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const { error } = await client.from('store_products').upsert(batch, { onConflict: 'sku' })
    if (error) {
      console.error(`  ❌ Products batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
    } else {
      totalInserted += batch.length
    }
  }

  const statusIcon = totalValidationErrors > 0 ? '⚠️' : '✅'
  console.log(
    `  ${statusIcon} Products: ${totalInserted} total from ${files.length} files${totalValidationErrors > 0 ? ` (${totalValidationErrors} validation errors)` : ''}`
  )
}

async function seedTenantProducts(tenantId: string, verbose: boolean = false): Promise<void> {
  const client = getClient()

  const assignmentsData = loadJSON<{ products: any[] }>(
    join(DATA_DIR, '03-store', 'tenant-products', `${tenantId}.json`)
  )

  if (!assignmentsData?.products || assignmentsData.products.length === 0) {
    if (verbose) console.warn(`  ⚠️  No product assignments for ${tenantId}`)
    return
  }

  // Batch load all products by SKU (fixes N+1 query problem)
  const skus = assignmentsData.products.map((a: any) => a.sku).filter(Boolean)
  const { data: products } = await client.from('store_products').select('id, sku').in('sku', skus)

  const skuToId = new Map((products || []).map((p: any) => [p.sku, p.id]))

  // Build inventory records in batch
  const inventoryRecords = assignmentsData.products
    .filter((a: any) => a.sku && skuToId.has(a.sku))
    .map((a: any) => ({
      tenant_id: tenantId,
      product_id: skuToId.get(a.sku),
      stock_quantity: a.initial_stock || 0,
      min_stock_level: a.min_stock_level || 5,
      reorder_quantity: (a.min_stock_level || 5) * 2,
    }))

  if (inventoryRecords.length === 0) {
    console.log(`  ⚠️  Inventory (${tenantId}): No matching products found`)
    return
  }

  // Batch upsert all inventory records
  const { error, count } = await client
    .from('store_inventory')
    .upsert(inventoryRecords, { onConflict: 'tenant_id,product_id', count: 'exact' })

  if (error) {
    console.error(`  ❌ Inventory (${tenantId}): ${error.message}`)
  } else {
    console.log(`  ✅ Inventory (${tenantId}): ${inventoryRecords.length} products assigned`)
  }
}

// =============================================================================
// DEMO DATA SEEDING (Using Factories)
// =============================================================================

async function seedDemoData(tenantId: string, verbose: boolean = false): Promise<void> {
  console.log(`\n🎭 Seeding demo data for: ${tenantId} (using factories)`)

  // Load factories dynamically
  await loadFactories()

  // Set factory mode to 'seed' (persist, no cleanup)
  setMode('seed')

  // Get or create a vet profile for this tenant
  const client = getClient()
  const { data: vets } = await client
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role', 'vet')
    .limit(1)

  const vetId = vets?.[0]?.id || null

  // Create predefined owners (idempotent by email)
  console.log('  👥 Creating predefined owners...')
  const owners = await createPredefinedOwners(tenantId)
  console.log(`     Created/found ${owners.length} owners`)

  // Create pets for each owner
  console.log('  🐕 Creating pets with vaccines...')
  let totalPets = 0
  let totalVaccines = 0

  for (const owner of owners) {
    try {
      const petsWithVaccines = await createPetsForOwner(owner.id, 2, tenantId)
      totalPets += petsWithVaccines.length
      for (const { vaccines } of petsWithVaccines) {
        totalVaccines += vaccines.length
      }
    } catch (e) {
      if (verbose) console.warn(`     ⚠️  Pet creation error: ${e}`)
    }
  }
  console.log(`     Created ${totalPets} pets with ${totalVaccines} vaccine records`)

  // Create appointments for some owners
  if (vetId) {
    console.log('  📅 Creating appointment history...')
    let totalAppointments = 0

    // Get all pets for this tenant to create appointments
    const { data: pets } = await client
      .from('pets')
      .select('id, owner_id')
      .eq('tenant_id', tenantId)
      .limit(10)

    if (pets && pets.length > 0) {
      for (const pet of pets.slice(0, 5)) {
        try {
          const appointments = await createAppointmentHistory(
            pet.id,
            pet.owner_id,
            vetId,
            tenantId,
            { past: 2, future: 1, includeRecords: true }
          )
          totalAppointments += appointments.length
        } catch (e) {
          if (verbose) console.warn(`     ⚠️  Appointment creation error: ${e}`)
        }
      }
      console.log(`     Created ${totalAppointments} appointments`)
    }
  }

  // Create invoices and payments
  console.log('  💰 Creating invoice history...')
  let totalInvoices = 0

  for (const owner of owners.slice(0, 5)) {
    try {
      const invoices = await createInvoiceHistory(owner.id, null, tenantId, { count: 2 })
      totalInvoices += invoices.length
    } catch (e) {
      if (verbose) console.warn(`     ⚠️  Invoice creation error: ${e}`)
    }
  }
  console.log(`     Created ${totalInvoices} invoices`)

  // Create loyalty points
  console.log('  ⭐ Creating loyalty points...')
  let totalLoyalty = 0

  const personas = ['vip', 'new', 'budget', 'loyal', 'standard'] as const
  for (let i = 0; i < Math.min(owners.length, 5); i++) {
    const owner = owners[i]
    const persona = personas[i % personas.length]
    try {
      await createLoyaltyForPersona(owner.id, persona, tenantId)
      totalLoyalty++
    } catch (e) {
      if (verbose) console.warn(`     ⚠️  Loyalty creation error: ${e}`)
    }
  }
  console.log(`     Created loyalty for ${totalLoyalty} owners`)

  // Create hospitalizations
  console.log('  🏥 Creating hospitalization records...')
  let totalHospitalizations = 0

  // Get kennels and pets
  const { data: kennels } = await client
    .from('kennels')
    .select('id, code, kennel_type')
    .eq('tenant_id', tenantId)
    .limit(5)

  const { data: allPets } = await client
    .from('pets')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .limit(10)

  if (kennels && kennels.length > 0 && allPets && allPets.length > 0 && vetId) {
    for (let i = 0; i < Math.min(3, kennels.length, allPets.length); i++) {
      const pet = allPets[i]
      const kennel = kennels[i]
      const admitDate = new Date()
      admitDate.setDate(admitDate.getDate() - Math.floor(Math.random() * 7))

      // Generate admission number: HOSP-YYYYMMDD-XXX
      const dateStr = admitDate.toISOString().slice(0, 10).replace(/-/g, '')
      const admissionNumber = `HOSP-${dateStr}-${String(i + 1).padStart(3, '0')}`

      const hospitalization = {
        tenant_id: tenantId,
        pet_id: pet.id,
        kennel_id: kennel.id,
        admission_number: admissionNumber,
        admitted_at: admitDate.toISOString(),
        admitted_by: vetId,
        primary_vet_id: vetId,
        reason: ['Cirugía programada', 'Observación post-operatoria', 'Tratamiento IV'][i % 3],
        diagnosis: ['Piometra', 'Fractura tibial', 'Gastroenteritis'][i % 3],
        status: i === 0 ? 'admitted' : 'discharged',
        acuity_level: ['normal', 'moderate', 'critical'][i % 3],
        notes: `Paciente ${pet.name} ingresado para ${['cirugía', 'observación', 'tratamiento'][i % 3]}`,
        actual_discharge: i !== 0 ? new Date().toISOString() : null,
        discharged_by: i !== 0 ? vetId : null,
      }

      const { error } = await client.from('hospitalizations').insert(hospitalization)
      if (!error) {
        totalHospitalizations++

        // Add vitals for hospitalized pets
        const vitals = {
          hospitalization_id: (
            await client
              .from('hospitalizations')
              .select('id')
              .eq('pet_id', pet.id)
              .order('admitted_at', { ascending: false })
              .limit(1)
              .single()
          ).data?.id,
          temperature: 38.5 + Math.random() * 1.5,
          heart_rate: 80 + Math.floor(Math.random() * 40),
          respiratory_rate: 15 + Math.floor(Math.random() * 10),
          blood_pressure_systolic: 110 + Math.floor(Math.random() * 30),
          blood_pressure_diastolic: 70 + Math.floor(Math.random() * 20),
          pain_score: Math.floor(Math.random() * 4),
          notes: 'Signos vitales estables',
          recorded_by: vetId,
        }

        if (vitals.hospitalization_id) {
          await client.from('hospitalization_vitals').insert(vitals)
        }
      }
    }
  }
  console.log(`     Created ${totalHospitalizations} hospitalization records`)

  // Create lab orders
  console.log('  🔬 Creating lab orders...')
  let totalLabOrders = 0

  // Get lab test catalog
  const { data: labTests } = await client
    .from('lab_test_catalog')
    .select('id, name, code')
    .limit(10)

  if (labTests && labTests.length > 0 && allPets && allPets.length > 0 && vetId) {
    for (let i = 0; i < Math.min(5, allPets.length); i++) {
      const pet = allPets[i]
      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30))

      const labOrder = {
        tenant_id: tenantId,
        pet_id: pet.id,
        ordered_by: vetId,
        status: ['pending', 'in_progress', 'completed', 'completed', 'completed'][i % 5],
        priority: ['routine', 'urgent', 'routine', 'routine', 'stat'][i % 5],
        ordered_at: orderDate.toISOString(),
        notes: [
          'Chequeo anual',
          'Pre-quirúrgico',
          'Control de tratamiento',
          'Diagnóstico inicial',
          'Urgencia',
        ][i % 5],
      }

      const { data: insertedOrder, error } = await client
        .from('lab_orders')
        .insert(labOrder)
        .select('id')
        .single()
      if (!error && insertedOrder) {
        totalLabOrders++

        // Add lab order items (2-3 tests per order)
        const numTests = 2 + Math.floor(Math.random() * 2)
        for (let j = 0; j < Math.min(numTests, labTests.length); j++) {
          const test = labTests[(i + j) % labTests.length]
          const item = {
            lab_order_id: insertedOrder.id,
            test_id: test.id,
            status: labOrder.status === 'completed' ? 'completed' : 'pending',
          }
          await client.from('lab_order_items').insert(item)

          // Add results for completed tests
          if (item.status === 'completed') {
            const result = {
              lab_order_id: insertedOrder.id,
              test_id: test.id,
              value: (Math.random() * 100).toFixed(2),
              unit: 'mg/dL',
              is_abnormal: Math.random() > 0.8,
              notes: 'Resultado dentro de parámetros normales',
              resulted_by: vetId,
              resulted_at: new Date().toISOString(),
            }
            await client.from('lab_results').insert(result)
          }
        }
      }
    }
  }
  console.log(`     Created ${totalLabOrders} lab orders`)

  console.log('  ✅ Demo data seeding complete')
}

// =============================================================================
// POST-SEED VERIFICATION
// =============================================================================

interface VerificationResult {
  table: string
  expected: string
  actual: number
  status: 'pass' | 'warn' | 'fail'
}

async function verifySeedResults(config: SeedConfig): Promise<void> {
  console.log('\n🔍 Verifying seed results...')
  const client = getClient()

  const results: VerificationResult[] = []

  // Reference data checks (should exist if not 'basic' type)
  if (config.type !== 'basic') {
    const { count: diagnosisCount } = await client
      .from('diagnosis_codes')
      .select('*', { count: 'exact', head: true })
    results.push({
      table: 'diagnosis_codes',
      expected: '>0',
      actual: diagnosisCount || 0,
      status: (diagnosisCount || 0) > 0 ? 'pass' : 'fail',
    })

    const { count: growthCount } = await client
      .from('growth_standards')
      .select('*', { count: 'exact', head: true })
    results.push({
      table: 'growth_standards',
      expected: '>0',
      actual: growthCount || 0,
      status: (growthCount || 0) > 0 ? 'pass' : 'fail',
    })
  }

  // Tenant-specific checks
  for (const tenantId of config.tenants) {
    const { count: tenantCount } = await client
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('id', tenantId)
    results.push({
      table: `tenants(${tenantId})`,
      expected: '1',
      actual: tenantCount || 0,
      status: (tenantCount || 0) === 1 ? 'pass' : 'fail',
    })

    const { count: servicesCount } = await client
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    results.push({
      table: `services(${tenantId})`,
      expected: '>0',
      actual: servicesCount || 0,
      status: (servicesCount || 0) > 0 ? 'pass' : 'warn',
    })

    const { count: paymentMethodsCount } = await client
      .from('payment_methods')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    results.push({
      table: `payment_methods(${tenantId})`,
      expected: '>0',
      actual: paymentMethodsCount || 0,
      status: (paymentMethodsCount || 0) > 0 ? 'pass' : 'warn',
    })

    // Full/demo type checks
    if (config.type === 'full' || config.type === 'demo') {
      const { count: productsCount } = await client
        .from('store_products')
        .select('*', { count: 'exact', head: true })
      results.push({
        table: 'store_products',
        expected: '>0',
        actual: productsCount || 0,
        status: (productsCount || 0) > 0 ? 'pass' : 'fail',
      })

      const { count: brandsCount } = await client
        .from('store_brands')
        .select('*', { count: 'exact', head: true })
      results.push({
        table: 'store_brands',
        expected: '>0',
        actual: brandsCount || 0,
        status: (brandsCount || 0) > 0 ? 'pass' : 'fail',
      })

      const { count: inventoryCount } = await client
        .from('store_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      results.push({
        table: `store_inventory(${tenantId})`,
        expected: '>0',
        actual: inventoryCount || 0,
        status: (inventoryCount || 0) > 0 ? 'pass' : 'warn',
      })
    }

    // Demo type checks
    if (config.type === 'demo') {
      const { count: ownersCount } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
      results.push({
        table: `owners(${tenantId})`,
        expected: '>0',
        actual: ownersCount || 0,
        status: (ownersCount || 0) > 0 ? 'pass' : 'warn',
      })

      const { count: petsCount } = await client
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      results.push({
        table: `pets(${tenantId})`,
        expected: '>0',
        actual: petsCount || 0,
        status: (petsCount || 0) > 0 ? 'pass' : 'warn',
      })

      const { count: vaccinesCount } = await client
        .from('vaccines')
        .select('*', { count: 'exact', head: true })
      results.push({
        table: 'vaccines',
        expected: '>0',
        actual: vaccinesCount || 0,
        status: (vaccinesCount || 0) > 0 ? 'pass' : 'warn',
      })
    }
  }

  // Print results
  const passed = results.filter((r) => r.status === 'pass').length
  const warned = results.filter((r) => r.status === 'warn').length
  const failed = results.filter((r) => r.status === 'fail').length

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'
    console.log(`  ${icon} ${result.table}: ${result.actual} (expected ${result.expected})`)
  }

  console.log(`\n  Summary: ${passed} passed, ${warned} warnings, ${failed} failed`)

  if (failed > 0) {
    console.error('\n  ❌ Some verifications failed. Check the seeding output above for errors.')
  }
}

// =============================================================================
// CLEAR TENANT DATA
// =============================================================================

async function clearTenantData(tenantId: string): Promise<void> {
  console.log(`\n🧹 Clearing data for tenant: ${tenantId}`)
  const client = getClient()

  // Delete in reverse dependency order
  const tables = [
    'store_order_items',
    'store_orders',
    'store_carts',
    'store_inventory',
    'loyalty_transactions',
    'loyalty_points',
    'invoice_items',
    'payments',
    'invoices',
    'vaccine_reactions',
    'vaccines',
    'medical_records',
    'appointments',
    'hospitalizations',
    'pets',
    'services',
    'kennels',
    'payment_methods',
    'consent_documents',
    'consent_templates',
    'message_templates',
  ]

  let totalDeleted = 0

  for (const table of tables) {
    try {
      const { data, error } = await client
        .from(table)
        .delete()
        .eq('tenant_id', tenantId)
        .select('id')

      if (!error && data) {
        totalDeleted += data.length
      }
    } catch (_error: unknown) {
      // Table might not exist or have tenant_id
    }
  }

  console.log(`  ✅ Cleared ${totalDeleted} records`)
}

// =============================================================================
// MAIN ORCHESTRATION
// =============================================================================

async function seed(config: SeedConfig): Promise<void> {
  console.log('\n==============================================')
  console.log('   Vete API-Based Database Seeding')
  console.log('==============================================')
  console.log(`Type: ${config.type}`)
  console.log(`Tenants: ${config.tenants.join(', ')}`)
  console.log(`Clear first: ${config.clearFirst}`)
  console.log('')

  try {
    // Clear existing data if requested
    if (config.clearFirst) {
      for (const tenantId of config.tenants) {
        await clearTenantData(tenantId)
      }
    }

    // Always seed reference data (except for 'basic')
    if (config.type !== 'basic') {
      await seedReferenceData(config.verbose)
    }

    // Seed each tenant
    for (const tenantId of config.tenants) {
      await seedTenant(tenantId)
      await seedClinicData(tenantId, config.verbose)

      // Full or demo: add store data and demo data
      if (config.type === 'full' || config.type === 'demo') {
        await seedStoreData([tenantId], config.verbose)
        await seedDemoData(tenantId, config.verbose)
      }
    }

    // Run post-seed verification
    await verifySeedResults(config)

    console.log('\n==============================================')
    console.log('   ✅ Seeding completed successfully!')
    console.log('==============================================\n')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const config: SeedConfig = {
    type: 'demo',
    tenants: ['terrapet'],
    clearFirst: false,
    verbose: false,
  }

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
      case '-t':
        const typeArg = args[++i]
        if (['basic', 'reference', 'full', 'demo'].includes(typeArg)) {
          config.type = typeArg as SeedConfig['type']
        } else {
          console.error(`Invalid type: ${typeArg}. Use: basic, reference, full, demo`)
          process.exit(1)
        }
        break

      case '--tenant':
        config.tenants = [args[++i]]
        break

      case '--tenants':
        config.tenants = args[++i].split(',')
        break

      case '--clear':
        config.clearFirst = true
        break

      case '--verbose':
      case '-v':
        config.verbose = true
        break

      case '--help':
      case '-h':
        console.log(`
Vete Database Seeding Script

Usage:
  npx tsx db/seeds/scripts/seed.ts [options]

Options:
  --type, -t <type>     Seed type: basic, reference, full, demo (default: demo)
  --tenant <id>         Tenant ID to seed (default: terrapet)
  --tenants <ids>       Comma-separated tenant IDs
  --clear               Clear existing tenant data first
  --verbose, -v         Verbose output
  --help, -h            Show this help

Examples:
  npx tsx db/seeds/scripts/seed.ts                      # Full demo seed for terrapet
  npx tsx db/seeds/scripts/seed.ts --type basic         # Basic clinic setup
  npx tsx db/seeds/scripts/seed.ts --tenant petlife     # Seed petlife tenant
  npx tsx db/seeds/scripts/seed.ts --clear --type full  # Clear and reseed
`)
        process.exit(0)
    }
  }

  await seed(config)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

export { seed }
export type { SeedConfig }
