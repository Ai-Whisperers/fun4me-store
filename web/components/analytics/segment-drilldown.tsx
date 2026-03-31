'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Loader2,
  Crown,
  Users,
  AlertTriangle,
  Moon,
  Sparkles,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingBag,
} from 'lucide-react'

type SegmentType = 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  total_orders: number
  total_spent: number
  last_order_date: string | null
  days_since_last_order: number | null
  loyalty_points: number
}

interface SegmentDrilldownProps {
  segment: SegmentType
  tenantId?: string
  onClose: () => void
}

const segmentConfig: Record<
  SegmentType,
  { label: string; icon: typeof Crown; color: string; bgColor: string }
> = {
  vip: { label: 'VIP', icon: Crown, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  regular: { label: 'Regulares', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  at_risk: {
    label: 'En Riesgo',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  dormant: { label: 'Inactivos', icon: Moon, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  new: { label: 'Nuevos', icon: Sparkles, color: 'text-green-600', bgColor: 'bg-green-100' },
}

export function SegmentDrilldown({
  segment,
  onClose,
}: SegmentDrilldownProps): React.ReactElement {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const config = segmentConfig[segment]
  const Icon = config.icon

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/analytics/customers?segment=${segment}`)
        if (!res.ok) throw new Error('Error al cargar datos')

        const data = await res.json()
        // Extract customers from the response based on segment
        let segmentCustomers: Customer[] = []

        if (segment === 'vip' || segment === 'regular') {
          segmentCustomers = data.topCustomers?.filter(
            (c: Customer & { segment: string }) => c.segment === segment
          ) || []
        } else if (segment === 'at_risk' || segment === 'dormant') {
          segmentCustomers = data.atRiskCustomers?.filter(
            (c: Customer & { segment: string }) => c.segment === segment
          ) || []
        } else {
          // For 'new', combine and filter
          const allCustomers = [
            ...(data.topCustomers || []),
            ...(data.atRiskCustomers || []),
          ]
          segmentCustomers = allCustomers.filter(
            (c: Customer & { segment: string }) => c.segment === segment
          )
        }

        setCustomers(segmentCustomers)
      } catch (err) {
        setError('No se pudieron cargar los clientes')
        console.error('Error fetching segment customers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [segment])

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Clientes {config.label}
              </h3>
              <p className="text-sm text-gray-500">
                {loading ? 'Cargando...' : `${customers.length} clientes`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
              <p className="mt-4 text-gray-600">{error}</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600">No hay clientes en este segmento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {customer.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1 hover:text-[var(--primary)]"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {customer.email}
                          </a>
                        )}
                        {customer.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1 hover:text-[var(--primary)]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--primary)]">
                        {formatCurrency(customer.total_spent)}
                      </p>
                      <p className="text-xs text-gray-500">total gastado</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{customer.total_orders} pedidos</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {customer.days_since_last_order !== null
                          ? `Última compra hace ${customer.days_since_last_order} días`
                          : 'Sin compras'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{customer.loyalty_points.toLocaleString()} puntos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 py-2 font-medium text-gray-700 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
