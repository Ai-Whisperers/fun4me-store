'use client'

/**
 * Price Comparison Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 */

import { useState, useMemo } from 'react'
import {
  Search,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
  Package,
  Star,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface ComparisonSupplier {
  supplier: {
    id: string
    name: string
    verification_status: string
  } | null
  unit_cost: number
  minimum_order_qty: number | null
  lead_time_days: number | null
  is_preferred: boolean
  last_verified_at: string | null
  total_lead_time: number
}

interface ProductComparison {
  product: {
    id: string
    sku: string
    name: string
    base_unit: string
  } | null
  suppliers: ComparisonSupplier[]
  best_price: number | null
  price_range: { min: number; max: number } | null
}

interface PriceComparisonProps {
  productIds: string[]
  onSelectSupplier?: (supplierId: string, productId: string, unitCost: number) => void
}

export function PriceComparison({ productIds, onSelectSupplier }: PriceComparisonProps): React.ReactElement {
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  // Stable key for productIds array
  const productIdsKey = useMemo(() => productIds.join(','), [productIds])

  // React Query: Fetch price comparison
  const { data, isLoading, error } = useQuery({
    queryKey: ['procurement', 'compare', productIdsKey, { verifiedOnly }],
    queryFn: async (): Promise<{ comparison: ProductComparison[] }> => {
      const params = new URLSearchParams({
        products: productIdsKey,
        verified_only: verifiedOnly.toString(),
      })
      const res = await fetch(`/api/procurement/compare?${params.toString()}`)
      if (!res.ok) throw new Error('Error al comparar precios')
      return res.json()
    },
    enabled: productIds.length > 0,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const comparisons = data?.comparison || []

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[var(--status-error-bg)] p-4 text-center text-[var(--status-error)]">
        Error al cargar la comparación de precios
      </div>
    )
  }

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">Sin productos para comparar</p>
          <p className="text-sm text-gray-400">Selecciona productos para ver precios de proveedores</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          Solo proveedores verificados
        </label>
      </div>

      {/* Comparisons */}
      {comparisons.map((comparison) => (
        <Card key={comparison.product?.id || 'unknown'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Package className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="text-base">{comparison.product?.name || 'Producto'}</CardTitle>
                  <p className="text-sm text-gray-500">SKU: {comparison.product?.sku || '-'}</p>
                </div>
              </div>
              {comparison.price_range && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Rango de precios</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    ₲{comparison.price_range.min.toLocaleString()} - ₲{comparison.price_range.max.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {comparison.suppliers.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">
                No hay cotizaciones para este producto
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left font-medium text-gray-600">Proveedor</th>
                      <th className="pb-2 text-right font-medium text-gray-600">Costo Unit.</th>
                      <th className="pb-2 text-right font-medium text-gray-600">Ahorro</th>
                      <th className="pb-2 text-right font-medium text-gray-600">Min. Orden</th>
                      <th className="pb-2 text-right font-medium text-gray-600">Lead Time</th>
                      <th className="pb-2 text-right font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.suppliers
                      .sort((a, b) => a.unit_cost - b.unit_cost)
                      .map((supplierData, index) => {
                        const isBest = index === 0
                        const savings = comparison.best_price
                          ? ((supplierData.unit_cost - comparison.best_price) / comparison.best_price) * 100
                          : 0

                        return (
                          <tr
                            key={supplierData.supplier?.id || index}
                            className={`border-b border-gray-50 ${isBest ? 'bg-[var(--status-success-bg)]/50' : ''}`}
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {supplierData.supplier?.name || 'Proveedor'}
                                {supplierData.is_preferred && (
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                )}
                                {supplierData.supplier?.verification_status === 'verified' && (
                                  <CheckCircle className="h-3.5 w-3.5 text-[var(--status-success)]" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <span className={`font-medium ${isBest ? 'text-[var(--status-success)]' : ''}`}>
                                ₲{supplierData.unit_cost.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {isBest ? (
                                <span className="flex items-center justify-end gap-1 text-[var(--status-success)]">
                                  <TrendingDown className="h-3.5 w-3.5" />
                                  Mejor precio
                                </span>
                              ) : savings > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-[var(--status-error)]">
                                  <TrendingUp className="h-3.5 w-3.5" />
                                  +{savings.toFixed(1)}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 text-right text-gray-500">
                              {supplierData.minimum_order_qty || '-'}
                            </td>
                            <td className="py-3 text-right">
                              {supplierData.total_lead_time > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-gray-500">
                                  <Clock className="h-3.5 w-3.5" />
                                  {supplierData.total_lead_time}d
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {onSelectSupplier && supplierData.supplier && comparison.product && (
                                // Non-null assertions safe: conditional checks supplier and product exist
                                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                                <button
                                  onClick={() => onSelectSupplier(
                                    supplierData.supplier!.id,
                                    comparison.product!.id,
                                    supplierData.unit_cost
                                  )}
                                  className="rounded-lg bg-[var(--primary)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                                >
                                  Seleccionar
                                </button>
                                /* eslint-enable @typescript-eslint/no-non-null-assertion */
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
