/**
 * Basic Seed Variant
 *
 * Minimal seed for unit tests: tenants + reference data only.
 * Fast execution, no tenant-specific data.
 */

import type { SeedVariant } from './types'
import { TenantSeeder } from '../seeders/tenant-seeder'
import {
  DiagnosisCodeSeeder,
  DrugDosageSeeder,
  GrowthStandardSeeder,
  VaccineProtocolSeeder,
  InsuranceProviderSeeder,
} from '../seeders/reference-seeder'

export const basicVariant: SeedVariant = {
  name: 'basic',
  description: 'Tenants + reference data only (for unit tests)',
  seeders: [
    {
      name: 'tenants',
      factory: (client, options) => new TenantSeeder(client, options),
      requiresTenant: false,
    },
    {
      name: 'diagnosis_codes',
      factory: (client, options) => new DiagnosisCodeSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'drug_dosages',
      factory: (client, options) => new DrugDosageSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'growth_standards',
      factory: (client, options) => new GrowthStandardSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'vaccine_protocols',
      factory: (client, options) => new VaccineProtocolSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'insurance_providers',
      factory: (client, options) => new InsuranceProviderSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
  ],
}
