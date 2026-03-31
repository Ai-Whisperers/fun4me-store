/**
 * Tenant Seeder
 *
 * Seeds core tenant data: tenants and document sequences.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { JsonSeeder, SeederOptions } from './base-seeder'
import { TenantSchema, Tenant } from '@/lib/test-utils/schemas'

interface TenantsJson {
  tenants: Array<{
    id: string
    name: string
    plan?: string
    is_active?: boolean
    settings?: Record<string, unknown>
  }>
}

export class TenantSeeder extends JsonSeeder<Tenant> {
  constructor(client: SupabaseClient, options: SeederOptions) {
    super(client, options)
  }

  getTableName(): string {
    return 'tenants'
  }

  getSchema() {
    return TenantSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/00-core/tenants.json'
  }

  extractData(json: unknown): unknown[] {
    return (json as TenantsJson).tenants || []
  }

  /**
   * After seeding tenants, seed document sequences for each
   */
  protected async postProcess(created: Tenant[]): Promise<void> {
    const year = new Date().getFullYear()
    const documentTypes = [
      'invoice',
      'admission',
      'lab_order',
      'prescription',
      'consent',
      'receipt',
      'quote',
    ]

    for (const tenant of created) {
      for (const docType of documentTypes) {
        const { error } = await this.client.from('document_sequences').upsert(
          {
            tenant_id: tenant.id,
            document_type: docType,
            year,
            current_sequence: 0,
            prefix: docType.toUpperCase().slice(0, 3),
          },
          {
            onConflict: 'tenant_id,document_type,year',
          }
        )

        if (error && this.options.verbose) {
          console.warn(`  Document sequence error for ${tenant.id}/${docType}: ${error.message}`)
        }
      }
    }

    if (created.length > 0) {
      this.log(`Created document sequences for ${created.length} tenants`)
    }
  }
}
