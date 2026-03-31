'use client'

/**
 * Subscription Card Component
 *
 * REF-006: Extracted from client component
 */

import { Calendar, Truck, ChevronRight, Dog, Cat } from 'lucide-react'
import type { Subscription } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatPrice } from '../utils'

interface SubscriptionCardProps {
  subscription: Subscription
  onClick: () => void
}

export function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps): React.ReactElement {
  return (
    <div
      className="cursor-pointer rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-5 transition hover:border-[var(--primary)] hover:shadow-md"
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{subscription.plan.name}</h3>
          <p className="text-sm text-[var(--text-muted)]">{subscription.plan.service.name}</p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        {subscription.pet.species === 'dog' ? (
          <Dog className="h-4 w-4 text-[var(--text-muted)]" />
        ) : (
          <Cat className="h-4 w-4 text-[var(--text-muted)]" />
        )}
        <span className="text-sm text-[var(--text-secondary)]">{subscription.pet.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-secondary)]">
            {subscription.next_service_date ? formatDate(subscription.next_service_date) : 'Sin programar'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--primary)]">{formatPrice(subscription.current_price)}</span>
        </div>
      </div>

      {(subscription.wants_pickup || subscription.wants_delivery) && (
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--border-light,#e5e7eb)] pt-3">
          <Truck className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">
            {subscription.wants_pickup && subscription.wants_delivery
              ? 'Recogida y entrega'
              : subscription.wants_pickup
                ? 'Solo recogida'
                : 'Solo entrega'}
          </span>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
      </div>
    </div>
  )
}
