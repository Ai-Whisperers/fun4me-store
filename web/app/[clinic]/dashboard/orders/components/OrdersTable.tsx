'use client'

/**
 * Orders Table Component
 *
 * REF-006: Extracted orders table display
 */

import { ShoppingBag, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Order, OrdersPagination, OrderStatus } from '../types'
import { OrderStatusBadge, PaymentStatusBadge } from './OrderStatusBadge'
import { formatDate, formatCurrency } from '../utils'

interface OrdersTableProps {
  orders: Order[]
  loading: boolean
  hasFilters: boolean
  pagination: OrdersPagination
  updating: boolean
  onViewDetails: (orderId: string) => void
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void
  getNextStatus: (currentStatus: OrderStatus) => OrderStatus | null
  onPageChange: (page: number) => void
}

export function OrdersTable({
  orders,
  loading,
  hasFilters,
  pagination,
  updating,
  onViewDetails,
  onAdvanceStatus,
  getNextStatus,
  onPageChange,
}: OrdersTableProps): React.ReactElement {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Cargando pedidos...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No hay pedidos</h3>
          <p className="mt-1 text-[var(--text-secondary)]">
            {hasFilters
              ? 'No se encontraron pedidos con los filtros aplicados'
              : 'Los pedidos de la tienda aparecerán aquí'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pedido
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status)
              return (
                <tr key={order.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[var(--primary)]/10 rounded-lg p-2">
                        <ShoppingBag className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">
                          #{order.order_number}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {order.item_count} producto{order.item_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.customer ? (
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {order.customer.full_name}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {order.customer.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[var(--text-primary)]">
                      {formatCurrency(order.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[var(--text-secondary)]">
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {order.status !== 'cancelled' &&
                        order.status !== 'delivered' &&
                        nextStatus && (
                          <button
                            onClick={() => onAdvanceStatus(order.id, nextStatus)}
                            disabled={updating}
                            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                          >
                            Avanzar
                          </button>
                        )}
                      <button
                        onClick={() => onViewDetails(order.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} pedidos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-[var(--text-primary)]">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
