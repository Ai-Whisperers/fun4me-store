/**
 * Base Seeder Class
 *
 * Abstract base class for all table seeders.
 * Implements the template method pattern for consistent seeding operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodSchema, ZodType } from 'zod'
import { UniqueKeyConfig, upsertWithIdempotency, UNIQUE_KEYS } from '../utils/idempotency'
import { validateBatch, ValidationResult } from '../utils/validation'
import { SeederResult, createSeederResult } from '../utils/reporting'

// Re-export for convenience
export type { SeederResult }

/**
 * Options for seeder operations
 */
export interface SeederOptions {
  tenantId?: string
  mode: 'test' | 'seed'
  dryRun?: boolean
  verbose?: boolean
  trackFn?: (table: string, id: string, tenantId?: string) => void
}

/**
 * Data source types for seeders
 */
export type DataSource = 'json' | 'factory' | 'generated'

/**
 * Abstract base class for all seeders
 */
export abstract class BaseSeeder<T extends Record<string, unknown>> {
  protected client: SupabaseClient
  protected options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  /**
   * Get the database table name
   */
  abstract getTableName(): string

  /**
   * Get the Zod validation schema
   */
  abstract getSchema(): ZodType<T, any, any>

  /**
   * Load data to seed (from JSON, factory, or generated)
   */
  abstract loadData(): Promise<unknown[]>

  /**
   * Get unique key configuration for idempotency
   * Override if table needs custom key
   */
  getUniqueKey(): UniqueKeyConfig | undefined {
    return UNIQUE_KEYS[this.getTableName()]
  }

  /**
   * Pre-process data before validation
   * Override to add computed fields like admission_number
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    return data
  }

  /**
   * Post-process after successful insert
   * Override to seed related tables
   */
  protected async postProcess(_created: T[]): Promise<void> {
    // Default: no post-processing
  }

  /**
   * Validate loaded data against schema
   */
  protected validate(data: unknown[]): ValidationResult<T> {
    return validateBatch(this.getSchema(), data)
  }

  /**
   * Main seed method - template method pattern
   */
  async seed(): Promise<SeederResult> {
    const startTime = new Date()
    const table = this.getTableName()

    try {
      // 1. Load data
      const rawData = await this.loadData()

      if (rawData.length === 0) {
        return createSeederResult(table, 0, 0, [], ['No data to seed'], startTime)
      }

      // 2. Pre-process (add computed fields)
      const processedData = await this.preProcess(rawData)

      // 3. Validate
      const validation = this.validate(processedData)

      if (validation.totalInvalid > 0) {
        const warnings = validation.invalid
          .slice(0, 3)
          .map((item) => `Record #${item.index}: ${item.errors.map((e) => e.message).join(', ')}`)

        if (this.options.verbose) {
          console.warn(`  ⚠️ ${table}: ${validation.totalInvalid} validation errors`)
          warnings.forEach((w) => console.warn(`    ${w}`))
        }
      }

      if (validation.totalValid === 0) {
        return createSeederResult(
          table,
          0,
          0,
          validation.invalid.map((i) => ({
            error: new Error(i.errors.map((e) => e.message).join(', ')),
          })),
          [],
          startTime
        )
      }

      // 4. Dry run - skip actual insert
      if (this.options.dryRun) {
        return createSeederResult(
          table,
          0,
          validation.totalValid,
          [],
          [`Dry run: would insert ${validation.totalValid} records`],
          startTime
        )
      }

      // 5. Insert with idempotency
      const result = await upsertWithIdempotency(this.client, table, validation.valid, {
        uniqueKey: this.getUniqueKey(),
        trackFn: this.options.trackFn,
        verbose: this.options.verbose,
      })

      // 6. Post-process (seed related tables)
      if (result.created.length > 0) {
        await this.postProcess(result.created)
      }

      // 7. Return result
      return createSeederResult(
        table,
        result.created.length,
        result.skipped.length,
        result.errors,
        validation.totalInvalid > 0 ? [`${validation.totalInvalid} records failed validation`] : [],
        startTime
      )
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      return createSeederResult(table, 0, 0, [{ error }], [], startTime)
    }
  }

  /**
   * Helper: Load JSON file
   */
  protected async loadJsonFile<D>(filePath: string): Promise<D> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const fullPath = path.resolve(process.cwd(), filePath)
    const content = await fs.readFile(fullPath, 'utf-8')
    return JSON.parse(content) as D
  }

  /**
   * Helper: Get current tenant ID
   */
  protected getTenantId(): string {
    if (!this.options.tenantId) {
      throw new Error('tenantId is required for this seeder')
    }
    return this.options.tenantId
  }

  /**
   * Helper: Log if verbose
   */
  protected log(message: string): void {
    if (this.options.verbose) {
      console.log(`  ${message}`)
    }
  }
}

/**
 * Base class for seeders that load from JSON files
 */
export abstract class JsonSeeder<T extends Record<string, unknown>> extends BaseSeeder<T> {
  /**
   * Get the path to the JSON data file
   */
  abstract getJsonPath(): string

  /**
   * Extract the data array from the JSON file structure
   */
  abstract extractData(json: unknown): unknown[]

  async loadData(): Promise<unknown[]> {
    const json = await this.loadJsonFile(this.getJsonPath())
    return this.extractData(json)
  }
}

/**
 * Base class for seeders that generate data using factories
 */
export abstract class FactorySeeder<T extends Record<string, unknown>> extends BaseSeeder<T> {
  protected count: number

  constructor(client: SupabaseClient, options: SeederOptions, count: number = 10) {
    super(client, options)
    this.count = count
  }

  /**
   * Generate a single record using factory
   */
  abstract generateOne(index: number): Promise<unknown>

  async loadData(): Promise<unknown[]> {
    const records: unknown[] = []
    for (let i = 0; i < this.count; i++) {
      const record = await this.generateOne(i)
      records.push(record)
    }
    return records
  }
}

/**
 * Base class for reference data seeders (global, no tenant)
 */
export abstract class ReferenceSeeder<T extends Record<string, unknown>> extends JsonSeeder<T> {
  // Reference data doesn't need tenant_id
  protected getTenantId(): string {
    return '' // Override to return empty for global data
  }
}
