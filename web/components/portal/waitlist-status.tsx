'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Timer,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface WaitlistEntry {
  id: string
  pet: { id: string; name: string; species: string }
  service: { id: string; name: string }
  preferred_date: string
  preferred_time_start: string | null
  preferred_time_end: string | null
  position: number
  status: 'waiting' | 'offered' | 'booked' | 'expired' | 'cancelled'
  offered_appointment?: {
    id: string
    start_time: string
    end_time: string
  }
  offer_expires_at: string | null
  created_at: string
}

export function WaitlistStatus(): React.ReactElement {
  const params = useParams()
  const _clinic = params?.clinic as string
  const { toast } = useToast()
  const t = useTranslations('portal.waitlist')

  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/appointments/waitlist?status=waiting,offered')
      if (!res.ok) throw new Error(t('errorLoading'))
      const data = await res.json()
      setEntries(data.waitlist || [])
    } catch (error) {
      console.error('Error fetching waitlist:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
    // Refresh every 30 seconds to check for offers
    const interval = setInterval(fetchEntries, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleAccept = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch(`/api/appointments/waitlist/${entryId}/accept`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errorAccept'))
      }

      toast({
        title: t('appointmentConfirmed'),
        description: t('appointmentConfirmedDesc'),
      })
      fetchEntries()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : t('errorAccept'),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch(`/api/appointments/waitlist/${entryId}/decline`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errorDecline'))
      }

      toast({
        title: t('offerDeclined'),
        description: t('offerDeclinedDesc'),
      })
      fetchEntries()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : t('errorDecline'),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (entryId: string) => {
    if (!confirm(t('confirmLeave'))) return

    setActionLoading(entryId)
    try {
      const res = await fetch(`/api/appointments/waitlist/${entryId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errorCancel'))
      }

      toast({
        title: t('removedFromList'),
        description: t('removedFromListDesc'),
      })
      fetchEntries()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : t('errorCancel'),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeRemaining = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return t('expired')

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return t('timeRemaining', { hours, minutes })
    return t('minutesRemaining', { minutes })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
        <Clock className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 font-medium text-gray-600">
          {t('notInWaitlist')}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {t('notInWaitlistDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text-primary)]">{t('title')}</h3>
        <button
          onClick={fetchEntries}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {entries.map((entry) => {
        const isOffer = entry.status === 'offered'
        const isLoading = actionLoading === entry.id

        return (
          <div
            key={entry.id}
            className={`rounded-xl border-2 p-4 ${
              isOffer
                ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)]'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Offer Banner */}
            {isOffer && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--status-success-bg)] px-3 py-2 text-sm font-medium text-[var(--status-success-text)]">
                <CheckCircle className="h-4 w-4" />
                {t('appointmentAvailable')}
                {entry.offer_expires_at && (
                  <span className="ml-auto flex items-center gap-1 text-xs">
                    <Timer className="h-3 w-3" />
                    {getTimeRemaining(entry.offer_expires_at)}
                  </span>
                )}
              </div>
            )}

            {/* Entry Info */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isOffer ? 'bg-[var(--status-success-bg)]' : 'bg-[var(--status-warning-bg)]'
                }`}
              >
                {isOffer ? (
                  <CheckCircle className="h-5 w-5 text-[var(--status-success)]" />
                ) : (
                  <Clock className="h-5 w-5 text-[var(--status-warning)]" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">
                  {entry.pet.name} - {entry.service.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {isOffer && entry.offered_appointment
                      ? formatDate(entry.offered_appointment.start_time)
                      : formatDate(entry.preferred_date)}
                  </span>
                  {isOffer && entry.offered_appointment && (
                    <span>
                      {formatTime(entry.offered_appointment.start_time)} -{' '}
                      {formatTime(entry.offered_appointment.end_time)}
                    </span>
                  )}
                  {!isOffer && (
                    <span className="rounded bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning-text)]">
                      {t('position', { position: entry.position })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {isOffer ? (
                <>
                  <button
                    onClick={() => handleAccept(entry.id)}
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--status-success)] px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {t('accept')}
                  </button>
                  <button
                    onClick={() => handleDecline(entry.id)}
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {t('decline')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleCancel(entry.id)}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] px-4 py-2 text-sm font-medium text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {t('leaveList')}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
