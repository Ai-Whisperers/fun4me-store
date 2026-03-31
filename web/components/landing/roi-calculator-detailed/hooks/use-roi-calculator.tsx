'use client'

/**
 * ROI Calculator Hook
 *
 * REF-006: State and calculations extracted from client component
 */

import { useState, useMemo, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { discounts, commissionConfig, bulkOrderingConfig } from '@/lib/pricing/tiers'
import type { ClinicInputs, DerivedPlanConfig, ROICalculations, RevenueBreakdown, CostBreakdown } from '../types'
import { plans, DEFAULT_CLINIC_INPUTS, HOURLY_RATE } from '../constants'
import { formatCurrency, formatPercent } from '../utils'

interface UseROICalculatorReturn {
  // State
  inputs: ClinicInputs
  setInputs: React.Dispatch<React.SetStateAction<ClinicInputs>>
  selectedPlanId: string | null
  setSelectedPlanId: (id: string | null) => void
  showAdvanced: boolean
  setShowAdvanced: (show: boolean) => void
  showDetailedBreakdown: boolean
  setShowDetailedBreakdown: (show: boolean) => void
  billingPeriod: 'monthly' | 'yearly'
  setBillingPeriod: (period: 'monthly' | 'yearly') => void

  // Derived
  plans: DerivedPlanConfig[]
  suggestedPlan: DerivedPlanConfig
  currentPlan: DerivedPlanConfig
  calculations: ROICalculations
}

export function useROICalculator(): UseROICalculatorReturn {
  const [inputs, setInputs] = useState<ClinicInputs>(DEFAULT_CLINIC_INPUTS)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  // Auto-suggest plan based on patient count
  const suggestedPlan = useMemo(() => {
    return (
      plans.find(
        (p) =>
          inputs.monthlyConsultations >= p.targetPatientsMin &&
          inputs.monthlyConsultations < p.targetPatientsMax
      ) || plans[1] // Default to Profesional if not found
    )
  }, [inputs.monthlyConsultations])

  const currentPlan = selectedPlanId
    ? plans.find((p) => p.id === selectedPlanId) || suggestedPlan
    : suggestedPlan

  // Auto-open advanced config for e-commerce plans
  useEffect(() => {
    if (currentPlan.hasEcommerce) {
      setShowAdvanced(true)
    }
  }, [currentPlan.hasEcommerce])

  // Get current commission rate based on months on platform
  const currentCommissionRate = useMemo(() => {
    if (!currentPlan.hasEcommerce) return 0
    return inputs.monthsOnPlatform < commissionConfig.monthsUntilIncrease
      ? commissionConfig.initialRate
      : commissionConfig.standardRate
  }, [currentPlan, inputs.monthsOnPlatform])

  // All calculations
  const calculations = useMemo((): ROICalculations => {
    // === REVENUE/SAVINGS STREAMS ===

    // 1. New clients from digital presence
    const newClientsPerMonth = Math.round(inputs.monthlyConsultations * currentPlan.expectedGrowthPercent)
    const revenueFromNewClients = newClientsPerMonth * inputs.avgConsultationPrice

    // 2. Recovered revenue from reduced no-shows
    const recoveredNoShows = Math.round(inputs.monthlyNoShows * currentPlan.expectedNoShowReduction)
    const revenueFromRecoveredNoShows = recoveredNoShows * inputs.avgConsultationPrice

    // 3. Time savings (admin hours)
    const hoursSavedPerMonth = inputs.adminHoursPerWeek * 4 * currentPlan.timeSavingsPercent
    const valueSavedFromTime = hoursSavedPerMonth * HOURLY_RATE

    // 4. E-commerce - only count commission cost
    const totalStoreSales = currentPlan.hasEcommerce ? inputs.currentMonthlyStoreSales : 0

    // Total gross benefit
    const totalGrossBenefit =
      revenueFromNewClients +
      revenueFromRecoveredNoShows +
      valueSavedFromTime

    // === VETIC COSTS ===

    // 1. Monthly subscription
    const subscriptionCost = currentPlan.monthlyCost

    // 2. E-commerce commission
    const ecommerceCommission = currentPlan.hasEcommerce
      ? totalStoreSales * currentCommissionRate
      : 0

    // 3. Bulk ordering markup
    const bulkDeliveryMarkup = currentPlan.hasBulkOrdering
      ? inputs.monthlySupplySpend * bulkOrderingConfig.deliveryMarkup
      : 0

    // Total Vetic costs
    const totalVeticCosts = subscriptionCost + ecommerceCommission + bulkDeliveryMarkup

    // Net monthly benefit
    const netMonthlyBenefit = totalGrossBenefit - totalVeticCosts

    // Annual calculations
    const yearlyGrossBenefit = totalGrossBenefit * 12
    const yearlyVeticCosts = totalVeticCosts * 12
    const yearlyNetBenefit = netMonthlyBenefit * 12

    // ROI calculation
    const yearlyROI = yearlyVeticCosts > 0
      ? ((yearlyGrossBenefit - yearlyVeticCosts) / yearlyVeticCosts) * 100
      : Infinity

    // Break-even clients
    const breakEvenClients = subscriptionCost > 0
      ? Math.ceil(subscriptionCost / inputs.avgConsultationPrice)
      : 0

    // Annual discount calculation
    const annualPrice = subscriptionCost * 12 * (1 - discounts.annual)
    const annualSavings = subscriptionCost * 12 - annualPrice

    // Revenue breakdown items
    const revenueBreakdown: RevenueBreakdown[] = [
      {
        label: 'Citas recuperadas (con recordatorios)',
        icon: <Clock className="h-4 w-4" />,
        amount: revenueFromRecoveredNoShows,
        description: currentPlan.hasWhatsappReminders
          ? `Estimado: ${recoveredNoShows} citas/mes × ${formatCurrency(inputs.avgConsultationPrice)}`
          : 'Requiere plan con recordatorios WhatsApp',
        isAvailable: currentPlan.hasWhatsappReminders && revenueFromRecoveredNoShows > 0,
        planRequired: currentPlan.hasWhatsappReminders ? undefined : 'Profesional',
      },
      {
        label: 'Ahorro tiempo admin (estimado)',
        icon: <Clock className="h-4 w-4" />,
        amount: valueSavedFromTime,
        description: `~${hoursSavedPerMonth.toFixed(0)}h/mes con registros digitales`,
        isAvailable: valueSavedFromTime > 0,
      },
    ]

    // Cost breakdown items
    const costBreakdown: CostBreakdown[] = [
      {
        label: 'Suscripcion mensual',
        amount: subscriptionCost,
        description: `Plan ${currentPlan.name}`,
        type: 'subscription',
      },
    ]

    if (currentPlan.hasEcommerce && ecommerceCommission > 0) {
      costBreakdown.push({
        label: `Comision tienda (${formatPercent(currentCommissionRate)})`,
        amount: ecommerceCommission,
        description: `${formatPercent(currentCommissionRate)} de ${formatCurrency(totalStoreSales)} en ventas`,
        type: 'commission',
      })
    }

    if (currentPlan.hasBulkOrdering && bulkDeliveryMarkup > 0) {
      costBreakdown.push({
        label: 'Logistica compras volumen',
        amount: bulkDeliveryMarkup,
        description: 'Costo de coordinacion y entrega',
        type: 'markup',
      })
    }

    return {
      newClientsPerMonth,
      revenueFromNewClients,
      recoveredNoShows,
      revenueFromRecoveredNoShows,
      hoursSavedPerMonth,
      valueSavedFromTime,
      totalStoreSales,
      totalGrossBenefit,
      totalVeticCosts,
      netMonthlyBenefit,
      yearlyGrossBenefit,
      yearlyVeticCosts,
      yearlyNetBenefit,
      yearlyROI: yearlyROI === Infinity ? 999 : Math.round(yearlyROI),
      breakEvenClients,
      annualPrice,
      annualSavings,
      currentCommissionRate,
      paybackMonths: totalGrossBenefit > 0 && totalVeticCosts > 0
        ? totalVeticCosts / totalGrossBenefit
        : null,
      revenueBreakdown,
      costBreakdown,
      ecommerceCommission,
      subscriptionCost,
    }
  }, [inputs, currentPlan, currentCommissionRate])

  return {
    inputs,
    setInputs,
    selectedPlanId,
    setSelectedPlanId,
    showAdvanced,
    setShowAdvanced,
    showDetailedBreakdown,
    setShowDetailedBreakdown,
    billingPeriod,
    setBillingPeriod,
    plans,
    suggestedPlan,
    currentPlan,
    calculations,
  }
}
