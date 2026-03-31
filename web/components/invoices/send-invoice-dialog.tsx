'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { sendInvoice } from '@/app/actions/invoices'
import { formatCurrency } from '@/lib/types/invoicing'

interface SendInvoiceDialogProps {
  invoiceId: string
  invoiceNumber: string
  total: number
  clientEmail?: string
  clientName?: string
  isOpen: boolean
  onClose: () => void
}

export function SendInvoiceDialog({
  invoiceId,
  invoiceNumber,
  total,
  clientEmail,
  clientName,
  isOpen,
  onClose,
}: SendInvoiceDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSend = async () => {
    setLoading(true)
    setError(null)

    const result = await sendInvoice(invoiceId)

    if (!result.success) {
      setError(result.error || 'Error al enviar')
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Enviar Factura</h2>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100" aria-label="Cerrar diálogo">
            <Icons.X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          {/* Invoice Preview */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Factura</span>
              <span className="font-medium">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Total</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-1 text-sm text-[var(--text-secondary)]">Enviar a:</p>
            {clientEmail ? (
              <div className="flex items-center gap-2">
                <Icons.Mail className="h-4 w-4 text-[var(--primary)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{clientName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{clientEmail}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <Icons.AlertTriangle className="h-4 w-4" />
                <p className="text-sm">El cliente no tiene email registrado</p>
              </div>
            )}
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Se enviará un correo electrónico al cliente con los detalles de la factura y un enlace
            para verla en el portal.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-[var(--text-secondary)] hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !clientEmail}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.Send className="h-4 w-4" />
            )}
            Enviar factura
          </button>
        </div>
      </div>
    </div>
  )
}
