'use client'

/**
 * Reorder Suggestions Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 */

import React, { useState, useEffect } from 'react'
import {
  ShoppingCart,
  AlertCircle,
  AlertTriangle,
  Package,
  Loader2,
  Building2,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface ReorderSuggestion {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  category_name: string | null
  stock_quantity: number
  available_quantity: number
  min_stock_level: number
  reorder_point: number | null
  reorder_quantity: number | null
  weighted_average_cost: number | null
  supplier_id: string | null
  supplier_name: string | null
  urgency: 'critical' | 'low' | 'reorder'
}

interface SupplierGroup {
  supplier_id: string | null
  supplier_name: string
  products: ReorderSuggestion[]
  total_cost: number
  total_items: number
}

interface Summary {
  total_products: number
  critical_count: number
  low_count: number
  total_estimated_cost?: number
}

interface ReorderSuggestionsProps {
  clinic: string
}

const urgencyConfig = {
  critical: {
    label: 'Sin Stock',
    bgColor: 'bg-[var(--status-error-bg)]',
    borderColor: 'border-[var(--status-error-border)]',
    textColor: 'text-[var(--status-error)]',
    icon: <AlertCircle className="h-4 w-4 text-[var(--status-error)]" />,
  },
  low: {
    label: 'Stock Bajo',
    bgColor: 'bg-[var(--status-warning-bg)]',
    borderColor: 'border-[var(--status-warning-border)]',
    textColor: 'text-[var(--status-warning)]',
    icon: <AlertTriangle className="h-4 w-4 text-[var(--status-warning)]" />,
  },
  reorder: {
    label: 'Reordenar',
    bgColor: 'bg-[var(--status-warning-bg)]',
    borderColor: 'border-[var(--status-warning-border)]',
    textColor: 'text-[var(--status-warning-text)]',
    icon: <ShoppingCart className="h-4 w-4 text-[var(--status-warning)]" />,
  },
}

export default function ReorderSuggestions({ clinic }: ReorderSuggestionsProps): React.ReactElement {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // React Query: Fetch reorder suggestions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', 'reorder-suggestions', { groupBySupplier: true }],
    queryFn: async (): Promise<{ grouped: SupplierGroup[]; summary: Summary }> => {
      const response = await fetch('/api/inventory/reorder-suggestions?groupBySupplier=true')
      if (!response.ok) throw new Error('Error al cargar sugerencias')
      return response.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const groups = data?.grouped || []
  const summary = data?.summary || null

  // Auto-expand first group when data loads
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groups[0].supplier_id || 'no-supplier']))
    }
  }, [groups, expandedGroups.size])

  const toggleGroup = (groupId: string): void => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Analizando inventario...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-[var(--status-error)]">
        <AlertCircle className="h-5 w-5" />
        Error al cargar las sugerencias de reorden
        <button
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1 rounded-lg bg-[var(--status-error-bg)] px-3 py-1 text-sm font-medium hover:opacity-80"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <Package className="mx-auto mb-4 h-12 w-12 text-[var(--status-success)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          ¡Inventario en orden!
        </h3>
        <p className="mt-1 text-[var(--text-secondary)]">
          No hay productos que necesiten reposición en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm">Total</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {summary?.total_products || 0}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">productos a reordenar</div>
        </div>

        <div className="rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--status-error)]">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Críticos</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--status-error)]">{summary?.critical_count || 0}</div>
          <div className="text-xs text-[var(--status-error)]">sin stock</div>
        </div>

        <div className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--status-warning)]">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Stock Bajo</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--status-warning)]">{summary?.low_count || 0}</div>
          <div className="text-xs text-[var(--status-warning)]">necesitan atención</div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm">Costo Est.</span>
          </div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">
            {formatCurrency(summary?.total_estimated_cost || 0)}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">para reposición</div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Supplier Groups */}
      {groups.map((group) => {
        const groupId = group.supplier_id || 'no-supplier'
        const isExpanded = expandedGroups.has(groupId)

        return (
          <div
            key={groupId}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <button
              onClick={() => toggleGroup(groupId)}
              className="flex w-full items-center justify-between bg-gray-50 p-4 hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                  <Building2 className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div className="text-left">
                  <h2 className="font-semibold text-[var(--text-primary)]">{group.supplier_name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {group.products.length} producto{group.products.length !== 1 ? 's' : ''} •{' '}
                    {formatCurrency(group.total_cost)} estimado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {group.supplier_id && (
                  <Link
                    href={`/${clinic}/dashboard/procurement/orders/new?supplier=${group.supplier_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Crear Orden
                  </Link>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {group.products.map((product) => {
                  const config = urgencyConfig[product.urgency]

                  return (
                    <div key={product.id} className="p-4 transition-colors hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {product.name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.textColor}`}
                            >
                              {config.icon}
                              {config.label}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                            {product.sku && (
                              <span className="font-mono text-xs">SKU: {product.sku}</span>
                            )}
                            {product.category_name && <span>{product.category_name}</span>}
                          </div>
                        </div>

                        {/* Stock Info */}
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {product.available_quantity} / {product.min_stock_level}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              actual / mínimo
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--primary)]">
                              +{product.reorder_quantity || 10}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">sugerido</div>
                          </div>
                          {product.weighted_average_cost && (
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)]">
                                {formatCurrency(
                                  product.weighted_average_cost * (product.reorder_quantity || 10)
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">costo est.</div>
                            </div>
                          )}
                        </div>

                        {/* Quick Action */}
                        <Link
                          href={`/${clinic}/dashboard/inventory?search=${encodeURIComponent(product.name)}`}
                          className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
