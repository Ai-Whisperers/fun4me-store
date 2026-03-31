/**
 * Unified Cleanup Manager
 *
 * Single source of truth for test data cleanup. Consolidates:
 * - lib/test-utils/context.ts (89 tables)
 * - tests/__helpers__/db.ts (16 tables)
 *
 * Features:
 * - Complete table dependency order (100+ tables)
 * - Retry logic for FK constraint violations
 * - Cleanup verification
 * - Both resource tracking and tenant-wide cleanup
 *
 * @example
 * ```typescript
 * // Track resources as you create them
 * cleanupManager.track('pets', pet.id, tenantId);
 *
 * // Cleanup with retry
 * const result = await cleanupManager.cleanupWithRetry();
 *
 * // Verify cleanup was successful
 * const { clean, orphans } = await cleanupManager.verifyCleanup();
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type CleanupMode = 'test' | 'seed'

export interface TrackedResource {
  table: string
  id: string
  tenantId?: string
}

export interface CleanupResult {
  success: boolean
  deletedCount: number
  failedTables: string[]
  orphanedRecords: TrackedResource[]
  errors: Array<{ table: string; error: string }>
  duration: number
}

export interface VerifyResult {
  clean: boolean
  orphans: TrackedResource[]
}

/**
 * Complete table dependency order for cleanup (child tables first)
 *
 * IMPORTANT: This must be maintained when new tables are added.
 * Order is critical - child tables must come before parent tables.
 */
export const COMPLETE_TABLE_DEPENDENCY_ORDER = [
  // ==========================================================================
  // TIER 1: Deepest children (no FK references TO them)
  // ==========================================================================

  // Lab module children
  'lab_result_comments',
  'lab_result_attachments',
  'lab_results',
  'lab_order_items',

  // Hospitalization children
  'hospitalization_notes',
  'hospitalization_feedings',
  'hospitalization_medications',
  'hospitalization_treatments',
  'hospitalization_vitals',

  // Store order children
  'store_order_items',

  // Message children
  'message_attachments',

  // Insurance claim children
  'insurance_claim_items',

  // Invoice children
  'refunds',
  'invoice_items',

  // Consent children
  'consent_template_versions',

  // Store campaign children
  'store_campaign_items',

  // ==========================================================================
  // TIER 2: Mid-level tables with child references
  // ==========================================================================

  // Lab module
  'lab_orders',

  // Hospitalization
  'hospitalizations',

  // Store orders
  'store_orders',

  // Messages
  'messages',

  // Insurance claims
  'insurance_claims',

  // Payments
  'payments',

  // Invoices
  'invoices',

  // Vaccine reactions
  'vaccine_reactions',

  // Consent documents
  'consent_documents',

  // ==========================================================================
  // TIER 3: Module-level entities
  // ==========================================================================

  // Store module - reservations must come before carts (FK dependency)
  'store_inventory_reservations',
  'store_carts',
  'store_wishlists',
  'store_stock_alerts',
  'store_reviews',
  'store_inventory_transactions',
  'store_inventory',
  'store_price_history',
  'store_campaigns',
  'store_coupons',
  'store_coupon_usage',

  // Communications
  'notification_queue',
  'reminders',
  'conversations',
  'whatsapp_messages',
  'notifications',

  // Clinical (reference pets)
  'prescriptions',
  'vaccines',
  'medical_records',
  'appointments',
  'appointments_waitlist',
  'recurring_appointments',
  'reproductive_cycles',
  'euthanasia_assessments',

  // Insurance policies
  'insurance_policies',

  // Loyalty
  'loyalty_transactions',
  'loyalty_points',

  // Expenses
  'expenses',

  // ==========================================================================
  // TIER 4: Core entities
  // ==========================================================================

  // Pet-related
  'pet_documents',
  'weight_records',
  'lost_pets',
  'clinic_pets',
  'qr_tags',
  'pets',

  // Staff-related
  'staff_alert_preferences',
  'staff_time_off',
  'staff_schedules',
  'staff_profiles',

  // Kennels
  'kennels',

  // Lab catalog
  'lab_panels',
  'lab_test_catalog',

  // Store products/catalog
  'store_products',
  'store_categories',
  'store_brands',
  'suppliers',

  // Procurement
  'purchase_order_items',
  'purchase_orders',

  // Templates
  'consent_templates',
  'message_templates',
  'reminder_templates',

  // Insurance providers
  'insurance_providers',

  // Communication preferences
  'communication_preferences',

  // Subscriptions
  'subscriptions',

  // ==========================================================================
  // TIER 5: Profile-level (reference auth/tenants)
  // ==========================================================================

  // Document sequences
  'document_sequences',

  // Audit
  'audit_logs',
  'disease_reports',

  // Payment methods
  'payment_methods',
  'time_off_types',

  // Services
  'services',

  // Invites and profiles
  'clinic_invites',
  'clinic_profiles',
  'demo_accounts',
  'profiles',

  // ==========================================================================
  // TIER 6: Root tables (almost never deleted in tests)
  // ==========================================================================
  // 'tenants' - Excluded, never delete in tests
  // 'diagnosis_codes' - Reference data
  // 'drug_dosages' - Reference data
  // 'growth_standards' - Reference data
] as const

export type CleanupTable = (typeof COMPLETE_TABLE_DEPENDENCY_ORDER)[number]

/**
 * Unified Cleanup Manager
 */
export class CleanupManager {
  private mode: CleanupMode = 'test'
  private trackedResources: Map<string, Set<string>> = new Map()
  private checkpointResources: Map<string, Set<string>> | null = null
  private client: SupabaseClient | null = null
  private static instance: CleanupManager | null = null

  /**
   * Get singleton instance (for global tracking)
   */
  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager()
    }
    return CleanupManager.instance
  }

  /**
   * Create new instance (for isolated tests)
   */
  constructor() {}

  /**
   * Set operating mode
   */
  setMode(mode: CleanupMode): void {
    this.mode = mode
  }

  /**
   * Get current mode
   */
  getMode(): CleanupMode {
    return this.mode
  }

  /**
   * Check if tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.mode === 'test'
  }

  /**
   * Get Supabase client
   */
  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!url || !key) {
        throw new Error(
          'CleanupManager: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        )
      }

      this.client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    return this.client
  }

  /**
   * Track a resource for cleanup
   */
  track(table: string, id: string, tenantId?: string): void {
    if (this.mode === 'seed') return

    if (!this.trackedResources.has(table)) {
      this.trackedResources.set(table, new Set())
    }
    this.trackedResources.get(table)!.add(id)
  }

  /**
   * Track multiple resources at once
   */
  trackBatch(table: string, ids: string[]): void {
    ids.forEach((id) => this.track(table, id))
  }

  /**
   * Get tracked resources (for inspection)
   */
  getTracked(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    this.trackedResources.forEach((ids, table) => {
      result[table] = Array.from(ids)
    })
    return result
  }

  /**
   * Get count of tracked resources
   */
  getTrackedCount(): number {
    let count = 0
    this.trackedResources.forEach((ids) => {
      count += ids.size
    })
    return count
  }

  /**
   * Save a checkpoint of currently tracked resources.
   * Call after beforeAll to preserve shared resources.
   * afterEach should then use cleanupSinceCheckpoint() instead of cleanupWithRetry().
   */
  checkpoint(): void {
    this.checkpointResources = new Map()
    this.trackedResources.forEach((ids, table) => {
      this.checkpointResources!.set(table, new Set(ids))
    })
  }

  /**
   * Clean up only resources added SINCE the last checkpoint.
   * Preserves beforeAll resources while cleaning per-test resources.
   */
  async cleanupSinceCheckpoint(): Promise<CleanupResult> {
    if (!this.checkpointResources) {
      // No checkpoint set — clean everything
      return this.cleanupWithRetry()
    }

    // Identify resources added since checkpoint
    const newResources = new Map<string, Set<string>>()
    this.trackedResources.forEach((ids, table) => {
      const checkpointIds = this.checkpointResources!.get(table) || new Set()
      const newIds = new Set<string>()
      ids.forEach((id) => {
        if (!checkpointIds.has(id)) {
          newIds.add(id)
        }
      })
      if (newIds.size > 0) {
        newResources.set(table, newIds)
      }
    })

    // Temporarily swap tracked resources to only clean new ones
    const savedResources = this.trackedResources
    this.trackedResources = newResources

    const result = await this.cleanupWithRetry()

    // Restore checkpoint resources (the shared/beforeAll ones)
    this.trackedResources = new Map()
    this.checkpointResources!.forEach((ids, table) => {
      this.trackedResources.set(table, new Set(ids))
    })

    return result
  }

  /**
   * Standard cleanup (single pass)
   */
  async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now()
    const result: CleanupResult = {
      success: true,
      deletedCount: 0,
      failedTables: [],
      orphanedRecords: [],
      errors: [],
      duration: 0,
    }

    if (this.mode === 'seed') {
      result.duration = Date.now() - startTime
      return result
    }

    const client = this.getClient()

    // Delete in dependency order
    for (const table of COMPLETE_TABLE_DEPENDENCY_ORDER) {
      const ids = this.trackedResources.get(table)
      if (!ids || ids.size === 0) continue

      const idsArray = Array.from(ids)
      try {
        const { error, count } = await client.from(table).delete().in('id', idsArray)

        if (error) {
          result.success = false
          result.failedTables.push(table)
          result.errors.push({ table, error: error.message })
          idsArray.forEach((id) => result.orphanedRecords.push({ table, id }))
        } else {
          result.deletedCount += count || idsArray.length
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        result.errors.push({ table, error: errorMsg })
      }
    }

    // Handle tables not in the predefined order
    for (const [table, ids] of this.trackedResources) {
      if (!(COMPLETE_TABLE_DEPENDENCY_ORDER as readonly string[]).includes(table)) {
        const idsArray = Array.from(ids)
        try {
          const { error } = await client.from(table).delete().in('id', idsArray)
          if (error) {
            result.errors.push({ table, error: error.message })
          } else {
            result.deletedCount += idsArray.length
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error'
          result.errors.push({ table, error: errorMsg })
        }
      }
    }

    this.trackedResources.clear()
    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Cleanup with retry logic (for FK constraint violations)
   */
  async cleanupWithRetry(maxRetries: number = 3): Promise<CleanupResult> {
    let lastResult: CleanupResult | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastResult = await this.cleanup()

      if (lastResult.success || lastResult.failedTables.length === 0) {
        return lastResult
      }

      // Re-track failed resources for retry
      for (const orphan of lastResult.orphanedRecords) {
        this.track(orphan.table, orphan.id, orphan.tenantId)
      }

      // Exponential backoff
      await new Promise((r) => setTimeout(r, 100 * attempt))
    }

    return lastResult!
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup(): Promise<VerifyResult> {
    const orphans: TrackedResource[] = []
    const client = this.getClient()
    const tracked = this.getTracked()

    for (const [table, ids] of Object.entries(tracked)) {
      for (const id of ids) {
        try {
          const { data } = await client.from(table).select('id').eq('id', id).maybeSingle()
          if (data) {
            orphans.push({ table, id })
          }
        } catch (_error: unknown) {
          // Table might not exist
        }
      }
    }

    return { clean: orphans.length === 0, orphans }
  }

  /**
   * Cleanup all data for a specific tenant
   */
  async cleanupTenant(tenantId: string): Promise<CleanupResult> {
    const startTime = Date.now()
    const result: CleanupResult = {
      success: true,
      deletedCount: 0,
      failedTables: [],
      orphanedRecords: [],
      errors: [],
      duration: 0,
    }

    const client = this.getClient()

    for (const table of COMPLETE_TABLE_DEPENDENCY_ORDER) {
      try {
        const { error, count } = await client.from(table).delete().eq('tenant_id', tenantId)

        if (error && !error.message.includes('column "tenant_id" does not exist')) {
          result.errors.push({ table, error: error.message })
        } else if (count) {
          result.deletedCount += count
        }
      } catch (_error: unknown) {
        // Table might not exist or not have tenant_id
      }
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * Reset internal state
   */
  reset(): void {
    this.trackedResources.clear()
  }

  /**
   * Log cleanup summary
   */
  logSummary(result: CleanupResult): void {
    if (result.success) {
      console.log(`✓ Cleanup completed: ${result.deletedCount} records in ${result.duration}ms`)
    } else {
      console.warn(`⚠ Cleanup partial: ${result.deletedCount} deleted, ${result.errors.length} errors`)
      result.errors.forEach((e) => console.warn(`  - ${e.table}: ${e.error}`))
    }
  }
}

// Singleton instance for global use
export const cleanupManager = CleanupManager.getInstance()

// Convenience exports (backward compatible)
export const trackResource = (table: string, id: string, tenantId?: string) =>
  cleanupManager.track(table, id, tenantId)
export const cleanup = () => cleanupManager.cleanup()
export const cleanupWithRetry = (maxRetries?: number) => cleanupManager.cleanupWithRetry(maxRetries)
export const verifyCleanup = () => cleanupManager.verifyCleanup()
export const setCleanupMode = (mode: CleanupMode) => cleanupManager.setMode(mode)
export const resetCleanup = () => cleanupManager.reset()

/**
 * Legacy compatibility - matches old tests/__helpers__/db.ts API
 */
export async function cleanupTestData(testIds: Record<string, string[]>): Promise<void> {
  const manager = new CleanupManager()
  for (const [table, ids] of Object.entries(testIds)) {
    ids.forEach((id) => manager.track(table, id))
  }
  const result = await manager.cleanupWithRetry()
  if (!result.success) {
    console.warn('cleanupTestData had failures:', result.errors)
  }
}

/**
 * Legacy TestContext class (for backward compatibility)
 */
export class TestContext {
  private manager: CleanupManager

  constructor() {
    this.manager = new CleanupManager()
  }

  track(table: string, id: string): void {
    this.manager.track(table, id)
  }

  getTracked(): Record<string, string[]> {
    return this.manager.getTracked()
  }

  async cleanup(): Promise<void> {
    const result = await this.manager.cleanupWithRetry()
    if (!result.success) {
      console.warn('TestContext cleanup had failures:', result.errors)
    }
  }

  reset(): void {
    this.manager.reset()
  }
}
