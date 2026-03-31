/**
 * Referral Code Card Component
 *
 * Displays referral code with copy/share actions and tier progress.
 */

'use client'

import { Gift, Copy, Share2, Check } from 'lucide-react'
import type { Ambassador, Stats } from './types'

interface ReferralCodeCardProps {
  ambassador: Ambassador
  stats: Stats | null
  copied: boolean
  onCopyCode: () => void
  onShareCode: () => void
}

export function ReferralCodeCard({
  ambassador,
  stats,
  copied,
  onCopyCode,
  onShareCode,
}: ReferralCodeCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Tu Código de Referido</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Gana {stats?.commission_rate || ambassador.commission_rate}% de comisión por cada clínica que se una
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 rounded-lg border-2 border-emerald-200 bg-white px-4 py-3">
            <p className="text-center text-2xl font-bold tracking-widest text-emerald-600">
              {ambassador.referral_code}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCopyCode}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:flex-none"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={onShareCode}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-600 px-4 py-3 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 sm:flex-none"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      {stats?.next_tier && (
        <div className="border-t border-emerald-100 bg-white/50 px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {stats.referrals_to_next_tier} conversiones más para {stats.next_tier_info?.name}
            </span>
            <span className="font-medium text-emerald-600">
              +{(stats.next_tier_info?.commission || 0) - stats.commission_rate}% comisión
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${
                  stats.next_tier === 'promotor'
                    ? (stats.converted_referrals / 5) * 100
                    : stats.next_tier === 'super'
                    ? ((stats.converted_referrals - 5) / 5) * 100
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
