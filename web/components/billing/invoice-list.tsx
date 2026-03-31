'use client'

/**
 * Invoice List Component
 *
 * Displays a list of platform invoices with filtering and actions.
 */

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/Toast'
import {
  FileText,
  Download,
  Eye,
  CreditCard,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { PlatformInvoice, PlatformInvoiceWithItems, PlatformInvoiceStatus } from '@/lib/billing/types'

interface InvoiceListProps {
  clinic: string
  onViewInvoice: (invoice: PlatformInvoiceWithItems) => void
  onPayInvoice: (invoiceId: string) => void
  onReportTransfer: (invoiceId: string) => void
}

/**
 * Get status badge styles (without label - label comes from translations)
 */
function getStatusConfig(status: PlatformInvoiceStatus): {
  icon: React.ComponentType<{ className?: string }>
  className: string
} {
  const configs: Record<PlatformInvoiceStatus, {
    icon: React.ComponentType<{ className?: string }>
    className: string
  }> = {
    draft: {
      icon: FileText,
      className: 'bg-gray-100 text-gray-700',
    },
    sent: {
      icon: Clock,
      className: 'bg-blue-100 text-blue-700',
    },
    paid: {
      icon: CheckCircle,
      className: 'bg-green-100 text-green-700',
    },
    overdue: {
      icon: AlertTriangle,
      className: 'bg-red-100 text-red-700',
    },
    void: {
      icon: AlertCircle,
      className: 'bg-gray-100 text-gray-500',
    },
    waived: {
      icon: CheckCircle,
      className: 'bg-purple-100 text-purple-700',
    },
  }
  return configs[status]
}

export function InvoiceList({
  clinic,
  onViewInvoice,
  onPayInvoice,
  onReportTransfer,
}: InvoiceListProps): React.ReactElement {
  const t = useTranslations('billing.invoiceList')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Format currency in Paraguayan Guaranies
  const formatCurrency = (amount: number): string => {
    return `₲${amount.toLocaleString(locale === 'es' ? 'es-PY' : 'en-US')}`
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  useEffect(() => {
    loadInvoices()
  }, [clinic])

  async function loadInvoices(): Promise<void> {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/billing/invoices?clinic=${clinic}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.loadInvoices'))
      }

      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleViewInvoice(invoiceId: string): Promise<void> {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}?clinic=${clinic}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('errors.loadInvoice'))
      }

      const invoice: PlatformInvoiceWithItems = await response.json()
      onViewInvoice(invoice)
    } catch (e) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: e instanceof Error ? e.message : t('errors.loadInvoice'),
        variant: 'error',
      })
    }
  }

  async function handleDownloadPdf(invoiceId: string): Promise<void> {
    try {
      setDownloadingId(invoiceId)

      const response = await fetch(`/api/billing/invoices/${invoiceId}/pdf?clinic=${clinic}`)

      if (!response.ok) {
        throw new Error(t('errors.generatePdf'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
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
    } finally {
      setDownloadingId(null)
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'pending') {
      return ['sent', 'overdue'].includes(invoice.status)
    }
    if (filter === 'paid') {
      return invoice.status === 'paid'
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">{t('errors.loadInvoices')}</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={loadInvoices}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200"
        >
          {tc('tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/80'
            }`}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      {filteredInvoices.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <p className="mt-4 text-[var(--text-secondary)]">
            {t(`empty.${filter}`)}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-paper)]">
          <table className="w-full">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t('columns.invoice')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t('columns.period')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t('columns.total')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t('columns.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {tc('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredInvoices.map((invoice) => {
                const statusConfig = getStatusConfig(invoice.status)
                const StatusIcon = statusConfig.icon
                const canPay = ['sent', 'overdue'].includes(invoice.status)

                return (
                  <tr key={invoice.id} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-mono font-medium text-[var(--text-primary)]">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {t('dueDate')}: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-[var(--text-primary)]">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {t(`status.${invoice.status}`)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--primary)]"
                          title={t('actions.viewDetail')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(invoice.id)}
                          disabled={downloadingId === invoice.id}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--primary)] disabled:opacity-50"
                          title={t('actions.downloadPdf')}
                        >
                          {downloadingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        {canPay && (
                          <>
                            <button
                              onClick={() => onPayInvoice(invoice.id)}
                              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                              title={t('actions.payWithCard')}
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onReportTransfer(invoice.id)}
                              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-green-100 hover:text-green-600"
                              title={t('actions.reportTransfer')}
                            >
                              <Building2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
