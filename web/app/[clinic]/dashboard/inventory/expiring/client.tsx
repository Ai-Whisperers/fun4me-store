'use client'

/**
 * Expiring Products Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  Package,
  ArrowLeft,
  Loader2,
  Calendar,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface ExpiringProduct {
  id: string
  tenant_id: string
  name: string
  sku: string | null
  image_url: string | null
  stock_quantity: number
  expiry_date: string
  batch_number: string | null
  category_name: string | null
  days_until_expiry: number
  urgency_level: string
}

interface ExpiryTotals {
  expired: number
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

interface ExpiringProductsClientProps {
  clinic: string
}

type UrgencyFilter = 'all' | 'expired' | 'critical' | 'high' | 'medium' | 'low'
type DisposeStatus = 'idle' | 'loading' | 'success' | 'error'

const urgencyConfig = {
  expired: {
    label: 'Vencidos',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    description: 'Productos que ya vencieron',
  },
  critical: {
    label: 'Críticos (< 7 días)',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-700',
    icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
    description: 'Vencen en menos de 7 días',
  },
  high: {
    label: 'Altos (7-14 días)',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    description: 'Vencen en 7-14 días',
  },
  medium: {
    label: 'Medios (14-30 días)',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-5 w-5 text-yellow-500" />,
    description: 'Vencen en 14-30 días',
  },
  low: {
    label: 'Bajos (30-60 días)',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-700',
    icon: <Calendar className="h-5 w-5 text-green-500" />,
    description: 'Vencen en 30-60 días',
  },
}

export default function ExpiringProductsClient({
  clinic,
}: ExpiringProductsClientProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<UrgencyFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [disposeStatus, setDisposeStatus] = useState<DisposeStatus>('idle')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['expired', 'critical', 'high'])
  )

  // React Query: Fetch expiring products
  const {
    data: productsData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['expiring-products'],
    queryFn: async (): Promise<{ products: ExpiringProduct[]; totals: ExpiryTotals }> => {
      const response = await fetch('/api/dashboard/expiring-products?days=90')

      if (!response.ok) {
        throw new Error('Error al cargar productos')
      }

      const data = await response.json()
      return {
        products: data.products || [],
        totals: data.totals || { expired: 0, critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      }
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const products = productsData?.products || []
  const totals = productsData?.totals || { expired: 0, critical: 0, high: 0, medium: 0, low: 0, total: 0 }
  const error = queryError?.message || null

  const fetchProducts = async (): Promise<void> => {
    await refetch()
  }

  const toggleSection = (section: string): void => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const toggleProductSelection = (productId: string): void => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const selectAllInSection = (sectionProducts: ExpiringProduct[]): void => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      sectionProducts.forEach((p) => newSet.add(p.id))
      return newSet
    })
  }

  const clearSelection = (): void => {
    setSelectedProducts(new Set())
  }

  const disposeProduct = async (productId: string, quantity: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantityChange: -quantity,
          reason: 'expired',
          notes: 'Producto vencido - desechado desde Control de Vencimientos',
        }),
      })

      if (!response.ok) {
        return false
      }

      return true
    } catch (_error: unknown) {
      return false
    }
  }

  const handleDisposeSelected = async (): Promise<void> => {
    if (selectedProducts.size === 0) return

    setDisposeStatus('loading')
    const productsToDispose = products.filter((p) => selectedProducts.has(p.id))

    let successCount = 0
    for (const product of productsToDispose) {
      const success = await disposeProduct(product.id, product.stock_quantity)
      if (success) successCount++
    }

    if (successCount === productsToDispose.length) {
      setDisposeStatus('success')
      setSelectedProducts(new Set())
      await fetchProducts()
    } else {
      setDisposeStatus('error')
    }

    setTimeout(() => setDisposeStatus('idle'), 3000)
  }

  const handleDisposeSingle = async (product: ExpiringProduct): Promise<void> => {
    const success = await disposeProduct(product.id, product.stock_quantity)
    if (success) {
      await fetchProducts()
    }
  }

  // Apply search filter
  const searchFilteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.batch_number && p.batch_number.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query))
    )
  })

  const filteredProducts =
    filter === 'all'
      ? searchFilteredProducts
      : searchFilteredProducts.filter((p) => p.urgency_level === filter)

  const groupedProducts: Record<string, ExpiringProduct[]> = {
    expired: filteredProducts.filter((p) => p.urgency_level === 'expired'),
    critical: filteredProducts.filter((p) => p.urgency_level === 'critical'),
    high: filteredProducts.filter((p) => p.urgency_level === 'high'),
    medium: filteredProducts.filter((p) => p.urgency_level === 'medium'),
    low: filteredProducts.filter((p) => p.urgency_level === 'low'),
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              href={`/${clinic}/dashboard/inventory`}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
              <Clock className="h-7 w-7 text-[var(--primary)]" />
              Control de Vencimientos
            </h1>
          </div>
          <p className="ml-12 text-[var(--text-secondary)]">
            Gestiona productos próximos a vencer y toma acciones preventivas
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-xl border p-4 transition-all ${
            filter === 'all'
              ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totals.total}</div>
          <div className="text-xs text-[var(--text-secondary)]">Total</div>
        </button>

        {(Object.keys(urgencyConfig) as Array<keyof typeof urgencyConfig>).map((key) => {
          const config = urgencyConfig[key]
          const count = totals[key] || 0

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl border p-4 transition-all ${
                filter === key
                  ? `${config.borderColor} ${config.bgColor}`
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">{config.icon}</div>
              <div className={`text-2xl font-bold ${config.textColor}`}>{count}</div>
              <div className="truncate text-xs text-[var(--text-secondary)]">
                {config.label.split(' ')[0]}
              </div>
            </button>
          )
        })}
      </div>

      {/* Search and Bulk Actions Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU, lote..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Limpiar
            </button>
            <button
              onClick={handleDisposeSelected}
              disabled={disposeStatus === 'loading'}
              className="flex items-center gap-2 rounded-lg bg-[var(--status-error)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--status-error-text)] disabled:opacity-50"
            >
              {disposeStatus === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : disposeStatus === 'success' ? (
                <>
                  <Check className="h-4 w-4" />
                  ¡Desechados!
                </>
              ) : disposeStatus === 'error' ? (
                <>
                  <X className="h-4 w-4" />
                  Error
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Desechar Seleccionados
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-[var(--status-error-text)]">
          <AlertCircle className="h-5 w-5 text-[var(--status-error)]" />
          {error}
        </div>
      )}

      {/* No Products */}
      {filteredProducts.length === 0 && !loading && (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            No hay productos por vencer
          </h3>
          <p className="mt-1 text-[var(--text-secondary)]">
            {filter === 'all'
              ? 'No tienes productos próximos a vencer en los próximos 90 días'
              : `No hay productos en la categoría "${urgencyConfig[filter as keyof typeof urgencyConfig]?.label || filter}"`}
          </p>
        </div>
      )}

      {/* Product Groups */}
      {(Object.keys(groupedProducts) as Array<keyof typeof groupedProducts>).map((key) => {
        const products = groupedProducts[key]
        if (products.length === 0) return null

        const config = urgencyConfig[key as keyof typeof urgencyConfig]
        if (!config) return null

        const isExpanded = expandedSections.has(key)

        return (
          <div
            key={key}
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${config.borderColor}`}
          >
            <button
              onClick={() => toggleSection(key)}
              className={`flex w-full items-center justify-between p-4 ${config.bgColor}`}
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <div className="text-left">
                  <h2 className={`text-lg font-bold ${config.textColor}`}>{config.label}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {products.length} producto{products.length !== 1 ? 's' : ''} -{' '}
                    {config.description}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {/* Select All Row */}
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selectAllInSection(products)
                    }}
                    className="text-xs font-medium text-[var(--primary)] hover:underline"
                  >
                    Seleccionar todos ({products.length})
                  </button>
                </div>
                {products.map((product) => (
                  <div key={product.id} className="p-4 transition-colors hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <label className="flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                      </label>
                      {/* Product Image */}
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">
                              {product.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {product.sku && (
                                <span className="font-mono text-xs text-[var(--text-secondary)]">
                                  SKU: {product.sku}
                                </span>
                              )}
                              {product.batch_number && (
                                <span className="text-xs text-[var(--text-secondary)]">
                                  Lote: {product.batch_number}
                                </span>
                              )}
                              {product.category_name && (
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {product.category_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expiry Info */}
                          <div className="flex-shrink-0 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${config.badgeColor}`}
                            >
                              {key === 'expired' ? (
                                <>
                                  Venció hace {Math.abs(product.days_until_expiry)} día
                                  {Math.abs(product.days_until_expiry) !== 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  {product.days_until_expiry} día
                                  {product.days_until_expiry !== 1 ? 's' : ''}
                                </>
                              )}
                            </span>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              {formatDate(product.expiry_date)}
                            </p>
                          </div>
                        </div>

                        {/* Stock & Actions */}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm text-[var(--text-secondary)]">
                            <strong>{product.stock_quantity}</strong> unidades en stock
                          </span>
                          <div className="flex gap-2">
                            {key === 'expired' && (
                              <button
                                onClick={() => handleDisposeSingle(product)}
                                className="flex items-center gap-1 rounded-lg bg-[var(--status-error-bg)] px-3 py-1.5 text-xs font-medium text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-border)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Marcar como Desechado
                              </button>
                            )}
                            {(key === 'critical' || key === 'high') && (
                              <Link
                                href={`/${clinic}/dashboard/campaigns/new?product=${product.id}&discount=15`}
                                className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-100"
                              >
                                Crear Promoción
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Legend */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Filter className="h-5 w-5 text-gray-400" />
          Leyenda de Urgencia
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(urgencyConfig) as Array<keyof typeof urgencyConfig>).map((key) => {
            const config = urgencyConfig[key]
            return (
              <div key={key} className="flex items-start gap-3">
                {config.icon}
                <div>
                  <p className={`font-medium ${config.textColor}`}>{config.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{config.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
