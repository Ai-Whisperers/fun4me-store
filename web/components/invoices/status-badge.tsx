'use client'

import { invoiceStatusConfig, type InvoiceStatus } from '@/lib/types/invoicing'

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = invoiceStatusConfig[status] || invoiceStatusConfig.draft

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${config.className} ${className}`}>
      {config.label}
    </span>
  )
}
