'use client'

/**
 * Stock History Modal Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 */

import { useState, useEffect, useRef } from 'react'
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  RotateCcw,
  ShoppingCart,
  Truck,
  Settings,
  Loader2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Transaction {
  id: string
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage' | 'theft' | 'expired' | 'transfer'
  quantity: number
  unit_cost: number | null
  notes: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
  performed_by: {
    id: string
    full_name: string
  } | null
}

interface HistoryData {
  transactions: Transaction[]
  summary: {
    total_in: number
    total_out: number
    current_stock: number
    wac: number
  }
  product: {
    id: string
    name: string
    sku: string | null
  }
}

interface StockHistoryModalProps {
  productId: string
  productName: string
  isOpen: boolean
  onClose: () => void
  clinic: string
}

const TYPE_CONFIG: Record<
  Transaction['type'],
  { label: string; icon: typeof Package; color: string; bgColor: string }
> = {
  purchase: {
    label: 'Compra',
    icon: Truck,
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-bg)]',
  },
  sale: {
    label: 'Venta',
    icon: ShoppingCart,
    color: 'text-[var(--status-info)]',
    bgColor: 'bg-[var(--status-info-bg)]',
  },
  adjustment: {
    label: 'Ajuste',
    icon: Settings,
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10',
  },
  return: {
    label: 'Devolución',
    icon: RotateCcw,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning-bg)]',
  },
  damage: {
    label: 'Daño',
    icon: AlertTriangle,
    color: 'text-[var(--status-error)]',
    bgColor: 'bg-[var(--status-error-bg)]',
  },
  theft: {
    label: 'Robo',
    icon: AlertTriangle,
    color: 'text-[var(--status-error)]',
    bgColor: 'bg-[var(--status-error-bg)]',
  },
  expired: {
    label: 'Vencido',
    icon: AlertTriangle,
    color: 'text-[var(--status-warning)]',
    bgColor: 'bg-[var(--status-warning-bg)]',
  },
  transfer: {
    label: 'Transferencia',
    icon: Package,
    color: 'text-[var(--text-secondary)]',
    bgColor: 'bg-gray-100',
  },
}

export function StockHistoryModal({
  productId,
  productName,
  isOpen,
  onClose,
  clinic: _clinic,
}: StockHistoryModalProps) {
  const [typeFilter, setTypeFilter] = useState<string>('')
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // React Query: Fetch stock history
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', productId, 'history', { type: typeFilter }],
    queryFn: async (): Promise<HistoryData> => {
      const params = new URLSearchParams({ limit: '50' })
      if (typeFilter) params.set('type', typeFilter)

      const response = await fetch(`/api/inventory/${productId}/history?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details?.message || 'Error al cargar historial')
      }

      return result
    },
    enabled: isOpen && !!productId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Accessibility: Keyboard handling and focus trap
  useEffect(() => {
    if (!isOpen) return

    // Focus close button when modal opens
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstEl = focusableElements[0]
        const lastEl = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl?.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-history-modal-title"
        className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[var(--bg-default)] rounded-lg shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10">
              <History className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="stock-history-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
                Historial de Movimientos
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{productName}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-[var(--text-muted)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-4 gap-4 p-4 border-b">
            <div className="p-3 rounded-lg bg-[var(--status-success-bg)]">
              <div className="flex items-center gap-2 text-[var(--status-success)] mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Entradas</span>
              </div>
              <p className="text-lg font-bold text-[var(--status-success)]">{data.summary.total_in}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--status-error-bg)]">
              <div className="flex items-center gap-2 text-[var(--status-error)] mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Salidas</span>
              </div>
              <p className="text-lg font-bold text-[var(--status-error)]">{data.summary.total_out}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--status-info-bg)]">
              <div className="flex items-center gap-2 text-[var(--status-info)] mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">Stock Actual</span>
              </div>
              <p className="text-lg font-bold text-[var(--status-info)]">{data.summary.current_stock}</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--primary)]/10">
              <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
                <Settings className="w-4 h-4" />
                <span className="text-xs font-medium">Costo Prom.</span>
              </div>
              <p className="text-lg font-bold text-[var(--primary)]">
                {formatCurrency(data.summary.wac)}
              </p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="p-4 border-b">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Todos los movimientos</option>
            <option value="purchase">Compras</option>
            <option value="sale">Ventas</option>
            <option value="adjustment">Ajustes</option>
            <option value="return">Devoluciones</option>
            <option value="damage">Daños</option>
            <option value="expired">Vencidos</option>
          </select>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-[var(--status-error)]">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{error instanceof Error ? error.message : 'Error al cargar historial'}</p>
            </div>
          ) : data?.transactions.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.transactions.map((transaction) => {
                const config = TYPE_CONFIG[transaction.type]
                const Icon = config.icon
                const isPositive = transaction.quantity > 0

                return (
                  <div
                    key={transaction.id}
                    className="flex items-start gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {transaction.reference_type && (
                          <span className="text-xs text-gray-400">
                            • {transaction.reference_type}
                          </span>
                        )}
                      </div>
                      {transaction.notes && (
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                          {transaction.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>{formatDate(transaction.created_at)}</span>
                        {transaction.performed_by && (
                          <span>por {transaction.performed_by.full_name}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {transaction.quantity}
                      </p>
                      {transaction.unit_cost && transaction.unit_cost > 0 && (
                        <p className="text-xs text-gray-400">
                          @ {formatCurrency(transaction.unit_cost)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
