/**
 * Seed Variant Types
 *
 * Type definitions for seed variant configuration.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SeederOptions } from '../seeders/base-seeder'
import type { SeederResult } from '../utils/reporting'

/**
 * Interface for any seeder (BaseSeeder or custom)
 */
export interface Seeder {
  seed(): Promise<SeederResult>
}

/**
 * Factory function type for creating seeders
 * Accepts any object with a seed() method, not just BaseSeeder
 */
export type SeederFactory = (client: SupabaseClient, options: SeederOptions) => Seeder

/**
 * Configuration for a single seeder in a variant
 */
export interface SeederConfig {
  /** Name for logging */
  name: string

  /** Factory function to create the seeder */
  factory: SeederFactory

  /** Whether this seeder requires a tenant_id */
  requiresTenant?: boolean

  /** Tables that must be seeded before this one */
  dependencies?: string[]

  /** Extra configuration passed to factory */
  config?: Record<string, unknown>
}

/**
 * Seed variant definition
 */
export interface SeedVariant {
  /** Variant name (basic, integration, e2e, demo, reset) */
  name: string

  /** Human-readable description */
  description: string

  /** Ordered list of seeders to run */
  seeders: SeederConfig[]

  /** Whether to cleanup existing data before seeding */
  cleanup?: boolean

  /** Tables to exclude from cleanup */
  preserveTables?: string[]
}

/**
 * Available variant names
 */
export type VariantName = 'basic' | 'integration' | 'e2e' | 'demo' | 'reset'

/**
 * Seed run context
 */
export interface SeedContext {
  variant: VariantName
  tenants: string[]
  mode: 'test' | 'seed'
  dryRun: boolean
  verbose: boolean
  startTime: Date
  results: SeederResult[]
  createdIds: Map<string, string[]> // table -> ids
}

/**
 * Options for the orchestrator
 */
export interface OrchestratorOptions {
  variant: VariantName
  tenants?: string[]
  mode?: 'test' | 'seed'
  dryRun?: boolean
  verbose?: boolean
  clear?: boolean
}
