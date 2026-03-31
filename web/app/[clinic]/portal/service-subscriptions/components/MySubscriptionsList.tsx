'use client'

/**
 * My Subscriptions List Component
 *
 * REF-006: Extracted from client component
 */

import { RefreshCw } from 'lucide-react'
import type { Subscription } from '../types'
import { SubscriptionCard } from './SubscriptionCard'

interface MySubscriptionsListProps {
  subscriptions: Subscription[]
  onSelectSubscription: (sub: Subscription) => void
}

export function MySubscriptionsList({
  subscriptions,
  onSelectSubscription,
}: MySubscriptionsListProps): React.ReactElement {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Mis Suscripciones</h2>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-8 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mb-2 font-semibold text-[var(--text-primary)]">No tienes suscripciones activas</h3>
          <p className="mb-4 text-[var(--text-muted)]">
            Suscríbete a un plan para recibir servicios recurrentes con recogida y entrega a domicilio.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onClick={() => onSelectSubscription(sub)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
