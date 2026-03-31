'use client'

/**
 * Summary Metrics Component
 *
 * REF-006: Summary metrics row extracted from client component
 */

import { discounts } from '@/lib/pricing/tiers'
import type { DerivedPlanConfig, ROICalculations } from '../types'
import { formatCurrency } from '../utils'

interface SummaryMetricsProps {
  currentPlan: DerivedPlanConfig
  calculations: ROICalculations
  billingPeriod: 'monthly' | 'yearly'
}

export function SummaryMetrics({
  currentPlan,
  calculations,
  billingPeriod,
}: SummaryMetricsProps): React.ReactElement {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
      <div className="rounded-xl bg-[var(--landing-bg-white)] border border-[var(--landing-border)] p-4">
        <div className="text-2xl font-black text-[var(--landing-text-primary)] md:text-3xl">
          {currentPlan.isCustomPricing
            ? 'Personalizado'
            : billingPeriod === 'yearly'
              ? formatCurrency(Math.round(calculations.subscriptionCost * (1 - discounts.annual)))
              : formatCurrency(calculations.subscriptionCost)}
        </div>
        <div className="text-sm text-[var(--landing-text-muted)]">
          Suscripcion/mes
          {billingPeriod === 'yearly' && !currentPlan.isCustomPricing && currentPlan.monthlyCost > 0 && (
            <span className="ml-1 text-green-600">(-{Math.round(discounts.annual * 100)}%)</span>
          )}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--landing-bg-white)] border border-[var(--landing-border)] p-4">
        <div className="text-2xl font-black text-[var(--landing-text-primary)] md:text-3xl">
          {currentPlan.hasEcommerce ? `${(calculations.currentCommissionRate * 100).toFixed(0)}%` : 'N/A'}
        </div>
        <div className="text-sm text-[var(--landing-text-muted)]">Comision tienda</div>
      </div>
      <div className="rounded-xl bg-[var(--landing-bg-white)] border border-[var(--landing-border)] p-4">
        <div className="text-2xl font-black text-[var(--landing-text-primary)] md:text-3xl">
          {currentPlan.isCustomPricing
            ? 'Contactar'
            : billingPeriod === 'yearly'
              ? formatCurrency(calculations.annualPrice + (calculations.ecommerceCommission * 12))
              : formatCurrency(calculations.yearlyVeticCosts)}
        </div>
        <div className="text-sm text-[var(--landing-text-muted)]">
          Total anual
          {billingPeriod === 'yearly' && !currentPlan.isCustomPricing && currentPlan.monthlyCost > 0 && (
            <span className="ml-1 text-green-600">(ahorrás {formatCurrency(calculations.annualSavings)})</span>
          )}
        </div>
      </div>
    </div>
  )
}
