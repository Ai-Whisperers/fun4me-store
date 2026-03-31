'use client'

import { formatCurrency, calculateInvoiceTotals, InvoiceItem } from '@/lib/types/invoicing'

interface LineItem {
  line_total: number
}

interface TotalsSummaryProps {
  // Option 1: Pass items and calculate totals
  items?: LineItem[]
  // Option 2: Pass pre-calculated totals
  subtotal?: number
  taxRate?: number
  taxAmount?: number
  total?: number
  amountPaid?: number
  amountDue?: number
}

export function TotalsSummary(props: TotalsSummaryProps) {
  let subtotal: number
  let taxAmount: number
  let total: number
  let amountDue: number
  const taxRate = props.taxRate || 10
  const amountPaid = props.amountPaid || 0

  if (props.items) {
    // Calculate from items
    const calculated = calculateInvoiceTotals(
      props.items.map(
        (i) => ({ ...i, description: '', quantity: 1, unit_price: 0 }) as InvoiceItem
      ),
      taxRate
    )
    subtotal = calculated.subtotal
    taxAmount = calculated.taxAmount
    total = calculated.total
    amountDue = total - amountPaid
  } else {
    // Use pre-calculated values
    subtotal = props.subtotal || 0
    taxAmount = props.taxAmount || 0
    total = props.total || 0
    amountDue = props.amountDue !== undefined ? props.amountDue : total - amountPaid
  }

  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-4">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">Subtotal</span>
        <span className="text-[var(--text-primary)]">{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">IVA ({taxRate}%)</span>
        <span className="text-[var(--text-primary)]">{formatCurrency(taxAmount)}</span>
      </div>

      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="flex justify-between font-bold">
          <span className="text-[var(--text-primary)]">Total</span>
          <span className="text-[var(--text-primary)]">{formatCurrency(total)}</span>
        </div>
      </div>

      {amountPaid > 0 && (
        <>
          <div className="flex justify-between text-sm text-green-600">
            <span>Pagado</span>
            <span>-{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between font-bold text-orange-600">
            <span>Saldo Pendiente</span>
            <span>{formatCurrency(amountDue)}</span>
          </div>
        </>
      )}
    </div>
  )
}
