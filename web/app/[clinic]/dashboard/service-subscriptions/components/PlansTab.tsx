'use client'

/**
 * Plans Tab Component
 *
 * REF-006: Extracted plans tab from client component
 */

import { RefreshCw, Package, Plus, Edit } from 'lucide-react'
import type { Plan } from '../types'
import { formatFrequency, formatPrice } from '../utils'

interface PlansTabProps {
  loading: boolean
  plans: Plan[]
  onEditPlan: (plan: Plan) => void
  onCreatePlan: () => void
}

export function PlansTab({
  loading,
  plans,
  onEditPlan,
  onCreatePlan,
}: PlansTabProps): React.ReactElement {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Planes de Suscripción</h2>
        <button
          onClick={onCreatePlan}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-8 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No hay planes creados</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border bg-[var(--bg-primary,#fff)] p-5 ${
                plan.is_active
                  ? 'border-[var(--border-light,#e5e7eb)]'
                  : 'border-dashed border-[var(--status-error,#dc2626)] opacity-60'
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{plan.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{plan.service.name}</p>
                </div>
                {plan.is_featured && (
                  <span className="rounded bg-[var(--primary-light,#e0e7ff)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                    Destacado
                  </span>
                )}
              </div>

              <div className="mb-3">
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {plan.price_per_period.toLocaleString('es-PY')}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {' '}
                  Gs/{formatFrequency(plan.billing_frequency).toLowerCase()}
                </span>
              </div>

              <ul className="mb-4 space-y-1 text-sm text-[var(--text-secondary)]">
                <li>• {plan.services_per_period} servicios por período</li>
                {plan.includes_pickup && (
                  <li>• Recogida: +{formatPrice(plan.pickup_fee)}</li>
                )}
                {plan.includes_delivery && (
                  <li>• Entrega: +{formatPrice(plan.delivery_fee)}</li>
                )}
              </ul>

              <button
                onClick={() => onEditPlan(plan)}
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
              >
                <Edit className="mr-2 inline h-4 w-4" />
                Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
