import * as Icons from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { statusConfig, formatAppointmentTime } from '@/lib/types/appointments'

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
  start_time: string
  end_time: string
  status: string
  reason: string
  pets: Pet | null
}

interface TodayScheduleWidgetProps {
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

export function TodayScheduleWidget({ appointments, clinic }: TodayScheduleWidgetProps) {
  // Group appointments by status priority
  const activeAppointments = appointments.filter((a) =>
    ['in_progress', 'checked_in', 'pending', 'confirmed'].includes(a.status)
  )
  const completedCount = appointments.filter((a) =>
    ['completed', 'no_show', 'cancelled'].includes(a.status)
  ).length

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Find the next upcoming appointment
  const nextAppointment = activeAppointments.find((apt) => {
    const aptTime = new Date(apt.start_time)
    return aptTime > now
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary)]/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Icons.CalendarClock className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Agenda de Hoy</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {new Date().toLocaleDateString('es-PY', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </div>
        <Link
          href={`/${clinic}/dashboard/appointments`}
          className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Ver todo
          <Icons.ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 bg-gray-50 px-5 py-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--status-info)]" />
          <span className="text-[var(--text-secondary)]">
            {activeAppointments.filter((a) => ['pending', 'confirmed'].includes(a.status)).length}{' '}
            pendientes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
          <span className="text-[var(--text-secondary)]">
            {activeAppointments.filter((a) => a.status === 'in_progress').length} en consulta
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
          <span className="text-[var(--text-secondary)]">{completedCount} completadas</span>
        </div>
      </div>

      {/* Appointments List */}
      {activeAppointments.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Icons.CalendarCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-[var(--text-secondary)]">No hay citas pendientes para hoy</p>
          <Link
            href={`/${clinic}/dashboard/appointments/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Icons.Plus className="h-4 w-4" />
            Nueva Cita
          </Link>
        </div>
      ) : (
        <div className="max-h-[400px] divide-y divide-gray-100 overflow-y-auto">
          {activeAppointments.slice(0, 8).map((apt) => {
            const status = statusConfig[apt.status] || statusConfig.pending
            const SpeciesIcon = speciesIcons[apt.pets?.species || 'default'] || speciesIcons.default
            const aptTime = new Date(apt.start_time)
            const isNext = nextAppointment?.id === apt.id
            const isPast = aptTime < now && !['in_progress', 'checked_in'].includes(apt.status)

            return (
              <div
                key={apt.id}
                className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 ${
                  apt.status === 'in_progress' ? 'bg-[var(--primary)]/10' : ''
                } ${isNext ? 'bg-[var(--status-info-bg)]' : ''}`}
              >
                {/* Time Column */}
                <div className={`w-16 shrink-0 ${isPast ? 'opacity-50' : ''}`}>
                  <p
                    className={`text-sm font-bold ${
                      apt.status === 'in_progress'
                        ? 'text-[var(--primary)]'
                        : isNext
                          ? 'text-[var(--primary)]'
                          : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatAppointmentTime(apt.start_time)}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {formatAppointmentTime(apt.end_time)}
                  </p>
                </div>

                {/* Pet Avatar */}
                <div className="bg-[var(--primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {apt.pets?.photo_url ? (
                    <Image
                      src={apt.pets.photo_url}
                      alt={apt.pets.name || 'Mascota'}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <SpeciesIcon className="h-5 w-5 text-[var(--primary)]" />
                  )}
                </div>

                {/* Pet & Owner Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {apt.pets?.name || 'Sin nombre'}
                    </p>
                    {isNext && (
                      <span className="bg-[var(--primary)]/10 rounded px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                        SIGUIENTE
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {apt.pets?.owner?.full_name || 'Propietario desconocido'}
                  </p>
                </div>

                {/* Reason */}
                <div className="hidden min-w-0 flex-1 md:block">
                  <p className="truncate text-xs text-[var(--text-secondary)]">{apt.reason}</p>
                </div>

                {/* Status Badge */}
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}
                >
                  {status.label}
                </span>

                {/* Phone Quick Action */}
                {apt.pets?.owner?.phone && (
                  <a
                    href={`tel:${apt.pets.owner.phone}`}
                    className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100"
                    title={`Llamar a ${apt.pets.owner.phone}`}
                    aria-label={`Llamar a ${apt.pets.owner.full_name || 'propietario'} al ${apt.pets.owner.phone}`}
                  >
                    <Icons.Phone className="h-4 w-4 text-[var(--text-secondary)]" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer - Show more link if there are more appointments */}
      {activeAppointments.length > 8 && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
          <Link
            href={`/${clinic}/dashboard/appointments`}
            className="flex items-center justify-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            +{activeAppointments.length - 8} citas más
            <Icons.ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
