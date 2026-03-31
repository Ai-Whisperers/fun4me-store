/**
 * Order Detail Modal Component
 *
 * Main orchestrator for viewing and managing procurement orders.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ReceiptText, AlertCircle } from 'lucide-react'
import { useOrderDetailData } from './use-order-detail-data'
import { OrderStatusTimeline } from './OrderStatusTimeline'
import { OrderInfoGrid } from './OrderInfoGrid'
import { OrderItemsTable } from './OrderItemsTable'
import { OrderActions } from './OrderActions'
import type { OrderDetailModalProps, PurchaseOrderItem } from './types'

export function OrderDetailModal({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderDetailModalProps): React.ReactElement | null {
  // Receiving state
  const [receivingMode, setReceivingMode] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})

  // Data hook
  const { order, isLoading, error, statusMutation, getNextStatus, getNextStatusLabel } =
    useOrderDetailData({ orderId, isOpen, onOrderUpdated: handleOrderUpdated })

  function handleOrderUpdated() {
    setReceivingMode(false)
    onOrderUpdated()
  }

  // Initialize received quantities when order data changes
  useEffect(() => {
    if (order?.purchase_order_items) {
      const quantities: Record<string, number> = {}
      order.purchase_order_items.forEach((item: PurchaseOrderItem) => {
        quantities[item.id] = item.received_quantity
      })
      setReceivedQuantities(quantities)
    }
  }, [order])

  // Reset receiving mode when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReceivingMode(false)
    }
  }, [isOpen, orderId])

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    if (!order) return

    const params: {
      status: string
      received_items?: { item_id: string; received_quantity: number }[]
    } = { status: newStatus }

    // Include received quantities when receiving
    if (newStatus === 'received') {
      params.received_items = Object.entries(receivedQuantities).map(([itemId, qty]) => ({
        item_id: itemId,
        received_quantity: qty,
      }))
    }

    statusMutation.mutate(params)
  }

  // Handle received quantity update
  const handleReceivedQuantityChange = (itemId: string, quantity: number) => {
    setReceivedQuantities((prev) => ({ ...prev, [itemId]: quantity }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <ReceiptText className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {isLoading ? 'Cargando...' : order?.order_number || 'Orden de Compra'}
              </h2>
              <p className="text-sm text-gray-500">Detalles de la orden</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Cerrar">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : error ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center">
              <AlertCircle className="mb-4 h-12 w-12 text-[var(--status-error)]" />
              <p className="text-[var(--status-error)]">Error al cargar los detalles de la orden</p>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Status Timeline */}
              <OrderStatusTimeline
                currentStatus={order.status}
                cancelledAt={order.cancelled_at}
              />

              {/* Order Info Grid */}
              <OrderInfoGrid order={order} />

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-medium text-[var(--text-primary)]">
                    Dirección de Entrega
                  </h3>
                  <p className="text-sm text-gray-600">{order.shipping_address}</p>
                </div>
              )}

              {/* Items Table */}
              <OrderItemsTable
                items={order.purchase_order_items}
                status={order.status}
                subtotal={order.subtotal}
                taxAmount={order.tax_amount}
                total={order.total}
                receivingMode={receivingMode}
                receivedQuantities={receivedQuantities}
                onReceivedQuantityChange={handleReceivedQuantityChange}
              />

              {/* Notes */}
              {order.notes && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-medium text-[var(--text-primary)]">Notas</h3>
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              )}

              {/* Actions */}
              <OrderActions
                status={order.status}
                receivingMode={receivingMode}
                isPending={statusMutation.isPending}
                nextStatus={getNextStatus()}
                nextStatusLabel={getNextStatusLabel()}
                onStatusChange={handleStatusChange}
                onEnterReceivingMode={() => setReceivingMode(true)}
                onExitReceivingMode={() => setReceivingMode(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
