/**
 * ROI Calculator Detailed Constants
 *
 * REF-006: Configuration constants extracted from client component
 */

import { pricingTiers, type TierId, type PricingTier } from '@/lib/pricing/tiers'
import { tierIcons } from '@/lib/pricing/tier-ui'
import type { DerivedPlanConfig, ClinicInputs } from './types'

/**
 * Calculator-specific properties per tier
 * These are component-specific and not part of the central config
 */
export const tierCalculatorProps: Record<TierId, {
  expectedGrowthPercent: number
  expectedNoShowReduction: number
  timeSavingsPercent: number
}> = {
  gratis: { expectedGrowthPercent: 0, expectedNoShowReduction: 0, timeSavingsPercent: 0.15 },
  profesional: { expectedGrowthPercent: 0, expectedNoShowReduction: 0.20, timeSavingsPercent: 0.30 },
}

/**
 * Derive plan configs from central pricing tiers
 * All base data comes from lib/pricing/tiers.ts - single source of truth
 */
export const plans: DerivedPlanConfig[] = pricingTiers.map((tier: PricingTier) => ({
  id: tier.id,
  name: tier.name,
  icon: tierIcons[tier.id],
  color: tier.color,
  monthlyCost: tier.monthlyPrice,
  isCustomPricing: tier.enterprise,
  expectedGrowthPercent: tierCalculatorProps[tier.id].expectedGrowthPercent,
  expectedNoShowReduction: tierCalculatorProps[tier.id].expectedNoShowReduction,
  timeSavingsPercent: tierCalculatorProps[tier.id].timeSavingsPercent,
  targetPatientsMin: tier.targetPatientsMin,
  targetPatientsMax: tier.targetPatientsMax,
  includedUsers: tier.includedUsers,
  hasEcommerce: tier.features.ecommerce,
  hasBulkOrdering: tier.features.bulkOrdering,
  hasWhatsappReminders: tier.features.whatsappApi,
  showAds: !tier.features.adFree,
  ecommerceCommission: tier.ecommerceCommission,
}))

export const DEFAULT_CLINIC_INPUTS: ClinicInputs = {
  monthlyConsultations: 100,
  avgConsultationPrice: 150000,
  monthlyNoShows: 10,
  adminHoursPerWeek: 15,
  currentMonthlyStoreSales: 3000000,
  monthlySupplySpend: 2000000,
  monthsOnPlatform: 0,
}

export const HOURLY_RATE = 50000 // Gs per hour of admin time
