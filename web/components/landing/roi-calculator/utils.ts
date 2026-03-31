/**
 * ROI Calculator Utilities
 *
 * Helper functions and plan configuration.
 */

import { pricingTiers, type PricingTier } from '@/lib/pricing/tiers'
import { tierIcons } from '@/lib/pricing/tier-ui'
import type { DerivedPlanConfig } from './types'

/**
 * Format currency with M suffix for millions
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `Gs ${(value / 1000000).toFixed(1)}M`
  }
  return `Gs ${new Intl.NumberFormat('es-PY').format(value)}`
}

/**
 * Format currency with K/M suffix for compact display
 */
export function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

/**
 * Derive plan configs from central pricing tiers
 * All data comes from lib/pricing/tiers.ts - single source of truth
 */
export const plans: DerivedPlanConfig[] = pricingTiers.map((tier: PricingTier) => ({
  id: tier.id,
  name: tier.name,
  icon: tierIcons[tier.id],
  color: tier.color,
  monthlyCost: tier.monthlyPrice,
  expectedGrowthPercent: 0, // Conservative - no growth promises
  targetPatientsMin: tier.targetPatientsMin,
  targetPatientsMax: tier.targetPatientsMax,
  includedUsers: tier.includedUsers,
  hasEcommerce: tier.features.ecommerce,
  hasBulkOrdering: tier.features.bulkOrdering,
  showAds: !tier.features.adFree,
}))
