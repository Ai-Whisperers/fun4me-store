'use client'

/**
 * Subscription Detail Modal Component
 *
 * REF-006: Extracted subscription detail modal from client component
 */

import { X, User, Dog, Cat } from 'lucide-react'
import type { Subscription } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatPrice } from '../utils'

interface SubscriptionDetailModalProps {
  subscription: Subscription
  onClose: () => void
}

export function SubscriptionDetailModal({
  subscription,
  onClose,
}: SubscriptionDetailModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Detalle de Suscripción</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="font-medium text-[var(--text-primary)]">
                {subscription.customer.full_name}
              </span>
            </div>
            {subscription.customer.phone && (
              <p className="mb-1 text-sm text-[var(--text-muted)]">{subscription.customer.phone}</p>
            )}
            <p className="text-sm text-[var(--text-muted)]">{subscription.customer.email}</p>
          </div>

          <div className="rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
            <div className="flex items-center gap-2">
              {subscription.pet.species === 'dog' ? (
                <Dog className="h-4 w-4 text-[var(--text-muted)]" />
              ) : (
                <Cat className="h-4 w-4 text-[var(--text-muted)]" />
              )}
              <span className="font-medium text-[var(--text-primary)]">{subscription.pet.name}</span>
              {subscription.pet.breed && (
                <span className="text-sm text-[var(--text-muted)]">{subscription.pet.breed}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{subscription.plan.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{subscription.plan.service.name}</p>
            </div>
            <StatusBadge status={subscription.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Precio mensual</p>
              <p className="font-medium text-[var(--text-primary)]">
                {formatPrice(subscription.current_price)}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Servicios usados</p>
              <p className="font-medium text-[var(--text-primary)]">
                {subscription.total_services_used}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Próximo servicio</p>
              <p className="font-medium text-[var(--text-primary)]">
                {subscription.next_service_date ? formatDate(subscription.next_service_date) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Restantes</p>
              <p className="font-medium text-[var(--text-primary)]">
                {subscription.services_remaining_this_period}
              </p>
            </div>
          </div>

          {(subscription.wants_pickup || subscription.wants_delivery) && (
            <div className="rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
              <h4 className="mb-2 font-medium text-[var(--text-primary)]">Transporte</h4>
              {subscription.wants_pickup && subscription.pickup_address && (
                <div className="mb-2 text-sm">
                  <p className="text-[var(--text-muted)]">Recogida:</p>
                  <p className="text-[var(--text-secondary)]">{subscription.pickup_address}</p>
                </div>
              )}
              {subscription.wants_delivery && subscription.delivery_address && (
                <div className="text-sm">
                  <p className="text-[var(--text-muted)]">Entrega:</p>
                  <p className="text-[var(--text-secondary)]">{subscription.delivery_address}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
