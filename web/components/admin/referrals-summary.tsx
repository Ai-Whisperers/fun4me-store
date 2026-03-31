'use client'

/**
 * Referrals Summary Card
 *
 * Shows referral program overview for the admin dashboard.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Gift, AlertCircle } from 'lucide-react'

interface ReferralStats {
  total_referrals: number
  pending_referrals: number
  trial_started: number
  converted_referrals: number
  conversion_rate: number
  total_discount_given: number
  top_referrers: Array<{
    tenant_id: string
    tenant_name: string
    referral_count: number
    converted_count: number
  }>
}

export function ReferralsSummary() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/platform/referrals/summary')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setStats(data)
      } catch (e) {
        setError('Error al cargar estadísticas')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

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
          <Gift className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Programa de Referidos</h2>
        </div>
        <Link
          href="/admin/referrals"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver detalles
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="p-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total_referrals}</p>
            <p className="text-xs text-gray-500">Total referidos</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.converted_referrals}</p>
            <p className="text-xs text-gray-500">Convertidos</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending_referrals}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.conversion_rate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Tasa conversión</p>
          </div>
        </div>

        {/* Top referrers */}
        {stats.top_referrers && stats.top_referrers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Top Referidores</h3>
            <div className="space-y-2">
              {stats.top_referrers.slice(0, 3).map((referrer, index) => (
                <div
                  key={referrer.tenant_id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      'bg-orange-300 text-orange-800'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{referrer.tenant_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{referrer.converted_count}</span>
                    <span className="text-xs text-gray-500">/{referrer.referral_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
