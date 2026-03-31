'use client'

/**
 * Sales Tab Component
 *
 * Displays sales analytics including summary cards, revenue trends,
 * category distribution, top products, and coupon statistics.
 */

import {
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Package,
  Gift,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { StoreAnalyticsData } from '../types'
import { COLORS, STATUS_COLORS } from '../types'
import { formatCurrency, formatDate } from '../utils/format'

interface SalesTabProps {
  data: StoreAnalyticsData
}

export function SalesTab({ data }: SalesTabProps): React.ReactElement {
  return (
    <>
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Ventas Hoy"
          value={formatCurrency(data.summary.today.total)}
          subtitle={`${data.summary.today.count} pedidos`}
          iconBg="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
          icon={Calendar}
        />
        <SummaryCard
          title="Esta Semana"
          value={formatCurrency(data.summary.week.total)}
          subtitle={`${data.summary.week.count} pedidos`}
          iconBg="var(--accent-green-light)"
          iconColor="var(--accent-green)"
          icon={TrendingUp}
        />
        <SummaryCard
          title="Este Mes"
          value={formatCurrency(data.summary.month.total)}
          subtitle={`${data.summary.month.count} pedidos`}
          iconBg="var(--accent-purple-light)"
          iconColor="var(--accent-purple)"
          icon={DollarSign}
        />
        <SummaryCard
          title="Este Año"
          value={formatCurrency(data.summary.year.total)}
          subtitle={`${data.summary.year.count} pedidos`}
          iconBg="var(--accent-orange-light)"
          iconColor="var(--accent-orange)"
          icon={BarChart3}
        />
      </div>

      {/* Revenue Trend Chart */}
      <RevenueTrendChart dailyTrend={data.dailyTrend} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryRevenueChart categoryRevenue={data.categoryRevenue} />
        <StatusDistributionChart statusDistribution={data.statusDistribution} />
      </div>

      {/* Top Products Table */}
      <TopProductsTable topProducts={data.topProducts} />

      {/* Coupon Stats */}
      <CouponStatsCard couponStats={data.couponStats} />
    </>
  )
}

// =============================================================================
// Internal Components
// =============================================================================

interface SummaryCardProps {
  title: string
  value: string
  subtitle: string
  iconBg: string
  iconColor: string
  icon: React.ElementType
}

function SummaryCard({
  title,
  value,
  subtitle,
  iconBg,
  iconColor,
  icon: Icon,
}: SummaryCardProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: iconBg }}>
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  )
}

interface RevenueTrendChartProps {
  dailyTrend: StoreAnalyticsData['dailyTrend']
}

function RevenueTrendChart({ dailyTrend }: RevenueTrendChartProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Tendencia de Ventas
      </h3>
      <div className="h-[300px]">
        {dailyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="colorStoreRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatDate} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0
                  if (name === 'revenue') return [formatCurrency(numValue), 'Ingresos']
                  if (name === 'orders') return [numValue, 'Pedidos']
                  return [formatCurrency(numValue), 'Ticket Promedio']
                }}
                labelFormatter={(label) => formatDate(String(label))}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorStoreRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
            No hay datos de ventas en este período
          </div>
        )}
      </div>
    </div>
  )
}

interface CategoryRevenueChartProps {
  categoryRevenue: StoreAnalyticsData['categoryRevenue']
}

function CategoryRevenueChart({ categoryRevenue }: CategoryRevenueChartProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Ingresos por Categoría
      </h3>
      <div className="h-[300px]">
        {categoryRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryRevenue}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total_revenue"
                nameKey="category_name"
                label={({ name, percent }) =>
                  `${(name as string)?.substring(0, 10) || ''} ${Math.round((percent || 0) * 100)}%`
                }
              >
                {categoryRevenue.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0
                  return [formatCurrency(numValue), 'Ingresos']
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
            No hay datos de categorías
          </div>
        )}
      </div>
    </div>
  )
}

interface StatusDistributionChartProps {
  statusDistribution: StoreAnalyticsData['statusDistribution']
}

function StatusDistributionChart({
  statusDistribution,
}: StatusDistributionChartProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Estado de Pedidos
      </h3>
      <div className="h-[300px]">
        {statusDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 12 }} width={100} />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : 0
                  if (name === 'count') return [numValue, 'Cantidad']
                  return [formatCurrency(numValue), 'Total']
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]}>
                {statusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
            No hay datos de pedidos
          </div>
        )}
      </div>
    </div>
  )
}

interface TopProductsTableProps {
  topProducts: StoreAnalyticsData['topProducts']
}

function TopProductsTable({ topProducts }: TopProductsTableProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-[var(--primary)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Productos Más Vendidos
        </h3>
      </div>
      {topProducts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Vendidos
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Ingresos
                </th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        #{index + 1}
                      </span>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            SKU: {product.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {product.category_name || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-[var(--text-primary)]">
                      {product.total_sold}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium" style={{ color: 'var(--status-success)' }}>
                      {formatCurrency(product.total_revenue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          No hay datos de productos vendidos
        </div>
      )}
    </div>
  )
}

interface CouponStatsCardProps {
  couponStats: StoreAnalyticsData['couponStats']
}

function CouponStatsCard({ couponStats }: CouponStatsCardProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-[var(--primary)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Estadísticas de Cupones
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock
          label="Total Cupones"
          value={couponStats.total_coupons.toString()}
          bg="var(--accent-blue-light)"
          color="var(--accent-blue)"
          darkColor="var(--accent-blue-dark)"
        />
        <StatBlock
          label="Cupones Activos"
          value={couponStats.active_coupons.toString()}
          bg="var(--accent-green-light)"
          color="var(--accent-green)"
          darkColor="var(--accent-green-dark)"
        />
        <StatBlock
          label="Usos Totales"
          value={couponStats.total_usage.toString()}
          bg="var(--accent-purple-light)"
          color="var(--accent-purple)"
          darkColor="var(--accent-purple-dark)"
        />
        <StatBlock
          label="Descuentos Dados"
          value={formatCurrency(couponStats.total_discount_given)}
          bg="var(--accent-orange-light)"
          color="var(--accent-orange)"
          darkColor="var(--accent-orange-dark)"
        />
      </div>
    </div>
  )
}

interface StatBlockProps {
  label: string
  value: string
  bg: string
  color: string
  darkColor: string
}

function StatBlock({ label, value, bg, color, darkColor }: StatBlockProps): React.ReactElement {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: bg }}>
      <p className="text-sm font-medium" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold" style={{ color: darkColor }}>
        {value}
      </p>
    </div>
  )
}
