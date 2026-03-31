/**
 * Test Context - Manages mode and cleanup tracking
 *
 * Modes:
 * - 'test': Data is tracked and cleaned up after tests
 * - 'seed': Data persists for demo/development purposes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type Mode = 'test' | 'seed'

/**
 * Complete table dependency order for cleanup (child tables first)
 * This ensures FK constraints are respected during deletion.
 */
export const TABLE_DEPENDENCY_ORDER = [
  // Lab child tables
  'lab_result_comments',
  'lab_result_attachments',
  'lab_results',
  'lab_order_items',
  'lab_orders',

  // Hospitalization child tables
  'hospitalization_notes',
  'hospitalization_feedings',
  'hospitalization_medications',
  'hospitalization_treatments',
  'hospitalization_vitals',
  'hospitalizations',

  // Store child tables
  'store_order_items',
  'store_orders',
  'store_carts',
  'store_wishlists',
  'store_stock_alerts',
  'store_reviews',
  'store_inventory',
  'store_inventory_transactions',

  // Finance child tables
  'refunds',
  'payments',
  'invoice_items',
  'invoices',
  'expenses',
  'loyalty_transactions',
  'loyalty_points',

  // Clinical child tables
  'consent_documents',
  'prescriptions',
  'vaccine_reactions',
  'vaccines',
  'medical_records',
  'appointments',
  'reproductive_cycles',

  // Insurance
  'insurance_claim_items',
  'insurance_claims',
  'insurance_policies',

  // Communications
  'message_attachments',
  'messages',
  'conversations',
  'whatsapp_messages',
  'reminders',
  'notifications',

  // Pet-related
  'lost_pets',
  'clinic_pets',
  'qr_tags',
  'pets',

  // Staff-related
  'staff_time_off',
  'staff_schedules',
  'staff_profiles',
  'clinic_profiles',
  'clinic_invites',
  'profiles',

  // Clinic operational
  'services',
  'kennels',
  'payment_methods',
  'time_off_types',
  'consent_template_versions',
  'consent_templates',
  'message_templates',
  'reminder_templates',

  // Document sequences
  'document_sequences',

  // Audit
  'audit_logs',
  'disease_reports',

  // Note: Reference data and tenants are NOT included
  // They should persist across cleanup operations
]

interface CreatedResource {
  table: string
  id: string
  tenant_id?: string
}

class TestContext {
  private mode: Mode = 'test'
  private createdResources: CreatedResource[] = []
  private supabaseClient: SupabaseClient | null = null

  /**
   * Set the operating mode
   * - 'test': Resources are tracked for cleanup
   * - 'seed': Resources persist (no cleanup)
   */
  setMode(mode: Mode): void {
    this.mode = mode
  }

  getMode(): Mode {
    return this.mode
  }

  isTestMode(): boolean {
    return this.mode === 'test'
  }

  isSeedMode(): boolean {
    return this.mode === 'seed'
  }

  /**
   * Get Supabase client (creates if needed)
   */
  getClient(): SupabaseClient {
    if (!this.supabaseClient) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!url || !key) {
        throw new Error('Missing Supabase environment variables')
      }

      this.supabaseClient = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    return this.supabaseClient
  }

  /**
   * Track a created resource for cleanup
   */
  track(table: string, id: string, tenant_id?: string): void {
    if (this.mode === 'test') {
      this.createdResources.push({ table, id, tenant_id })
    }
  }

  /**
   * Get all tracked resources
   */
  getTracked(): CreatedResource[] {
    return [...this.createdResources]
  }

  /**
   * Clean up all tracked resources (in dependency order)
   */
  async cleanup(): Promise<void> {
    if (this.mode === 'seed') {
      console.log('Seed mode: skipping cleanup')
      return
    }

    const client = this.getClient()

    // Group by table for batch deletes
    const byTable = new Map<string, string[]>()
    for (const r of this.createdResources) {
      const ids = byTable.get(r.table) || []
      ids.push(r.id)
      byTable.set(r.table, ids)
    }

    // Delete in dependency order (child tables first)
    for (const table of TABLE_DEPENDENCY_ORDER) {
      const ids = byTable.get(table)
      if (ids && ids.length > 0) {
        const { error } = await client.from(table).delete().in('id', ids)
        if (error) {
          console.warn(`Failed to cleanup ${table}:`, error.message)
        } else {
          console.log(`  Cleaned up ${table}: ${ids.length} records`)
        }
        byTable.delete(table)
      }
    }

    // Handle any tables not in the predefined order
    for (const [table, ids] of byTable) {
      if (ids.length > 0) {
        const { error } = await client.from(table).delete().in('id', ids)
        if (error) {
          console.warn(`Failed to cleanup ${table}:`, error.message)
        } else {
          console.log(`  Cleaned up ${table}: ${ids.length} records`)
        }
      }
    }

    this.createdResources = []
  }

  /**
   * Clean up all data for a specific tenant
   */
  async cleanupTenant(tenantId: string): Promise<void> {
    const client = this.getClient()

    console.log(`Cleaning up tenant: ${tenantId}`)

    for (const table of TABLE_DEPENDENCY_ORDER) {
      try {
        const { error } = await client.from(table).delete().eq('tenant_id', tenantId)

        if (error && !error.message.includes('column "tenant_id" does not exist')) {
          console.warn(`  ${table}: ${error.message}`)
        }
      } catch (_error: unknown) {
        // Table might not exist
      }
    }
  }

  /**
   * Reset context (for test isolation)
   */
  reset(): void {
    this.createdResources = []
  }
}

// Singleton instance
export const testContext = new TestContext()

// Convenience exports
export const setMode = (mode: Mode) => testContext.setMode(mode)
export const getMode = () => testContext.getMode()
export const isTestMode = () => testContext.isTestMode()
export const isSeedMode = () => testContext.isSeedMode()
export const trackResource = (table: string, id: string, tenant_id?: string) =>
  testContext.track(table, id, tenant_id)
export const cleanup = () => testContext.cleanup()
export const cleanupTenant = (tenantId: string) => testContext.cleanupTenant(tenantId)
export const resetContext = () => testContext.reset()
export const getClient = () => testContext.getClient()
