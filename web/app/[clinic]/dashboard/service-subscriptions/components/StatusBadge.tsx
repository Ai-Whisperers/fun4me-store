'use client'

/**
 * Status Badge Component
 *
 * REF-006: Extracted status badge from client component
 */

import { getStatusStyles, getStatusLabel } from '../utils'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}
