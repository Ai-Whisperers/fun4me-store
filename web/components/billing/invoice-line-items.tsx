'use client'

/**
 * Invoice Line Items Component
 *
 * Reusable table for displaying invoice line items.
 * Used in invoice detail modal and PDF generation.
 */

import type { PlatformInvoiceItem } from '@/lib/billing/types'

interface InvoiceLineItemsProps {
  items: PlatformInvoiceItem[]
  subtotal: number
  taxAmount: number
  taxRate: number
  total: number
  compact?: boolean
}

/**
 * Format currency in Paraguayan Guaranies
 */
function formatCurrency(amount: number): string {
  return `₲${amount.toLocaleString('es-PY')}`
}

/**
 * Get item type display label
 */
function getItemTypeLabel(itemType: PlatformInvoiceItem['item_type']): string {
  const labels: Record<PlatformInvoiceItem['item_type'], string> = {
    subscription: 'Suscripcion',
    store_commission: 'Comision Tienda',
    service_commission: 'Comision Servicios',
    adjustment: 'Ajuste',
    credit: 'Credito',
    late_fee: 'Cargo por Mora',
    discount: 'Descuento',
  }
  return labels[itemType] || itemType
}

export function InvoiceLineItems({
  items,
  subtotal,
  taxAmount,
  taxRate,
  total,
  compact = false,
}: InvoiceLineItemsProps): React.ReactElement {
  if (compact) {
    return (
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
              {item.quantity > 1 && (
                <p className="text-xs text-[var(--text-muted)]">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </p>
              )}
            </div>
            <span className="font-medium text-[var(--text-primary)]">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}

        {/* Totals */}
        <div className="space-y-2 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">Subtotal</span>
            <span className="text-[var(--text-primary)]">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">IVA ({Math.round(taxRate * 100)}%)</span>
            <span className="text-[var(--text-primary)]">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold">
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <table className="w-full">
        <thead className="bg-[var(--bg-subtle)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Descripcion
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Cantidad
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Precio Unit.
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <tr key={item.id} className="bg-[var(--bg-paper)]">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {getItemTypeLabel(item.item_type)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                {item.quantity}
              </td>
              <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[var(--bg-subtle)]">
          <tr>
            <td colSpan={3} className="px-4 py-2 text-right text-sm text-[var(--text-muted)]">
              Subtotal
            </td>
            <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">
              {formatCurrency(subtotal)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="px-4 py-2 text-right text-sm text-[var(--text-muted)]">
              IVA ({Math.round(taxRate * 100)}%)
            </td>
            <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">
              {formatCurrency(taxAmount)}
            </td>
          </tr>
          <tr className="border-t-2 border-[var(--border)]">
            <td colSpan={3} className="px-4 py-3 text-right text-base font-semibold text-[var(--text-primary)]">
              Total
            </td>
            <td className="px-4 py-3 text-right text-lg font-bold text-[var(--primary)]">
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
