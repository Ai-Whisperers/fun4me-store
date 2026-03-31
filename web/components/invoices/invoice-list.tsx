'use client'

import { InvoiceCard } from './invoice-card'
import { StatusFilter } from './status-filter'
import type { Invoice } from '@/lib/types/invoicing'
import * as Icons from 'lucide-react'

interface InvoiceListProps {
  invoices: Invoice[]
  pagination: {
    total: number
    page: number
    limit: number
  }
  clinic: string
  currentStatus?: string
}

export function InvoiceList({ invoices, pagination, clinic, currentStatus }: InvoiceListProps) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <StatusFilter currentStatus={currentStatus || 'all'} clinic={clinic} />
      </div>

      {/* List */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <Icons.FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">No hay facturas</h3>
          <p className="text-[var(--text-secondary)]">
            {currentStatus && currentStatus !== 'all'
              ? 'No hay facturas con este estado.'
              : 'Crea tu primera factura para comenzar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} clinic={clinic} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <a
              key={page}
              href={`/${clinic}/dashboard/invoices?status=${currentStatus || 'all'}&page=${page}`}
              className={`rounded-lg px-3 py-1 text-sm ${
                page === pagination.page
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
