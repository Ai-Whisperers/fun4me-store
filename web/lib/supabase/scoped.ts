/**
 * Tenant-Scoped Query Builders
 * ARCH-010: Enforce Tenant Isolation at Query Level
 * OPS-003: Automatic slow query detection
 *
 * Provides query builders that automatically enforce tenant isolation,
 * preventing cross-tenant data access at the application level.
 * Also tracks query execution times for slow query detection.
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * await supabase.from('invoices').select('*').eq('tenant_id', profile.tenant_id);
 *
 * // Use:
 * const { query, select, insert, update, upsert, delete: del } = scopedQueries(supabase, profile.tenant_id);
 * await select('invoices', '*');
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { trackQuery } from '@/lib/monitoring/slow-query'

/**
 * Filter function type for modifying queries
 * Uses 'any' for compatibility with Supabase's internal query builder types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFilter = (query: any) => any

/**
 * Creates tenant-scoped query functions that automatically include tenant_id filter
 */
export function scopedQueries(supabase: SupabaseClient, tenantId: string) {
  if (!tenantId) {
    throw new Error('[ScopedQueries] tenant_id is required for scoped queries')
  }

  return {
    /**
     * Get the raw supabase client for edge cases
     * WARNING: Use with caution - prefer scoped methods
     */
    client: supabase,

    /**
     * Get the tenant ID being used
     */
    tenantId,

    /**
     * Execute a SELECT query scoped to tenant
     * Automatically adds .eq('tenant_id', tenantId)
     * OPS-003: Tracks query execution time for slow query detection
     */
    select: async <T = unknown>(
      table: string,
      columns: string = '*',
      options?: {
        filter?: QueryFilter
        single?: boolean
        count?: 'exact' | 'planned' | 'estimated'
      }
    ): Promise<{ data: T[] | T | null; error: Error | null; count?: number }> => {
      const startTime = performance.now()

      let query = supabase.from(table).select(columns, { count: options?.count })

      // Always filter by tenant_id first
      query = query.eq('tenant_id', tenantId)

      // Apply additional filters if provided
      if (options?.filter) {
        query = options.filter(query)
      }

      if (options?.single) {
        const result = await query.single()
        const duration = performance.now() - startTime
        trackQuery(table, 'select', duration, result.data ? 1 : 0)
        return {
          data: result.data as T | null,
          error: result.error,
          count: result.count ?? undefined,
        }
      }

      const result = await query
      const duration = performance.now() - startTime
      const rowCount = Array.isArray(result.data) ? result.data.length : undefined
      trackQuery(table, 'select', duration, rowCount)
      return {
        data: result.data as T[] | null,
        error: result.error,
        count: result.count ?? undefined,
      }
    },

    /**
     * Execute an INSERT query with automatic tenant_id
     * Automatically adds tenant_id to all inserted records
     * OPS-003: Tracks query execution time for slow query detection
     */
    insert: async <T = unknown>(
      table: string,
      data: Record<string, unknown> | Record<string, unknown>[],
      options?: { returning?: boolean }
    ): Promise<{ data: T[] | null; error: Error | null }> => {
      const startTime = performance.now()
      const records = Array.isArray(data) ? data : [data]

      // Add tenant_id to all records
      const scopedRecords = records.map((record) => ({
        ...record,
        tenant_id: tenantId,
      }))

      const baseQuery = supabase.from(table).insert(scopedRecords)

      const result =
        options?.returning !== false
          ? await baseQuery.select()
          : await baseQuery
      const duration = performance.now() - startTime
      trackQuery(table, 'insert', duration, scopedRecords.length)
      return { data: result.data as T[] | null, error: result.error }
    },

    /**
     * Execute an UPDATE query scoped to tenant
     * Automatically adds .eq('tenant_id', tenantId) to WHERE clause
     * OPS-003: Tracks query execution time for slow query detection
     */
    update: async <T = unknown>(
      table: string,
      data: Record<string, unknown>,
      filter: QueryFilter,
      options?: { returning?: boolean }
    ): Promise<{ data: T[] | null; error: Error | null }> => {
      const startTime = performance.now()
      // Remove tenant_id from update data to prevent cross-tenant moves
      const { tenant_id: _, ...safeData } = data

      // Build the base query with filters
      const baseQuery = filter(
        supabase.from(table).update(safeData).eq('tenant_id', tenantId)
      )

      const result =
        options?.returning !== false
          ? await baseQuery.select()
          : await baseQuery
      const duration = performance.now() - startTime
      const rowCount = Array.isArray(result.data) ? result.data.length : undefined
      trackQuery(table, 'update', duration, rowCount)
      return { data: result.data as T[] | null, error: result.error }
    },

    /**
     * Execute an UPSERT query with automatic tenant_id
     * Automatically adds tenant_id to all upserted records
     * OPS-003: Tracks query execution time for slow query detection
     */
    upsert: async <T = unknown>(
      table: string,
      data: Record<string, unknown> | Record<string, unknown>[],
      options?: { onConflict?: string; returning?: boolean }
    ): Promise<{ data: T[] | null; error: Error | null }> => {
      const startTime = performance.now()
      const records = Array.isArray(data) ? data : [data]

      // Add tenant_id to all records
      const scopedRecords = records.map((record) => ({
        ...record,
        tenant_id: tenantId,
      }))

      const baseQuery = supabase.from(table).upsert(scopedRecords, {
        onConflict: options?.onConflict,
      })

      const result =
        options?.returning !== false
          ? await baseQuery.select()
          : await baseQuery
      const duration = performance.now() - startTime
      trackQuery(table, 'upsert', duration, scopedRecords.length)
      return { data: result.data as T[] | null, error: result.error }
    },

    /**
     * Execute a DELETE query scoped to tenant
     * Automatically adds .eq('tenant_id', tenantId) to WHERE clause
     * OPS-003: Tracks query execution time for slow query detection
     */
    delete: async (
      table: string,
      filter: QueryFilter
    ): Promise<{ error: Error | null }> => {
      const startTime = performance.now()
      let query = supabase.from(table).delete()

      // Always filter by tenant_id first
      query = query.eq('tenant_id', tenantId)

      // Apply user's filter
      query = filter(query)

      const result = await query
      const duration = performance.now() - startTime
      trackQuery(table, 'delete', duration)
      return { error: result.error }
    },

    /**
     * Execute a COUNT query scoped to tenant
     * OPS-003: Tracks query execution time for slow query detection
     */
    count: async (
      table: string,
      filter?: QueryFilter
    ): Promise<{ count: number; error: Error | null }> => {
      const startTime = performance.now()
      let query = supabase.from(table).select('*', { count: 'exact', head: true })

      // Always filter by tenant_id first
      query = query.eq('tenant_id', tenantId)

      if (filter) {
        query = filter(query)
      }

      const result = await query
      const duration = performance.now() - startTime
      trackQuery(table, 'count', duration, result.count || 0)
      return { count: result.count || 0, error: result.error }
    },

    /**
     * Check if a record exists and belongs to this tenant
     */
    exists: async (
      table: string,
      id: string
    ): Promise<{ exists: boolean; error: Error | null }> => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      return { exists: (count || 0) > 0, error }
    },

    /**
     * Verify a resource belongs to this tenant (returns the resource if valid)
     */
    verify: async <T = unknown>(
      table: string,
      id: string,
      columns: string = 'id, tenant_id'
    ): Promise<{ data: T | null; valid: boolean; error: Error | null }> => {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      return {
        data: data as T | null,
        valid: !!data,
        error,
      }
    },
  }
}

/**
 * Type for the scoped queries object
 */
export type ScopedQueries = ReturnType<typeof scopedQueries>

/**
 * Tables that require tenant isolation
 * This list should be kept up-to-date as new tables are added
 */
export const TENANT_SCOPED_TABLES = [
  // Core
  'profiles',

  // Pets
  'pets',
  'vaccines',
  'medical_records',
  'qr_tags',
  'vaccine_reactions',
  'growth_standards',

  // Clinical
  'prescriptions',
  'diagnosis_codes', // May be global or per-tenant
  'drug_dosages',
  'euthanasia_assessments',
  'reproductive_cycles',

  // Appointments
  'services',
  'appointments',

  // Invoicing
  'invoices',
  'invoice_items',
  'payments',
  'refunds',
  'payment_methods',

  // Store
  'store_categories',
  'store_products',
  'store_inventory',
  'store_orders',
  'store_order_items',
  'store_campaigns',
  'store_coupons',
  'store_carts',
  'store_wishlists',
  'store_stock_alerts',

  // Finance
  'expenses',
  'loyalty_points',
  'loyalty_transactions',

  // Hospitalization
  'kennels',
  'hospitalizations',
  'hospitalization_vitals',
  'hospitalization_medications',
  'hospitalization_feedings',

  // Laboratory
  'lab_test_catalog',
  'lab_panels',
  'lab_orders',
  'lab_order_items',
  'lab_results',
  'lab_result_attachments',
  'lab_result_comments',

  // Consent
  'consent_templates',
  'consent_template_versions',
  'consent_documents',

  // Insurance
  'insurance_policies',
  'insurance_claims',
  'insurance_claim_items',

  // Messaging
  'conversations',
  'messages',
  'message_attachments',
  'message_templates',
  'whatsapp_messages',

  // Reminders
  'reminders',
  'reminder_templates',

  // Staff
  'staff_profiles',
  'staff_schedules',
  'staff_time_off',
  'staff_time_off_types',

  // Audit & Notifications
  'audit_logs',
  'notifications',

  // Safety
  'lost_pets',
  'disease_reports',
] as const

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLES)[number]

/**
 * Check if a table requires tenant isolation
 */
export function isTenantScopedTable(table: string): boolean {
  return TENANT_SCOPED_TABLES.includes(table as TenantScopedTable)
}
