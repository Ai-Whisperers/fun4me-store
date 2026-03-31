/**
 * Input Panel Component
 *
 * Sliders and plan selector for ROI calculator inputs.
 */

'use client'

import { DollarSign, Megaphone, Check } from 'lucide-react'
import { plans, formatCurrencyShort } from './utils'
import type { DerivedPlanConfig } from './types'

interface InputPanelProps {
  monthlyConsultations: number
  avgConsultationPrice: number
  currentPlan: DerivedPlanConfig
  suggestedPlan: DerivedPlanConfig
  selectedPlanId: string | null
  onConsultationsChange: (value: number) => void
  onPriceChange: (value: number) => void
  onPlanSelect: (planId: string) => void
}

export function InputPanel({
  monthlyConsultations,
  avgConsultationPrice,
  currentPlan,
  suggestedPlan,
  selectedPlanId,
  onConsultationsChange,
  onPriceChange,
  onPlanSelect,
}: InputPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-1">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
        <DollarSign className="h-5 w-5 text-[var(--primary)]" />
        Tu Clinica
      </h3>

      {/* Monthly Consultations */}
      <div className="mb-6">
        <label className="mb-2 block text-sm text-white/70">Pacientes mensuales</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="10"
            max="600"
            step="5"
            value={monthlyConsultations}
            onChange={(e) => onConsultationsChange(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)]"
          />
          <div className="w-16 text-center">
            <span className="text-xl font-bold text-white">{monthlyConsultations}</span>
          </div>
        </div>
      </div>

      {/* Average Price */}
      <div className="mb-6">
        <label className="mb-2 block text-sm text-white/70">Precio promedio consulta</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="50000"
            max="400000"
            step="10000"
            value={avgConsultationPrice}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)]"
          />
          <div className="w-20 text-center">
            <span className="text-lg font-bold text-white">
              {formatCurrencyShort(avgConsultationPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Selector */}
      <div>
        <label className="mb-3 block text-sm text-white/70">
          Plan
          {!selectedPlanId && (
            <span className="ml-2 text-xs text-[var(--primary)]">(auto-sugerido)</span>
          )}
        </label>
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onPlanSelect(plan.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                currentPlan.id === plan.id
                  ? 'bg-white/10'
                  : 'border-transparent bg-white/5 hover:bg-white/[0.07]'
              }`}
              style={{
                borderColor: currentPlan.id === plan.id ? plan.color : 'transparent',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
              >
                {plan.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{plan.name}</span>
                  {plan.showAds && (
                    <span title="Muestra anuncios">
                      <Megaphone className="h-3 w-3 text-amber-400" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/40">
                  {plan.monthlyCost === 0 ? 'Gratis' : `${formatCurrencyShort(plan.monthlyCost)}/mes`}
                </div>
              </div>
              {currentPlan.id === plan.id &&
                suggestedPlan.id === plan.id &&
                !selectedPlanId && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                  >
                    Sugerido
                  </span>
                )}
              {currentPlan.id === plan.id && (
                <Check className="h-4 w-4" style={{ color: plan.color }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
