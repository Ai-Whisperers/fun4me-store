/**
 * Seed Variants Index
 *
 * Export all seed variant configurations.
 */

export * from './types'
export * from './basic'
export * from './integration'
export * from './demo'

import type { SeedVariant, VariantName } from './types'
import { basicVariant } from './basic'
import { integrationVariant } from './integration'
import { demoVariant, resetVariant } from './demo'

/**
 * Map of all available variants
 */
export const VARIANTS: Record<VariantName, SeedVariant> = {
  basic: basicVariant,
  integration: integrationVariant,
  e2e: integrationVariant, // Alias for now
  demo: demoVariant,
  reset: resetVariant,
}

/**
 * Get a variant by name
 */
export function getVariant(name: VariantName): SeedVariant {
  const variant = VARIANTS[name]
  if (!variant) {
    throw new Error(`Unknown seed variant: ${name}. Available: ${Object.keys(VARIANTS).join(', ')}`)
  }
  return variant
}

/**
 * Get all variant names
 */
export function getVariantNames(): VariantName[] {
  return Object.keys(VARIANTS) as VariantName[]
}

/**
 * Print available variants
 */
export function printVariants(): void {
  console.log('\nAvailable seed variants:')
  for (const [name, variant] of Object.entries(VARIANTS)) {
    console.log(`  ${name.padEnd(12)} - ${variant.description}`)
  }
  console.log('')
}
