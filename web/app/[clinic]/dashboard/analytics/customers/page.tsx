'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  TrendingUp,
  UserCheck,
  UserX,
  Star,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Crown,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface CustomerSegment {
  segment: 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'
  count: number
  total_revenue: number
  avg_order_value: number
  percentage: number
  // Index signature for recharts compatibility
  [key: string]: string | number
}

interface CustomerMetrics {
  id: string
  name: string
  email: string
  segment: CustomerSegment['segment']
  total_orders: number
  total_spent: number
  avg_order_value: number
  first_order_date: string | null
  last_order_date: string | null
  days_since_last_order: number | null
  loyalty_points: number
}

interface PurchaseFrequency {
  frequency: string
  count: number
  percentage: number
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

interface CustomerAnalyticsData {
  summary: CustomerSummary
  segments: CustomerSegment[]
  purchaseFrequency: PurchaseFrequency[]
  topCustomers: CustomerMetrics[]
  atRiskCustomers: CustomerMetrics[]
  generatedAt: string
}

const SEGMENT_COLORS: Record<string, string> = {
  vip: 'var(--chart-5)',
  regular: 'var(--chart-2)',
  new: 'var(--chart-1)',
  at_risk: 'var(--chart-3)',
  dormant: 'var(--chart-4)',
}

const SEGMENT_LABELS: Record<string, string> = {
  vip: 'VIP',
  regular: 'Regular',
  new: 'Nuevo',
  at_risk: 'En Riesgo',
  dormant: 'Inactivo',
}

export default function CustomerAnalyticsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const [period, setPeriod] = useState<number>(90)
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<CustomerAnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/analytics/customers?period=${period}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        } else {
          const errorData = await response.json()
          setError(errorData.message || 'Error al cargar analíticas')
        }
      } catch (err) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching customer analytics:', err)
        }
        setError('Error de conexión')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [period])

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M Gs.`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K Gs.`
    }
    return `${value.toLocaleString('es-PY')} Gs.`
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getSegmentIcon = (segment: string) => {
    switch (segment) {
      case 'vip':
        return <Crown className="h-4 w-4 text-purple-600" />
      case 'at_risk':
        return <AlertCircle className="h-4 w-4 text-amber-600" />
      case 'dormant':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'new':
        return <Star className="h-4 w-4 text-blue-600" />
      default:
        return <UserCheck className="h-4 w-4 text-green-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--status-error)' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-[var(--text-secondary)]">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/${clinic}/dashboard/analytics`}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </Link>
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <Users className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Analíticas de Clientes
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Segmentación, patrones de compra y retención
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
          {[
            { value: 30, label: '30 días' },
            { value: 90, label: '90 días' },
            { value: 180, label: '6 meses' },
            { value: 365, label: '1 año' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total Clientes</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {data.summary.total_customers}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {data.summary.active_customers} activos
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--accent-blue-light)' }}>
              <Users className="h-6 w-6" style={{ color: 'var(--accent-blue)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Nuevos Clientes</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {data.summary.new_customers_period}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">últimos {period} días</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--accent-green-light)' }}
            >
              <UserCheck className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Tasa de Recompra</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {data.summary.repeat_purchase_rate}%
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">clientes recurrentes</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--accent-purple-light)' }}
            >
              <RefreshCw className="h-6 w-6" style={{ color: 'var(--accent-purple)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Valor de Vida</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(data.summary.avg_customer_lifetime_value)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">promedio por cliente</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--accent-orange-light)' }}
            >
              <TrendingUp className="h-6 w-6" style={{ color: 'var(--accent-orange)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Segment Distribution */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Segmentación de Clientes
          </h3>
          <div className="h-[300px]">
            {data.segments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.segments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="segment"
                    label={(props: { name?: string; percent?: number }) =>
                      `${SEGMENT_LABELS[props.name as string] || props.name} ${Math.round((props.percent || 0) * 100)}%`
                    }
                  >
                    {data.segments.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SEGMENT_COLORS[entry.segment] || 'var(--chart-1)'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, SEGMENT_LABELS[name as string] || name]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <Legend formatter={(value) => SEGMENT_LABELS[value] || value} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
                No hay datos de segmentos
              </div>
            )}
          </div>
        </div>

        {/* Purchase Frequency */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Frecuencia de Compra
          </h3>
          <div className="h-[300px]">
            {data.purchaseFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.purchaseFrequency} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="frequency" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    formatter={(value) => [value, 'Clientes']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
                No hay datos de frecuencia
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-[var(--primary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Mejores Clientes</h3>
        </div>
        {data.topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                    Segmento
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Total Gastado
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Última Compra
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer, index) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{customer.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getSegmentIcon(customer.segment)}
                        <span className="text-sm font-medium">
                          {SEGMENT_LABELS[customer.segment]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-[var(--text-primary)]">
                        {customer.total_orders}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium" style={{ color: 'var(--status-success)' }}>
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formatDate(customer.last_order_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-purple-600">
                        {customer.loyalty_points.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-[var(--text-secondary)]">
            No hay datos de clientes
          </div>
        )}
      </div>

      {/* At-Risk Customers */}
      {data.atRiskCustomers.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserX className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Clientes en Riesgo</h3>
            <span className="text-sm text-[var(--text-muted)]">
              (No han comprado en más de 60 días)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Días sin Comprar
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Total Histórico
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                    Pedidos
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.atRiskCustomers.slice(0, 10).map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{customer.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{customer.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          (customer.days_since_last_order || 0) > 120
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {customer.days_since_last_order} días
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {customer.total_orders}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated At */}
      <div className="text-center text-sm text-[var(--text-secondary)]">
        Datos actualizados: {new Date(data.generatedAt).toLocaleString('es-PY')}
      </div>
    </div>
  )
}
