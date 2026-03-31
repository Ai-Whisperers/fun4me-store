'use client'

/**
 * Inventory Tab Component
 *
 * Displays inventory turnover analytics including summary cards,
 * reorder suggestions, and product-level inventory status.
 */

import { Package, PackageX, TrendingDown, RotateCcw, AlertTriangle } from 'lucide-react'
import type { TurnoverAnalyticsData } from '../types'
import { TURNOVER_STATUS_COLORS, PRIORITY_COLORS } from '../types'
import { formatCurrency } from '../utils/format'

interface InventoryTabProps {
  data: TurnoverAnalyticsData
}

export function InventoryTab({ data }: InventoryTabProps): React.ReactElement {
  return (
    <>
      {/* Turnover Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Valor Inventario"
          value={formatCurrency(data.summary.total_inventory_value)}
          subtitle={`${data.summary.total_products} productos`}
          iconBg="var(--accent-blue-light)"
          iconColor="var(--accent-blue)"
          icon={Package}
        />
        <SummaryCard
          title="Stock Crítico / Bajo"
          value={`${data.summary.critical_stock_count} / ${data.summary.low_stock_count}`}
          subtitle="Requieren atención"
          valueColor="var(--status-error)"
          iconBg="var(--status-error-light)"
          iconColor="var(--status-error)"
          icon={PackageX}
        />
        <SummaryCard
          title="Sobrestock / Lento"
          value={`${data.summary.overstocked_count} / ${data.summary.slow_moving_count}`}
          subtitle="Optimizar rotación"
          valueColor="var(--accent-orange)"
          iconBg="var(--accent-orange-light)"
          iconColor="var(--accent-orange)"
          icon={TrendingDown}
        />
        <SummaryCard
          title="Rotación Promedio"
          value={`${data.summary.avg_turnover_ratio.toFixed(2)}x`}
          subtitle="Veces en el período"
          iconBg="var(--accent-green-light)"
          iconColor="var(--accent-green)"
          icon={RotateCcw}
        />
      </div>

      {/* Reorder Suggestions */}
      {data.reorderSuggestions.length > 0 && (
        <ReorderSuggestionsTable suggestions={data.reorderSuggestions} />
      )}

      {/* Inventory Status Table */}
      <InventoryStatusTable productTurnover={data.productTurnover} />
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
          <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: iconBg }}>
          <Icon className="h-6 w-6" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  )
}

interface ReorderSuggestionsTableProps {
  suggestions: TurnoverAnalyticsData['reorderSuggestions']
}

function ReorderSuggestionsTable({
  suggestions,
}: ReorderSuggestionsTableProps): React.ReactElement {
  const priorityLabels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--status-warning)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Sugerencias de Reposición
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                Prioridad
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                Producto
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                Stock Actual
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                Punto Reorden
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                Días hasta Agotarse
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                Cantidad Sugerida
              </th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((suggestion) => (
              <tr key={suggestion.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: PRIORITY_COLORS[suggestion.priority].bg,
                      color: PRIORITY_COLORS[suggestion.priority].text,
                    }}
                  >
                    {priorityLabels[suggestion.priority]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{suggestion.name}</p>
                    {suggestion.sku && (
                      <p className="text-xs text-[var(--text-secondary)]">SKU: {suggestion.sku}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className="font-medium"
                    style={{
                      color:
                        suggestion.current_stock === 0
                          ? 'var(--status-error)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {suggestion.current_stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[var(--text-secondary)]">{suggestion.reorder_point}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {suggestion.days_until_stockout !== null ? (
                    <span
                      className="font-medium"
                      style={{
                        color:
                          suggestion.days_until_stockout <= 3
                            ? 'var(--status-error)'
                            : suggestion.days_until_stockout <= 7
                              ? 'var(--status-warning)'
                              : 'var(--text-primary)',
                      }}
                    >
                      {suggestion.days_until_stockout} días
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)]">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-[var(--primary)]">
                    +{suggestion.suggested_quantity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface InventoryStatusTableProps {
  productTurnover: TurnoverAnalyticsData['productTurnover']
}

function InventoryStatusTable({
  productTurnover,
}: InventoryStatusTableProps): React.ReactElement {
  const statusLabels: Record<string, string> = {
    critical: 'Crítico',
    low: 'Bajo',
    healthy: 'Saludable',
    overstocked: 'Sobrestock',
    slow_moving: 'Lento',
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-[var(--primary)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Estado de Inventario por Producto
        </h3>
      </div>
      {productTurnover.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Producto
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Venta Diaria
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Días Inventario
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Rotación
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {productTurnover.slice(0, 30).map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor:
                          TURNOVER_STATUS_COLORS[product.status]?.bg || 'var(--bg-tertiary)',
                        color:
                          TURNOVER_STATUS_COLORS[product.status]?.text || 'var(--text-secondary)',
                      }}
                    >
                      {statusLabels[product.status] || product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                      {product.category_name && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {product.category_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-[var(--text-primary)]">
                      {product.current_stock}
                    </span>
                    {product.reorder_point && (
                      <span className="block text-xs text-[var(--text-secondary)]">
                        (min: {product.reorder_point})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[var(--text-primary)]">
                      {product.avg_daily_sales.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {product.days_of_inventory !== null ? (
                      <span
                        className="font-medium"
                        style={{
                          color:
                            product.days_of_inventory <= 7
                              ? 'var(--status-error)'
                              : product.days_of_inventory <= 14
                                ? 'var(--status-warning)'
                                : product.days_of_inventory > 180
                                  ? 'var(--accent-purple)'
                                  : 'var(--text-primary)',
                        }}
                      >
                        {product.days_of_inventory}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">∞</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[var(--text-primary)]">
                      {product.turnover_ratio.toFixed(2)}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(product.cost_value)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          No hay datos de inventario
        </div>
      )}
    </div>
  )
}
