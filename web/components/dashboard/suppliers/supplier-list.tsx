'use client'

/**
 * Supplier List Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Debounced search via query key updates
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Supplier {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  contact_info: {
    email?: string
    phone?: string
    address?: string
    city?: string
    contact_person?: string
  } | null
  supplier_type: 'products' | 'services' | 'both'
  minimum_order_amount: number | null
  payment_terms: string | null
  delivery_time_days: number | null
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

interface SupplierListProps {
  onCreateClick: () => void
  onViewClick: (supplier: Supplier) => void
  onEditClick: (supplier: Supplier) => void
  onDeleteClick: (supplier: Supplier) => void
}

const SUPPLIER_TYPES = {
  products: { label: 'Productos', color: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]' },
  services: { label: 'Servicios', color: 'bg-purple-100 text-purple-700' },
  both: { label: 'Ambos', color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' },
}

const VERIFICATION_STATUS = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-[var(--status-warning)]' },
  verified: { label: 'Verificado', icon: CheckCircle, color: 'text-[var(--status-success)]' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'text-[var(--status-error)]' },
}

export function SupplierList({
  onCreateClick,
  onViewClick,
  onEditClick,
  onDeleteClick,
}: SupplierListProps): React.ReactElement {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Build filters object for query key
  const filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  }), [debouncedSearch, typeFilter, statusFilter])

  // React Query: Fetch suppliers with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: async (): Promise<{ suppliers: Supplier[] }> => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)

      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar proveedores')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const suppliers = data?.suppliers || []

  const handleMenuToggle = (id: string) => {
    setActiveMenu(activeMenu === id ? null : id)
  }

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="products">Productos</option>
            <option value="services">Servicios</option>
            <option value="both">Ambos</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="verified">Verificado</option>
            <option value="rejected">Rechazado</option>
          </select>

          <button
            onClick={() => refetch()}
            className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            title="Actualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--status-error-bg)] p-4 text-[var(--status-error)]">
          {error instanceof Error ? error.message : 'Error al cargar los proveedores'}
        </div>
      )}

      {/* Supplier List */}
      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No hay proveedores</p>
            <p className="text-sm text-gray-400">Agrega tu primer proveedor para comenzar</p>
            <button
              onClick={onCreateClick}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Agregar Proveedor
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => {
            const typeInfo = SUPPLIER_TYPES[supplier.supplier_type]
            const statusInfo = VERIFICATION_STATUS[supplier.verification_status]
            const StatusIcon = statusInfo.icon

            return (
              <Card key={supplier.id} className="relative transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                        <Building2 className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {supplier.name}
                        </h3>
                        {supplier.tax_id && (
                          <p className="text-xs text-gray-500">RUC: {supplier.tax_id}</p>
                        )}
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={() => handleMenuToggle(supplier.id)}
                        className="rounded-lg p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>

                      {activeMenu === supplier.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() => {
                              onViewClick(supplier)
                              setActiveMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalles
                          </button>
                          <button
                            onClick={() => {
                              onEditClick(supplier)
                              setActiveMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              onDeleteClick(supplier)
                              setActiveMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {supplier.contact_info?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {supplier.contact_info.phone}
                      </div>
                    )}
                    {supplier.contact_info?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        {supplier.contact_info.email}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {(supplier.delivery_time_days || supplier.minimum_order_amount) && (
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                      {supplier.delivery_time_days && (
                        <span>Entrega: {supplier.delivery_time_days} días</span>
                      )}
                      {supplier.minimum_order_amount && (
                        <span>Mín: ₲{supplier.minimum_order_amount.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
