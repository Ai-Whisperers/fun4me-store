'use client'

/**
 * Billing Client Component
 *
 * Main client-side component for the billing settings page.
 * Uses tabs to organize: Overview, Payment Methods, Invoices
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabList, TabTrigger, TabPanel } from '@/components/ui/tabs'
import { BillingOverview } from '@/components/billing/billing-overview'
import { CommissionBreakdown } from '@/components/billing/commission-breakdown'
import { PaymentMethodsManager } from '@/components/billing/payment-methods-manager'
import { InvoiceList } from '@/components/billing/invoice-list'
import { InvoiceDetailModal } from '@/components/billing/invoice-detail-modal'
import { AddCardModal } from '@/components/billing/add-card-modal'
import { BankTransferModal } from '@/components/billing/bank-transfer-modal'
import { ReportTransferModal } from '@/components/billing/report-transfer-modal'
import { useModal, useModalWithData } from '@/lib/hooks/use-modal'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { BillingOverviewResponse, PlatformInvoiceWithItems } from '@/lib/billing/types'

interface BillingClientProps {
  clinic: string
  initialTab?: string
  payInvoiceId?: string
}

type TabId = 'overview' | 'payments' | 'invoices'

export function BillingClient({
  clinic,
  initialTab,
  payInvoiceId,
}: BillingClientProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [activeTab, setActiveTab] = useState<TabId>((initialTab as TabId) || 'overview')
  const [overview, setOverview] = useState<BillingOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const addCardModal = useModal()
  const bankTransferModal = useModal()
  const reportTransferModal = useModalWithData<string>() // invoice_id
  const invoiceDetailModal = useModalWithData<PlatformInvoiceWithItems>()

  // Load billing overview
  useEffect(() => {
    loadOverview()
  }, [])

  // Handle pay query param
  useEffect(() => {
    if (payInvoiceId) {
      setActiveTab('invoices')
      // Could auto-open pay modal here
    }
  }, [payInvoiceId])

  async function loadOverview(): Promise<void> {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/billing/overview?clinic=${clinic}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Error al cargar informacion de facturacion')
      }

      const data: BillingOverviewResponse = await response.json()
      setOverview(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  function handleTabChange(tabId: string): void {
    setActiveTab(tabId as TabId)
    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  function handleAddPaymentMethod(): void {
    addCardModal.open()
  }

  function handlePaymentMethodAdded(): void {
    addCardModal.close()
    loadOverview() // Refresh data
  }

  function handleViewInvoice(invoice: PlatformInvoiceWithItems): void {
    invoiceDetailModal.open(invoice)
  }

  function handlePayInvoice(invoiceId: string): void {
    // Could open payment flow or navigate
    router.push(`/${clinic}/dashboard/settings/billing?tab=payments&pay=${invoiceId}`)
  }

  function handleReportTransfer(invoiceId: string): void {
    reportTransferModal.open(invoiceId)
  }

  function handleTransferReported(): void {
    reportTransferModal.close()
    loadOverview()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Error al cargar facturacion</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button
          onClick={loadOverview}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // No data
  if (!overview) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-[var(--text-secondary)]">
          No se encontro informacion de facturacion
        </p>
      </div>
    )
  }

  return (
    <>
      <Tabs defaultTab={activeTab} variant="underline" size="lg" onChange={handleTabChange}>
        <TabList className="mb-6">
          <TabTrigger id="overview" icon="LayoutDashboard">
            Resumen
          </TabTrigger>
          <TabTrigger id="payments" icon="CreditCard">
            Metodos de Pago
          </TabTrigger>
          <TabTrigger id="invoices" icon="FileText">
            Facturas
          </TabTrigger>
        </TabList>

        {/* Overview Tab */}
        <TabPanel id="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <BillingOverview data={overview} onAddPaymentMethod={handleAddPaymentMethod} />
            <CommissionBreakdown currentPeriod={overview.current_period} tier={overview.tier} />
          </div>
        </TabPanel>

        {/* Payment Methods Tab */}
        <TabPanel id="payments">
          <PaymentMethodsManager
            clinic={clinic}
            hasPaymentMethod={overview.has_payment_method}
            defaultPaymentMethod={overview.default_payment_method}
            onAddCard={handleAddPaymentMethod}
            onShowBankDetails={() => bankTransferModal.open()}
            onRefresh={loadOverview}
          />
        </TabPanel>

        {/* Invoices Tab */}
        <TabPanel id="invoices">
          <InvoiceList
            clinic={clinic}
            onViewInvoice={handleViewInvoice}
            onPayInvoice={handlePayInvoice}
            onReportTransfer={handleReportTransfer}
          />
        </TabPanel>
      </Tabs>

      {/* Modals */}
      <AddCardModal
        {...addCardModal.modalProps}
        clinic={clinic}
        trialDaysRemaining={overview.trial_days_remaining}
        tierName={overview.tier_display_name}
        monthlyAmount={overview.monthly_amount}
        firstInvoiceDate={overview.first_invoice_date || overview.trial_end_date}
        onSuccess={handlePaymentMethodAdded}
      />

      <BankTransferModal {...bankTransferModal.modalProps} />

      <ReportTransferModal
        {...reportTransferModal.modalProps}
        invoiceId={reportTransferModal.data}
        clinic={clinic}
        onSuccess={handleTransferReported}
      />

      <InvoiceDetailModal
        {...invoiceDetailModal.modalProps}
        invoice={invoiceDetailModal.data}
        clinic={clinic}
        onPay={handlePayInvoice}
        onReportTransfer={handleReportTransfer}
      />
    </>
  )
}
