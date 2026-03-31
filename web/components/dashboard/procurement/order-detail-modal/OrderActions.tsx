/**
 * Order Actions Component
 *
 * Action buttons for order status management.
 */

'use client'

import { Package, CheckCircle, Send, Loader2 } from 'lucide-react'
import type { OrderStatus, TimelineStatus } from './types'

interface OrderActionsProps {
  status: OrderStatus
  receivingMode: boolean
  isPending: boolean
  nextStatus: TimelineStatus | null
  nextStatusLabel: string
  onStatusChange: (status: string) => void
  onEnterReceivingMode: () => void
  onExitReceivingMode: () => void
}

export function OrderActions({
  status,
  receivingMode,
  isPending,
  nextStatus,
  nextStatusLabel,
  onStatusChange,
  onEnterReceivingMode,
  onExitReceivingMode,
}: OrderActionsProps) {
  // Don't show actions for terminal states
  if (status === 'received' || status === 'cancelled') {
    return null
  }

  return (
    <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
      {/* Cancel Button */}
      <button
        onClick={() => onStatusChange('cancelled')}
        disabled={isPending}
        className="rounded-lg border border-[var(--status-error)] px-4 py-2 font-medium text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50"
      >
        Cancelar Orden
      </button>

      {/* Enter Receiving Mode Button (for shipped orders) */}
      {status === 'shipped' && !receivingMode && (
        <button
          onClick={onEnterReceivingMode}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
        >
          <Package className="h-4 w-4" />
          Recibir Orden
        </button>
      )}

      {/* Receiving Mode Actions */}
      {receivingMode && (
        <>
          <button
            onClick={onExitReceivingMode}
            className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onStatusChange('received')}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--status-success)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle className="h-4 w-4" />
            Confirmar Recepción
          </button>
        </>
      )}

      {/* Next Status Button */}
      {!receivingMode && nextStatus && status !== 'shipped' && (
        <button
          onClick={() => onStatusChange(nextStatus)}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'draft' && <Send className="h-4 w-4" />}
          {nextStatusLabel}
        </button>
      )}
    </div>
  )
}
