'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, Clock, CalendarPlus } from 'lucide-react'

interface Appointment {
  id: string
  start_time: string
  status: string
  reason: string
  pets: { name: string } | null
}

interface UpcomingAppointmentsCardProps {
  appointments: Appointment[]
  clinic: string
}

function AppointmentRow({ appointment, t }: { appointment: Appointment; t: (key: string) => string }): React.ReactElement {
  const date = new Date(appointment.start_time)
  const formattedDate = date.toLocaleDateString('es-PY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const formattedTime = date.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusColors: Record<string, string> = {
    scheduled: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    checked_in: 'bg-amber-100 text-amber-700',
  }

  const statusLabels: Record<string, string> = {
    scheduled: t('statusScheduled'),
    confirmed: t('statusConfirmed'),
    checked_in: t('statusCheckedIn'),
  }

  return (
    <div className="rounded-lg bg-[var(--bg-subtle)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--text-primary)]">
            {appointment.pets?.name || t('appointment')}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">{appointment.reason}</p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[appointment.status] || statusColors.scheduled}`}
        >
          {statusLabels[appointment.status] || appointment.status}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formattedTime}
        </span>
      </div>
    </div>
  )
}

export function UpcomingAppointmentsCard({
  appointments,
  clinic,
}: UpcomingAppointmentsCardProps): React.ReactElement {
  const t = useTranslations('portal.upcomingAppointments')
  const upcomingAppointments = appointments.slice(0, 3)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <Calendar className="h-5 w-5 text-[var(--primary)]" />
          {t('title')}
        </h3>
        {appointments.length > 3 && (
          <Link
            href={`/${clinic}/portal/appointments`}
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            {t('viewAll')}
          </Link>
        )}
      </div>

      {upcomingAppointments.length === 0 ? (
        <div className="py-4 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-secondary)]">{t('noAppointments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingAppointments.map((apt) => (
            <AppointmentRow key={apt.id} appointment={apt} t={t} />
          ))}
        </div>
      )}

      <Link
        href={`/${clinic}/book`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
      >
        <CalendarPlus className="h-4 w-4" />
        {t('bookNew')}
      </Link>
    </div>
  )
}
