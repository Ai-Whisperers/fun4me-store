'use client'

/**
 * Purchase Order List Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 */

import { useState, useMemo } from 'react'
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  MoreVertical,
  Eye,
  Pencil,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface PurchaseOrderItem {
  id: string
  quantity: number
  unit_cost: number
  received_quantity: number
  catalog_products: {
    id: string
    sku: string
    name: string
  } | null
}

interface PurchaseOrder {
  id: string
  order_number: string
  status: 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled'
  subtotal: number
  total: number
  expected_delivery_date: string | null
  created_at: string
  suppliers: {
    id: string
    name: string
  } | null
  purchase_order_items: PurchaseOrderItem[]
  profiles: {
    id: string
    full_name: string
  } | null
}

interface PurchaseOrderListProps {
  onCreateClick: () => void
  onViewClick: (order: PurchaseOrder) => void
  onEditClick: (order: PurchaseOrder) => void
}

const STATUS_CONFIG = {
  draft: { label: 'Borrador', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  submitted: { label: 'Enviado', icon: Clock, color: 'text-[var(--status-info)]', bg: 'bg-[var(--status-info-bg)]' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'text-[var(--status-success)]', bg: 'bg-[var(--status-success-bg)]' },
  shipped: { label: 'En Camino', icon: Truck, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10' },
  received: { label: 'Recibido', icon: Package, color: 'text-[var(--status-success)]', bg: 'bg-[var(--status-success-bg)]' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-[var(--status-error)]', bg: 'bg-[var(--status-error-bg)]' },
}

export function PurchaseOrderList({
  onCreateClick,
  onViewClick,
  onEditClick,
}: PurchaseOrderListProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Build filters object for query key
  const filters = useMemo(() => ({
    status: statusFilter || undefined,
  }), [statusFilter])

  // React Query: Fetch purchase orders with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.procurement.orders(filters),
    queryFn: async (): Promise<{ orders: PurchaseOrder[] }> => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)

      const res = await fetch(`/api/procurement/orders?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar órdenes')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const orders = data?.orders || []

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="submitted">Enviado</option>
            <option value="confirmed">Confirmado</option>
            <option value="shipped">En Camino</option>
            <option value="received">Recibido</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <button
            onClick={() => refetch()}
            className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            title="Actualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Orden
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--status-error-bg)] p-4 text-[var(--status-error)]">
          {error instanceof Error ? error.message : 'Error al cargar las órdenes de compra'}
        </div>
      )}

      {/* Order List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No hay órdenes de compra</p>
            <p className="text-sm text-gray-400">Crea tu primera orden para comenzar</p>
            <button
              onClick={onCreateClick}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Crear Orden
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Proveedor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Items</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entrega Est.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Creado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status]
                const StatusIcon = statusConfig.icon
                const itemCount = order.purchase_order_items?.length || 0
                const receivedCount = order.purchase_order_items?.filter(
                  i => i.received_quantity >= i.quantity
                ).length || 0

                return (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {order.suppliers?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600">
                        {order.status === 'received' || order.status === 'shipped' ? (
                          <span>{receivedCount}/{itemCount} recibidos</span>
                        ) : (
                          <span>{itemCount} items</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₲{order.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === order.id ? null : order.id)}
                          className="rounded-lg p-1 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>

                        {activeMenu === order.id && (
                          <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            <button
                              onClick={() => {
                                onViewClick(order)
                                setActiveMenu(null)
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalles
                            </button>
                            {order.status === 'draft' && (
                              <button
                                onClick={() => {
                                  onEditClick(order)
                                  setActiveMenu(null)
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
