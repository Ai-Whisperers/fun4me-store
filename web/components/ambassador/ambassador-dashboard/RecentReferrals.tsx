/**
 * Recent Referrals Component
 *
 * Displays list of recent referrals with status badges.
 */

'use client'

import { Gift, Users, ExternalLink, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDate, formatCurrency, statusStyles, statusLabels } from './utils'
import type { Referral } from './types'

interface RecentReferralsProps {
  referrals: Referral[]
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles.pending
  const label = statusLabels[status] || status

  const iconMap: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    trial_started: <AlertCircle className="h-3 w-3" />,
    converted: <CheckCircle className="h-3 w-3" />,
    expired: <AlertCircle className="h-3 w-3" />,
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {iconMap[status] || iconMap.pending}
      {label}
    </span>
  )
}

export function RecentReferrals({ referrals }: RecentReferralsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="font-semibold text-gray-900">Referidos Recientes</h3>
        <a
          href="/ambassador/referrals"
          className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Ver todos
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {referrals.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Aún no tienes referidos</p>
          <p className="mt-1 text-sm text-gray-400">
            Comparte tu código para empezar a ganar comisiones
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {referrals.map((referral) => (
            <div key={referral.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Users className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {referral.tenant?.name || 'Clínica'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {referral.tenant?.zone} • {formatDate(referral.referred_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {referral.status === 'converted' && referral.commission_amount && (
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(referral.commission_amount)}
                  </span>
                )}
                <StatusBadge status={referral.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
