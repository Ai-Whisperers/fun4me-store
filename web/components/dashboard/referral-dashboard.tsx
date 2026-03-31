'use client'

/**
 * Referral Dashboard
 *
 * Dashboard component for clinics to manage their referral program.
 * Shows referral code, statistics, and list of referrals.
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Code regeneration uses useMutation
 */

import { useState } from 'react'
import { Gift, Copy, Share2, Users, TrendingUp, Percent, RefreshCw, Check, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface ReferralCode {
  id: string
  code: string
  is_active: boolean
  times_used: number
  max_uses: number | null
  referrer_discount_percent: number
  referred_trial_bonus_days: number
  referrer_loyalty_points: number
  referred_loyalty_points: number
  share_url: string
  share_message: string
}

interface ReferralStats {
  total_referrals: number
  pending_referrals: number
  converted_referrals: number
  total_discount_earned: number
  total_points_earned: number
  current_discount: number
  max_discount: number
  discount_per_referral: number
}

interface Referral {
  id: string
  status: string
  created_at: string
  trial_started_at: string | null
  converted_at: string | null
  referrer_discount_percent: number
  referrer_discount_applied: boolean
  referred_tenant: { id: string; name: string } | null
  referral_code: { code: string } | null
}

export function ReferralDashboard() {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  // React Query: Fetch referral code
  const { data: code } = useQuery({
    queryKey: queryKeys.referrals.code('current'),
    queryFn: async (): Promise<ReferralCode | null> => {
      const res = await fetch('/api/referrals/code')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: staleTimes.LONG,
    gcTime: gcTimes.LONG,
  })

  // React Query: Fetch referral stats
  const { data: stats } = useQuery({
    queryKey: queryKeys.referrals.stats('current'),
    queryFn: async (): Promise<ReferralStats | null> => {
      const res = await fetch('/api/referrals/stats')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // React Query: Fetch referrals list
  const { data: referralsData, isLoading } = useQuery({
    queryKey: queryKeys.referrals.list('current'),
    queryFn: async (): Promise<{ referrals: Referral[] }> => {
      const res = await fetch('/api/referrals?limit=10')
      if (!res.ok) return { referrals: [] }
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const referrals = referralsData?.referrals ?? []

  // Mutation: Regenerate code
  const regenerateMutation = useMutation({
    mutationFn: async (): Promise<ReferralCode> => {
      const res = await fetch('/api/referrals/code', { method: 'POST' })
      if (!res.ok) throw new Error('Error al regenerar código')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.code('current') })
    },
  })

  const copyCode = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_error: unknown) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code.code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareCode = async () => {
    if (!code) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Vetic',
          text: code.share_message,
          url: code.share_url,
        })
      } catch (_error: unknown) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy the share message
      await navigator.clipboard.writeText(code.share_message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const regenerateCode = () => {
    if (regenerateMutation.isPending) return
    regenerateMutation.mutate()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      trial_started: 'bg-blue-100 text-blue-800',
      converted: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      trial_started: 'En prueba',
      converted: 'Convertido',
      expired: 'Expirado',
    }
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Tu Código de Referido</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Comparte este código y gana {stats?.discount_per_referral || 30}% de descuento por cada clínica que se una
            </p>
          </div>
          <button
            onClick={regenerateCode}
            disabled={regenerateMutation.isPending}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-white/50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Regenerar</span>
          </button>
        </div>

        {code && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-lg border border-purple-200 bg-white px-4 py-3">
              <p className="text-center text-2xl font-bold tracking-widest text-purple-600">
                {code.code}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 sm:flex-none"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
              <button
                onClick={shareCode}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple-600 px-4 py-3 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 sm:flex-none"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </button>
            </div>
          </div>
        )}

        {code && (
          <div className="mt-4 rounded-lg bg-white/50 p-3">
            <p className="text-xs text-gray-600">
              <strong>Beneficios para la clínica referida:</strong> {code.referred_trial_bonus_days} días extra de prueba + {code.referred_loyalty_points} puntos de bienvenida
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_referrals}</p>
                <p className="text-xs text-gray-500">Total referidos</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.converted_referrals}</p>
                <p className="text-xs text-gray-500">Convertidos</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Percent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.current_discount}%</p>
                <p className="text-xs text-gray-500">Tu descuento actual</p>
              </div>
            </div>
            {stats.current_discount < stats.max_discount && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(stats.current_discount / stats.max_discount) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Máximo {stats.max_discount}%</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Gift className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_points_earned}</p>
                <p className="text-xs text-gray-500">Puntos ganados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Historial de Referidos</h3>
        </div>

        {referrals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Gift className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Aún no tienes referidos</p>
            <p className="mt-1 text-sm text-gray-400">
              Comparte tu código para empezar a ganar descuentos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Users className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {referral.referred_tenant?.name || 'Clínica'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(referral.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {referral.status === 'converted' && referral.referrer_discount_applied && (
                    <span className="text-sm font-medium text-green-600">
                      +{referral.referrer_discount_percent}%
                    </span>
                  )}
                  {getStatusBadge(referral.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {referrals.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <a
              href="/dashboard/settings/referrals"
              className="flex items-center justify-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Ver todos los referidos
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReferralDashboard
