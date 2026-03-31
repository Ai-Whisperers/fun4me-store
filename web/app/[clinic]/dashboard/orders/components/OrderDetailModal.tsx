'use client'

/**
 * Order Detail Modal Component
 *
 * REF-006: Extracted order detail view
 */

import {
  X,
  User,
  Phone,
  Mail,
  Package,
  Truck,
  FileText,
} from 'lucide-react'
import type { Order, OrderItem, OrderStatus } from '../types'
import { OrderStatusBadge, PaymentStatusBadge } from './OrderStatusBadge'
import { formatDate, formatCurrency } from '../utils'
import { STATUS_CONFIG } from '../constants'

interface OrderDetailModalProps {
  order: Order
  items: OrderItem[]
  updating: boolean
  onClose: () => void
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void
  onCancel: (orderId: string, reason: string) => void
  getNextStatus: (currentStatus: OrderStatus) => OrderStatus | null
}

export function OrderDetailModal({
  order,
  items,
  updating,
  onClose,
  onAdvanceStatus,
  onCancel,
  getNextStatus,
}: OrderDetailModalProps): React.ReactElement {
  const nextStatus = getNextStatus(order.status)

  const getNextStatusLabel = (status: OrderStatus | null): string => {
    if (!status) return ''
    return STATUS_CONFIG[status]?.label || status
  }

  const handleCancel = (): void => {
    const reason = prompt('Razón de cancelación:')
    if (reason) {
      onCancel(order.id, reason)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Pedido #{order.order_number}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {formatDate(order.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Status and Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="ml-auto flex items-center gap-2">
                {nextStatus && (
                  <button
                    onClick={() => onAdvanceStatus(order.id, nextStatus)}
                    disabled={updating}
                    className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {updating ? 'Actualizando...' : `Marcar como ${getNextStatusLabel(nextStatus)}`}
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Customer Info */}
          {order.customer && (
            <div className="rounded-xl bg-gray-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <User className="h-4 w-4" />
                Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{order.customer.full_name}</p>
                <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Mail className="h-4 w-4" />
                  {order.customer.email}
                </p>
                {order.customer.phone && (
                  <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone className="h-4 w-4" />
                    {order.customer.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <Package className="h-4 w-4" />
              Productos ({items.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                      Cant.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product?.name || ''}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.product?.name}</p>
                            <p className="text-xs text-gray-500">{item.product?.sku}</p>
                            {item.requires_prescription && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
                                <FileText className="h-3 w-3" />
                                Receta
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.shipping_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Envío</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Impuestos</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.customer_notes || order.internal_notes) && (
            <div className="space-y-3">
              {order.customer_notes && (
                <div className="rounded-xl bg-blue-50 p-4">
                  <h4 className="mb-1 font-medium text-blue-700">Notas del Cliente</h4>
                  <p className="text-sm text-blue-600">{order.customer_notes}</p>
                </div>
              )}
              {order.internal_notes && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <h4 className="mb-1 font-medium text-gray-700">Notas Internas</h4>
                  <p className="text-sm text-gray-600">{order.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Info */}
          {order.status === 'cancelled' && (
            <div className="rounded-xl bg-red-50 p-4">
              <h4 className="mb-1 font-medium text-red-700">Pedido Cancelado</h4>
              <p className="text-sm text-red-600">
                {order.cancelled_at && `Fecha: ${formatDate(order.cancelled_at)}`}
              </p>
              {order.cancellation_reason && (
                <p className="mt-1 text-sm text-red-600">
                  Razón: {order.cancellation_reason}
                </p>
              )}
            </div>
          )}

          {/* Tracking */}
          {order.tracking_number && (
            <div className="rounded-xl bg-cyan-50 p-4">
              <h4 className="mb-1 flex items-center gap-2 font-medium text-cyan-700">
                <Truck className="h-4 w-4" />
                Seguimiento
              </h4>
              <p className="text-sm text-cyan-600">Número: {order.tracking_number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
