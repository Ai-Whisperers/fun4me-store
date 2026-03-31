/**
 * ROI Calculator Types
 *
 * Type definitions for ROI calculator component.
 */

import type { TierId } from '@/lib/pricing/tiers'

/**
 * Plan configuration derived from central pricing config
 * NOTE: Growth percentages set to 0 - we don't promise growth, only show what we deliver
 */
export interface DerivedPlanConfig {
  id: TierId
  name: string
  icon: React.ReactNode
  color: string
  monthlyCost: number
  expectedGrowthPercent: number
  targetPatientsMin: number
  targetPatientsMax: number
  includedUsers: number
  hasEcommerce: boolean
  hasBulkOrdering: boolean
  showAds: boolean
}

export interface ROICalculations {
  newClientsPerMonth: number
  additionalRevenuePerMonth: number
  netMonthlyBenefit: number
  monthsToRecover: number
  yearlyROI: number
  breakEvenClients: number
  yearlyNetProfit: number
  yearlyVeticCost: number
  annualPrice: number
  annualSavings: number
}
