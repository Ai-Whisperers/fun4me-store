/**
 * ROI Calculator Detailed Types
 *
 * REF-006: Type definitions extracted from client component
 */

import type { TierId } from '@/lib/pricing/tiers'

export interface DerivedPlanConfig {
  id: TierId
  name: string
  icon: React.ReactNode
  color: string
  monthlyCost: number
  isCustomPricing?: boolean
  expectedGrowthPercent: number
  expectedNoShowReduction: number
  timeSavingsPercent: number
  targetPatientsMin: number
  targetPatientsMax: number
  includedUsers: number
  hasEcommerce: boolean
  hasBulkOrdering: boolean
  hasWhatsappReminders: boolean
  showAds: boolean
  ecommerceCommission: number
}

export interface ClinicInputs {
  monthlyConsultations: number
  avgConsultationPrice: number
  monthlyNoShows: number
  adminHoursPerWeek: number
  currentMonthlyStoreSales: number
  monthlySupplySpend: number
  monthsOnPlatform: number
}

export interface RevenueBreakdown {
  label: string
  icon: React.ReactNode
  amount: number
  description: string
  isAvailable: boolean
  planRequired?: string
}

export interface CostBreakdown {
  label: string
  amount: number
  description: string
  type: 'subscription' | 'commission' | 'markup'
}

export interface ROICalculations {
  // Revenue items
  newClientsPerMonth: number
  revenueFromNewClients: number
  recoveredNoShows: number
  revenueFromRecoveredNoShows: number
  hoursSavedPerMonth: number
  valueSavedFromTime: number
  totalStoreSales: number

  // Totals
  totalGrossBenefit: number
  totalVeticCosts: number
  netMonthlyBenefit: number

  // Annual
  yearlyGrossBenefit: number
  yearlyVeticCosts: number
  yearlyNetBenefit: number
  yearlyROI: number

  // Other metrics
  breakEvenClients: number
  annualPrice: number
  annualSavings: number
  currentCommissionRate: number
  paybackMonths: number | null

  // Breakdown arrays
  revenueBreakdown: RevenueBreakdown[]
  costBreakdown: CostBreakdown[]

  // Store specific
  ecommerceCommission: number
  subscriptionCost: number
}
