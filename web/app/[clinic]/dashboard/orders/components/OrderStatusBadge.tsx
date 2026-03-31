'use client'

/**
 * Order Status Badge Components
 *
 * REF-006: Extracted status display components
 */

import {
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '../constants'

interface StatusBadgeProps {
  status: string
}

export function OrderStatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    confirmed: <CheckCircle className="h-3 w-3" />,
    processing: <RefreshCw className="h-3 w-3" />,
    ready: <Package className="h-3 w-3" />,
    shipped: <Truck className="h-3 w-3" />,
    delivered: <CheckCircle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
    refunded: <RefreshCw className="h-3 w-3" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {icons[status] || icons.pending}
      {config.label}
    </span>
  )
}

export function PaymentStatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <CreditCard className="h-3 w-3" />
      {config.label}
    </span>
  )
}
