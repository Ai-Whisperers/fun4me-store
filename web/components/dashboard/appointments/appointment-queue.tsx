'use client'

import { useState, useEffect, useMemo } from 'react'
import * as Icons from 'lucide-react'
import Image from 'next/image'
import { StatusButtons } from './status-buttons'
import { statusConfig, formatAppointmentTime } from '@/lib/types/appointments'
import { cn } from '@/lib/utils'

// Calculate time difference in minutes
function getMinutesDiff(fromDate: string): number {
  const from = new Date(fromDate)
  const now = new Date()
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60))
}

// Format waiting time for display
function formatWaitingTime(minutes: number): string {
  if (minutes < 1) return 'Recién llegó'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Get urgency level based on wait time
function getWaitUrgency(minutes: number): 'normal' | 'warning' | 'urgent' {
  if (minutes >= 45) return 'urgent'
  if (minutes >= 20) return 'warning'
  return 'normal'
}

// Waiting time indicator component
function WaitingTimeIndicator({ checkedInAt }: { checkedInAt: string }) {
  const [minutes, setMinutes] = useState(() => getMinutesDiff(checkedInAt))

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMinutes(getMinutesDiff(checkedInAt))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [checkedInAt])

  const urgency = getWaitUrgency(minutes)
  const urgencyStyles = {
    normal: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
    urgent: 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)] animate-pulse',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        urgencyStyles[urgency]
      )}
      title={`En espera desde ${new Date(checkedInAt).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`}
    >
      <Icons.Timer className="h-3.5 w-3.5" />
      <span>{formatWaitingTime(minutes)}</span>
    </div>
  )
}

// Estimated wait time calculation for queue position
function EstimatedWaitBadge({
  position,
  avgServiceTime = 15,
}: {
  position: number
  avgServiceTime?: number
}) {
  const estimatedMinutes = position * avgServiceTime

  if (estimatedMinutes === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[var(--status-success)]">
        <Icons.Zap className="h-3 w-3" />
        Siguiente
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
      <Icons.Clock className="h-3 w-3" />~{formatWaitingTime(estimatedMinutes)} de espera
    </span>
  )
}

interface Pet {
  id: string
  name: string
  species: string
  photo_url?: string | null
  owner?: {
    id: string
    full_name: string
    phone?: string | null
  }
}

interface Appointment {
  id: string
  tenant_id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  notes?: string | null
  checked_in_at?: string | null
  started_at?: string | null
  pets: Pet
}

interface AppointmentQueueProps {
  appointments: Appointment[]
  clinic: string
}

const speciesIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dog: Icons.Dog,
  cat: Icons.Cat,
  bird: Icons.Bird,
  rabbit: Icons.Rabbit,
  fish: Icons.Fish,
  default: Icons.PawPrint,
}

export function AppointmentQueue({ appointments, clinic }: AppointmentQueueProps) {
  // Group by status for better visual organization
  const inProgress = appointments.filter((a) => a.status === 'in_progress')
  const checkedIn = appointments.filter((a) => a.status === 'checked_in')
  const waiting = appointments.filter((a) => ['pending', 'confirmed'].includes(a.status))
  const completed = appointments.filter((a) =>
    ['completed', 'no_show', 'cancelled'].includes(a.status)
  )

  // Calculate wait time stats for checked-in patients
  const waitStats = useMemo(() => {
    if (checkedIn.length === 0) return null

    // Non-null assertions safe: filter and reduce checks ensure checked_in_at exists
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const waitTimes = checkedIn
      .filter((a) => a.checked_in_at)
      .map((a) => getMinutesDiff(a.checked_in_at!))

    if (waitTimes.length === 0) return null

    const avg = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    const max = Math.max(...waitTimes)
    const longestWaiting = checkedIn.reduce(
      (longest, apt) => {
        if (!apt.checked_in_at) return longest
        if (!longest) return apt
        return getMinutesDiff(apt.checked_in_at) > getMinutesDiff(longest.checked_in_at!)
          ? apt
          : longest
      },
      null as Appointment | null
    )
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    return { avg, max, longestWaiting }
  }, [checkedIn])

  return (
    <div className="space-y-6">
      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <section aria-labelledby="in-progress-heading">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" aria-hidden="true" />
            <h2 id="in-progress-heading" className="font-bold text-[var(--text-primary)]">
              En Consulta
            </h2>
            <span className="text-sm text-[var(--text-secondary)]">({inProgress.length})</span>
          </div>
          <div
            className="space-y-3"
            role="list"
            aria-label={`${inProgress.length} ${inProgress.length === 1 ? 'cita' : 'citas'} en consulta`}
          >
            {inProgress.map((apt) => (
              <AppointmentRow key={apt.id} appointment={apt} clinic={clinic} highlight="purple" />
            ))}
          </div>
        </section>
      )}

      {/* Checked In Section */}
      {checkedIn.length > 0 && (
        <section aria-labelledby="checked-in-heading">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--status-warning)]" aria-hidden="true" />
              <h2 id="checked-in-heading" className="font-bold text-[var(--text-primary)]">
                Cola de Espera
              </h2>
              <span className="text-sm text-[var(--text-secondary)]">({checkedIn.length})</span>
            </div>
            {waitStats && (
              <div className="ml-0 flex items-center gap-3 text-xs sm:ml-auto">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <Icons.BarChart3 className="h-3 w-3" aria-hidden="true" />
                  Prom:{' '}
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatWaitingTime(waitStats.avg)}
                  </span>
                </span>
                {waitStats.max >= 20 && (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      waitStats.max >= 45 ? 'text-[var(--status-error)]' : 'text-[var(--status-warning)]'
                    )}
                  >
                    <Icons.AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Máx: <span className="font-bold">{formatWaitingTime(waitStats.max)}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div
            className="space-y-3"
            role="list"
            aria-label={`${checkedIn.length} ${checkedIn.length === 1 ? 'cita' : 'citas'} en espera`}
          >
            {checkedIn.map((apt, index) => (
              <AppointmentRow
                key={apt.id}
                appointment={apt}
                clinic={clinic}
                highlight="yellow"
                showWaitTime
                queuePosition={index}
              />
            ))}
          </div>
        </section>
      )}

      {/* Waiting Section */}
      {waiting.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--status-info)]" aria-hidden="true" />
            <h2 id="waiting-heading" className="font-bold text-[var(--text-primary)]">
              Próximas Citas
            </h2>
            <span className="text-sm text-[var(--text-secondary)]">({waiting.length})</span>
          </div>
          <div
            className="space-y-3"
            role="list"
            aria-label={`${waiting.length} ${waiting.length === 1 ? 'cita' : 'citas'} próximas`}
          >
            {waiting.map((apt) => (
              <AppointmentRow key={apt.id} appointment={apt} clinic={clinic} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <section aria-labelledby="completed-heading">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
            <h2 id="completed-heading" className="font-bold text-[var(--text-primary)]">
              Finalizadas
            </h2>
            <span className="text-sm text-[var(--text-secondary)]">({completed.length})</span>
          </div>
          <div
            className="space-y-3"
            role="list"
            aria-label={`${completed.length} ${completed.length === 1 ? 'cita' : 'citas'} finalizadas`}
          >
            {completed.map((apt) => (
              <AppointmentRow key={apt.id} appointment={apt} clinic={clinic} faded />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AppointmentRow({
  appointment,
  clinic,
  highlight,
  faded,
  queuePosition,
  showWaitTime = false,
}: {
  appointment: Appointment
  clinic: string
  highlight?: 'purple' | 'yellow'
  faded?: boolean
  queuePosition?: number
  showWaitTime?: boolean
}) {
  const status = statusConfig[appointment.status] || statusConfig.pending
  const SpeciesIcon = speciesIcons[appointment.pets?.species] || speciesIcons.default

  const highlightBorder =
    highlight === 'purple'
      ? 'border-l-4 border-l-[var(--primary)]'
      : highlight === 'yellow'
        ? 'border-l-4 border-l-[var(--status-warning)]'
        : ''

  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-4 ${highlightBorder} ${faded ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Time */}
        <div className="flex min-w-[100px] items-center gap-3">
          <Icons.Clock className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <p className="font-bold text-[var(--text-primary)]">
              {formatAppointmentTime(appointment.start_time)}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {formatAppointmentTime(appointment.end_time)}
            </p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="flex flex-1 items-center gap-3">
          <div className="bg-[var(--primary)]/10 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            {appointment.pets?.photo_url ? (
              <Image
                src={appointment.pets.photo_url}
                alt={appointment.pets.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <SpeciesIcon className="h-6 w-6 text-[var(--primary)]" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-[var(--text-primary)]">
              {appointment.pets?.name || 'Sin nombre'}
            </h3>
            <p className="truncate text-sm text-[var(--text-secondary)]">
              {appointment.pets?.owner?.full_name || 'Propietario desconocido'}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {appointment.reason}
          </p>
          {appointment.pets?.owner?.phone && (
            <a
              href={`tel:${appointment.pets.owner.phone}`}
              className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
            >
              <Icons.Phone className="h-3 w-3" />
              {appointment.pets.owner.phone}
            </a>
          )}
        </div>

        {/* Waiting Time / Queue Position */}
        {showWaitTime && appointment.checked_in_at && (
          <div className="shrink-0">
            <WaitingTimeIndicator checkedInAt={appointment.checked_in_at} />
          </div>
        )}

        {queuePosition !== undefined && (
          <div className="shrink-0">
            <EstimatedWaitBadge position={queuePosition} />
          </div>
        )}

        {/* Status Badge */}
        <div className="shrink-0">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Actions */}
        {!faded && (
          <div className="shrink-0">
            <StatusButtons
              appointmentId={appointment.id}
              currentStatus={appointment.status}
              clinic={clinic}
            />
          </div>
        )}
      </div>
    </div>
  )
}
