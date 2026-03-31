'use client'

/**
 * Commission Dashboard
 *
 * Dashboard component for clinics to view their e-commerce commission obligations.
 * Shows current rate, monthly stats, pending payments, and recent commissions.
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hooks
 */

import {
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface CommissionSummary {
  current_month: {
    order_count: number
    gmv: number
    commission_total: number
  }
  pending_payment: number
  rate_info: {
    current_rate: number
    rate_type: 'initial' | 'standard' | 'enterprise'
    months_active: number
    ecommerce_start_date: string | null
    rate_increases_at: string | null
    next_rate: number | null
  }
  totals: {
    calculated: number
    invoiced: number
    paid: number
    waived: number
    adjusted: number
    total_lifetime: number
  }
  latest_invoice: {
    id: string
    invoice_number: string
    period_start: string
    period_end: string
    amount_due: number
    status: string
    due_date: string
  } | null
}

interface Commission {
  id: string
  order_id: string
  order_total: number
  commissionable_amount: number
  commission_rate: number
  commission_amount: number
  rate_type: string
  status: string
  calculated_at: string
  store_orders: {
    order_number: string
    profiles: {
      full_name: string
    } | null
  }
}

interface CommissionDashboardProps {
  clinic: string
}

export function CommissionDashboard({ clinic }: CommissionDashboardProps) {
  // React Query: Fetch commission summary
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['commissions', 'summary', clinic],
    queryFn: async (): Promise<CommissionSummary> => {
      const res = await fetch(`/api/store/commissions/summary?clinic=${clinic}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Error al cargar resumen')
      }
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // React Query: Fetch commissions list
  const { data: commissionsData } = useQuery({
    queryKey: ['commissions', 'list', clinic],
    queryFn: async (): Promise<{ commissions: Commission[] }> => {
      const res = await fetch(`/api/store/commissions?clinic=${clinic}&limit=5`)
      if (!res.ok) return { commissions: [] }
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const commissions = commissionsData?.commissions ?? []
  const isLoading = summaryLoading
  const error = summaryError?.message ?? null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getRateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: 'Tarifa Inicial',
      standard: 'Tarifa Estándar',
      enterprise: 'Tarifa Empresarial',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      calculated: 'bg-blue-100 text-blue-800',
      invoiced: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      waived: 'bg-gray-100 text-gray-800',
      adjusted: 'bg-orange-100 text-orange-800',
    }
    const labels: Record<string, string> = {
      calculated: 'Calculado',
      invoiced: 'Facturado',
      paid: 'Pagado',
      waived: 'Exonerado',
      adjusted: 'Ajustado',
    }
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-24 rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-gray-200" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <p className="mt-4 text-red-700">{error}</p>
        <button
          onClick={() => refetchSummary()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Info className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">No hay datos de comisiones disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rate Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Tu Tarifa de Comisión</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {getRateTypeLabel(summary.rate_info.rate_type)} -{' '}
              <span className="font-bold text-blue-600">{formatPercent(summary.rate_info.current_rate)}</span>
              {' '}sobre ventas de la tienda
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {formatPercent(summary.rate_info.current_rate)}
            </p>
            {summary.rate_info.rate_increases_at && (
              <p className="mt-1 text-xs text-gray-500">
                Aumenta a {formatPercent(summary.rate_info.next_rate || 0.05)} el{' '}
                {formatDate(summary.rate_info.rate_increases_at)}
              </p>
            )}
          </div>
        </div>

        {summary.rate_info.rate_type === 'initial' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-100/50 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <p className="text-xs text-blue-800">
              Estás en la tarifa inicial del 3% durante tus primeros 6 meses. Después de{' '}
              {6 - summary.rate_info.months_active} meses más, la tarifa aumentará al 5%.
            </p>
          </div>
        )}

        {summary.rate_info.rate_type === 'enterprise' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-100/50 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <p className="text-xs text-green-800">
              Tienes una tarifa empresarial negociada del 2%. Esta tarifa no cambiará.
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Current Month */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.current_month.commission_total)}
              </p>
              <p className="text-xs text-gray-500">Este mes ({summary.current_month.order_count} pedidos)</p>
            </div>
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              Ventas: {formatCurrency(summary.current_month.gmv)}
            </p>
          </div>
        </div>

        {/* Pending Payment */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.pending_payment)}
              </p>
              <p className="text-xs text-gray-500">Pendiente de pago</p>
            </div>
          </div>
          {summary.latest_invoice && summary.latest_invoice.status !== 'paid' && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">
                Vence: {formatDate(summary.latest_invoice.due_date)}
              </p>
            </div>
          )}
        </div>

        {/* Lifetime Paid */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totals.paid)}
              </p>
              <p className="text-xs text-gray-500">Total pagado</p>
            </div>
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              De {formatCurrency(summary.totals.total_lifetime)} total
            </p>
          </div>
        </div>
      </div>

      {/* Latest Invoice */}
      {summary.latest_invoice && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Factura #{summary.latest_invoice.invoice_number}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(summary.latest_invoice.period_start)} -{' '}
                  {formatDate(summary.latest_invoice.period_end)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">
                {formatCurrency(summary.latest_invoice.amount_due)}
              </p>
              {getStatusBadge(summary.latest_invoice.status)}
            </div>
          </div>
        </div>
      )}

      {/* Recent Commissions */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Comisiones Recientes</h3>
        </div>

        {commissions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Aún no hay comisiones registradas</p>
            <p className="mt-1 text-sm text-gray-400">
              Las comisiones se calculan automáticamente al confirmar pedidos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {commissions.map((commission) => (
              <div key={commission.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900">
                    Pedido #{commission.store_orders?.order_number || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {commission.store_orders?.profiles?.full_name || 'Cliente'} •{' '}
                    {formatDate(commission.calculated_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(commission.commission_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPercent(commission.commission_rate)} de{' '}
                    {formatCurrency(commission.commissionable_amount)}
                  </p>
                </div>
                <div className="ml-4">
                  {getStatusBadge(commission.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {commissions.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <a
              href={`/${clinic}/dashboard/analytics/store`}
              className="flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todas las comisiones
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="flex items-center gap-2 font-medium text-gray-900">
          <Info className="h-4 w-4" />
          ¿Cómo funcionan las comisiones?
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li>• Las comisiones se calculan sobre el subtotal de cada pedido (sin envío ni impuestos)</li>
          <li>• La tarifa inicial es del 3% durante los primeros 6 meses</li>
          <li>• Después de 6 meses, la tarifa estándar es del 5%</li>
          <li>• Las facturas de comisiones se generan mensualmente</li>
          <li>• El pago vence 15 días después del cierre del período</li>
        </ul>
      </div>
    </div>
  )
}

export default CommissionDashboard
