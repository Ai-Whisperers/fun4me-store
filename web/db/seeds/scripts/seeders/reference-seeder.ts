/**
 * Reference Data Seeder
 *
 * Seeds global reference data: diagnosis codes, drug dosages, growth standards, etc.
 * This data is shared across all tenants.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ReferenceSeeder, SeederOptions, SeederResult } from './base-seeder'
import { createSeederResult } from '../utils/reporting'
import { upsertWithIdempotency, UNIQUE_KEYS } from '../utils/idempotency'

/**
 * Diagnosis Code Schema
 */
const DiagnosisCodeSchema = z.object({
  code: z.string().min(2),
  term: z.string().min(2),
  standard: z.enum(['venom', 'snomed', 'custom']).default('venom'),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional().nullable(),
  species: z.array(z.string()).default(['all']),
  is_active: z.boolean().default(true),
})

type DiagnosisCode = z.infer<typeof DiagnosisCodeSchema>

/**
 * Drug Dosage Schema
 */
// Schema matching actual database columns (no duration_days, is_active)
const DrugDosageSchema = z
  .object({
    name: z.string().min(1),
    generic_name: z.string().optional().nullable(),
    species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'all']).default('all'),
    category: z
      .enum([
        'antibiotic',
        'analgesic',
        'nsaid',
        'corticosteroid',
        'antiemetic',
        'cardiac',
        'antifungal',
        'antiparasitic',
        'sedative',
        'steroid',
        'heartworm',
        'vaccine',
        'other',
      ])
      .optional()
      .nullable(),
    min_dose_mg_kg: z.number().min(0).optional().nullable(),
    max_dose_mg_kg: z.number().min(0).optional().nullable(),
    concentration_mg_ml: z.number().positive().optional().nullable(),
    route: z
      .enum([
        'oral',
        'PO',
        'IV',
        'IM',
        'SC',
        'SQ',
        'topical',
        'inhaled',
        'rectal',
        'ophthalmic',
        'otic',
      ])
      .optional()
      .nullable(),
    frequency: z.string().optional().nullable(),
    max_daily_dose_mg_kg: z.number().min(0).optional().nullable(),
    contraindications: z.array(z.string()).optional().nullable(),
    side_effects: z.array(z.string()).optional().nullable(),
    notes: z.string().optional().nullable(),
    requires_prescription: z.boolean().default(true),
  })
  .passthrough() // Allow extra fields from JSON that we'll strip in preProcess

type DrugDosage = z.infer<typeof DrugDosageSchema>

/**
 * Growth Standard Schema
 */
const GrowthStandardSchema = z.object({
  species: z.enum(['dog', 'cat']),
  breed: z.string().optional().nullable(),
  breed_category: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  age_weeks: z.number().int().min(0),
  weight_kg: z.number().positive(),
  percentile: z
    .union([z.string(), z.enum(['P3', 'P10', 'P25', 'P50', 'P75', 'P90', 'P97'])])
    .transform((val) => {
      // Normalize percentile format
      if (typeof val === 'string' && !val.startsWith('P')) {
        return `P${val}`
      }
      return val
    }),
})

type GrowthStandard = z.infer<typeof GrowthStandardSchema>

/**
 * Diagnosis Codes Seeder
 */
export class DiagnosisCodeSeeder extends ReferenceSeeder<DiagnosisCode> {
  getTableName(): string {
    return 'diagnosis_codes'
  }

  getSchema() {
    return DiagnosisCodeSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/diagnosis-codes.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { codes?: unknown[]; diagnosis_codes?: unknown[] }
    return data.codes || data.diagnosis_codes || []
  }
}

/**
 * Drug Dosages Seeder
 */
export class DrugDosageSeeder extends ReferenceSeeder<DrugDosage> {
  getTableName(): string {
    return 'drug_dosages'
  }

  getSchema() {
    return DrugDosageSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/drug-dosages.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { dosages?: unknown[]; drug_dosages?: unknown[] }
    return data.dosages || data.drug_dosages || []
  }

  /**
   * Pre-process to normalize fields and strip non-DB columns
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    // Columns that exist in the database
    const dbColumns = [
      'name',
      'generic_name',
      'species',
      'category',
      'min_dose_mg_kg',
      'max_dose_mg_kg',
      'concentration_mg_ml',
      'route',
      'frequency',
      'max_daily_dose_mg_kg',
      'contraindications',
      'side_effects',
      'notes',
      'requires_prescription',
    ]

    return data.map((item) => {
      const record = item as Record<string, unknown>
      const cleaned: Record<string, unknown> = {}

      // Only keep columns that exist in DB
      for (const col of dbColumns) {
        if (col in record) {
          cleaned[col] = record[col]
        }
      }

      // Ensure contraindications is an array for Postgres TEXT[]
      if (cleaned.contraindications && typeof cleaned.contraindications === 'string') {
        cleaned.contraindications = [cleaned.contraindications]
      }

      // Ensure side_effects is an array for Postgres TEXT[]
      if (cleaned.side_effects && typeof cleaned.side_effects === 'string') {
        cleaned.side_effects = [cleaned.side_effects]
      }

      return cleaned
    })
  }
}

/**
 * Growth Standards Seeder
 */
export class GrowthStandardSeeder extends ReferenceSeeder<GrowthStandard> {
  getTableName(): string {
    return 'growth_standards'
  }

  getSchema() {
    return GrowthStandardSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/growth-standards.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { standards?: unknown[]; growth_standards?: unknown[] }
    return data.standards || data.growth_standards || []
  }
}

/**
 * Vaccine Protocol Schema
 * Note: DB has protocol_type NOT NULL with enum ('core', 'non-core', 'lifestyle')
 * JSON uses 'type' field and may have 'optional' which maps to 'lifestyle'
 * DB does NOT have is_active column - strip in preProcess
 */
const VaccineProtocolSchema = z
  .object({
    vaccine_name: z.string().min(1),
    vaccine_code: z.string().min(1),
    species: z.enum(['dog', 'cat', 'rabbit', 'all']).default('all'),
    // Accept 'type' from JSON - will be mapped to protocol_type in preProcess
    type: z.enum(['core', 'non-core', 'lifestyle', 'optional']).optional(),
    protocol_type: z.enum(['core', 'non-core', 'lifestyle']).optional(),
    diseases_prevented: z.array(z.string()).min(1),
    first_dose_weeks: z.number().int().min(0).optional().nullable(),
    booster_weeks: z.array(z.number()).optional().nullable(),
    booster_intervals_months: z.array(z.number()).optional().nullable(),
    duration_years: z.number().int().positive().optional().nullable(),
    revaccination_months: z.number().optional().nullable(),
    manufacturer: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .passthrough()

type VaccineProtocol = z.infer<typeof VaccineProtocolSchema>

/**
 * Vaccine Protocols Seeder
 */
export class VaccineProtocolSeeder extends ReferenceSeeder<VaccineProtocol> {
  getTableName(): string {
    return 'vaccine_protocols'
  }

  getSchema() {
    return VaccineProtocolSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/vaccine-protocols.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { protocols?: unknown[]; vaccine_protocols?: unknown[] }
    return data.protocols || data.vaccine_protocols || []
  }

  /**
   * Pre-process to:
   * - Map 'type' to 'protocol_type'
   * - Map 'optional' type to 'lifestyle'
   * - Filter out unsupported species (DB only allows dog, cat, all)
   * - Strip non-DB columns (is_active, initial_age_weeks, booster_schedule)
   */
  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    if (!data || !Array.isArray(data)) return []

    // Columns that exist in the database
    const dbColumns = [
      'vaccine_name',
      'vaccine_code',
      'species',
      'protocol_type',
      'diseases_prevented',
      'first_dose_weeks',
      'booster_weeks',
      'booster_intervals_months',
      'revaccination_months',
      'duration_years',
      'manufacturer',
      'notes',
    ]

    // Species allowed by DB constraint
    const allowedSpecies = new Set(['dog', 'cat', 'all'])

    return data
      .filter((item) => {
        // Filter out records with unsupported species
        const species = (item as Record<string, unknown>).species as string
        return !species || allowedSpecies.has(species)
      })
      .map((item) => {
        const record = item as Record<string, unknown>
        const cleaned: Record<string, unknown> = {}

        // Only keep columns that exist in DB
        for (const col of dbColumns) {
          if (col in record) {
            cleaned[col] = record[col]
          }
        }

        // Map 'type' field to 'protocol_type' if not already set
        if (!cleaned.protocol_type && record.type) {
          const typeValue = record.type as string
          // Map 'optional' to 'lifestyle' per DB constraint
          cleaned.protocol_type = typeValue === 'optional' ? 'lifestyle' : typeValue
        }

        // Ensure protocol_type is set (required by DB)
        if (!cleaned.protocol_type) {
          cleaned.protocol_type = 'non-core'
        }

        return cleaned
      })
  }
}

/**
 * Insurance Provider Schema
 */
const InsuranceProviderSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  claim_submission_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

type InsuranceProvider = z.infer<typeof InsuranceProviderSchema>

/**
 * Insurance Providers Seeder
 */
export class InsuranceProviderSeeder extends ReferenceSeeder<InsuranceProvider> {
  getTableName(): string {
    return 'insurance_providers'
  }

  getSchema() {
    return InsuranceProviderSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/insurance-providers.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { providers?: unknown[]; insurance_providers?: unknown[] }
    return data.providers || data.insurance_providers || []
  }
}

/**
 * Composite seeder for all reference data
 */
export class AllReferenceSeeder {
  private client: SupabaseClient
  private options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  async seed(): Promise<SeederResult[]> {
    const results: SeederResult[] = []

    // Seed in order
    const seeders = [
      new DiagnosisCodeSeeder(this.client, this.options),
      new DrugDosageSeeder(this.client, this.options),
      new GrowthStandardSeeder(this.client, this.options),
      new VaccineProtocolSeeder(this.client, this.options),
      new InsuranceProviderSeeder(this.client, this.options),
    ]

    for (const seeder of seeders) {
      try {
        const result = await seeder.seed()
        results.push(result)
      } catch (e) {
        results.push(
          createSeederResult(
            seeder.getTableName(),
            0,
            0,
            [{ error: e instanceof Error ? e : new Error(String(e)) }],
            [],
            new Date()
          )
        )
      }
    }

    return results
  }
}
