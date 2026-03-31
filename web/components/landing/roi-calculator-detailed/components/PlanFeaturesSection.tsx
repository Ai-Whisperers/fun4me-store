'use client'

/**
 * Plan Features Section Component
 *
 * REF-006: Plan features and summary extracted from client component
 */

import { Wallet, Check } from 'lucide-react'
import { discounts } from '@/lib/pricing/tiers'
import { tierDetailedFeatures } from '@/lib/pricing/tier-ui'
import type { DerivedPlanConfig, ROICalculations } from '../types'
import { formatCurrency } from '../utils'

interface PlanFeaturesSectionProps {
  currentPlan: DerivedPlanConfig
  calculations: ROICalculations
  billingPeriod: 'monthly' | 'yearly'
}

export function PlanFeaturesSection({
  currentPlan,
  calculations,
  billingPeriod,
}: PlanFeaturesSectionProps): React.ReactElement {
  const planFeatures = tierDetailedFeatures

  return (
    <div
      className="rounded-xl border-2 p-4"
      style={{
        borderColor: `${currentPlan.color}40`,
        backgroundColor: `${currentPlan.color}10`,
      }}
    >
      <h4 className="mb-4 flex items-center gap-2 font-bold text-[var(--landing-text-primary)]">
        <Wallet className="h-5 w-5" style={{ color: currentPlan.color }} />
        Resumen de costos
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white/80 p-4 text-center">
          <div className="mb-1 text-sm text-[var(--landing-text-muted)]">
            Costo mensual {billingPeriod === 'yearly' && '(equiv.)'}
          </div>
          <div className="text-3xl font-black text-[var(--landing-text-primary)]">
            {currentPlan.isCustomPricing
              ? 'Personalizado'
              : currentPlan.monthlyCost === 0
                ? 'Gratis'
                : billingPeriod === 'yearly'
                  ? formatCurrency(Math.round(calculations.subscriptionCost * (1 - discounts.annual)) + calculations.ecommerceCommission)
                  : formatCurrency(calculations.totalVeticCosts)}
          </div>
          {billingPeriod === 'yearly' && !currentPlan.isCustomPricing && currentPlan.monthlyCost > 0 && (
            <div className="mt-1 text-xs text-[var(--landing-text-muted)] line-through">
              {formatCurrency(calculations.totalVeticCosts)}/mes
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white/80 p-4 text-center">
          <div className="mb-1 text-sm text-[var(--landing-text-muted)]">Costo anual</div>
          <div className="text-3xl font-black text-[var(--landing-text-primary)]">
            {currentPlan.isCustomPricing
              ? 'Contactar'
              : currentPlan.monthlyCost === 0
                ? 'Gratis'
                : billingPeriod === 'yearly'
                  ? formatCurrency(calculations.annualPrice + (calculations.ecommerceCommission * 12))
                  : formatCurrency(calculations.yearlyVeticCosts)}
          </div>
          {billingPeriod === 'yearly' && !currentPlan.isCustomPricing && currentPlan.monthlyCost > 0 && (
            <div className="mt-1 text-xs font-bold text-green-600">
              Ahorrás {formatCurrency(calculations.annualSavings)}
            </div>
          )}
        </div>
      </div>

      {/* Payback Period */}
      {calculations.paybackMonths !== null && calculations.totalGrossBenefit > 0 && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-green-800">
                Recuperacion de inversion
              </div>
              <div className="text-xs text-green-600">
                Basado en beneficios estimados
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-green-700">
                {calculations.paybackMonths < 1 ? (
                  'Inmediato'
                ) : calculations.paybackMonths < 12 ? (
                  `${calculations.paybackMonths.toFixed(1)} meses`
                ) : (
                  `${(calculations.paybackMonths / 12).toFixed(1)} años`
                )}
              </div>
              {calculations.paybackMonths <= 1 && (
                <div className="text-xs text-green-600">
                  Los beneficios superan el costo
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* What's included */}
      <div className="mt-4 rounded-lg bg-white/80 p-4">
        <p className="mb-3 text-sm font-bold text-[var(--landing-text-primary)]">
          Incluido en Plan {currentPlan.name}:
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Included features */}
          <div className="space-y-1.5">
            {planFeatures[currentPlan.id].included.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="text-[var(--landing-text-secondary)]">{feature}</span>
              </div>
            ))}
          </div>

          {/* Not included features */}
          {planFeatures[currentPlan.id].notIncluded.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--landing-text-muted)] mb-2">
                Disponible en planes superiores:
              </p>
              {planFeatures[currentPlan.id].notIncluded.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 flex-shrink-0 text-center text-[var(--landing-text-light)]">–</span>
                  <span className="text-[var(--landing-text-light)]">{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User limit info */}
        {currentPlan.id === 'gratis' && (
          <div className="mt-3 pt-3 border-t border-[var(--landing-border-light)] text-xs text-[var(--landing-text-muted)]">
            1 usuario incluido • Actualiza a Profesional para usuarios ilimitados
          </div>
        )}
      </div>
    </div>
  )
}
