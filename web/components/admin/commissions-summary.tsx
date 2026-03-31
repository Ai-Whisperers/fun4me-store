'use client'

/**
 * Commissions Summary Card
 *
 * Shows commission overview for the admin dashboard.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface CommissionStats {
  calculated: { count: number; total: number }
  invoiced: { count: number; total: number }
  paid: { count: number; total: number }
  pending_invoices: number
}

export function CommissionsSummary() {
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/platform/commissions/summary')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setStats(data)
      } catch (_e) {
        setError('Error al cargar estadísticas')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return `Gs ${amount.toLocaleString('es-PY')}`
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'Error al cargar datos'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Comisiones</h2>
        </div>
        <Link
          href="/admin/commissions"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver detalles
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="p-5 space-y-4">
        {/* Pending to invoice */}
        <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Por facturar</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-yellow-900">{formatCurrency(stats.calculated.total)}</p>
            <p className="text-xs text-yellow-600">{stats.calculated.count} órdenes</p>
          </div>
        </div>

        {/* Invoiced (pending payment) */}
        <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Facturado (pendiente)</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-blue-900">{formatCurrency(stats.invoiced.total)}</p>
            <p className="text-xs text-blue-600">{stats.pending_invoices} facturas</p>
          </div>
        </div>

        {/* Paid this month */}
        <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Cobrado este mes</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-900">{formatCurrency(stats.paid.total)}</p>
            <p className="text-xs text-green-600">{stats.paid.count} órdenes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
