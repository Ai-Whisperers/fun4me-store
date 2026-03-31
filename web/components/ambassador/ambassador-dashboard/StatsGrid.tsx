/**
 * Stats Grid Component
 *
 * Displays ambassador statistics (referrals, conversions, earnings).
 */

'use client'

import { Users, TrendingUp, DollarSign, Banknote, ChevronRight } from 'lucide-react'
import { formatCurrency } from './utils'
import type { Stats } from './types'

interface StatsGridProps {
  stats: Stats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Referrals */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_referrals}</p>
            <p className="text-sm text-gray-500">Referidos</p>
          </div>
        </div>
      </div>

      {/* Converted */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.converted_referrals}</p>
            <p className="text-sm text-gray-500">Convertidos</p>
          </div>
        </div>
      </div>

      {/* Total Earned */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_earned)}</p>
            <p className="text-sm text-gray-500">Total ganado</p>
          </div>
        </div>
      </div>

      {/* Pending Payout */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Banknote className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending_payout)}</p>
            <p className="text-sm text-gray-500">Por cobrar</p>
          </div>
        </div>
        {stats.pending_payout >= 500000 && (
          <a
            href="/ambassador/payouts"
            className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Solicitar pago
            <ChevronRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}
