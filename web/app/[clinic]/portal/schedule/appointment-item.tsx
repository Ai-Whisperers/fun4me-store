'use client'

import * as Icons from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { updateAppointmentStatus } from '@/app/actions/update-appointment'
import { useState } from 'react'
import type { AppointmentStatus } from '@/lib/types/status'

interface AppointmentOwner {
  full_name?: string
  phone?: string
}

interface AppointmentPet {
  name: string
  species: string
  owner?: AppointmentOwner
}

interface Appointment {
  id: string
  pet: AppointmentPet
  start_time: string
  status: AppointmentStatus
  reason: string
  notes?: string
}

export default function AppointmentItem({
  appointment,
  clinic,
}: {
  appointment: Appointment
  clinic: string
}) {
  const t = useTranslations('appointments')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const { pet, start_time, status, reason, notes } = appointment
  const date = new Date(start_time)

  const handleStatus = async (newStatus: string) => {
    if (!confirm(t('confirmStatusChange', { status: t(`status.${newStatus}`) }))) return
    setLoading(true)
    await updateAppointmentStatus(appointment.id, newStatus, clinic)
    setLoading(false)
  }

  const statusColors: Record<AppointmentStatus, string> = {
    scheduled: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
    confirmed: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
    checked_in: 'bg-[var(--status-special-bg)] text-[var(--status-special)] border-[var(--status-special-light)]',
    in_progress: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/20',
    completed: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
    cancelled: 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border)]',
    no_show: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)] border-[var(--status-error-border)]',
  }

  const badgeClass = statusColors[status] || 'bg-[var(--bg-muted)] text-[var(--text-muted)]'

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-default)] p-6 shadow-sm transition-shadow hover:shadow-md md:flex-row">
      {/* Time Column */}
      <div className="flex flex-shrink-0 flex-col items-center justify-center border-b border-[var(--border-light)] pb-4 md:w-32 md:border-b-0 md:border-r md:pb-0 md:pr-6">
        <span className="text-2xl font-black text-[var(--text-primary)]">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {date.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
        </span>
        <div
          className={`mt-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}
        >
          {t(`status.${status}`)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{pet.name}</h3>
              <span className="text-sm text-[var(--text-muted)]">({pet.species})</span>
            </div>
            <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Icons.User className="h-3 w-3" /> {pet.owner?.full_name || t('unknownOwner')}
              <span className="text-[var(--text-muted)]">|</span>
              <Icons.Phone className="h-3 w-3" /> {pet.owner?.phone || '-'}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] p-4">
          <div className="flex items-start gap-3">
            <Icons.Info className="mt-1 h-4 w-4 shrink-0 text-[var(--status-info)]" />
            <div>
              <span className="mb-0.5 block text-xs font-bold uppercase text-[var(--text-muted)]">{t('reason')}</span>
              <p className="text-sm font-medium text-[var(--text-secondary)]">{reason}</p>
              {notes && <p className="mt-1 text-xs italic text-[var(--text-muted)]">"{notes}"</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-2 border-t border-[var(--border-light)] pt-4 md:flex-col md:border-l md:border-t-0 md:pl-6 md:pt-0">
        {loading && (
          <div className="flex items-center justify-center p-2">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
          </div>
        )}
        {!loading && status === 'scheduled' && (
          <>
            <button
              onClick={() => handleStatus('confirmed')}
              disabled={loading}
              className="rounded-lg bg-[var(--status-info-bg)] p-2 text-[var(--status-info)] transition-colors hover:bg-[var(--status-info-border)] disabled:opacity-50"
              title={t('actions.confirm')}
            >
              <Icons.Check className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleStatus('cancelled')}
              disabled={loading}
              className="rounded-lg bg-[var(--status-error-bg)] p-2 text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-border)] disabled:opacity-50"
              title={tc('cancel')}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </>
        )}
        {!loading && status === 'confirmed' && (
          <button
            onClick={() => handleStatus('completed')}
            disabled={loading}
            className="rounded-lg bg-[var(--status-success-bg)] p-2 text-[var(--status-success)] transition-colors hover:bg-[var(--status-success-border)] disabled:opacity-50"
            title={t('actions.complete')}
          >
            <Icons.CheckCircle2 className="h-5 w-5" />
          </button>
        )}
        {!loading && status !== 'cancelled' && status !== 'completed' && status !== 'no_show' && (
          <button
            onClick={() => handleStatus('cancelled')}
            disabled={loading}
            className="rounded-lg bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-50"
            title={tc('cancel')}
          >
            <Icons.Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
