/**
 * Order Status Timeline Component
 *
 * Visual timeline showing order progress through statuses.
 */

'use client'

import { XCircle } from 'lucide-react'
import { STATUS_CONFIG, STATUS_TIMELINE, formatDate } from './types'
import type { OrderStatus, TimelineStatus } from './types'

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  cancelledAt: string | null
}

export function OrderStatusTimeline({ currentStatus, cancelledAt }: OrderStatusTimelineProps) {
  const isCancelled = currentStatus === 'cancelled'

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="mb-4 font-medium text-[var(--text-primary)]">Estado de la Orden</h3>
      <div className="flex items-center justify-between">
        {STATUS_TIMELINE.map((status, index) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const isCurrent = currentStatus === status
          const isPast = STATUS_TIMELINE.indexOf(currentStatus as TimelineStatus) > index

          return (
            <div key={status} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isCancelled
                      ? 'bg-gray-200 text-gray-400'
                      : isPast || isCurrent
                        ? `${config.bg} ${config.color}`
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`mt-2 text-xs ${isCurrent ? 'font-semibold' : ''}`}>
                  {config.label}
                </span>
              </div>
              {index < STATUS_TIMELINE.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isPast ? 'bg-[var(--status-success)]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {isCancelled && (
        <div className="mt-4 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
          <XCircle className="mb-1 inline h-4 w-4" /> Orden cancelada el {formatDate(cancelledAt)}
        </div>
      )}
    </div>
  )
}
