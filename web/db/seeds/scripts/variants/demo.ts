/**
 * Demo Seed Variant
 *
 * Full demo environment with realistic data.
 * For development and QA testing.
 */

import type { SeedVariant } from './types'
import { integrationVariant } from './integration'
import {
  StoreBrandSeeder,
  StoreCategorySeeder,
  SupplierSeeder,
  StoreProductSeeder,
  StoreInventorySeeder,
} from '../seeders/store-seeder'
import { HospitalizationSeeder } from '../seeders/hospitalization-seeder'
import { LabOrderDemoSeeder } from '../seeders/lab-seeder'
import { ProfileSeeder } from '../seeders/profile-seeder'
import { PetSeeder } from '../seeders/pet-seeder'
import { DemoDataSeeder } from '../seeders/demo-data-seeder'
import type { SeederResult } from '../seeders/base-seeder'

/**
 * Wrapper to make DemoDataSeeder compatible with BaseSeeder interface
 */
class DemoDataSeederWrapper {
  private seeder: DemoDataSeeder
  private tenantId: string

  constructor(client: any, options: any) {
    this.tenantId = options.tenantId || 'terrapet'
    this.seeder = new DemoDataSeeder(client, this.tenantId, options.verbose)
  }

  async seed(): Promise<SeederResult> {
    const startTime = Date.now()
    const result = await this.seeder.seed()

    // Sum up all counts
    const totalCreated = Object.values(result.counts).reduce((a, b) => a + b, 0)

    return {
      table: 'demo_data',
      created: totalCreated,
      skipped: 0,
      errors: result.success ? 0 : 1,
      errorDetails: result.success ? [] : ['Demo data seeding failed'],
      warnings: [],
      duration: Date.now() - startTime,
    }
  }
}

export const demoVariant: SeedVariant = {
  name: 'demo',
  description: 'Full demo: reference + clinic + users + pets + store + clinical data',
  seeders: [
    // Include all integration seeders (tenants, reference data, services, kennels, lab catalog)
    ...integrationVariant.seeders,

    // Demo profiles (owners, vets, admins) - per tenant
    {
      name: 'profiles',
      factory: (client, options) => new ProfileSeeder(client, options),
      requiresTenant: true,
      dependencies: ['tenants'],
    },

    // Demo pets - per tenant (depends on profiles)
    {
      name: 'pets',
      factory: (client, options) => new PetSeeder(client, options),
      requiresTenant: true,
      dependencies: ['profiles'],
    },

    // Store data (global)
    {
      name: 'store_brands',
      factory: (client, options) => new StoreBrandSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'store_categories',
      factory: (client, options) => new StoreCategorySeeder(client, options),
      requiresTenant: false,
      dependencies: ['store_brands'],
    },
    {
      name: 'suppliers',
      factory: (client, options) => new SupplierSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
    {
      name: 'store_products',
      factory: (client, options) => new StoreProductSeeder(client, options),
      requiresTenant: false,
      dependencies: ['store_brands', 'store_categories', 'suppliers'],
    },
    {
      name: 'store_inventory',
      factory: (client, options) => new StoreInventorySeeder(client, options),
      requiresTenant: true,
      dependencies: ['store_products'],
    },

    // Hospitalization demo (per tenant) - uses kennels
    {
      name: 'hospitalizations',
      factory: (client, options) => new HospitalizationSeeder(client, options),
      requiresTenant: true,
      dependencies: ['kennels', 'pets'],
    },

    // Lab orders demo (per tenant)
    {
      name: 'lab_orders',
      factory: (client, options) => new LabOrderDemoSeeder(client, options),
      requiresTenant: true,
      dependencies: ['lab_test_catalog', 'pets'],
    },

    // Full demo data: medical records, vaccines, prescriptions, appointments, invoices
    {
      name: 'demo_data',
      factory: (client, options) => new DemoDataSeederWrapper(client, options),
      requiresTenant: true,
      dependencies: ['pets', 'services', 'kennels'],
    },
  ],
}

/**
 * Reset variant - clears data first
 */
export const resetVariant: SeedVariant = {
  ...demoVariant,
  name: 'reset',
  description: 'Clear tenant data + full demo',
  cleanup: true,
  preserveTables: [
    'tenants',
    'diagnosis_codes',
    'drug_dosages',
    'growth_standards',
    'vaccine_protocols',
    'insurance_providers',
    'lab_test_catalog',
    'store_brands',
    'store_categories',
    'suppliers',
    'store_products',
  ],
}
