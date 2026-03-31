'use client'

import { useState } from 'react'
import {
  Mail,
  MessageSquare,
  Gift,
  Crown,
  Users,
  AlertTriangle,
  Moon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
  DollarSign,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Customer {
  id: string
  name: string
  email: string
  segment: 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'
  total_orders: number
  total_spent: number
  avg_order_value: number
  first_order_date: string | null
  last_order_date: string | null
  days_since_last_order: number | null
  loyalty_points: number
}

interface SegmentCustomerListProps {
  customers: Customer[]
  segment?: Customer['segment'] | null
  onSendEmail?: (customerIds: string[]) => void
  onSendWhatsApp?: (customerIds: string[]) => void
  onApplyDiscount?: (customerIds: string[]) => void
}

const segmentConfig = {
  vip: { label: 'VIP', icon: Crown, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  regular: { label: 'Regular', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  at_risk: {
    label: 'En Riesgo',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  dormant: { label: 'Inactivo', icon: Moon, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  new: { label: 'Nuevo', icon: Sparkles, color: 'text-green-600', bgColor: 'bg-green-100' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function SegmentCustomerList({
  customers,
  segment,
  onSendEmail,
  onSendWhatsApp,
  onApplyDiscount,
}: SegmentCustomerListProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<keyof Customer>('total_spent')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter customers
  const filteredCustomers = customers
    .filter((c) => (segment ? c.segment === segment : true))
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)))
    }
  }

  const SortIcon = ({ field }: { field: keyof Customer }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    )
  }

  return (
    <div className="rounded-xl bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedIds.size} seleccionados</span>
            <button
              onClick={() => onSendEmail?.(Array.from(selectedIds))}
              className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => onSendWhatsApp?.(Array.from(selectedIds))}
              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-100"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={() => onApplyDiscount?.(Array.from(selectedIds))}
              className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-100"
            >
              <Gift className="h-4 w-4" />
              Descuento
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('name')}>
                Cliente <SortIcon field="name" />
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('segment')}>
                Segmento <SortIcon field="segment" />
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('total_orders')}>
                Pedidos <SortIcon field="total_orders" />
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('total_spent')}>
                Total Gastado <SortIcon field="total_spent" />
              </th>
              <th
                className="cursor-pointer px-4 py-3"
                onClick={() => handleSort('days_since_last_order')}
              >
                Última Compra <SortIcon field="days_since_last_order" />
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('loyalty_points')}>
                Puntos <SortIcon field="loyalty_points" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCustomers.map((customer) => {
              const config = segmentConfig[customer.segment]
              const SegmentIcon = config.icon

              return (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                      className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${config.bgColor} ${config.color}`}>
                      <SegmentIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.total_orders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {customer.days_since_last_order !== null
                          ? `hace ${customer.days_since_last_order} días`
                          : '-'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(customer.last_order_date)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-amber-600">
                      {customer.loyalty_points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-gray-500">No se encontraron clientes</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-sm text-gray-500">
        Mostrando {filteredCustomers.length} de {customers.length} clientes
      </div>
    </div>
  )
}
