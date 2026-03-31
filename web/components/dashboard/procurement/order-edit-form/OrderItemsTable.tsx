/**
 * Order Items Table Component
 *
 * Editable table for order line items with quantity, cost, and subtotals.
 */

'use client'

import { Trash2 } from 'lucide-react'
import type { OrderItem } from './types'

interface OrderItemsTableProps {
  items: OrderItem[]
  onUpdateItem: (index: number, field: 'quantity' | 'unit_cost', value: number) => void
  onRemoveItem: (index: number) => void
  total: number
}

export function OrderItemsTable({ items, onUpdateItem, onRemoveItem, total }: OrderItemsTableProps) {
  const activeItems = items.filter((i) => !i.isDeleted)

  if (activeItems.length === 0) {
    return null
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Items de la Orden</label>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left font-medium text-gray-600">Producto</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Cantidad</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Costo Unit.</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Subtotal</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              if (item.isDeleted) return null
              return (
                <tr key={item.id || item.catalog_product_id} className="border-b border-gray-100">
                  <td className="px-4 py-2">
                    <p className="font-medium">
                      {item.product_name}
                      {item.isNew && (
                        <span className="ml-2 rounded bg-[var(--status-info-bg)] px-1.5 py-0.5 text-xs text-[var(--status-info)]">
                          Nuevo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">SKU: {item.product_sku}</p>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-right focus:border-[var(--primary)] focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => onUpdateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-right focus:border-[var(--primary)] focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₲{(item.quantity * item.unit_cost).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="rounded p-1 text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                Total:
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-[var(--primary)]">
                ₲{total.toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
