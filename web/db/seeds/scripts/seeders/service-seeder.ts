/**
 * Service Seeder
 *
 * Seeds clinic operational data: services, kennels, payment methods, time-off types.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { JsonSeeder, SeederOptions, SeederResult } from './base-seeder'
import { createSeederResult } from '../utils/reporting'
import {
  ServiceSchema,
  Service,
  KennelSchema,
  Kennel,
  PaymentMethodSchema,
  PaymentMethod,
  TimeOffTypeSchema,
  TimeOffType,
} from '@/lib/test-utils/schemas'

/**
 * Services Seeder
 */
export class ServiceSeeder extends JsonSeeder<Service> {
  getTableName(): string {
    return 'services'
  }

  getSchema() {
    return ServiceSchema
  }

  getJsonPath(): string {
    return `db/seeds/data/02-clinic/${this.getTenantId()}/services.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { services?: unknown[] }
    return (data.services || []).map((s) => ({
      ...(s as Record<string, unknown>),
      tenant_id: this.getTenantId(),
    }))
  }

  /**
   * Pre-process to strip non-DB columns
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    // Columns that exist in the database
    const dbColumns = [
      'id',
      'tenant_id',
      'name',
      'description',
      'category',
      'base_price',
      'currency',
      'tax_rate',
      'duration_minutes',
      'buffer_minutes',
      'max_daily_bookings',
      'requires_appointment',
      'available_days',
      'available_start_time',
      'available_end_time',
      'requires_deposit',
      'deposit_percentage',
      'species_allowed',
      'display_order',
      'is_featured',
      'icon',
      'color',
      'is_active',
    ]

    return data.map((item) => {
      const record = item as Record<string, unknown>
      const cleaned: Record<string, unknown> = {}

      for (const col of dbColumns) {
        if (col in record) {
          cleaned[col] = record[col]
        }
      }

      return cleaned
    })
  }
}

/**
 * Kennels Seeder
 */
export class KennelSeeder extends JsonSeeder<Kennel> {
  getTableName(): string {
    return 'kennels'
  }

  getSchema() {
    return KennelSchema
  }

  getJsonPath(): string {
    return `db/seeds/data/02-clinic/${this.getTenantId()}/kennels.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { kennels?: unknown[] }
    return (data.kennels || []).map((k) => ({
      ...(k as Record<string, unknown>),
      tenant_id: this.getTenantId(),
    }))
  }
}

/**
 * Payment Methods Seeder
 */
export class PaymentMethodSeeder extends JsonSeeder<PaymentMethod> {
  getTableName(): string {
    return 'payment_methods'
  }

  getSchema() {
    return PaymentMethodSchema
  }

  getJsonPath(): string {
    return `db/seeds/data/02-clinic/${this.getTenantId()}/payment-methods.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { payment_methods?: unknown[] }
    return (data.payment_methods || []).map((pm) => ({
      ...(pm as Record<string, unknown>),
      tenant_id: this.getTenantId(),
    }))
  }

  /**
   * Pre-process to strip non-DB columns and rename sort_order -> display_order
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    const dbColumns = [
      'id',
      'tenant_id',
      'name',
      'type',
      'description',
      'is_default',
      'is_active',
      'requires_reference',
      'fee_percentage',
      'min_amount',
      'max_amount',
      'instructions',
      'display_order',
      'icon',
    ]

    return data.map((item) => {
      const record = item as Record<string, unknown>
      const cleaned: Record<string, unknown> = {}

      for (const col of dbColumns) {
        if (col in record) {
          cleaned[col] = record[col]
        }
      }

      // Handle sort_order -> display_order rename
      if ('sort_order' in record && !('display_order' in cleaned)) {
        cleaned.display_order = record.sort_order
      }

      return cleaned
    })
  }
}

/**
 * Time Off Types Seeder
 * Seeds global time off types (tenant_id = NULL).
 * These are based on Paraguay labor law and shared across all tenants.
 */
export class TimeOffTypeSeeder extends JsonSeeder<TimeOffType> {
  getTableName(): string {
    return 'time_off_types'
  }

  getSchema() {
    return TimeOffTypeSchema
  }

  getJsonPath(): string {
    return `db/seeds/data/02-templates/time-off-types.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { time_off_types?: unknown[] }
    // DON'T add tenant_id - these are global templates (tenant_id = NULL in DB)
    return data.time_off_types || []
  }
}

/**
 * Composite seeder for all clinic operational data
 */
export class ClinicOperationalSeeder {
  private client: SupabaseClient
  private options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  async seed(): Promise<SeederResult[]> {
    const results: SeederResult[] = []

    // Seed in order (no dependencies between these)
    const seeders = [
      new ServiceSeeder(this.client, this.options),
      new KennelSeeder(this.client, this.options),
      new PaymentMethodSeeder(this.client, this.options),
      new TimeOffTypeSeeder(this.client, this.options),
    ]

    for (const seeder of seeders) {
      try {
        const result = await seeder.seed()
        results.push(result)
      } catch (e) {
        // File might not exist for this tenant - that's OK
        const error = e instanceof Error ? e : new Error(String(e))
        if (!error.message.includes('ENOENT')) {
          results.push(createSeederResult(seeder.getTableName(), 0, 0, [{ error }], [], new Date()))
        }
      }
    }

    return results
  }
}
