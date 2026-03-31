/**
 * ROI Calculator Hook
 *
 * Manages state and calculations for ROI calculator.
 */

'use client'

import { useState, useMemo } from 'react'
import { discounts } from '@/lib/pricing/tiers'
import { plans } from './utils'
import type { DerivedPlanConfig, ROICalculations } from './types'

export function useROICalculator() {
  const [monthlyConsultations, setMonthlyConsultations] = useState(80)
  const [avgConsultationPrice, setAvgConsultationPrice] = useState(150000)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Auto-suggest plan based on patient count
  const suggestedPlan = useMemo(() => {
    return (
      plans.find(
        (p) =>
          monthlyConsultations >= p.targetPatientsMin && monthlyConsultations < p.targetPatientsMax
      ) || plans[2]
    ) // Default to Crecimiento
  }, [monthlyConsultations])

  const currentPlan: DerivedPlanConfig = selectedPlanId
    ? plans.find((p) => p.id === selectedPlanId) || suggestedPlan
    : suggestedPlan

  const calculations: ROICalculations = useMemo(() => {
    const { monthlyCost, expectedGrowthPercent } = currentPlan

    // New clients per month from having online presence
    const newClientsPerMonth = Math.round(monthlyConsultations * expectedGrowthPercent)

    // Additional revenue per month
    const additionalRevenuePerMonth = newClientsPerMonth * avgConsultationPrice

    // Net monthly benefit
    const netMonthlyBenefit = additionalRevenuePerMonth - monthlyCost

    // First year calculations (no setup costs in new model)
    const yearlyAdditionalRevenue = additionalRevenuePerMonth * 12
    const yearlyVeticCost = monthlyCost * 12
    const yearlyNetProfit = yearlyAdditionalRevenue - yearlyVeticCost
    const yearlyROI = yearlyVeticCost > 0 ? (yearlyNetProfit / yearlyVeticCost) * 100 : Infinity

    // Break-even clients needed per month
    const breakEvenClients = monthlyCost > 0 ? Math.ceil(monthlyCost / avgConsultationPrice) : 0

    // Months to recover (no setup cost, just see when monthly benefit > cost)
    const monthsToRecover = netMonthlyBenefit > 0 ? 1 : 999

    // With annual discount
    const annualPrice = monthlyCost * 12 * (1 - discounts.annual)
    const annualSavings = (monthlyCost * 12) - annualPrice

    return {
      newClientsPerMonth,
      additionalRevenuePerMonth,
      netMonthlyBenefit,
      monthsToRecover,
      yearlyROI: yearlyROI === Infinity ? 999 : Math.round(yearlyROI),
      breakEvenClients,
      yearlyNetProfit,
      yearlyVeticCost,
      annualPrice,
      annualSavings,
    }
  }, [monthlyConsultations, avgConsultationPrice, currentPlan])

  const handleConsultationsChange = (value: number) => {
    setMonthlyConsultations(value)
    setSelectedPlanId(null) // Reset to auto-suggest
  }

  return {
    // State
    monthlyConsultations,
    avgConsultationPrice,
    selectedPlanId,
    currentPlan,
    suggestedPlan,
    calculations,

    // Actions
    setMonthlyConsultations: handleConsultationsChange,
    setAvgConsultationPrice,
    setSelectedPlanId,
  }
}
