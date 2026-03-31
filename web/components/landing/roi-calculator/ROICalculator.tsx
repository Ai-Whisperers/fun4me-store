/**
 * ROI Calculator Component
 *
 * Main orchestrator for ROI calculator section.
 */

'use client'

import { Calculator } from 'lucide-react'
import { useROICalculator } from './use-roi-calculator'
import { InputPanel } from './InputPanel'
import { ResultsPanel } from './ResultsPanel'

export function ROICalculator() {
  const {
    monthlyConsultations,
    avgConsultationPrice,
    selectedPlanId,
    currentPlan,
    suggestedPlan,
    calculations,
    setMonthlyConsultations,
    setAvgConsultationPrice,
    setSelectedPlanId,
  } = useROICalculator()

  return (
    <section
      id="calculadora"
      className="relative overflow-hidden bg-[var(--bg-dark)] py-20 md:py-28"
    >
      {/* Background */}
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px] transition-colors duration-500"
        style={{ backgroundColor: `${currentPlan.color}08` }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="bg-[var(--primary)]/10 border-[var(--primary)]/20 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
            <Calculator className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--primary)]">Calculadora de ROI</span>
          </div>
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl lg:text-5xl">
            ¿Vale la pena la inversion?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Ingresa los datos de tu clinica y descubri cuanto podes ganar.
            <strong className="text-[var(--primary)]"> Con garantia de resultados.</strong>
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Input Panel */}
            <InputPanel
              monthlyConsultations={monthlyConsultations}
              avgConsultationPrice={avgConsultationPrice}
              currentPlan={currentPlan}
              suggestedPlan={suggestedPlan}
              selectedPlanId={selectedPlanId}
              onConsultationsChange={setMonthlyConsultations}
              onPriceChange={setAvgConsultationPrice}
              onPlanSelect={setSelectedPlanId}
            />

            {/* Results Panel */}
            <ResultsPanel
              currentPlan={currentPlan}
              calculations={calculations}
              monthlyConsultations={monthlyConsultations}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
