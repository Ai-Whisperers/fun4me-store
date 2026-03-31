'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

import {
  FileText,
  Check,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
} from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  requires_prescription: boolean
  prescription_file_url: string | null
  product: {
    id: string
    name: string
    image_url: string | null
  } | null
}

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
}

interface PendingOrder {
  id: string
  invoice_number: string
  status: string
  total: number
  requires_prescription_review: boolean
  prescription_file_url: string | null
  created_at: string
  customer: Customer | Customer[] | null
  items: OrderItem[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

interface Props {
  clinic: string
  config: ClinicConfig
}

export default function PrescriptionOrdersClient({ clinic: _clinic, config }: Props) {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [notes, setNotes] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const currency = config.settings?.currency || 'PYG'

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fetchOrders = useCallback(async (page: number = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/store/orders/pending-prescriptions?page=${page}&limit=10`)

      if (!response.ok) {
        throw new Error('Error al cargar pedidos')
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setPagination(data.pagination)
    } catch (err) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders:', err)
      }
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders(currentPage)
  }, [fetchOrders, currentPage])

  const handleReview = async () => {
    if (!selectedOrder || !reviewAction) return

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      setError('Por favor ingresa un motivo de rechazo')
      return
    }

    setIsReviewing(true)
    setError(null)

    try {
      const response = await fetch(`/api/store/orders/${selectedOrder.id}/prescription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          notes: notes.trim() || undefined,
          rejection_reason: reviewAction === 'reject' ? rejectionReason.trim() : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al procesar revisión')
      }

      // Success - refresh list and close modal
      setSelectedOrder(null)
      setReviewAction(null)
      setRejectionReason('')
      setNotes('')
      fetchOrders(currentPage)
    } catch (err) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reviewing order:', err)
      }
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsReviewing(false)
    }
  }

  const getCustomer = (order: PendingOrder): Customer | null => {
    if (!order.customer) return null
    return Array.isArray(order.customer) ? order.customer[0] : order.customer
  }

  const getPrescriptionItems = (order: PendingOrder) => {
    return order.items.filter((item) => item.requires_prescription)
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pedidos con Receta</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Revisa y aprueba pedidos que requieren verificación de receta médica
          </p>
        </div>
        <button
          onClick={() => fetchOrders(currentPage)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-subtle)] px-4 py-2 text-[var(--text-primary)] transition hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-white py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            No hay pedidos pendientes
          </h3>
          <p className="mt-1 text-[var(--text-secondary)]">
            Todos los pedidos con receta han sido procesados
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const customer = getCustomer(order)
            const prescriptionItems = getPrescriptionItems(order)

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-white"
              >
                {/* Order header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">
                          {order.invoice_number}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Pendiente Revisión
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.created_at)}
                        </span>
                        {customer && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {customer.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--primary)]">
                      {formatPrice(order.total)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {prescriptionItems.length} producto{prescriptionItems.length > 1 ? 's' : ''}{' '}
                      con receta
                    </p>
                  </div>
                </div>

                {/* Prescription items */}
                <div className="bg-gray-50 p-4">
                  <div className="space-y-3">
                    {prescriptionItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-lg bg-white p-3"
                      >
                        {/* Product image */}
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {item.product?.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product?.name || ''}
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <Package className="absolute inset-0 m-auto h-6 w-6 text-gray-400" />
                          )}
                        </div>

                        {/* Product info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--text-primary)]">
                            {item.product?.name || 'Producto'}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Cantidad: {item.quantity} × {formatPrice(item.unit_price)}
                          </p>
                        </div>

                        {/* Prescription file link */}
                        {item.prescription_file_url && (
                          <a
                            href={item.prescription_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Receta
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white p-4">
                  <button
                    onClick={() => {
                      setSelectedOrder(order)
                      setReviewAction('reject')
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 transition hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(order)
                      setReviewAction('approve')
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition hover:bg-green-600"
                  >
                    <Check className="h-4 w-4" />
                    Aprobar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev || isLoading}
            className="rounded-lg border border-[var(--border-default)] p-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-4 py-2 text-[var(--text-secondary)]">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={!pagination.hasNext || isLoading}
            className="rounded-lg border border-[var(--border-default)] p-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Review Modal */}
      {selectedOrder && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!isReviewing) {
                setSelectedOrder(null)
                setReviewAction(null)
                setRejectionReason('')
                setNotes('')
              }
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
              {reviewAction === 'approve' ? 'Aprobar Pedido' : 'Rechazar Pedido'}
            </h3>

            <div className="space-y-4">
              {/* Order info */}
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium">{selectedOrder.invoice_number}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {getCustomer(selectedOrder)?.full_name} - {formatPrice(selectedOrder.total)}
                </p>
              </div>

              {/* Rejection reason (only for reject) */}
              {reviewAction === 'reject' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    Motivo de rechazo *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-default)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Selecciona un motivo...</option>
                    <option value="Receta ilegible">Receta ilegible</option>
                    <option value="Receta vencida">Receta vencida</option>
                    <option value="Medicamento no coincide">
                      Medicamento no coincide con la receta
                    </option>
                    <option value="Falta firma del veterinario">Falta firma del veterinario</option>
                    <option value="Receta incompleta">Receta incompleta</option>
                    <option value="Dosis incorrecta">Dosis incorrecta en la receta</option>
                    <option value="Otro">Otro motivo</option>
                  </select>
                  {rejectionReason === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el motivo..."
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value)
                        setRejectionReason(e.target.value)
                      }}
                      className="mt-2 w-full rounded-lg border border-[var(--border-default)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  )}
                </div>
              )}

              {/* Notes (optional) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Agregar notas para el registro..."
                  className="w-full resize-none rounded-lg border border-[var(--border-default)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setSelectedOrder(null)
                  setReviewAction(null)
                  setRejectionReason('')
                  setNotes('')
                  setError(null)
                }}
                disabled={isReviewing}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReview}
                disabled={isReviewing || (reviewAction === 'reject' && !rejectionReason)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition disabled:opacity-50 ${
                  reviewAction === 'approve'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isReviewing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : reviewAction === 'approve' ? (
                  <>
                    <Check className="h-5 w-5" />
                    Confirmar Aprobación
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5" />
                    Confirmar Rechazo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
