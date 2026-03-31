/**
 * Seed Orchestrator
 *
 * Central orchestration of the seed process.
 * Manages variant execution, dependency ordering, and reporting.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SeedVariant, SeederConfig, OrchestratorOptions, VariantName } from './variants/types'
import { getVariant, printVariants } from './variants'
import { SeederOptions } from './seeders/base-seeder'
import {
  createReport,
  printReport,
  SeedReport,
  SeederResult,
  createLogger,
} from './utils/reporting'

/**
 * Table cleanup order (child tables first)
 * Tables are deleted in this order to respect foreign key constraints
 */
const CLEANUP_ORDER = [
  // Lab results chain
  'lab_result_comments',
  'lab_result_attachments',
  'lab_results',
  'lab_order_items',
  'lab_orders',
  // Hospitalization chain
  'hospitalization_notes',
  'hospitalization_feedings',
  'hospitalization_medications',
  'hospitalization_treatments',
  'hospitalization_vitals',
  'hospitalizations',
  // Store chain
  'store_order_items',
  'store_orders',
  'store_carts',
  'store_wishlists',
  'store_stock_alerts',
  'store_inventory',
  // Finance chain
  'payments',
  'refunds',
  'invoice_items',
  'invoices',
  // Medical records chain
  'prescriptions',
  'medical_records',
  'appointments',
  // Staff chain
  'staff_time_off',
  'staff_schedules',
  'staff_profiles',
  // Loyalty
  'loyalty_transactions',
  'loyalty_points',
  // QR tags before pets
  'qr_tags',
  // Pets and profiles last (handled specially for vaccine cleanup)
  'pets',
  'profiles',
  // Clinic config
  'services',
  'kennels',
  'payment_methods',
  'time_off_types',
  'consent_templates',
  'message_templates',
  'reminders',
]

/**
 * Tables that use pet_id instead of tenant_id for filtering
 */
const PET_BASED_TABLES = ['vaccines', 'vaccine_reactions']

export class SeedOrchestrator {
  private client: SupabaseClient
  private options: OrchestratorOptions
  private variant: SeedVariant
  private results: SeederResult[] = []
  private logger: ReturnType<typeof createLogger>

  constructor(options: OrchestratorOptions) {
    this.options = {
      mode: 'seed',
      dryRun: false,
      verbose: false,
      clear: false,
      tenants: ['terrapet'],
      ...options,
    }

    this.variant = getVariant(options.variant)
    this.logger = createLogger(this.options.verbose)

    // Create Supabase client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    })
  }

  /**
   * Run the seed process
   */
  async run(): Promise<SeedReport> {
    const startTime = new Date()

    console.log(`\n🌱 Seed Orchestrator: ${this.variant.name.toUpperCase()}`)
    console.log(`   Tenants: ${this.options.tenants!.join(', ')}`)
    console.log(`   Mode: ${this.options.mode}`)
    if (this.options.dryRun) console.log('   DRY RUN - no data will be written')
    console.log('')

    try {
      // Cleanup if requested
      if (this.options.clear || this.variant.cleanup) {
        await this.cleanup()
      }

      // Run seeders
      await this.runSeeders()

      // Generate report
      const report = createReport(
        this.variant.name,
        this.options.tenants!,
        this.options.mode!,
        this.results,
        startTime
      )

      printReport(report)

      return report
    } catch (e) {
      console.error('Seed orchestrator error:', e)
      throw e
    }
  }

  /**
   * Cleanup tenant data before seeding
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up existing data...')

    const preserveTables = new Set(this.variant.preserveTables || [])

    for (const tenantId of this.options.tenants!) {
      // First, get all pet IDs for this tenant to clean pet-based tables
      const { data: pets } = await this.client.from('pets').select('id').eq('tenant_id', tenantId)

      const petIds = (pets || []).map((p) => p.id)

      // Clean pet-based tables first (vaccines, vaccine_reactions)
      if (petIds.length > 0) {
        for (const table of PET_BASED_TABLES) {
          if (preserveTables.has(table)) continue
          try {
            const { error } = await this.client.from(table).delete().in('pet_id', petIds)

            if (error) {
              this.logger.debug(`Cleanup ${table}: ${error.message}`)
            }
          } catch (_error: unknown) {
            // Table might not exist
          }
        }
      }

      // Clean regular tables with tenant_id
      for (const table of CLEANUP_ORDER) {
        if (preserveTables.has(table)) {
          this.logger.debug(`Preserving ${table}`)
          continue
        }

        try {
          const { error } = await this.client.from(table).delete().eq('tenant_id', tenantId)

          if (error && !error.message.includes('column "tenant_id" does not exist')) {
            // Suppress common expected errors
            if (!error.message.includes('Could not find')) {
              this.logger.debug(`Cleanup ${table}: ${error.message}`)
            }
          }
        } catch (_error: unknown) {
          // Table might not exist or have different structure
        }
      }
    }

    console.log('   Cleanup complete\n')
  }

  /**
   * Run all seeders in the variant
   */
  private async runSeeders(): Promise<void> {
    const seederConfigs = this.variant.seeders

    // Group seeders by tenant requirement
    const globalSeeders = seederConfigs.filter((s) => !s.requiresTenant)
    const tenantSeeders = seederConfigs.filter((s) => s.requiresTenant)

    // Run global seeders first (no tenant context)
    console.log('📦 Seeding global data...')
    for (const config of globalSeeders) {
      await this.runSeeder(config)
    }

    // Run tenant-specific seeders for each tenant
    for (const tenantId of this.options.tenants!) {
      console.log(`\n🏥 Seeding tenant: ${tenantId}`)
      for (const config of tenantSeeders) {
        await this.runSeeder(config, tenantId)
      }
    }
  }

  /**
   * Run a single seeder
   */
  private async runSeeder(config: SeederConfig, tenantId?: string): Promise<void> {
    const seederOptions: SeederOptions = {
      tenantId,
      mode: this.options.mode!,
      dryRun: this.options.dryRun,
      verbose: this.options.verbose,
    }

    try {
      const seeder = config.factory(this.client, seederOptions)
      const result = await seeder.seed()

      this.results.push(result)

      // Log result
      const status = result.errors > 0 ? '⚠️' : result.created > 0 ? '✅' : '⏭️'
      const skipInfo = result.skipped > 0 ? ` (${result.skipped} skipped)` : ''
      console.log(`   ${status} ${config.name}: ${result.created} created${skipInfo}`)

      if (result.errors > 0 && this.options.verbose) {
        for (const detail of result.errorDetails.slice(0, 3)) {
          console.log(`      ❌ ${detail}`)
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))

      // File not found is OK for optional files
      if (error.message.includes('ENOENT')) {
        this.logger.debug(`${config.name}: No data file found (optional)`)
        return
      }

      this.results.push({
        table: config.name,
        created: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [error.message],
        warnings: [],
        duration: 0,
      })

      console.log(`   ❌ ${config.name}: ${error.message}`)
    }
  }

  /**
   * Get the Supabase client (for external use)
   */
  getClient(): SupabaseClient {
    return this.client
  }
}

/**
 * Run seed with options
 */
export async function runSeed(options: OrchestratorOptions): Promise<SeedReport> {
  const orchestrator = new SeedOrchestrator(options)
  return orchestrator.run()
}

/**
 * Print help
 */
export function printHelp(): void {
  console.log(`
Vete Seed System
================

Usage:
  npx tsx db/seeds/scripts/seed.ts [options]

Options:
  --variant, -v <name>   Seed variant (basic, integration, e2e, demo, reset)
  --tenant, -t <id>      Tenant ID to seed (default: terrapet)
  --tenants <ids>        Comma-separated tenant IDs
  --clear                Clear existing data before seeding
  --dry-run              Validate without inserting
  --verbose              Show detailed output
  --help, -h             Show this help
`)

  printVariants()
}
