'use client'

/**
 * Subscriptions Tab Component
 *
 * REF-006: Extracted subscriptions tab from client component
 */

import { Search, RefreshCw, Eye, ChevronLeft, ChevronRight, Dog, Cat } from 'lucide-react'
import type { Subscription, SubscriptionsPagination } from '../types'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatPrice } from '../utils'

interface SubscriptionsTabProps {
  loading: boolean
  subscriptions: Subscription[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  statusFilter: string
  setStatusFilter: (s: string) => void
  pagination: SubscriptionsPagination
  setPagination: React.Dispatch<React.SetStateAction<SubscriptionsPagination>>
  setSelectedSubscription: (s: Subscription) => void
}

export function SubscriptionsTab({
  loading,
  subscriptions,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  pagination,
  setPagination,
  setSelectedSubscription,
}: SubscriptionsTabProps): React.ReactElement {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por cliente, mascota o plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="paused">Pausadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-8 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)]">No hay suscripciones</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-light,#e5e7eb)] bg-[var(--bg-secondary,#f9fafb)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                  Mascota
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                  Próximo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--text-muted)]">
                  Precio
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light,#e5e7eb)]">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="transition hover:bg-[var(--bg-secondary,#f9fafb)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)]">{sub.customer.full_name}</p>
                    {sub.customer.phone && (
                      <p className="text-xs text-[var(--text-muted)]">{sub.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {sub.pet.species === 'dog' ? (
                        <Dog className="h-4 w-4 text-[var(--text-muted)]" />
                      ) : (
                        <Cat className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                      <span className="text-[var(--text-secondary)]">{sub.pet.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[var(--text-secondary)]">{sub.plan.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {sub.next_service_date ? formatDate(sub.next_service_date) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                    {formatPrice(sub.current_price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedSubscription(sub)}
                      className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--primary)]"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total > pagination.limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Mostrando {pagination.offset + 1}-
            {Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
              }
              disabled={pagination.offset === 0}
              className="rounded-lg border border-[var(--border-light,#e5e7eb)] p-2 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="rounded-lg border border-[var(--border-light,#e5e7eb)] p-2 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
