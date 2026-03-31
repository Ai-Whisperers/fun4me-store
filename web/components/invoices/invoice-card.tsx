'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { StatusBadge } from './status-badge'
import { formatCurrency, formatDate, type Invoice } from '@/lib/types/invoicing'

interface InvoiceCardProps {
  invoice: Invoice
  clinic: string
}

export function InvoiceCard({ invoice, clinic }: InvoiceCardProps) {
  const petName = invoice.pets?.name || 'Sin mascota'
  const ownerName = invoice.pets?.owner?.full_name || 'Cliente desconocido'

  return (
    <Link
      href={`/${clinic}/dashboard/invoices/${invoice.id}`}
      className="block rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Invoice Number & Date */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Icons.FileText className="h-4 w-4 text-[var(--primary)]" />
            <span className="font-bold text-[var(--text-primary)]">{invoice.invoice_number}</span>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{formatDate(invoice.created_at)}</p>
        </div>

        {/* Client & Pet */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--text-primary)]">{ownerName}</p>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            <Icons.PawPrint className="mr-1 inline h-3 w-3" />
            {petName}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right">
          <p className="font-bold text-[var(--text-primary)]">{formatCurrency(invoice.total)}</p>
          {invoice.amount_due > 0 && invoice.status !== 'draft' && (
            <p className="text-sm text-[var(--status-warning)]">
              Pendiente: {formatCurrency(invoice.amount_due)}
            </p>
          )}
          {invoice.status === 'paid' && <p className="text-sm text-[var(--status-success)]">Pagado</p>}
        </div>

        {/* Arrow */}
        <div className="hidden md:block">
          <Icons.ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}
