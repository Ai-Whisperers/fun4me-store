'use client'

/**
 * Benefits Breakdown Component
 *
 * REF-006: Potential benefits section extracted from client component
 */

import { PlusCircle } from 'lucide-react'
import type { ROICalculations } from '../types'
import { formatCurrency } from '../utils'

interface BenefitsBreakdownProps {
  calculations: ROICalculations
}

export function BenefitsBreakdown({ calculations }: BenefitsBreakdownProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg-white)] p-4">
      <h4 className="mb-2 flex items-center gap-2 font-bold text-[var(--landing-text-primary)]">
        <PlusCircle className="h-5 w-5 text-[var(--landing-text-muted)]" />
        Beneficios potenciales (estimados)
      </h4>
      <p className="mb-4 text-xs text-[var(--landing-text-light)]">
        Estos son estimados conservadores. Los resultados reales dependen de tu clinica.
      </p>
      <div className="space-y-3">
        {calculations.revenueBreakdown.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between rounded-lg p-3 ${
              item.isAvailable ? 'bg-[var(--landing-bg-muted)]' : 'bg-[var(--landing-bg)] opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  item.isAvailable ? 'bg-[var(--landing-primary-light)] text-[var(--landing-primary)]' : 'bg-[var(--landing-border)] text-[var(--landing-text-light)]'
                }`}
              >
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--landing-text-primary)]">
                  {item.label}
                  {!item.isAvailable && item.planRequired && (
                    <span className="rounded-full bg-[var(--landing-border)] px-2 py-0.5 text-xs text-[var(--landing-text-light)]">
                      Plan {item.planRequired}+
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--landing-text-muted)]">{item.description}</div>
              </div>
            </div>
            <div
              className={`text-lg font-bold ${
                item.isAvailable ? 'text-[var(--landing-text-primary)]' : 'text-[var(--landing-text-light)]'
              }`}
            >
              ~{formatCurrency(item.amount)}
            </div>
          </div>
        ))}

        {/* Total */}
        {calculations.totalGrossBenefit > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-[var(--landing-border)] pt-3">
            <span className="font-bold text-[var(--landing-text-secondary)]">Potencial estimado/mes</span>
            <span className="text-lg font-bold text-[var(--landing-text-secondary)]">
              ~{formatCurrency(calculations.totalGrossBenefit)}
            </span>
          </div>
        )}
        {calculations.totalGrossBenefit === 0 && (
          <div className="mt-2 rounded-lg bg-[var(--landing-bg-muted)] p-3 text-center text-sm text-[var(--landing-text-muted)]">
            Los beneficios medibles (como recordatorios) requieren Plan Profesional o superior.
          </div>
        )}
      </div>
    </div>
  )
}
