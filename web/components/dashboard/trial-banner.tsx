'use client'

import { useTenantTier } from '@/lib/features/client'
import { Clock, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TrialBannerProps {
  clinic: string
}

export function TrialBanner({ clinic }: TrialBannerProps): React.ReactElement | null {
  const { isOnTrial, trialEndsAt, tierName } = useTenantTier()

  // Don't show if not on trial
  if (!isOnTrial || !trialEndsAt) {
    return null
  }

  // Calculate days remaining
  const now = new Date()
  const endDate = new Date(trialEndsAt)
  const diffTime = endDate.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  // Determine urgency level for styling
  const isUrgent = daysRemaining <= 7
  const isCritical = daysRemaining <= 3

  const bgColor = isCritical
    ? 'bg-red-50 border-red-200'
    : isUrgent
      ? 'bg-amber-50 border-amber-200'
      : 'bg-blue-50 border-blue-200'

  const textColor = isCritical
    ? 'text-red-800'
    : isUrgent
      ? 'text-amber-800'
      : 'text-blue-800'

  const iconColor = isCritical
    ? 'text-red-500'
    : isUrgent
      ? 'text-amber-500'
      : 'text-blue-500'

  const buttonColor = isCritical
    ? 'bg-red-600 hover:bg-red-700'
    : isUrgent
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-blue-600 hover:bg-blue-700'

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className={`mb-6 rounded-xl border ${bgColor} p-4`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-full bg-white p-2 ${iconColor}`}>
            {isCritical ? (
              <Clock className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${textColor}`}>
              {isCritical
                ? `Tu prueba termina en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`
                : isUrgent
                  ? `Quedan ${daysRemaining} días de prueba`
                  : `Estás en período de prueba`}
            </h3>
            <p className={`text-sm ${textColor} opacity-80`}>
              {isCritical
                ? 'Actualiza ahora para no perder acceso a las funciones premium'
                : isUrgent
                  ? `Tu prueba gratuita termina el ${formatDate(endDate)}`
                  : `Disfruta todas las funciones de ${tierName || 'Profesional'} hasta el ${formatDate(endDate)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${clinic}/dashboard/settings/billing`}
            className={`inline-flex items-center gap-2 rounded-lg ${buttonColor} px-4 py-2 text-sm font-medium text-white transition-colors`}
          >
            {isCritical ? 'Actualizar Ahora' : 'Ver Planes'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Progress bar showing time remaining */}
      {daysRemaining > 0 && daysRemaining <= 30 && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full transition-all ${
                isCritical
                  ? 'bg-red-500'
                  : isUrgent
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(5, (daysRemaining / 30) * 100)}%` }}
            />
          </div>
          <p className={`mt-1 text-xs ${textColor} opacity-60`}>
            {daysRemaining} de 30 días restantes
          </p>
        </div>
      )}
    </div>
  )
}
