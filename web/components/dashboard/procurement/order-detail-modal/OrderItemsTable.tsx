/**
 * Order Items Table Component
 *
 * Table of order line items with receiving mode support.
 */

'use client'

import type { PurchaseOrderItem, OrderStatus } from './types'

interface OrderItemsTableProps {
  items: PurchaseOrderItem[]
  status: OrderStatus
  subtotal: number
  taxAmount: number
  total: number
  receivingMode: boolean
  receivedQuantities: Record<string, number>
  onReceivedQuantityChange: (itemId: string, quantity: number) => void
}

export function OrderItemsTable({
  items,
  status,
  subtotal,
  taxAmount,
  total,
  receivingMode,
  receivedQuantities,
  onReceivedQuantityChange,
}: OrderItemsTableProps) {
  const showReceivedColumn = status === 'shipped' || receivingMode
  const colSpan = showReceivedColumn ? 3 : 2

  return (
    <div>
      <h3 className="mb-3 font-medium text-[var(--text-primary)]">Items de la Orden</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Cantidad</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Costo Unit.</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
              {showReceivedColumn && (
                <th className="px-4 py-3 text-right font-medium text-gray-600">Recibido</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.store_products?.name || 'Producto'}</p>
                  <p className="text-xs text-gray-500">SKU: {item.store_products?.sku || '-'}</p>
                </td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">₲{item.unit_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-medium">
                  ₲{item.line_total.toLocaleString()}
                </td>
                {showReceivedColumn && (
                  <td className="px-4 py-3 text-right">
                    {receivingMode ? (
                      <input
                        type="number"
                        value={receivedQuantities[item.id] || 0}
                        onChange={(e) =>
                          onReceivedQuantityChange(
                            item.id,
                            Math.min(parseInt(e.target.value) || 0, item.quantity)
                          )
                        }
                        min="0"
                        max={item.quantity}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-right focus:border-[var(--primary)] focus:outline-none"
                      />
                    ) : (
                      <span
                        className={
                          item.received_quantity >= item.quantity
                            ? 'text-[var(--status-success)]'
                            : item.received_quantity > 0
                              ? 'text-[var(--status-warning)]'
                              : 'text-gray-500'
                        }
                      >
                        {item.received_quantity}/{item.quantity}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={colSpan} className="px-4 py-3 text-right font-medium">
                Subtotal:
              </td>
              <td className="px-4 py-3 text-right font-medium">₲{subtotal.toLocaleString()}</td>
              {showReceivedColumn && <td />}
            </tr>
            {taxAmount > 0 && (
              <tr className="bg-gray-50">
                <td colSpan={colSpan} className="px-4 py-3 text-right font-medium">
                  IVA:
                </td>
                <td className="px-4 py-3 text-right">₲{taxAmount.toLocaleString()}</td>
                {showReceivedColumn && <td />}
              </tr>
            )}
            <tr className="bg-gray-50">
              <td colSpan={colSpan} className="px-4 py-3 text-right text-lg font-bold">
                Total:
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-[var(--primary)]">
                ₲{total.toLocaleString()}
              </td>
              {showReceivedColumn && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
