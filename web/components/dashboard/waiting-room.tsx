'use client'

import { useState } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  PawPrint,
  Phone,
  ChevronRight,
  RefreshCw,
  Stethoscope,
  LogIn,
  Timer,
  AlertCircle,
} from 'lucide-react'
import { updateAppointmentStatus } from '@/app/actions/update-appointment-status'

const queryClient = new QueryClient()

export function WaitingRoomWrapper({ clinic }: { clinic: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WaitingRoom clinic={clinic} />
    </QueryClientProvider>
  )
}

interface WaitingPatient {
  id: string
  start_time: string
  end_time: string
  status:
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'
  reason: string
  pet: {
    id: string
    name: string
    species: string
    photo_url: string | null
  } | null
  owner: {
    id: string
    full_name: string
    phone: string | null
  } | null
  vet: {
    id: string
    full_name: string
  } | null
}

interface WaitingRoomProps {
  clinic: string
  initialAppointments?: WaitingPatient[]
}

// Status styling config (labels added via translations in component)
const statusStyles: Record<
  string,
  { translationKey: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    translationKey: 'pending',
    color: 'text-[var(--status-warning-text)]',
    bgColor: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    translationKey: 'confirmed',
    color: 'text-[var(--status-info-text)]',
    bgColor: 'bg-[var(--status-info-bg)] border-[var(--status-info-border)]',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  checked_in: {
    translationKey: 'checkedIn',
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10 border-[var(--primary)]/20',
    icon: <LogIn className="h-4 w-4" />,
  },
  in_progress: {
    translationKey: 'inProgress',
    color: 'text-[var(--status-success-text)]',
    bgColor: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)]',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  completed: {
    translationKey: 'completed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  cancelled: {
    translationKey: 'cancelled',
    color: 'text-[var(--status-error-text)]',
    bgColor: 'bg-[var(--status-error-bg)] border-[var(--status-error-border)]',
    icon: <XCircle className="h-4 w-4" />,
  },
  no_show: {
    translationKey: 'noShow',
    color: 'text-[var(--status-warning-text)]',
    bgColor: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
    icon: <AlertCircle className="h-4 w-4" />,
  },
}

export function WaitingRoom({ clinic }: { clinic: string }): React.ReactElement {
  const t = useTranslations('dashboard.waitingRoom')
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    data: appointments = [],
    isLoading,
    isFetching,
  } = useQuery<WaitingPatient[]>({
    queryKey: ['waitingRoom', clinic],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/waiting-room?clinic=${clinic}`)
      if (!res.ok) {
        throw new Error('Failed to fetch waiting room appointments')
      }
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null)

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ appointmentId, newStatus }: { appointmentId: string; newStatus: string }) =>
      updateAppointmentStatus(appointmentId, newStatus, clinic),
    onMutate: ({ appointmentId }) => {
      setUpdatingAppointmentId(appointmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitingRoom', clinic] })
    },
    onSettled: () => {
      setUpdatingAppointmentId(null)
    },
  })

  const formatTime = (timeString: string): string => {
    return new Date(timeString).toLocaleTimeString(locale === 'es' ? 'es-PY' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getWaitTime = (startTime: string): string => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()

    if (diffMs < 0) {
      const minsUntil = Math.abs(Math.floor(diffMs / 60000))
      if (minsUntil < 60) return t('waitTime.inMinutes', { minutes: minsUntil })
      return t('waitTime.inHoursMinutes', { hours: Math.floor(minsUntil / 60), minutes: minsUntil % 60 })
    }

    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return t('waitTime.waitingMinutes', { minutes: mins })
    return t('waitTime.waitingHoursMinutes', { hours: Math.floor(mins / 60), minutes: mins % 60 })
  }

  // Group appointments by status
  const grouped = {
    waiting: appointments.filter((a) => ['checked_in'].includes(a.status)),
    inProgress: appointments.filter((a) => a.status === 'in_progress'),
    upcoming: appointments.filter((a) => ['pending', 'confirmed'].includes(a.status)),
    completed: appointments.filter((a) => ['completed', 'cancelled', 'no_show'].includes(a.status)),
  }

  const getNextStatuses = (
    currentStatus: string
  ): { label: string; status: string; color: string }[] => {
    switch (currentStatus) {
      case 'pending':
        return [
          { label: t('actions.confirm'), status: 'confirmed', color: 'bg-[var(--status-info)]' },
          { label: t('actions.cancel'), status: 'cancelled', color: 'bg-[var(--status-error)]' },
        ]
      case 'confirmed':
        return [
          { label: t('actions.checkIn'), status: 'checked_in', color: 'bg-[var(--primary)]' },
          { label: t('actions.noShow'), status: 'no_show', color: 'bg-[var(--status-warning)]' },
        ]
      case 'checked_in':
        return [{ label: t('actions.startConsultation'), status: 'in_progress', color: 'bg-[var(--status-success)]' }]
      case 'in_progress':
        return [{ label: t('actions.complete'), status: 'completed', color: 'bg-gray-700' }]
      default:
        return []
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <Timer className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t('title')}</h2>
            <p className="text-xs text-gray-500">
              {t('activePatients', {
                count: appointments.filter(
                  (a) => !['completed', 'cancelled', 'no_show'].includes(a.status)
                ).length,
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['waitingRoom', clinic] })}
          disabled={isFetching}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Waiting (Checked In) */}
      {grouped.waiting.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="bg-[var(--primary)]/10 px-6 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              {t('inWaitingRoom')} ({grouped.waiting.length})
            </span>
          </div>
          {grouped.waiting.map((apt) => (
            <AppointmentRow
              key={apt.id}
              appointment={apt}
              clinic={clinic}
              isUpdating={updatingAppointmentId === apt.id}
              onStatusChange={(appointmentId, newStatus) =>
                updateStatus({ appointmentId, newStatus })
              }
              getNextStatuses={getNextStatuses}
              formatTime={formatTime}
              getWaitTime={getWaitTime}
            />
          ))}
        </div>
      )}

      {/* In Progress */}
      {grouped.inProgress.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="bg-[var(--status-success-bg)] px-6 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--status-success-text)]">
              {t('inConsultation')} ({grouped.inProgress.length})
            </span>
          </div>
          {grouped.inProgress.map((apt) => (
            <AppointmentRow
              key={apt.id}
              appointment={apt}
              clinic={clinic}
              isUpdating={updatingAppointmentId === apt.id}
              onStatusChange={(appointmentId, newStatus) =>
                updateStatus({ appointmentId, newStatus })
              }
              getNextStatuses={getNextStatuses}
              formatTime={formatTime}
              getWaitTime={getWaitTime}
            />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {grouped.upcoming.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="bg-gray-50 px-6 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              {t('upcomingAppointments')} ({grouped.upcoming.length})
            </span>
          </div>
          {grouped.upcoming.slice(0, 5).map((apt) => (
            <AppointmentRow
              key={apt.id}
              appointment={apt}
              clinic={clinic}
              isUpdating={updatingAppointmentId === apt.id}
              onStatusChange={(appointmentId, newStatus) =>
                updateStatus({ appointmentId, newStatus })
              }
              getNextStatuses={getNextStatuses}
              formatTime={formatTime}
              getWaitTime={getWaitTime}
            />
          ))}
          {grouped.upcoming.length > 5 && (
            <div className="px-6 py-3 text-center">
              <button
                onClick={() => router.push(`/${clinic}/dashboard/appointments`)}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                {t('viewMore', { count: grouped.upcoming.length - 5 })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Warm and inviting */}
      {appointments.length === 0 && !isLoading && (
        <div className="px-6 py-10 text-center">
          <div className="from-[var(--primary)]/10 to-[var(--accent)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
            <Clock className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h4 className="mb-2 text-base font-bold text-[var(--text-primary)]">
            {t('noAppointments')}
          </h4>
          <p className="mx-auto mb-4 max-w-xs text-sm text-[var(--text-secondary)]">
            {t('noAppointmentsDesc')}
          </p>
          <button
            onClick={() => router.push(`/${clinic}/dashboard/appointments?action=new`)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <PawPrint className="h-4 w-4" />
            {t('scheduleAppointment')}
          </button>
        </div>
      )}

      {/* Completed Section (Collapsed) */}
      {grouped.completed.length > 0 && (
        <details className="border-t border-gray-100">
          <summary className="cursor-pointer bg-gray-50 px-6 py-3 text-sm text-gray-500 hover:bg-gray-100">
            {t('completedToday')} ({grouped.completed.length})
          </summary>
          {grouped.completed.map((apt) => (
            <AppointmentRow
              key={apt.id}
              appointment={apt}
              clinic={clinic}
              isUpdating={updatingAppointmentId === apt.id}
              onStatusChange={(appointmentId, newStatus) =>
                updateStatus({ appointmentId, newStatus })
              }
              getNextStatuses={getNextStatuses}
              formatTime={formatTime}
              getWaitTime={getWaitTime}
              compact
            />
          ))}
        </details>
      )}
    </div>
  )
}

// Extracted row component for cleaner code
interface AppointmentRowProps {
  appointment: WaitingPatient
  clinic: string
  isUpdating: boolean
  onStatusChange: (id: string, status: string) => void
  getNextStatuses: (status: string) => { label: string; status: string; color: string }[]
  formatTime: (time: string) => string
  getWaitTime: (time: string) => string
  compact?: boolean
  translations?: ReturnType<typeof useTranslations<'dashboard.waitingRoom'>>
}

function AppointmentRow({
  appointment,
  clinic,
  isUpdating,
  onStatusChange,
  getNextStatuses,
  formatTime,
  getWaitTime,
  compact = false,
}: AppointmentRowProps): React.ReactElement {
  const t = useTranslations('dashboard.waitingRoom')
  const router = useRouter()
  const statusStyle = statusStyles[appointment.status]
  const statusLabel = t(`status.${statusStyle.translationKey}`)
  const nextStatuses = getNextStatuses(appointment.status)

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50 ${
        compact ? 'py-3' : ''
      }`}
    >
      {/* Pet Photo */}
      <div className="flex-shrink-0">
        {appointment.pet?.photo_url ? (
          <img
            src={appointment.pet.photo_url}
            alt={appointment.pet.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
            <PawPrint className="h-6 w-6 text-[var(--primary)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold text-gray-900">
            {appointment.pet?.name || t('noPatient')}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bgColor} ${statusStyle.color} border`}
          >
            {statusStyle.icon}
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(appointment.start_time)}
          </span>
          {appointment.owner && (
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3" />
              {appointment.owner.full_name}
            </span>
          )}
          {appointment.owner?.phone && (
            <a
              href={`tel:${appointment.owner.phone}`}
              className="flex items-center gap-1 text-[var(--primary)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3 w-3" />
            </a>
          )}
        </div>
        {!compact && appointment.reason && (
          <p className="mt-1 truncate text-xs text-gray-400">{appointment.reason}</p>
        )}
      </div>

      {/* Wait Time */}
      {['checked_in', 'in_progress'].includes(appointment.status) && (
        <div className="text-right text-xs text-gray-500">
          {getWaitTime(appointment.start_time)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {nextStatuses.map((next) => (
          <button
            key={next.status}
            onClick={() => onStatusChange(appointment.id, next.status)}
            disabled={isUpdating}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${next.color} transition-opacity hover:opacity-90 disabled:opacity-50`}
          >
            {next.label}
          </button>
        ))}
        <button
          onClick={() => router.push(`/${clinic}/portal/pets/${appointment.pet?.id}`)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[var(--primary)] hover:bg-opacity-10 hover:text-[var(--primary)]"
          title={t('viewProfile')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
