'use client'

/**
 * ROI Calculator Detailed Component
 *
 * REF-006: Refactored to use decomposed components
 * Original: 1048 lines → Refactored: ~200 lines
 */

import {
  Calculator,
  Info,
  PieChart,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react'
import { discounts } from '@/lib/pricing/tiers'
import { useROICalculator } from './roi-calculator-detailed/hooks/use-roi-calculator'
import {
  InputPanel,
  SummaryMetrics,
  BenefitsBreakdown,
  CostBreakdownSection,
  PlanFeaturesSection,
  UpgradeComparison,
  CtaSection,
} from './roi-calculator-detailed/components'

export function ROICalculatorDetailed() {
  const {
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
  } = useROICalculator()

  return (
    <section
      id="calculadora-roi"
      className="relative overflow-hidden bg-[var(--landing-bg-white)] py-20 md:py-28"
    >
      {/* Background gradient */}
      <div
        className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[200px] opacity-10 transition-colors duration-500"
        style={{ backgroundColor: currentPlan.color }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="bg-[var(--landing-primary-lighter)] border-[var(--landing-primary-light)] mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
            <Calculator className="h-4 w-4 text-[var(--landing-primary)]" />
            <span className="text-sm font-medium text-[var(--landing-primary)]">
              Calculadora de Costos
            </span>
          </div>
          <h2 className="mb-6 text-3xl font-black text-[var(--landing-text-primary)] md:text-4xl lg:text-5xl">
            ¿Cuanto{' '}
            <span className="text-3xl md:text-4xl lg:text-5xl" style={{ color: currentPlan.color }}>cuesta</span>{' '}
            realmente?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[var(--landing-text-secondary)]">
            Sin letra chica. Te mostramos exactamente lo que pagas: suscripcion,
            comisiones, y cualquier otro costo.
          </p>

          {/* Billing Period Toggle */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="inline-flex items-center rounded-full bg-[var(--landing-bg-white)] p-1 shadow-sm ring-1 ring-[var(--landing-border)]">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-[var(--landing-primary)] text-white shadow-md'
                    : 'text-[var(--landing-text-secondary)] hover:text-[var(--landing-text-primary)]'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-[var(--landing-primary)] text-white shadow-md'
                    : 'text-[var(--landing-text-secondary)] hover:text-[var(--landing-text-primary)]'
                }`}
              >
                Anual
                <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
                  -{Math.round(discounts.annual * 100)}%
                </span>
              </button>
            </div>

            {/* Savings summary for yearly */}
            {billingPeriod === 'yearly' && !currentPlan.isCustomPricing && currentPlan.monthlyCost > 0 && (
              <p className="text-sm font-medium text-green-600">
                Con pago anual ahorrás Gs {new Intl.NumberFormat('es-PY').format(Math.round(calculations.annualSavings))} por año
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Input Panel */}
            <InputPanel
              inputs={inputs}
              setInputs={setInputs}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              plans={plans}
              currentPlan={currentPlan}
              suggestedPlan={suggestedPlan}
            />

            {/* Results Panel */}
            <div className="lg:col-span-8">
              <div
                className="rounded-2xl border-2 bg-[var(--landing-bg)] p-6"
                style={{ borderColor: `${currentPlan.color}30` }}
              >
                <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-[var(--landing-text-primary)]">
                  <BarChart3 className="h-5 w-5" style={{ color: currentPlan.color }} />
                  Resultados con Plan {currentPlan.name}
                </h3>

                {/* Summary Metrics */}
                <SummaryMetrics
                  currentPlan={currentPlan}
                  calculations={calculations}
                  billingPeriod={billingPeriod}
                />

                {/* Toggle Detailed Breakdown */}
                <button
                  onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                  className="mb-4 flex w-full items-center justify-between rounded-lg bg-[var(--landing-bg-muted)] px-4 py-3 text-sm font-medium text-[var(--landing-text-primary)] transition-colors hover:bg-[var(--landing-border)]"
                >
                  <span className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Ver desglose completo
                  </span>
                  {showDetailedBreakdown ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showDetailedBreakdown && (
                  <div className="space-y-6">
                    {/* Benefits Breakdown */}
                    <BenefitsBreakdown calculations={calculations} />

                    {/* Cost Breakdown */}
                    <CostBreakdownSection
                      currentPlan={currentPlan}
                      calculations={calculations}
                      inputs={inputs}
                    />

                    {/* Plan Features */}
                    <PlanFeaturesSection
                      currentPlan={currentPlan}
                      calculations={calculations}
                      billingPeriod={billingPeriod}
                    />
                  </div>
                )}

                {/* Upgrade Comparison */}
                <UpgradeComparison currentPlan={currentPlan} />

                {/* Disclaimer */}
                <div className="mt-4 flex items-start gap-2 text-xs text-[var(--landing-text-light)]">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>
                    Los beneficios mostrados son estimados y no estan garantizados. Los resultados
                    reales dependen de cada clinica. La comision de tienda aplica sobre todas las
                    ventas.
                  </p>
                </div>
              </div>

              {/* CTA Section */}
              <CtaSection currentPlan={currentPlan} inputs={inputs} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ROICalculatorDetailed
