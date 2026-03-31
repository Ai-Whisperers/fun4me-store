'use client'

import Link from 'next/link'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Plus,
  ChevronRight,
  CalendarDays,
  RefreshCw,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface Appointment {
  id: string
  start_time: string
  end_time?: string
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  service?: {
    id: string
    name: string
    category?: string
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
  notes?: string | null
  cancellation_reason?: string | null
}

interface PetAppointmentsTabProps {
  petId: string
  petName: string
  appointments: Appointment[]
  clinic: string
}

export function PetAppointmentsTab({
  petId,
  petName,
  appointments,
  clinic,
}: PetAppointmentsTabProps) {
  const t = useTranslations('pets.tabs.appointments')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Separate appointments
  const upcomingAppointments = appointments
    .filter(
      (apt) =>
        new Date(apt.start_time) >= today &&
        !['cancelled', 'no_show', 'completed'].includes(apt.status)
    )
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const pastAppointments = appointments
    .filter(
      (apt) =>
        new Date(apt.start_time) < today ||
        ['completed', 'cancelled', 'no_show'].includes(apt.status)
    )
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(localeStr, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString(localeStr, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusConfig = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return { label: t('statusScheduled'), color: 'bg-blue-100 text-blue-700', icon: Clock }
      case 'confirmed':
        return { label: t('statusConfirmed'), color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
      case 'in_progress':
        return { label: t('statusInProgress'), color: 'bg-amber-100 text-amber-700', icon: RefreshCw }
      case 'completed':
        return { label: t('statusCompleted'), color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 }
      case 'cancelled':
        return { label: t('statusCancelled'), color: 'bg-red-100 text-red-700', icon: XCircle }
      case 'no_show':
        return { label: t('statusNoShow'), color: 'bg-orange-100 text-orange-700', icon: AlertCircle }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock }
    }
  }

  const getDaysUntil = (dateStr: string): string => {
    const aptDate = new Date(dateStr)
    aptDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((aptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('today')
    if (diffDays === 1) return t('tomorrow')
    if (diffDays < 7) return t('inDays', { count: diffDays })
    if (diffDays < 30) return diffDays >= 14 ? t('inWeeks', { count: Math.floor(diffDays / 7) }) : t('inWeek', { count: Math.floor(diffDays / 7) })
    return diffDays >= 60 ? t('inMonths', { count: Math.floor(diffDays / 30) }) : t('inMonth', { count: Math.floor(diffDays / 30) })
  }

  const AppointmentCard = ({
    appointment,
    isPast = false,
  }: {
    appointment: Appointment
    isPast?: boolean
  }) => {
    const statusConfig = getStatusConfig(appointment.status)
    const StatusIcon = statusConfig.icon

    return (
      <div
        className={`rounded-xl border p-4 transition-all ${isPast ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white hover:shadow-md'}`}
      >
        <div className="flex items-start gap-4">
          {/* Date block */}
          <div
            className={`w-16 flex-shrink-0 rounded-xl p-2 text-center ${isPast ? 'bg-gray-100' : 'bg-[var(--primary)]/10'}`}
          >
            <div
              className={`text-2xl font-black ${isPast ? 'text-gray-500' : 'text-[var(--primary)]'}`}
            >
              {new Date(appointment.start_time).getDate()}
            </div>
            <div
              className={`text-xs font-medium uppercase ${isPast ? 'text-gray-400' : 'text-[var(--primary)]'}`}
            >
              {new Date(appointment.start_time).toLocaleDateString(localeStr, { month: 'short' })}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </span>
              {!isPast && (
                <span className="text-xs font-medium text-[var(--primary)]">
                  {getDaysUntil(appointment.start_time)}
                </span>
              )}
            </div>

            <h4 className="mb-1 font-bold text-[var(--text-primary)]">
              {appointment.service?.name || t('generalConsultation')}
            </h4>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(appointment.start_time)}
              </span>
              {appointment.vet && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Dr. {appointment.vet.full_name}
                </span>
              )}
            </div>

            {appointment.notes && (
              <p className="mt-2 rounded bg-gray-50 p-2 text-xs italic text-gray-500">
                {appointment.notes}
              </p>
            )}

            {appointment.cancellation_reason && (
              <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-600">
                {t('reason')}: {appointment.cancellation_reason}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isPast && appointment.status !== 'cancelled' && (
            <div className="flex-shrink-0">
              <Link
                href={`/${clinic}/portal/appointments/${appointment.id}`}
                className="p-2 text-gray-400 transition-colors hover:text-[var(--primary)]"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('title', { petName })}</h2>
          <p className="text-sm text-gray-500">
            {upcomingAppointments.length !== 1 ? t('upcomingCountPlural', { count: upcomingAppointments.length }) : t('upcomingCount', { count: upcomingAppointments.length })} •{' '}
            {pastAppointments.length !== 1 ? t('pastCountPlural', { count: pastAppointments.length }) : t('pastCount', { count: pastAppointments.length })}
          </p>
        </div>
        <Link
          href={`/${clinic}/book?pet=${petId}`}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t('newAppointment')}
        </Link>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
            {t('upcomingAppointments')}
          </h3>
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </div>
        </div>
      )}

      {/* No upcoming - CTA */}
      {upcomingAppointments.length === 0 && (
        <div className="from-[var(--primary)]/5 to-[var(--primary)]/10 rounded-2xl bg-gradient-to-br p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <Calendar className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h3 className="mb-2 font-bold text-[var(--text-primary)]">{t('noUpcoming')}</h3>
          <p className="mx-auto mb-4 max-w-xs text-sm text-gray-500">
            {t('noUpcomingDescription', { petName })}
          </p>
          <Link
            href={`/${clinic}/book?pet=${petId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-md transition-opacity hover:opacity-90"
          >
            <Calendar className="h-4 w-4" />
            {t('scheduleAppointment')}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-500">
            <Clock className="h-4 w-4" />
            {t('appointmentHistory')}
          </h3>
          <div className="space-y-3">
            {pastAppointments.slice(0, 10).map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} isPast />
            ))}
            {pastAppointments.length > 10 && (
              <button className="w-full py-3 text-center text-sm font-medium text-gray-500 transition-colors hover:text-[var(--primary)]">
                {t('viewMoreOld', { count: pastAppointments.length - 10 })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {appointments.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-bold text-gray-900">{t('noHistory')}</h3>
          <p className="mx-auto mb-4 max-w-xs text-sm text-gray-500">
            {t('noHistoryDescription', { petName })}
          </p>
          <Link
            href={`/${clinic}/book?pet=${petId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
          >
            <Calendar className="h-4 w-4" />
            {t('scheduleFirst')}
          </Link>
        </div>
      )}
    </div>
  )
}
