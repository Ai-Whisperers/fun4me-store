'use client'

/**
 * Coupon Status Badge Component
 *
 * REF-006: Extracted status badge from client component
 */

import { CheckCircle, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import type { CouponStatus } from '../types'
import { STATUS_BADGE_CONFIG } from '../constants'

interface CouponStatusBadgeProps {
  status: CouponStatus
}

const iconMap = {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
}

export function CouponStatusBadge({ status }: CouponStatusBadgeProps): React.ReactElement {
  const config = STATUS_BADGE_CONFIG[status] || STATUS_BADGE_CONFIG.inactive
  const IconComponent = iconMap[config.iconName]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <IconComponent className="h-3 w-3" />
      {config.label}
    </span>
  )
}
