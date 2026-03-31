'use client'

/**
 * Input Panel Component
 *
 * REF-006: Clinic inputs and plan selector extracted from client component
 */

import { Building2, Check, ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import type { ClinicInputs, DerivedPlanConfig } from '../types'
import { formatCurrency } from '../utils'

interface InputPanelProps {
  inputs: ClinicInputs
  setInputs: React.Dispatch<React.SetStateAction<ClinicInputs>>
  plans: DerivedPlanConfig[]
  currentPlan: DerivedPlanConfig
  suggestedPlan: DerivedPlanConfig
  selectedPlanId: string | null
  setSelectedPlanId: (id: string | null) => void
  showAdvanced: boolean
  setShowAdvanced: (show: boolean) => void
}

export function InputPanel({
  inputs,
  setInputs,
  plans,
  currentPlan,
  suggestedPlan,
  selectedPlanId,
  setSelectedPlanId,
  showAdvanced,
  setShowAdvanced,
}: InputPanelProps): React.ReactElement {
  return (
    <div className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-6 lg:col-span-4">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-[var(--landing-text-primary)]">
        <Building2 className="h-5 w-5 text-[var(--landing-primary)]" />
        Tu Clinica Hoy
      </h3>

      {/* Basic Inputs */}
      <div className="space-y-5">
        {/* Monthly Consultations */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
            <span>Consultas mensuales</span>
            <span className="font-bold text-[var(--landing-text-primary)]">{inputs.monthlyConsultations}</span>
          </label>
          <input
            type="range"
            min="20"
            max="600"
            step="10"
            value={inputs.monthlyConsultations}
            onChange={(e) => {
              setInputs({ ...inputs, monthlyConsultations: Number(e.target.value) })
              setSelectedPlanId(null)
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-primary)]"
          />
        </div>

        {/* Average Price */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
            <span>Precio promedio consulta</span>
            <span className="font-bold text-[var(--landing-text-primary)]">{formatCurrency(inputs.avgConsultationPrice)}</span>
          </label>
          <input
            type="range"
            min="50000"
            max="500000"
            step="10000"
            value={inputs.avgConsultationPrice}
            onChange={(e) => setInputs({ ...inputs, avgConsultationPrice: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-primary)]"
          />
        </div>

        {/* No-shows */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
            <span>Citas perdidas/mes (no-shows)</span>
            <span className="font-bold text-[var(--landing-text-primary)]">{inputs.monthlyNoShows}</span>
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={inputs.monthlyNoShows}
            onChange={(e) => setInputs({ ...inputs, monthlyNoShows: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-primary)]"
          />
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-lg bg-[var(--landing-bg-muted)] px-4 py-3 text-sm text-[var(--landing-text-secondary)] transition-colors hover:bg-[var(--landing-border)]"
        >
          <span>Configuracion avanzada</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Advanced Inputs */}
        {showAdvanced && (
          <div className="space-y-5 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-bg-white)] p-4">
            {/* Admin Hours */}
            <div>
              <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
                <span>Horas admin/semana</span>
                <span className="font-bold text-[var(--landing-text-primary)]">{inputs.adminHoursPerWeek}h</span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={inputs.adminHoursPerWeek}
                onChange={(e) => setInputs({ ...inputs, adminHoursPerWeek: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-text-muted)]"
              />
            </div>

            {/* Current Store Sales */}
            <div>
              <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
                <span>Ventas tienda/mes</span>
                <span className="font-bold text-[var(--landing-text-primary)]">{formatCurrency(inputs.currentMonthlyStoreSales)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="20000000"
                step="500000"
                value={inputs.currentMonthlyStoreSales}
                onChange={(e) => setInputs({ ...inputs, currentMonthlyStoreSales: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-text-muted)]"
              />
            </div>

            {/* Monthly Supply Spend */}
            <div>
              <label className="mb-2 flex items-center justify-between text-sm text-[var(--landing-text-secondary)]">
                <span>Gasto insumos/mes</span>
                <span className="font-bold text-[var(--landing-text-primary)]">{formatCurrency(inputs.monthlySupplySpend)}</span>
              </label>
              <input
                type="range"
                min="500000"
                max="10000000"
                step="250000"
                value={inputs.monthlySupplySpend}
                onChange={(e) => setInputs({ ...inputs, monthlySupplySpend: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--landing-border)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--landing-text-muted)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan Selector */}
      <div className="mt-6">
        <label className="mb-3 block text-sm text-[var(--landing-text-secondary)]">
          Plan {!selectedPlanId && <span className="text-xs text-[var(--landing-primary)]">(sugerido)</span>}
        </label>
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                currentPlan.id === plan.id
                  ? 'bg-[var(--landing-bg-white)]'
                  : 'border-transparent bg-[var(--landing-bg-muted)] hover:bg-[var(--landing-border-light)]'
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
                  <span className="text-sm font-medium text-[var(--landing-text-primary)]">{plan.name}</span>
                  {plan.showAds && (
                    <span title="Con anuncios">
                      <Megaphone className="h-3 w-3 text-amber-500" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--landing-text-muted)]">
                  {plan.isCustomPricing ? 'Personalizado' : plan.monthlyCost === 0 ? 'Gratis' : `${formatCurrency(plan.monthlyCost)}/mes`}
                </div>
              </div>
              {currentPlan.id === plan.id && suggestedPlan.id === plan.id && !selectedPlanId && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                >
                  Ideal
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
