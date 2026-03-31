'use client'

/**
 * Client Segments Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  Users,
  TrendingUp,
  RefreshCw,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { SegmentOverview } from '@/components/dashboard/clients/segment-overview'
import { SegmentCustomerList } from '@/components/dashboard/clients/segment-customer-list'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/Toast'
import {
  BulkEmailModal,
  BulkWhatsAppModal,
  BulkDiscountModal,
  ExportModal,
} from '@/components/clients/bulk-actions'

interface Segment {
  segment: 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'
  count: number
  total_revenue: number
  avg_order_value: number
  percentage: number
}

interface Customer {
  id: string
  name: string
  email: string
  segment: 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'
  total_orders: number
  total_spent: number
  avg_order_value: number
  first_order_date: string | null
  last_order_date: string | null
  days_since_last_order: number | null
  loyalty_points: number
}

interface CustomerSummary {
  total_customers: number
  active_customers: number
  new_customers_period: number
  repeat_purchase_rate: number
  avg_customer_lifetime_value: number
  avg_orders_per_customer: number
  avg_basket_size: number
}

interface AnalyticsData {
  summary: CustomerSummary
  segments: Segment[]
  topCustomers: Customer[]
  atRiskCustomers: Customer[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ClientSegmentsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [selectedSegment, setSelectedSegment] = useState<Segment['segment'] | null>(null)
  const [period, setPeriod] = useState(90)

  // Bulk action modals state
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false)
  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])

  // React Query: Fetch analytics data
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['customer-analytics', period],
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await fetch(`/api/analytics/customers?period=${period}`)
      if (!res.ok) throw new Error('Error al cargar datos')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const error = queryError?.message || null

  const fetchData = async () => {
    await refetch()
  }

  // Combine all customers
  const allCustomers = data ? [...data.topCustomers, ...data.atRiskCustomers] : []
  // Remove duplicates
  const uniqueCustomers = allCustomers.filter(
    (customer, index, self) => index === self.findIndex((c) => c.id === customer.id)
  )

  const handleSendEmail = (customerIds: string[]) => {
    setSelectedClientIds(customerIds)
    setEmailModalOpen(true)
  }

  const handleSendWhatsApp = (customerIds: string[]) => {
    setSelectedClientIds(customerIds)
    setWhatsAppModalOpen(true)
  }

  const handleApplyDiscount = (customerIds: string[]) => {
    setSelectedClientIds(customerIds)
    setDiscountModalOpen(true)
  }

  const handleExport = () => {
    // Use all visible customers for export if none selected
    const customerIds = uniqueCustomers.map((c) => c.id)
    setSelectedClientIds(customerIds)
    setExportModalOpen(true)
  }

  const handleBulkActionSuccess = () => {
    showToast({ title: 'Acción completada exitosamente', variant: 'success' })
    fetchData() // Refresh data
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">{error || 'Error al cargar datos'}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${clinic}/dashboard`}
            className="rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              Segmentación de Clientes
            </h1>
            <p className="text-sm text-gray-500">Analiza y gestiona tus grupos de clientes</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
          >
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 6 meses</option>
            <option value={365}>Último año</option>
          </select>

          <button
            onClick={fetchData}
            className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            aria-label="Actualizar datos"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clientes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {data.summary.total_customers}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {data.summary.active_customers} activos ({data.summary.total_customers > 0 ? Math.round((data.summary.active_customers / data.summary.total_customers) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Nuevos Clientes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {data.summary.new_customers_period}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">En los últimos {period} días</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Tasa de Recompra</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {data.summary.repeat_purchase_rate}%
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Clientes con 2+ compras</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Valor Promedio</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.summary.avg_customer_lifetime_value)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
            <p className="mt-2 text-sm text-gray-500">Por cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Segment Overview */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
          Distribución por Segmento
        </h2>
        <SegmentOverview
          segments={data.segments}
          selectedSegment={selectedSegment}
          onSegmentClick={(seg) => setSelectedSegment(selectedSegment === seg ? null : seg)}
        />
      </div>

      {/* Customer List */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
          {selectedSegment
            ? `Clientes: ${data.segments.find((s) => s.segment === selectedSegment)?.count || 0}`
            : 'Todos los Clientes'}
        </h2>
        <SegmentCustomerList
          customers={uniqueCustomers}
          segment={selectedSegment}
          onSendEmail={handleSendEmail}
          onSendWhatsApp={handleSendWhatsApp}
          onApplyDiscount={handleApplyDiscount}
        />
      </div>

      {/* Bulk Action Modals */}
      <BulkEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        selectedCount={selectedClientIds.length}
        selectedIds={selectedClientIds}
        onSuccess={handleBulkActionSuccess}
      />
      <BulkWhatsAppModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        selectedCount={selectedClientIds.length}
        selectedIds={selectedClientIds}
        onSuccess={handleBulkActionSuccess}
      />
      <BulkDiscountModal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        selectedCount={selectedClientIds.length}
        selectedIds={selectedClientIds}
        onSuccess={handleBulkActionSuccess}
      />
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        selectedCount={selectedClientIds.length}
        selectedIds={selectedClientIds}
      />
    </div>
  )
}
