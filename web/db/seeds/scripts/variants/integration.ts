/**
 * Integration Seed Variant
 *
 * Adds clinic operational data on top of basic.
 * For integration tests that need services, kennels, etc.
 */

import type { SeedVariant } from './types'
import { basicVariant } from './basic'
import {
  ServiceSeeder,
  KennelSeeder,
  PaymentMethodSeeder,
  TimeOffTypeSeeder,
} from '../seeders/service-seeder'
import { LabTestCatalogSeeder } from '../seeders/lab-seeder'

export const integrationVariant: SeedVariant = {
  name: 'integration',
  description: 'Basic + services, kennels, lab catalog (for integration tests)',
  seeders: [
    // Include all basic seeders
    ...basicVariant.seeders,

    // Add clinic operational data (per tenant)
    {
      name: 'services',
      factory: (client, options) => new ServiceSeeder(client, options),
      requiresTenant: true,
      dependencies: ['tenants'],
    },
    {
      name: 'kennels',
      factory: (client, options) => new KennelSeeder(client, options),
      requiresTenant: true,
      dependencies: ['tenants'],
    },
    {
      name: 'payment_methods',
      factory: (client, options) => new PaymentMethodSeeder(client, options),
      requiresTenant: true,
      dependencies: ['tenants'],
    },
    {
      name: 'time_off_types',
      factory: (client, options) => new TimeOffTypeSeeder(client, options),
      requiresTenant: true,
      dependencies: ['tenants'],
    },
    {
      name: 'lab_test_catalog',
      factory: (client, options) => new LabTestCatalogSeeder(client, options),
      requiresTenant: false,
      dependencies: ['tenants'],
    },
  ],
}
