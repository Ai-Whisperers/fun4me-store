'use client'

/**
 * Available Plans Component
 *
 * REF-006: Extracted from client component
 */

import type { Plan } from '../types'
import { PlanCard } from './PlanCard'

interface AvailablePlansProps {
  plans: Plan[]
  onSelectPlan: (plan: Plan) => void
}

export function AvailablePlans({ plans, onSelectPlan }: AvailablePlansProps): React.ReactElement {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Planes Disponibles</h2>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-8 text-center">
          <p className="text-[var(--text-muted)]">No hay planes de suscripción disponibles por el momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onSubscribe={() => onSelectPlan(plan)} />
          ))}
        </div>
      )}
    </section>
  )
}
