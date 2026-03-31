'use client'

/**
 * Plan Card Component
 *
 * REF-006: Extracted from client component
 */

import { Plus, CheckCircle, Clock, Truck, MapPin, Dog, Cat } from 'lucide-react'
import type { Plan } from '../types'
import { formatFrequency, formatPrice } from '../utils'

interface PlanCardProps {
  plan: Plan
  onSubscribe: () => void
}

export function PlanCard({ plan, onSubscribe }: PlanCardProps): React.ReactElement {
  return (
    <div
      className={`relative rounded-xl border bg-[var(--bg-primary,#fff)] p-5 transition hover:shadow-md ${
        plan.is_featured
          ? 'border-[var(--primary)] ring-2 ring-[var(--primary)] ring-opacity-20'
          : 'border-[var(--border-light,#e5e7eb)]'
      }`}
    >
      {plan.is_featured && (
        <span className="absolute -top-3 right-4 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-medium text-white">
          Popular
        </span>
      )}

      <div className="mb-3">
        <h3 className="font-semibold text-[var(--text-primary)]">{plan.name}</h3>
        <p className="text-sm text-[var(--text-muted)]">{plan.service.name}</p>
      </div>

      {plan.description && (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{plan.description}</p>
      )}

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[var(--text-primary)]">
            {plan.price_per_period.toLocaleString('es-PY')}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            Gs/{formatFrequency(plan.billing_frequency).toLowerCase()}
          </span>
        </div>

        {plan.first_month_discount > 0 && (
          <span className="text-sm text-[var(--status-success,#16a34a)]">
            {plan.first_month_discount}% desc. primer mes
          </span>
        )}
      </div>

      <ul className="mb-4 space-y-2 text-sm text-[var(--text-secondary)]">
        <li className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-[var(--status-success,#16a34a)]" />
          {plan.services_per_period} {plan.services_per_period === 1 ? 'servicio' : 'servicios'} por período
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--text-muted)]" />
          {plan.service.duration_minutes} min por sesión
        </li>
        {plan.includes_pickup && (
          <li className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[var(--text-muted)]" />
            Recogida a domicilio
            {plan.pickup_fee > 0 && ` (+${formatPrice(plan.pickup_fee)})`}
          </li>
        )}
        {plan.includes_delivery && (
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
            Entrega a domicilio
            {plan.delivery_fee > 0 && ` (+${formatPrice(plan.delivery_fee)})`}
          </li>
        )}
      </ul>

      <div className="mb-4 flex items-center gap-1">
        {plan.species_allowed.map((sp) =>
          sp === 'dog' ? (
            <Dog key={sp} className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <Cat key={sp} className="h-4 w-4 text-[var(--text-muted)]" />
          )
        )}
        {plan.max_pet_weight_kg && (
          <span className="text-xs text-[var(--text-muted)]">Hasta {plan.max_pet_weight_kg}kg</span>
        )}
      </div>

      <button
        onClick={onSubscribe}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:brightness-110"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        Suscribirse
      </button>
    </div>
  )
}
