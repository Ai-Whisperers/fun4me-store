'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { StatusBadge } from './status-badge'
import { RecordPaymentDialog } from './record-payment-dialog'
import { SendInvoiceDialog } from './send-invoice-dialog'
import { InvoicePDFButton } from './invoice-pdf'
import { voidInvoice } from '@/app/actions/invoices'
import {
  formatCurrency,
  formatDate,
  canEditInvoice,
  canSendInvoice,
  canRecordPayment,
  canVoidInvoice,
  paymentMethodLabels,
  type Invoice,
} from '@/lib/types/invoicing'

interface InvoiceDetailProps {
  invoice: Invoice
  clinic: string
  clinicName: string
  isAdmin: boolean
}

export function InvoiceDetail({ invoice, clinic, clinicName, isAdmin }: InvoiceDetailProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [voidLoading, setVoidLoading] = useState(false)

  const handleVoid = async () => {
    if (!confirm('¿Estás seguro de anular esta factura? Esta acción no se puede deshacer.')) {
      return
    }

    setVoidLoading(true)
    const result = await voidInvoice(invoice.id)

    if (!result.success) {
      showToast({ title: result.error || 'Error al anular', variant: 'error' })
    }

    setVoidLoading(false)
    router.refresh()
  }

  const owner = invoice.pets?.owner

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {invoice.invoice_number}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-[var(--text-secondary)]">
            Creada el {formatDate(invoice.created_at)}
            {invoice.created_by_user && ` por ${invoice.created_by_user.full_name}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <InvoicePDFButton invoice={invoice} clinicName={clinicName} />

          {canEditInvoice(invoice.status) && (
            <Link
              href={`/${clinic}/dashboard/invoices/${invoice.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-50"
            >
              <Icons.Edit className="h-4 w-4" />
              Editar
            </Link>
          )}

          {canSendInvoice(invoice.status) && (
            <button
              onClick={() => setShowSendDialog(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-2 text-[var(--status-info-text)] hover:bg-[var(--status-info-bg)]/80"
            >
              <Icons.Send className="h-4 w-4" />
              Enviar
            </button>
          )}

          {canRecordPayment(invoice.status, invoice.amount_due) && (
            <button
              onClick={() => setShowPaymentDialog(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--status-success)] px-4 py-2 text-white hover:bg-[var(--status-success)]/90"
            >
              <Icons.DollarSign className="h-4 w-4" />
              Registrar pago
            </button>
          )}

          {isAdmin && canVoidInvoice(invoice.status) && (
            <button
              onClick={handleVoid}
              disabled={voidLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] px-4 py-2 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50"
            >
              {voidLoading ? (
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.XCircle className="h-4 w-4" />
              )}
              Anular
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Invoice Info */}
        <div className="space-y-6 md:col-span-2">
          {/* Client & Pet */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 font-bold text-[var(--text-primary)]">Cliente</h2>
            <div className="flex items-start gap-4">
              <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <Icons.User className="h-6 w-6 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {owner?.full_name || 'Cliente desconocido'}
                </p>
                {owner?.email && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Icons.Mail className="mr-1 inline h-3 w-3" />
                    {owner.email}
                  </p>
                )}
                {owner?.phone && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    <Icons.Phone className="mr-1 inline h-3 w-3" />
                    {owner.phone}
                  </p>
                )}
                {invoice.pets && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    <Icons.PawPrint className="mr-1 inline h-3 w-3" />
                    {invoice.pets.name} ({invoice.pets.species})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 font-bold text-[var(--text-primary)]">Artículos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                      Descripción
                    </th>
                    <th className="pb-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                      Cant.
                    </th>
                    <th className="pb-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                      Precio
                    </th>
                    <th className="pb-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                      Desc.
                    </th>
                    <th className="pb-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items?.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3 text-[var(--text-primary)]">
                        {item.description}
                        {item.services?.name && (
                          <span className="block text-xs text-[var(--text-secondary)]">
                            {item.services.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right text-[var(--text-primary)]">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right text-[var(--text-primary)]">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 text-right text-[var(--text-secondary)]">
                        {item.discount_percent ? `${item.discount_percent}%` : '-'}
                      </td>
                      <td className="py-3 text-right font-medium text-[var(--text-primary)]">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h2 className="mb-3 font-bold text-[var(--text-primary)]">Historial de Pagos</h2>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {paymentMethodLabels[payment.payment_method]} •{' '}
                        {formatDate(payment.paid_at)}
                        {payment.receiver && ` • ${payment.receiver.full_name}`}
                      </p>
                      {payment.reference_number && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          Ref: {payment.reference_number}
                        </p>
                      )}
                    </div>
                    <Icons.CheckCircle className="h-5 w-5 text-[var(--status-success)]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h2 className="mb-2 font-bold text-[var(--text-primary)]">Notas</h2>
              <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 font-bold text-[var(--text-primary)]">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">IVA ({invoice.tax_rate}%)</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="mt-2 border-t border-gray-100 pt-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-[var(--status-success)]">
                  <span>Pagado</span>
                  <span>-{formatCurrency(invoice.amount_paid)}</span>
                </div>
              )}
              {invoice.amount_due > 0 && (
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-[var(--status-warning)]">
                  <span>Pendiente</span>
                  <span>{formatCurrency(invoice.amount_due)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h2 className="mb-3 font-bold text-[var(--text-primary)]">Fechas</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Creada</span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Vencimiento</span>
                  <span>{formatDate(invoice.due_date)}</span>
                </div>
              )}
              {invoice.sent_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Enviada</span>
                  <span>{formatDate(invoice.sent_at)}</span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex justify-between text-[var(--status-success)]">
                  <span>Pagada</span>
                  <span>{formatDate(invoice.paid_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RecordPaymentDialog
        invoiceId={invoice.id}
        amountDue={invoice.amount_due}
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
      />

      <SendInvoiceDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        total={invoice.total}
        clientEmail={owner?.email}
        clientName={owner?.full_name}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
      />
    </div>
  )
}
