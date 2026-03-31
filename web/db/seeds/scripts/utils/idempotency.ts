/**
 * Idempotency Utility for Seed System
 *
 * Provides unique key configurations and idempotent insert operations.
 * Ensures running seeds multiple times produces the same result.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Unique key configuration for a table
 */
export interface UniqueKeyConfig {
  /** Column names that form the unique key */
  columns: string[]
  /** Optional custom key extraction function */
  extractKey?: (record: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Unique key configurations for all seedable tables
 */
export const UNIQUE_KEYS: Record<string, UniqueKeyConfig> = {
  // Core
  tenants: { columns: ['id'] },
  document_sequences: { columns: ['tenant_id', 'document_type', 'year'] },

  // Profiles
  profiles: {
    columns: ['tenant_id', 'email'],
    extractKey: (record) => ({
      tenant_id: record.tenant_id,
      // Email is stored lowercase in DB, so lowercase for matching
      email: record.email?.toString().toLowerCase(),
    }),
  },
  clinic_profiles: { columns: ['profile_id', 'tenant_id'] },
  staff_profiles: { columns: ['profile_id', 'tenant_id'] },

  // Pets
  pets: {
    columns: ['owner_id', 'name'],
    extractKey: (record) => ({
      owner_id: record.owner_id,
      // Don't lowercase - DB comparison is case-sensitive
      name: record.name?.toString(),
    }),
  },
  qr_tags: { columns: ['code'] },

  // Vaccines & Medical
  vaccines: {
    columns: ['pet_id', 'name', 'administered_date'],
    extractKey: (record) => ({
      pet_id: record.pet_id,
      name: record.name?.toString().toLowerCase(),
      administered_date: record.administered_date?.toString().split('T')[0],
    }),
  },
  medical_records: { columns: ['pet_id', 'visit_date', 'record_type'] },
  prescriptions: { columns: ['tenant_id', 'prescription_number'] },

  // Services & Scheduling
  services: {
    columns: ['tenant_id', 'name'],
    extractKey: (record) => ({
      tenant_id: record.tenant_id,
      // Don't lowercase - DB comparison is case-sensitive
      name: record.name?.toString(),
    }),
  },
  kennels: { columns: ['tenant_id', 'code'] },
  payment_methods: {
    columns: ['tenant_id', 'name'],
    extractKey: (record) => ({
      tenant_id: record.tenant_id,
      // Don't lowercase - DB comparison is case-sensitive
      name: record.name?.toString(),
    }),
  },
  time_off_types: { columns: ['tenant_id', 'code'] }, // DB: UNIQUE(tenant_id, code)
  consent_templates: { columns: ['code'] },

  // Hospitalization
  hospitalizations: { columns: ['tenant_id', 'admission_number'] },

  // Lab
  lab_test_catalog: {
    columns: ['tenant_id', 'code'],
    extractKey: (record) => ({
      tenant_id: record.tenant_id ?? null,
      code: record.code?.toString().toUpperCase(),
    }),
  },
  lab_panels: { columns: ['tenant_id', 'code'] },
  lab_orders: { columns: ['tenant_id', 'order_number'] },
  lab_order_items: { columns: ['lab_order_id', 'test_id'] },
  lab_results: { columns: ['lab_order_id', 'test_id'] },

  // Store
  store_brands: { columns: ['slug'] },
  store_categories: { columns: ['slug'] },
  suppliers: { columns: ['tenant_id', 'name'] },
  store_products: { columns: ['sku'] },
  store_inventory: { columns: ['product_id', 'tenant_id'] },
  store_wishlists: { columns: ['user_id', 'product_id'] },

  // Finance
  invoices: { columns: ['tenant_id', 'invoice_number'] },
  store_orders: { columns: ['tenant_id', 'order_number'] },

  // Reference Data (global)
  diagnosis_codes: { columns: ['code'] },
  drug_dosages: {
    columns: ['name', 'species'],
    extractKey: (record) => ({
      // Don't lowercase - DB unique constraint is case-sensitive
      name: record.name?.toString(),
      species: record.species ?? 'all',
    }),
  },
  growth_standards: {
    columns: ['species', 'breed_category', 'gender', 'age_weeks', 'percentile'],
  },
  vaccine_protocols: { columns: ['vaccine_code'] },
  insurance_providers: { columns: ['name'] },
}

/**
 * Result of an idempotent upsert operation
 */
export interface UpsertResult<T> {
  created: T[]
  skipped: T[]
  errors: Array<{ record: T; error: Error }>
}

/**
 * Check if a record already exists in the database
 */
export async function checkExists(
  client: SupabaseClient,
  table: string,
  record: Record<string, unknown>,
  uniqueKey?: UniqueKeyConfig
): Promise<{ exists: boolean; existingId?: string }> {
  const config = uniqueKey || UNIQUE_KEYS[table]

  if (!config) {
    // No unique key defined - can't check
    return { exists: false }
  }

  // Extract the key values
  const keyExtractor =
    config.extractKey ||
    ((r: Record<string, unknown>) => {
      const key: Record<string, unknown> = {}
      for (const col of config.columns) {
        key[col] = r[col]
      }
      return key
    })

  const whereClause = keyExtractor(record)

  // Check for null/undefined values in key - skip check if incomplete
  for (const [, value] of Object.entries(whereClause)) {
    if (value === undefined) {
      return { exists: false }
    }
  }

  try {
    let query = client.from(table).select('id')

    // Build where clause
    for (const [key, value] of Object.entries(whereClause)) {
      if (value === null) {
        query = query.is(key, null)
      } else {
        query = query.eq(key, value)
      }
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.warn(`  Check exists error for ${table}:`, error.message)
      return { exists: false }
    }

    return {
      exists: !!data,
      existingId: data?.id,
    }
  } catch (e) {
    console.warn(`  Check exists exception for ${table}:`, e)
    return { exists: false }
  }
}

/**
 * Insert records with idempotency check
 * Skips records that already exist based on unique key
 */
export async function upsertWithIdempotency<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  records: T[],
  options?: {
    uniqueKey?: UniqueKeyConfig
    trackFn?: (table: string, id: string, tenantId?: string) => void
    verbose?: boolean
  }
): Promise<UpsertResult<T>> {
  const result: UpsertResult<T> = {
    created: [],
    skipped: [],
    errors: [],
  }

  const uniqueKey = options?.uniqueKey || UNIQUE_KEYS[table]
  const verbose = options?.verbose ?? false

  for (const record of records) {
    try {
      // Check if exists
      const { exists, existingId } = await checkExists(client, table, record, uniqueKey)

      if (exists) {
        if (verbose) {
          console.log(`    Skipped (exists): ${table} id=${existingId}`)
        }
        result.skipped.push({ ...record, id: existingId } as T)
        continue
      }

      // Insert new record
      const { data, error } = await client.from(table).insert(record).select().single()

      if (error) {
        result.errors.push({
          record,
          error: new Error(`Insert failed: ${error.message}`),
        })
        continue
      }

      if (data) {
        result.created.push(data as T)

        // Track for cleanup if function provided
        if (options?.trackFn) {
          options.trackFn(table, data.id, record.tenant_id as string | undefined)
        }

        if (verbose) {
          console.log(`    Created: ${table} id=${data.id}`)
        }
      }
    } catch (e) {
      result.errors.push({
        record,
        error: e instanceof Error ? e : new Error(String(e)),
      })
    }
  }

  return result
}

/**
 * Batch insert with idempotency (more efficient for large datasets)
 * First queries all existing records, then inserts only new ones
 */
export async function batchUpsertWithIdempotency<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  records: T[],
  options?: {
    uniqueKey?: UniqueKeyConfig
    trackFn?: (table: string, id: string, tenantId?: string) => void
    batchSize?: number
    verbose?: boolean
  }
): Promise<UpsertResult<T>> {
  const result: UpsertResult<T> = {
    created: [],
    skipped: [],
    errors: [],
  }

  const uniqueKey = options?.uniqueKey || UNIQUE_KEYS[table]
  const batchSize = options?.batchSize ?? 100

  if (!uniqueKey || records.length === 0) {
    // No unique key - just insert all
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { data, error } = await client.from(table).insert(batch).select()

      if (error) {
        batch.forEach((record) => {
          result.errors.push({ record, error: new Error(error.message) })
        })
      } else if (data) {
        result.created.push(...(data as T[]))

        if (options?.trackFn) {
          data.forEach((d) => {
            options.trackFn!(table, d.id, (d as Record<string, unknown>).tenant_id as string)
          })
        }
      }
    }
    return result
  }

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const batchResult = await upsertWithIdempotency(client, table, batch, options)

    result.created.push(...batchResult.created)
    result.skipped.push(...batchResult.skipped)
    result.errors.push(...batchResult.errors)
  }

  return result
}

/**
 * Get the unique key for a specific table
 */
export function getUniqueKey(table: string): UniqueKeyConfig | undefined {
  return UNIQUE_KEYS[table]
}

/**
 * Check if a table has a unique key configured
 */
export function hasUniqueKey(table: string): boolean {
  return table in UNIQUE_KEYS
}
