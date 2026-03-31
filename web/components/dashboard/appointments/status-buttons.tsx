'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  checkInAppointment,
  startAppointment,
  completeAppointment,
  markNoShow,
  cancelAppointment,
} from '@/app/actions/appointments'

interface StatusButtonsProps {
  appointmentId: string
  currentStatus: string
  clinic: string
}

export function StatusButtons({ appointmentId, currentStatus, clinic: _clinic }: StatusButtonsProps) {
  const t = useTranslations('dashboard.statusButtons')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAction = async (
    action: () => Promise<{ success?: boolean; error?: string }>,
    actionName: string
  ) => {
    setLoading(actionName)
    setError(null)

    try {
      const result = await action()
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    } catch (_e) {
      setError(t('errorProcessing'))
    } finally {
      setLoading(null)
    }
  }

  const buttonBaseClass =
    'p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  // Determine which buttons to show based on current status
  switch (currentStatus) {
    case 'pending':
    case 'confirmed':
      return (
        <div className="flex items-center gap-2">
          {/* Check-in Button */}
          <button
            onClick={() => handleAction(() => checkInAppointment(appointmentId), 'checkin')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-[var(--status-warning-bg)] text-[var(--status-warning)] hover:opacity-80`}
            title={t('checkIn')}
          >
            {loading === 'checkin' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.UserCheck className="h-4 w-4" />
            )}
          </button>

          {/* No-show Button */}
          <button
            onClick={() => handleAction(() => markNoShow(appointmentId), 'noshow')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] hover:opacity-80`}
            title={t('noShow')}
          >
            {loading === 'noshow' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.UserX className="h-4 w-4" />
            )}
          </button>

          {/* Cancel Button */}
          <button
            onClick={() => handleAction(() => cancelAppointment(appointmentId), 'cancel')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-[var(--status-error-bg)] text-[var(--status-error)] hover:opacity-80`}
            title={t('cancel')}
          >
            {loading === 'cancel' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.X className="h-4 w-4" />
            )}
          </button>

          {error && <span className="text-xs text-[var(--status-error)]">{error}</span>}
        </div>
      )

    case 'checked_in':
      return (
        <div className="flex items-center gap-2">
          {/* Start Consultation Button */}
          <button
            onClick={() => handleAction(() => startAppointment(appointmentId), 'start')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-purple-100 text-purple-700 hover:bg-purple-200`}
            title={t('start')}
          >
            {loading === 'start' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.Stethoscope className="h-4 w-4" />
            )}
          </button>

          {/* Complete directly (skip in_progress) */}
          <button
            onClick={() => handleAction(() => completeAppointment(appointmentId), 'complete')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-[var(--status-success-bg)] text-[var(--status-success)] hover:opacity-80`}
            title={t('complete')}
          >
            {loading === 'complete' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.CheckCircle className="h-4 w-4" />
            )}
          </button>

          {error && <span className="text-xs text-[var(--status-error)]">{error}</span>}
        </div>
      )

    case 'in_progress':
      return (
        <div className="flex items-center gap-2">
          {/* Complete Button */}
          <button
            onClick={() => handleAction(() => completeAppointment(appointmentId), 'complete')}
            disabled={loading !== null}
            className={`${buttonBaseClass} bg-[var(--status-success-bg)] text-[var(--status-success)] hover:opacity-80`}
            title={t('completeConsultation')}
          >
            {loading === 'complete' ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.CheckCircle className="h-4 w-4" />
            )}
          </button>

          {error && <span className="text-xs text-[var(--status-error)]">{error}</span>}
        </div>
      )

    default:
      // No actions for completed, cancelled, no_show
      return null
  }
}
