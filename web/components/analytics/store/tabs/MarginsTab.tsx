'use client'

/**
 * Margins Tab Component
 *
 * Displays margin analytics including summary cards, category margins,
 * profit distribution, and low margin product identification.
 */

import { DollarSign, TrendingUp, Percent, AlertTriangle, TrendingDown } from 'lucide-react'
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
import type { MarginAnalyticsData } from '../types'
import { COLORS } from '../types'
import { formatCurrency } from '../utils/format'

interface MarginsTabProps {
  data: MarginAnalyticsData
}

export function MarginsTab({ data }: MarginsTabProps): React.ReactElement {
  return (
    <>
      {/* Margin Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Ingresos Totales"
          value={formatCurrency(data.summary.total_revenue)}
          iconBg="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
          icon={DollarSign}
        />
        <SummaryCard
          title="Ganancia Total"
          value={formatCurrency(data.summary.total_profit)}
          valueColor="var(--status-success)"
          iconBg="var(--accent-green-light)"
          iconColor="var(--accent-green)"
          icon={TrendingUp}
        />
        <SummaryCard
          title="Margen Promedio"
          value={`${data.summary.average_margin.toFixed(1)}%`}
          iconBg="var(--accent-purple-light)"
          iconColor="var(--accent-purple)"
          icon={Percent}
        />
        <SummaryCard
          title="Productos Bajo Margen"
          value={data.summary.low_margin_count.toString()}
          subtitle={`<${data.summary.low_margin_threshold}%`}
          valueColor={data.summary.low_margin_count > 0 ? 'var(--status-warning)' : undefined}
          iconBg="var(--status-warning-light)"
          iconColor="var(--status-warning)"
          icon={AlertTriangle}
        />
      </div>

      {/* Category Margins Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryMarginChart categoryMargins={data.categoryMargins} />
        <CategoryProfitChart categoryMargins={data.categoryMargins} />
      </div>

      {/* Low Margin Products Table */}
      <LowMarginProductsTable productMargins={data.productMargins} />
    </>
  )
}

// =============================================================================
// Internal Components
// =============================================================================

interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  valueColor?: string
  iconBg: string
  iconColor: string
  icon: React.ElementType
}

function SummaryCard({
  title,
  value,
  subtitle,
  valueColor,
  iconBg,
  iconColor,
  icon: Icon,
}: SummaryCardProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: valueColor || 'var(--text-primary)' }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: iconBg }}>
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  )
}

interface CategoryMarginChartProps {
  categoryMargins: MarginAnalyticsData['categoryMargins']
}

function CategoryMarginChart({ categoryMargins }: CategoryMarginChartProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Margen por Categoría
      </h3>
      <div className="h-[300px]">
        {categoryMargins.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryMargins} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="category_name"
                tick={{ fontSize: 12 }}
                width={120}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Margen']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              />
              <Bar dataKey="margin_percentage" fill="var(--chart-2)" radius={[0, 4, 4, 0]}>
                {categoryMargins.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.margin_percentage < 15 ? 'var(--status-warning)' : 'var(--chart-2)'}
                  />
                ))}
              </Bar>
            </BarChart>
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

interface CategoryProfitChartProps {
  categoryMargins: MarginAnalyticsData['categoryMargins']
}

function CategoryProfitChart({ categoryMargins }: CategoryProfitChartProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Ganancia por Categoría
      </h3>
      <div className="h-[300px]">
        {categoryMargins.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryMargins}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total_profit"
                nameKey="category_name"
                label={({ name, percent }) =>
                  `${(name as string)?.substring(0, 10) || ''} ${Math.round((percent || 0) * 100)}%`
                }
              >
                {categoryMargins.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'Ganancia']}
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

interface LowMarginProductsTableProps {
  productMargins: MarginAnalyticsData['productMargins']
}

function LowMarginProductsTable({
  productMargins,
}: LowMarginProductsTableProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-[var(--status-warning)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Productos con Menor Margen
        </h3>
      </div>
      {productMargins.length > 0 ? (
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
                  Precio
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Costo
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Margen
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Vendidos
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody>
              {productMargins.slice(0, 20).map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-[var(--text-secondary)]">SKU: {product.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {product.category_name || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(product.base_price)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[var(--text-secondary)]">
                      {formatCurrency(product.cost)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium"
                      style={{
                        backgroundColor:
                          product.margin_percentage < 15
                            ? 'var(--status-warning-light)'
                            : 'var(--status-success-light)',
                        color:
                          product.margin_percentage < 15
                            ? 'var(--status-warning)'
                            : 'var(--status-success)',
                      }}
                    >
                      {product.margin_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[var(--text-primary)]">{product.units_sold}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-medium"
                      style={{
                        color:
                          product.total_profit >= 0
                            ? 'var(--status-success)'
                            : 'var(--status-error)',
                      }}
                    >
                      {formatCurrency(product.total_profit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          No hay datos de productos
        </div>
      )}
    </div>
  )
}
