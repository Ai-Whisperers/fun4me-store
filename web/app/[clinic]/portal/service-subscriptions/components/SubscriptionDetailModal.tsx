'use client'

/**
 * Subscription Detail Modal Component
 *
 * REF-006: Extracted from client component
 */

import { X, Dog, Cat, Truck, MapPin, Star, Pause, Play } from 'lucide-react'
import type { Subscription } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatPrice, getDayName, getTimeSlotLabel } from '../utils'

interface SubscriptionDetailModalProps {
  subscription: Subscription
  onClose: () => void
  onToggleStatus: () => void
  onCancel: () => void
}

export function SubscriptionDetailModal({
  subscription,
  onClose,
  onToggleStatus,
  onCancel,
}: SubscriptionDetailModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{subscription.plan.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{subscription.plan.service.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status & Pet */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {subscription.pet.species === 'dog' ? (
              <Dog className="h-5 w-5 text-[var(--text-muted)]" />
            ) : (
              <Cat className="h-5 w-5 text-[var(--text-muted)]" />
            )}
            <span className="font-medium text-[var(--text-primary)]">{subscription.pet.name}</span>
          </div>
          <StatusBadge status={subscription.status} />
        </div>

        {/* Details Grid */}
        <div className="mb-6 grid gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Precio actual</span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatPrice(subscription.current_price)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Próximo servicio</span>
            <span className="font-medium text-[var(--text-primary)]">
              {subscription.next_service_date ? formatDate(subscription.next_service_date) : 'Sin programar'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Servicios restantes</span>
            <span className="font-medium text-[var(--text-primary)]">
              {subscription.services_remaining_this_period}
            </span>
          </div>

          {subscription.preferred_day_of_week !== null && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Día preferido</span>
              <span className="font-medium text-[var(--text-primary)]">
                {getDayName(subscription.preferred_day_of_week)}
              </span>
            </div>
          )}

          {subscription.preferred_time_slot && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Horario preferido</span>
              <span className="font-medium text-[var(--text-primary)]">
                {getTimeSlotLabel(subscription.preferred_time_slot)}
              </span>
            </div>
          )}
        </div>

        {/* Pickup/Delivery Info */}
        {(subscription.wants_pickup || subscription.wants_delivery) && (
          <div className="mb-6 rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
            <h4 className="mb-2 font-medium text-[var(--text-primary)]">Transporte</h4>
            {subscription.wants_pickup && subscription.pickup_address && (
              <div className="mb-2 flex items-start gap-2 text-sm">
                <Truck className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-[var(--text-muted)]">Recogida:</p>
                  <p className="text-[var(--text-secondary)]">{subscription.pickup_address}</p>
                </div>
              </div>
            )}
            {subscription.wants_delivery && subscription.delivery_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-[var(--text-muted)]">Entrega:</p>
                  <p className="text-[var(--text-secondary)]">{subscription.delivery_address}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Instances */}
        {subscription.instances.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 font-medium text-[var(--text-primary)]">Servicios Recientes</h4>
            <div className="space-y-2">
              {subscription.instances.slice(0, 5).map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-light,#e5e7eb)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDate(instance.scheduled_date)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{instance.status}</p>
                  </div>
                  {instance.customer_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{instance.customer_rating}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {subscription.status !== 'cancelled' && (
          <div className="flex gap-3">
            <button
              onClick={onToggleStatus}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-light,#e5e7eb)] px-4 py-2 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
            >
              {subscription.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Reanudar
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--status-error,#dc2626)] px-4 py-2 font-medium text-[var(--status-error,#dc2626)] transition hover:bg-[var(--status-error-bg,#fef2f2)]"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
