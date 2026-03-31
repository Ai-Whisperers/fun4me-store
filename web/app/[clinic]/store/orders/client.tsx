'use client'

/**
 * Order History Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Calendar,
  MapPin,
  CreditCard,
  RotateCcw,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { OrderInvoicePDFButton } from '@/components/store/order-invoice-pdf'
import { clsx } from 'clsx'
import type { ClinicConfig } from '@/lib/clinics'
import { useCart } from '@/context/cart-context'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  variant_id: string | null
  variant_name: string | null
  quantity: number
  unit_price: number
  line_total: number
  store_products?: {
    id: string
    name: string
    image_url: string | null
  }
}

interface Order {
  id: string
  order_number: string
  status: string
  subtotal: number
  discount_amount: number
  coupon_code: string | null
  shipping_cost: number
  tax_amount: number
  total: number
  shipping_address: {
    street?: string
    city?: string
    phone?: string
  } | null
  shipping_method: string
  tracking_number: string | null
  payment_method: string
  payment_status: string
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
  store_order_items: OrderItem[]
}

interface Props {
  readonly config: ClinicConfig
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: string
    bgColor: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  pending: { label: 'Pendiente', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
  confirmed: {
    label: 'Confirmado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: CheckCircle,
  },
  processing: {
    label: 'Preparando',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: Package,
  },
  shipped: { label: 'Enviado', color: 'text-indigo-600', bgColor: 'bg-indigo-50', icon: Truck },
  delivered: {
    label: 'Entregado',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
  refunded: {
    label: 'Reembolsado',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: RotateCcw,
  },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Contra Entrega',
  card: 'Tarjeta',
  bank_transfer: 'Transferencia',
}

interface OrdersResponse {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function OrderHistoryClient({ config }: Props) {
  const { clinic } = useParams() as { clinic: string }
  const router = useRouter()
  const { addItem } = useCart()

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [reorderingItem, setReorderingItem] = useState<string | null>(null)
  const [reorderingOrder, setReorderingOrder] = useState<string | null>(null)
  // BUG-013: State for cancel order functionality
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [reorderFeedback, setReorderFeedback] = useState<{
    type: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  // React Query: Fetch orders
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: fetchOrders,
  } = useQuery({
    queryKey: ['store-orders', clinic, page, statusFilter],
    queryFn: async (): Promise<OrdersResponse> => {
      const params = new URLSearchParams()
      params.set('clinic', clinic)
      params.set('page', page.toString())
      params.set('limit', '10')
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/store/orders?${params.toString()}`)

      if (res.status === 401) {
        router.push(`/${clinic}/portal/signup?redirect=/store/orders`)
        throw new Error('Unauthorized')
      }

      if (!res.ok) {
        throw new Error('Error al cargar pedidos')
      }

      return res.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
    enabled: !!clinic,
  })

  const orders = data?.orders || []
  const totalPages = data?.pagination?.pages || 1
  const error = queryError?.message === 'Unauthorized' ? null : queryError?.message || null

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return 'Gs 0'
    return `Gs ${price.toLocaleString('es-PY')}`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const toggleExpanded = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  // Add single item to cart
  const handleAddToCart = async (item: OrderItem) => {
    setReorderingItem(item.id)
    setReorderFeedback(null)

    try {
      // Fetch current stock for the product
      const res = await fetch(`/api/store/products/${item.product_id}?clinic=${clinic}`)
      if (!res.ok) {
        setReorderFeedback({ type: 'error', message: 'Producto no disponible' })
        return
      }

      const product = await res.json()
      const stock = product.store_inventory?.stock_quantity || 0

      if (stock <= 0) {
        setReorderFeedback({ type: 'error', message: `${item.product_name} sin stock` })
        return
      }

      const result = addItem({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        type: 'product',
        image_url: item.store_products?.image_url || undefined,
        stock,
        variant_id: item.variant_id || undefined,
      })

      if (result.success) {
        if (result.limitedByStock) {
          setReorderFeedback({
            type: 'warning',
            message: result.message || 'Cantidad limitada por stock',
          })
        } else {
          setReorderFeedback({
            type: 'success',
            message: `${item.product_name} agregado al carrito`,
          })
        }
      } else {
        setReorderFeedback({ type: 'error', message: result.message || 'No se pudo agregar' })
      }
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding to cart:', e)
      }
      setReorderFeedback({ type: 'error', message: 'Error al agregar al carrito' })
    } finally {
      setReorderingItem(null)
      // Clear feedback after 3 seconds
      setTimeout(() => setReorderFeedback(null), 3000)
    }
  }

  // Reorder entire order
  const handleReorderAll = async (order: Order) => {
    setReorderingOrder(order.id)
    setReorderFeedback(null)

    try {
      let addedCount = 0
      let skippedCount = 0
      const skippedItems: string[] = []

      for (const item of order.store_order_items) {
        // Fetch current stock
        const res = await fetch(`/api/store/products/${item.product_id}?clinic=${clinic}`)
        if (!res.ok) {
          skippedCount++
          skippedItems.push(item.product_name)
          continue
        }

        const product = await res.json()
        const stock = product.store_inventory?.stock_quantity || 0

        if (stock <= 0) {
          skippedCount++
          skippedItems.push(item.product_name)
          continue
        }

        const result = addItem(
          {
            id: item.product_id,
            name: item.product_name,
            price: item.unit_price,
            type: 'product',
            image_url: item.store_products?.image_url || undefined,
            stock,
            variant_id: item.variant_id || undefined,
          },
          item.quantity
        )

        if (result.success) {
          addedCount++
        } else {
          skippedCount++
          skippedItems.push(item.product_name)
        }
      }

      if (addedCount > 0 && skippedCount === 0) {
        setReorderFeedback({
          type: 'success',
          message: `${addedCount} producto${addedCount > 1 ? 's' : ''} agregado${addedCount > 1 ? 's' : ''} al carrito`,
        })
      } else if (addedCount > 0 && skippedCount > 0) {
        setReorderFeedback({
          type: 'warning',
          message: `${addedCount} agregado${addedCount > 1 ? 's' : ''}, ${skippedCount} sin stock`,
        })
      } else {
        setReorderFeedback({
          type: 'error',
          message: 'Ningún producto disponible',
        })
      }
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reordering:', e)
      }
      setReorderFeedback({ type: 'error', message: 'Error al reordenar' })
    } finally {
      setReorderingOrder(null)
      setTimeout(() => setReorderFeedback(null), 4000)
    }
  }

  // BUG-013: Handle order cancellation
  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    // Confirmation dialog
    if (!confirm(`¿Estás seguro de que deseas cancelar el pedido #${orderNumber}?`)) {
      return
    }

    setCancellingOrderId(orderId)
    setReorderFeedback(null)

    try {
      const response = await fetch(`/api/store/orders/${orderId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cancelar')
      }

      setReorderFeedback({
        type: 'success',
        message: `Pedido #${orderNumber} cancelado exitosamente`,
      })

      // Refresh the orders list
      fetchOrders()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al cancelar el pedido'
      setReorderFeedback({ type: 'error', message: errorMessage })
    } finally {
      setCancellingOrderId(null)
      setTimeout(() => setReorderFeedback(null), 4000)
    }
  }

  if (!clinic) return null

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] pb-20">
      {/* Feedback Toast */}
      {reorderFeedback && (
        <div
          className={clsx(
            'fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl px-6 py-3 font-medium shadow-lg transition-all',
            reorderFeedback.type === 'success' && 'bg-[var(--status-success)] text-white',
            reorderFeedback.type === 'warning' && 'bg-[var(--status-warning)] text-white',
            reorderFeedback.type === 'error' && 'bg-[var(--status-error)] text-white'
          )}
        >
          {reorderFeedback.message}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link
            href={`/${clinic}/store`}
            className="flex items-center gap-2 font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Volver a Tienda</span>
          </Link>

          <h1 className="text-lg font-bold text-[var(--text-primary)]">Mis Pedidos</h1>

          <Link href={`/${clinic}/cart`} className="rounded-full p-2 transition hover:bg-gray-100">
            <ShoppingBag className="h-6 w-6 text-gray-700" />
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-gray-200 bg-white text-[var(--text-secondary)] hover:border-[var(--primary)]'
              )}
            >
              {status === 'all' ? 'Todos' : STATUS_CONFIG[status]?.label || status}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[var(--primary)]" />
              <p className="text-[var(--text-secondary)]">Cargando pedidos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-20">
            <div className="max-w-md text-center">
              <AlertCircle className="mx-auto mb-4 h-16 w-16 text-[var(--status-error)]" />
              <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Error</h2>
              <p className="mb-6 text-[var(--text-secondary)]">{error}</p>
              <button
                onClick={() => fetchOrders()}
                className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Sin pedidos</h3>
            <p className="mx-auto mb-6 max-w-md text-[var(--text-secondary)]">
              {statusFilter !== 'all'
                ? `No tienes pedidos con estado "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"`
                : 'Aún no has realizado ningún pedido'}
            </p>
            <Link
              href={`/${clinic}/store`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="h-4 w-4" />
              Explorar Tienda
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedOrder === order.id

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  {/* Order Header */}
                  <button
                    onClick={() => toggleExpanded(order.id)}
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50 md:p-6"
                  >
                    {/* Status Icon */}
                    <div
                      className={clsx(
                        'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
                        statusConfig.bgColor
                      )}
                    >
                      <StatusIcon className={clsx('h-6 w-6', statusConfig.color)} />
                    </div>

                    {/* Order Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">
                          #{order.order_number}
                        </span>
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            statusConfig.bgColor,
                            statusConfig.color
                          )}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {formatDate(order.created_at)} • {order.store_order_items.length} producto
                        {order.store_order_items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-lg font-bold text-[var(--text-primary)]">
                        {formatPrice(order.total)}
                      </span>
                      <ChevronDown
                        className={clsx(
                          'mx-auto mt-1 h-5 w-5 text-gray-400 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Items */}
                      <div className="space-y-4 p-4 md:p-6">
                        <h4 className="font-semibold text-[var(--text-primary)]">Productos</h4>
                        {order.store_order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                              {item.store_products?.image_url ? (
                                <Image
                                  src={item.store_products.image_url}
                                  alt={item.product_name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/${clinic}/store/product/${item.product_id}`}
                                className="line-clamp-1 font-medium text-[var(--text-primary)] hover:text-[var(--primary)]"
                              >
                                {item.product_name}
                              </Link>
                              {item.variant_name && (
                                <p className="text-sm text-[var(--text-muted)]">
                                  {item.variant_name}
                                </p>
                              )}
                              <p className="text-sm text-[var(--text-secondary)]">
                                {item.quantity} x {formatPrice(item.unit_price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-[var(--text-primary)]">
                                {formatPrice(item.line_total)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToCart(item)
                                }}
                                disabled={reorderingItem === item.id}
                                className="hover:bg-[var(--primary)]/10 rounded-lg p-2 text-[var(--primary)] transition-colors disabled:opacity-50"
                                title="Agregar al carrito"
                              >
                                {reorderingItem === item.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <Plus className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Summary */}
                      <div className="border-t border-gray-100 px-4 pb-4 pt-4 md:px-6 md:pb-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left: Shipping & Payment */}
                          <div className="space-y-4">
                            {order.shipping_address && (
                              <div className="flex items-start gap-3">
                                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" />
                                <div>
                                  <p className="font-medium text-[var(--text-primary)]">
                                    Dirección de Envío
                                  </p>
                                  <p className="text-sm text-[var(--text-secondary)]">
                                    {order.shipping_address.street}
                                    {order.shipping_address.city &&
                                      `, ${order.shipping_address.city}`}
                                  </p>
                                  {order.shipping_address.phone && (
                                    <p className="text-sm text-[var(--text-muted)]">
                                      Tel: {order.shipping_address.phone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-3">
                              <CreditCard className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" />
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  Método de Pago
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {PAYMENT_METHOD_LABELS[order.payment_method] ||
                                    order.payment_method}
                                </p>
                              </div>
                            </div>

                            {order.tracking_number && (
                              <div className="flex items-start gap-3">
                                <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" />
                                <div>
                                  <p className="font-medium text-[var(--text-primary)]">
                                    Seguimiento
                                  </p>
                                  <p className="font-mono text-sm text-[var(--text-secondary)]">
                                    {order.tracking_number}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Pricing Summary */}
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Subtotal</span>
                              <span className="text-[var(--text-primary)]">
                                {formatPrice(order.subtotal)}
                              </span>
                            </div>
                            {order.discount_amount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>
                                  Descuento
                                  {order.coupon_code && ` (${order.coupon_code})`}
                                </span>
                                <span>-{formatPrice(order.discount_amount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Envío</span>
                              <span className="text-[var(--text-primary)]">
                                {order.shipping_cost > 0
                                  ? formatPrice(order.shipping_cost)
                                  : 'Gratis'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">IVA (10%)</span>
                              <span className="text-[var(--text-primary)]">
                                {formatPrice(order.tax_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                              <span className="text-[var(--text-primary)]">Total</span>
                              <span className="text-[var(--text-primary)]">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      {(order.shipped_at || order.delivered_at) && (
                        <div className="border-t border-gray-100 px-4 pb-4 pt-4 md:px-6 md:pb-6">
                          <h4 className="mb-3 font-semibold text-[var(--text-primary)]">
                            Historial
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                              <span className="text-[var(--text-secondary)]">
                                Pedido realizado: {formatDateTime(order.created_at)}
                              </span>
                            </div>
                            {order.shipped_at && (
                              <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-[var(--text-muted)]" />
                                <span className="text-[var(--text-secondary)]">
                                  Enviado: {formatDateTime(order.shipped_at)}
                                </span>
                              </div>
                            )}
                            {order.delivered_at && (
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-[var(--text-secondary)]">
                                  Entregado: {formatDateTime(order.delivered_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 px-4 pb-4 md:px-6 md:pb-6">
                        <button
                          onClick={() => handleReorderAll(order)}
                          disabled={reorderingOrder === order.id}
                          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {reorderingOrder === order.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Agregando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Reordenar Todo
                            </>
                          )}
                        </button>
                        <OrderInvoicePDFButton order={order} clinicName={config.name} />
                        {/* BUG-013: Cancel button with onClick handler */}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCancelOrder(order.id, order.order_number)}
                            disabled={cancellingOrderId === order.id}
                            className="flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] px-4 py-2 font-medium text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-bg)] disabled:opacity-50"
                          >
                            {cancellingOrderId === order.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cancelando...
                              </>
                            ) : (
                              'Cancelar'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={clsx(
                    'rounded-lg px-4 py-2 font-medium transition-colors',
                    page === 1
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'border border-gray-200 bg-white text-gray-700 hover:border-[var(--primary)]'
                  )}
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-[var(--text-secondary)]">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={clsx(
                    'rounded-lg px-4 py-2 font-medium transition-colors',
                    page === totalPages
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'border border-gray-200 bg-white text-gray-700 hover:border-[var(--primary)]'
                  )}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
