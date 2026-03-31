'use client'

/**
 * Invoice Detail Modal Component
 *
 * Displays full invoice details in a modal with actions.
 */

import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/Toast'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { InvoiceLineItems } from './invoice-line-items'
import {
  FileText,
  Download,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { PlatformInvoiceWithItems, PlatformInvoiceStatus } from '@/lib/billing/types'

interface InvoiceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: PlatformInvoiceWithItems | undefined
  clinic: string
  onPay: (invoiceId: string) => void
  onReportTransfer: (invoiceId: string) => void
}

/**
 * Get status icon and styles (label comes from translations)
 */
function getStatusConfig(status: PlatformInvoiceStatus): {
  icon: React.ComponentType<{ className?: string }>
  className: string
} {
  const configs: Record<PlatformInvoiceStatus, {
    icon: React.ComponentType<{ className?: string }>
    className: string
  }> = {
    draft: { icon: FileText, className: 'bg-gray-100 text-gray-700' },
    sent: { icon: Clock, className: 'bg-blue-100 text-blue-700' },
    paid: { icon: CheckCircle, className: 'bg-green-100 text-green-700' },
    overdue: { icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
    void: { icon: FileText, className: 'bg-gray-100 text-gray-500' },
    waived: { icon: CheckCircle, className: 'bg-purple-100 text-purple-700' },
  }
  return configs[status]
}

export function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  clinic,
  onPay,
  onReportTransfer,
}: InvoiceDetailModalProps): React.ReactElement {
  const t = useTranslations('billing.invoiceDetail')
  const locale = useLocale()
  const { showToast } = useToast()

  // Format currency in Paraguayan Guaranies
  const formatCurrency = (amount: number): string => {
    return `₲${amount.toLocaleString(locale === 'es' ? 'es-PY' : 'en-US')}`
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (!invoice) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('title')} size="lg">
        <div className="py-8 text-center text-[var(--text-muted)]">
          {t('notFound')}
        </div>
      </Modal>
    )
  }

  const statusConfig = getStatusConfig(invoice.status)
  const StatusIcon = statusConfig.icon
  const canPay = ['sent', 'overdue'].includes(invoice.status)

  async function handleDownloadPdf(): Promise<void> {
    if (!invoice) return
    try {
      const response = await fetch(`/api/billing/invoices/${invoice.id}/pdf?clinic=${clinic}`)

      if (!response.ok) {
        throw new Error(t('errors.generatePdf'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: e instanceof Error ? e.message : t('errors.downloadPdf'),
        variant: 'error',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('title')} ${invoice.invoice_number}`}
      size="lg"
    >
      {/* Header Info */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusConfig.className}`}
        >
          <StatusIcon className="h-4 w-4" />
          {t(`status.${invoice.status}`)}
        </span>

        {/* Due Date */}
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <Calendar className="h-4 w-4" />
          <span>{t('dueDate')}: {formatDate(invoice.due_date)}</span>
        </div>

        {/* Paid Date */}
        {invoice.paid_at && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>{t('paidDate')}: {formatDate(invoice.paid_at)}</span>
          </div>
        )}
      </div>

      {/* Period */}
      <div className="mb-6 rounded-lg bg-[var(--bg-subtle)] p-4">
        <p className="text-sm text-[var(--text-muted)]">{t('billingPeriod')}</p>
        <p className="font-medium text-[var(--text-primary)]">
          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
        </p>
      </div>

      {/* Line Items */}
      <InvoiceLineItems
        items={invoice.items}
        subtotal={invoice.subtotal}
        taxAmount={invoice.tax_amount}
        taxRate={invoice.tax_rate}
        total={invoice.total}
      />

      {/* Grace Period Info */}
      {invoice.grace_period_days && invoice.status === 'overdue' && (
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">
            {t('gracePeriod', { days: invoice.grace_period_days })}
          </p>
          {invoice.grace_reason && (
            <p className="mt-1 text-sm text-orange-700">{invoice.grace_reason}</p>
          )}
        </div>
      )}

      {/* Payment Info */}
      {invoice.status === 'paid' && invoice.payment_method && (
        <div className="mt-4 rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-800">
            <span className="font-medium">{t('paymentMethod')}:</span> {invoice.payment_method}
          </p>
          {invoice.payment_reference && (
            <p className="mt-1 text-sm text-green-700">
              <span className="font-medium">{t('paymentReference')}:</span> {invoice.payment_reference}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <ModalFooter className="mt-6">
        <button
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
        >
          <Download className="h-4 w-4" />
          {t('downloadPdf')}
        </button>

        {canPay && (
          <>
            <button
              onClick={() => {
                onClose()
                onReportTransfer(invoice.id)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-green-500 px-4 py-2 font-medium text-green-600 transition-colors hover:bg-green-50"
            >
              <Building2 className="h-4 w-4" />
              {t('reportTransfer')}
            </button>
            <button
              onClick={() => {
                onClose()
                onPay(invoice.id)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white transition-colors hover:bg-[var(--primary-dark)]"
            >
              <CreditCard className="h-4 w-4" />
              {t('payNow')}
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
