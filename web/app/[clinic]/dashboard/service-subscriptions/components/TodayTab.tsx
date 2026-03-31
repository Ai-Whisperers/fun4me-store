'use client'

/**
 * Today Tab Component
 *
 * REF-006: Extracted today/transport tab from client component
 */

import { RefreshCw, Truck, MapPin, Dog, Cat, Phone } from 'lucide-react'
import type { UpcomingService } from '../types'

interface TodayTabProps {
  loading: boolean
  upcomingServices: UpcomingService[]
}

export function TodayTab({ loading, upcomingServices }: TodayTabProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (upcomingServices.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-8 text-center">
        <Truck className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)]">
          No hay recogidas ni entregas programadas para hoy
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {upcomingServices.map((service) => (
        <div
          key={service.instance_id}
          className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-5"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{service.customer_name}</h3>
              <p className="text-sm text-[var(--text-muted)]">{service.plan_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {service.pickup_status === 'pending' && (
                <span className="rounded bg-[var(--status-warning-bg,#fef3c7)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning,#d97706)]">
                  Recoger
                </span>
              )}
              {service.delivery_status === 'pending' && (
                <span className="rounded bg-[var(--primary-light,#e0e7ff)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                  Entregar
                </span>
              )}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {service.pet_species === 'dog' ? (
              <Dog className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <Cat className="h-4 w-4 text-[var(--text-muted)]" />
            )}
            <span>{service.pet_name}</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span>{service.service_name}</span>
          </div>

          {service.pickup_address && (
            <div className="mb-2 flex items-start gap-2 text-sm">
              <Truck className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Recogida:</p>
                <p className="text-[var(--text-secondary)]">{service.pickup_address}</p>
              </div>
            </div>
          )}

          {service.delivery_address && (
            <div className="mb-3 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Entrega:</p>
                <p className="text-[var(--text-secondary)]">{service.delivery_address}</p>
              </div>
            </div>
          )}

          {service.customer_phone && (
            <a
              href={`tel:${service.customer_phone}`}
              className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
            >
              <Phone className="h-4 w-4" />
              {service.customer_phone}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
