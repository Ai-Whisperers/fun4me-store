'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'

interface LabOrder {
  id: string
  order_number: string
  ordered_at: string
  status: string
  priority: string
  has_critical_values: boolean
  pets: {
    id: string
    name: string
    species: string
  }
}

interface LabOrdersListProps {
  orders: LabOrder[]
  clinic: string
  currentStatus: string
  currentSearch: string
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ordered: {
    label: 'Ordenado',
    className: 'bg-blue-100 text-blue-800',
    icon: Icons.FileText,
  },
  specimen_collected: {
    label: 'Muestra Recolectada',
    className: 'bg-purple-100 text-purple-800',
    icon: Icons.Droplet,
  },
  in_progress: {
    label: 'En Proceso',
    className: 'bg-yellow-100 text-yellow-800',
    icon: Icons.Clock,
  },
  completed: {
    label: 'Completado',
    className: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
    icon: Icons.CheckCircle,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    icon: Icons.XCircle,
  },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  stat: {
    label: 'STAT',
    className: 'bg-[var(--status-error)] text-white',
  },
  urgent: {
    label: 'Urgente',
    className: 'bg-orange-500 text-white',
  },
  routine: {
    label: 'Rutina',
    className: 'bg-gray-500 text-white',
  },
}

export function LabOrdersList({
  orders,
  clinic,
  currentStatus,
  currentSearch,
}: LabOrdersListProps): React.ReactElement {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(currentSearch)

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (currentStatus !== 'all') params.set('status', currentStatus)
    const queryString = params.toString()
    router.push(`/${clinic}/dashboard/lab${queryString ? `?${queryString}` : ''}`)
  }

  const clearFilters = (): void => {
    setSearchTerm('')
    router.push(`/${clinic}/dashboard/lab`)
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar por mascota o número de orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          Buscar
        </button>
        {(currentSearch || currentStatus !== 'all') && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl bg-gray-100 px-6 py-3 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-200"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="rounded-xl bg-gray-50 py-12 text-center">
          <Icons.FileText className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <p className="text-lg text-[var(--text-secondary)]">
            {currentSearch || currentStatus !== 'all'
              ? 'No se encontraron órdenes con los filtros aplicados'
              : 'No hay órdenes de laboratorio'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.ordered
            const priority = priorityConfig[order.priority] || priorityConfig.routine
            const StatusIcon = status.icon

            return (
              <Link
                key={order.id}
                href={`/${clinic}/dashboard/lab/${order.id}`}
                className="block rounded-xl border-2 border-gray-100 bg-white p-5 transition-all hover:border-[var(--primary)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-1 items-start gap-4">
                    <div className={`rounded-lg p-3 ${status.className}`}>
                      <StatusIcon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                          {order.pets?.name || 'Sin mascota'}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${priority.className}`}
                        >
                          {priority.label}
                        </span>
                        {order.has_critical_values && (
                          <span className="flex items-center gap-1 rounded-full bg-[var(--status-error-bg)] px-3 py-1 text-xs font-bold text-[var(--status-error-text)]">
                            <Icons.AlertTriangle className="h-3 w-3" />
                            Crítico
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Icons.Hash className="h-4 w-4" />
                          {order.order_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icons.Calendar className="h-4 w-4" />
                          {new Date(order.ordered_at).toLocaleDateString('es-PY')}
                        </span>
                        <span className="flex items-center gap-1">
                          {order.pets?.species === 'dog' ? (
                            <Icons.Dog className="h-4 w-4" />
                          ) : order.pets?.species === 'cat' ? (
                            <Icons.Cat className="h-4 w-4" />
                          ) : (
                            <Icons.PawPrint className="h-4 w-4" />
                          )}
                          {order.pets?.species || 'Mascota'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <Icons.ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
