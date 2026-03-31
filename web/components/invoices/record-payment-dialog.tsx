'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { recordPayment } from '@/app/actions/invoices'
import { useFormSubmit } from '@/hooks'
import {
  formatCurrency,
  paymentMethodLabels,
  type PaymentMethod,
  type RecordPaymentData,
} from '@/lib/types/invoicing'

interface RecordPaymentDialogProps {
  invoiceId: string
  amountDue: number
  isOpen: boolean
  onClose: () => void
}

export function RecordPaymentDialog({
  invoiceId,
  amountDue,
  isOpen,
  onClose,
}: RecordPaymentDialogProps) {
  const router = useRouter()
  const [amount, setAmount] = useState(amountDue.toString())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Use the new useFormSubmit hook to handle form submission
  const {
    submit,
    isSubmitting: loading,
    error,
  } = useFormSubmit(
    async (paymentData: RecordPaymentData) => {
      // recordPayment takes paymentData with invoice_id included
      const result = await recordPayment(paymentData)
      return result
    },
    {
      onSuccess: () => {
        router.refresh()
        onClose()
      },
    }
  )

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build typed payment data object
    const paymentData: RecordPaymentData = {
      invoice_id: invoiceId,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
    }

    await submit(paymentData)
  }

  const payFullAmount = () => {
    setAmount(amountDue.toString())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Registrar Pago</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100" aria-label="Cerrar registro de pago">
            <Icons.X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]">{error}</div>}

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-[var(--text-secondary)]">Saldo pendiente</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">
              {formatCurrency(amountDue)}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Monto a pagar *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                max={amountDue}
                step="1"
                required
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={payFullAmount}
                disabled={loading}
                className="hover:bg-[var(--primary)]/10 rounded-lg px-3 py-2 text-sm text-[var(--primary)]"
              >
                Total
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Método de pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)]"
            >
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Número de referencia
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={loading}
                placeholder="Número de transacción, cheque, etc."
                className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)]"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full resize-none rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-[var(--text-secondary)] hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--status-success)] px-4 py-2 font-medium text-white hover:bg-[var(--status-success)]/90 disabled:opacity-50"
            >
              {loading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.DollarSign className="h-4 w-4" />
              )}
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
