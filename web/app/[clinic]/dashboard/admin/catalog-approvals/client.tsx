'use client'

/**
 * Catalog Approvals Client
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Package,
  Building,
  Eye,
  X,
  Check,
  HelpCircle,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  base_price: number
  images: string[] | null
  verification_status: 'pending' | 'verified' | 'rejected' | 'needs_review'
  created_at: string
  verified_at: string | null
  category: { id: string; name: string } | null
  brand: { id: string; name: string } | null
  created_by_tenant: { id: string; name: string } | null
  verified_by_profile: { id: string; full_name: string } | null
  attributes: Record<string, unknown> | null
}

interface Summary {
  pending: number
  verified: number
  rejected: number
  needs_review: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

interface CatalogApprovalsClientProps {
  clinic: string
}

type VerificationStatus = 'all' | 'pending' | 'verified' | 'rejected' | 'needs_review'

const statusOptions: { value: VerificationStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'verified', label: 'Verificados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'needs_review', label: 'Requieren Revisión' },
]

function getStatusBadge(status: string): React.ReactElement {
  // Use CSS variables for themeable status colors
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> =
    {
      pending: {
        bg: 'bg-[var(--status-warning-bg)]',
        text: 'text-[var(--status-warning-dark)]',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pendiente',
      },
      verified: {
        bg: 'bg-[var(--status-success-bg)]',
        text: 'text-[var(--status-success-dark)]',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Verificado',
      },
      rejected: {
        bg: 'bg-[var(--status-error-bg)]',
        text: 'text-[var(--status-error-dark)]',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Rechazado',
      },
      needs_review: {
        bg: 'bg-[var(--status-warning-bg)]',
        text: 'text-[var(--status-warning)]',
        icon: <HelpCircle className="h-3 w-3" />,
        label: 'Requiere Revisión',
      },
    }

  const c = config[status] || config.pending

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `₲ ${amount.toLocaleString('es-PY')}`
}

export default function CatalogApprovalsClient({
  clinic: _clinic,
}: CatalogApprovalsClientProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VerificationStatus>('pending')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  // React Query: Fetch products
  const {
    data: productsData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['catalog-approvals', statusFilter, page, limit, search],
    queryFn: async (): Promise<{ products: Product[]; summary: Summary; pagination: Pagination }> => {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: String(limit),
      })

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/admin/products/pending?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar productos')
      }

      const data = await response.json()
      return {
        products: data.products || [],
        summary: data.summary || { pending: 0, verified: 0, rejected: 0, needs_review: 0 },
        pagination: data.pagination || { page: 1, limit: 25, total: 0, pages: 0, hasNext: false, hasPrev: false },
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Approve/reject product
  const approveMutation = useMutation({
    mutationFn: async (params: { productId: string; action: 'verify' | 'reject' | 'needs_review'; reason?: string }) => {
      const body: Record<string, string> = { action: params.action }
      if (params.action === 'reject' && params.reason) {
        body.rejection_reason = params.reason
      }

      const response = await fetch(`/api/admin/products/${params.productId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Error al procesar producto')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-approvals'] })
      setShowRejectModal(false)
      setRejectionReason('')
      setShowDetail(false)
    },
  })

  const products = productsData?.products || []
  const summary = productsData?.summary || { pending: 0, verified: 0, rejected: 0, needs_review: 0 }
  const pagination = productsData?.pagination || { page: 1, limit: 25, total: 0, pages: 0, hasNext: false, hasPrev: false }
  const error = queryError?.message || approveMutation.error?.message || null
  const processing = approveMutation.isPending

  const handleApprove = async (
    productId: string,
    action: 'verify' | 'reject' | 'needs_review'
  ): Promise<void> => {
    await approveMutation.mutateAsync({
      productId,
      action,
      reason: action === 'reject' ? rejectionReason : undefined,
    })
  }

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Shield className="h-7 w-7 text-[var(--primary)]" />
            Aprobación de Catálogo Global
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Revisa y aprueba productos enviados por clínicas para el catálogo global
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          onClick={() => {
            setStatusFilter('pending')
            setPage(1)
          }}
          className={`rounded-xl border p-4 transition-all ${
            statusFilter === 'pending'
              ? 'border-[var(--status-warning)] bg-[var(--status-warning-bg)]'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--status-warning-bg)] p-2">
              <Clock className="h-5 w-5 text-[var(--status-warning)]" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-[var(--status-warning)]">{summary.pending}</div>
              <div className="text-xs text-[var(--text-secondary)]">Pendientes</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setStatusFilter('verified')
            setPage(1)
          }}
          className={`rounded-xl border p-4 transition-all ${
            statusFilter === 'verified'
              ? 'border-[var(--status-success)] bg-[var(--status-success-bg)]'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--status-success-bg)] p-2">
              <CheckCircle className="h-5 w-5 text-[var(--status-success)]" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-[var(--status-success)]">{summary.verified}</div>
              <div className="text-xs text-[var(--text-secondary)]">Verificados</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setStatusFilter('rejected')
            setPage(1)
          }}
          className={`rounded-xl border p-4 transition-all ${
            statusFilter === 'rejected'
              ? 'border-[var(--status-error)] bg-[var(--status-error-bg)]'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--status-error-bg)] p-2">
              <XCircle className="h-5 w-5 text-[var(--status-error)]" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-[var(--status-error)]">{summary.rejected}</div>
              <div className="text-xs text-[var(--text-secondary)]">Rechazados</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setStatusFilter('needs_review')
            setPage(1)
          }}
          className={`rounded-xl border p-4 transition-all ${
            statusFilter === 'needs_review'
              ? 'border-orange-400 bg-orange-50'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <HelpCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-orange-600">{summary.needs_review}</div>
              <div className="text-xs text-[var(--text-secondary)]">Revisar</div>
            </div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 transition-colors focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as VerificationStatus)
              setPage(1)
            }}
            className="focus:ring-[var(--primary)]/20 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Products List */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
            <p className="mt-4 text-[var(--text-secondary)]">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">No hay productos</h3>
            <p className="mt-1 text-[var(--text-secondary)]">
              {statusFilter === 'pending'
                ? 'No hay productos pendientes de aprobación'
                : 'No se encontraron productos con los filtros aplicados'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Producto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Enviado Por
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                              { }
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">
                              {product.name}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {product.sku && <span>SKU: {product.sku}</span>}
                              {product.category && (
                                <span className="ml-2">• {product.category.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {product.created_by_tenant ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{product.created_by_tenant.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(product.verification_status)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--text-secondary)]">
                          {formatDate(product.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowDetail(true)
                            }}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          {product.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(product.id, 'verify')}
                                disabled={processing}
                                className="rounded-lg p-2 transition-colors hover:bg-green-50"
                                title="Aprobar"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setShowRejectModal(true)
                                }}
                                disabled={processing}
                                className="rounded-lg p-2 transition-colors hover:bg-red-50"
                                title="Rechazar"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} productos
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={!pagination.hasPrev}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[var(--text-primary)]">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!pagination.hasNext}
                    className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Detalles del Producto
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Product Image & Info */}
              <div className="flex gap-6">
                {selectedProduct.images?.[0] ? (
                  <div className="relative h-32 w-32 overflow-hidden rounded-xl">
                    { }
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gray-100">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.sku && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      SKU: {selectedProduct.sku}
                    </p>
                  )}
                  <div className="mt-2">{getStatusBadge(selectedProduct.verification_status)}</div>
                  <p className="mt-3 text-lg font-bold text-[var(--primary)]">
                    {formatCurrency(selectedProduct.base_price)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {(() => {
                const desc = selectedProduct.description
                if (!desc) return null
                return (
                  <div>
                    <h4 className="mb-2 font-semibold text-[var(--text-primary)]">Descripción</h4>
                    <p className="text-[var(--text-secondary)]">{desc}</p>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-4">
                {selectedProduct.category && (
                  <div>
                    <span className="text-sm text-[var(--text-secondary)]">Categoría</span>
                    <p className="font-medium">{selectedProduct.category.name}</p>
                  </div>
                )}
                {selectedProduct.brand && (
                  <div>
                    <span className="text-sm text-[var(--text-secondary)]">Marca</span>
                    <p className="font-medium">{selectedProduct.brand.name}</p>
                  </div>
                )}
                {selectedProduct.created_by_tenant && (
                  <div>
                    <span className="text-sm text-[var(--text-secondary)]">Enviado Por</span>
                    <p className="font-medium">{selectedProduct.created_by_tenant.name}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-[var(--text-secondary)]">Fecha de Envío</span>
                  <p className="font-medium">{formatDate(selectedProduct.created_at)}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {(() => {
                if (selectedProduct.verification_status !== 'rejected') return null
                const reason = selectedProduct.attributes?.rejection_reason
                if (!reason) return null
                return (
                  <div className="rounded-xl bg-red-50 p-4">
                    <h4 className="mb-1 font-semibold text-red-700">Razón del Rechazo</h4>
                    <p className="text-red-600">{String(reason)}</p>
                  </div>
                )
              })()}

              {/* Actions */}
              {selectedProduct.verification_status === 'pending' && (
                <div className="flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => handleApprove(selectedProduct.id, 'verify')}
                    disabled={processing}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="mr-2 inline h-4 w-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      setShowDetail(false)
                      setShowRejectModal(true)
                    }}
                    disabled={processing}
                    className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <X className="mr-2 inline h-4 w-4" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProduct.id, 'needs_review')}
                    disabled={processing}
                    className="flex-1 rounded-xl border border-orange-200 px-4 py-2.5 font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                  >
                    <HelpCircle className="mr-2 inline h-4 w-4" />
                    Pedir Revisión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Rechazar Producto</h2>
            <p className="mb-4 text-[var(--text-secondary)]">
              ¿Estás seguro de rechazar "{selectedProduct.name}"? Por favor proporciona una razón.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Razón del rechazo (opcional pero recomendado)..."
              rows={3}
              className="focus:ring-[var(--primary)]/20 mb-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(selectedProduct.id, 'reject')}
                disabled={processing}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
