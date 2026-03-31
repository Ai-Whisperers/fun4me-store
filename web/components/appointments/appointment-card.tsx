'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CancelButton } from './cancel-button'
import { RescheduleDialog } from './reschedule-dialog'
import {
  statusConfig,
  formatAppointmentTime,
  canCancelAppointment,
  canRescheduleAppointment,
  formatAppointmentDateTime,
} from '@/lib/types/appointments'

interface AppointmentCardProps {
  appointment: {
    id: string
    tenant_id: string
    start_time: string
    end_time: string
    status: string
    reason: string
    notes?: string | null
    pets: {
      id: string
      name: string
      species: string
      photo_url?: string | null
    }
  }
  clinic: string
  showActions?: boolean
  onUpdate?: () => void
}

const speciesIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dog: Icons.Dog,
  cat: Icons.Cat,
  bird: Icons.Bird,
  rabbit: Icons.Rabbit,
  fish: Icons.Fish,
  default: Icons.PawPrint,
}

export function AppointmentCard({
  appointment,
  clinic,
  showActions = true,
  onUpdate,
}: AppointmentCardProps) {
  const t = useTranslations('appointments')
  const status = statusConfig[appointment.status] || statusConfig.pending
  const canCancel = canCancelAppointment(appointment)
  const canReschedule = canRescheduleAppointment(appointment)

  const SpeciesIcon = speciesIcons[appointment.pets.species] || speciesIcons.default

  const isPast = new Date(appointment.start_time) < new Date()
  const isToday = new Date(appointment.start_time).toDateString() === new Date().toDateString()

  return (
    <div
      className={`rounded-2xl border bg-white transition-all hover:shadow-lg ${
        appointment.status === 'cancelled'
          ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]/30'
          : isPast
            ? 'border-gray-100 opacity-75'
            : 'hover:border-[var(--primary)]/30 border-gray-100'
      }`}
    >
      <div className="p-5">
        {/* Header with status and date */}
        <div className="mb-4 flex flex-wrap items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Pet Avatar */}
            <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
              {appointment.pets.photo_url ? (
                <img
                  src={appointment.pets.photo_url}
                  alt={appointment.pets.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <SpeciesIcon className="h-6 w-6 text-[var(--primary)]" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-[var(--text-primary)]">{appointment.pets.name}</h3>
              <p className="text-xs capitalize text-[var(--text-secondary)]">
                {appointment.reason}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Date and Time */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span
              className={`font-medium ${isToday ? 'font-bold text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
            >
              {formatAppointmentDateTime(appointment.start_time)}
            </span>
          </div>
        </div>

        {/* Notes if any */}
        {appointment.notes && !appointment.notes.startsWith('[Cancelado') && (
          <p className="mb-4 line-clamp-2 text-sm text-[var(--text-secondary)]">
            {appointment.notes}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <Link
              href={`/${clinic}/portal/appointments/${appointment.id}`}
              className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {t('card.viewDetails')}
              <Icons.ChevronRight className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2">
              {canReschedule && (
                <RescheduleDialog
                  appointmentId={appointment.id}
                  clinicId={clinic}
                  currentDate={appointment.start_time.split('T')[0]}
                  currentTime={formatAppointmentTime(appointment.start_time)}
                  onSuccess={onUpdate}
                />
              )}
              {canCancel && (
                <CancelButton appointmentId={appointment.id} variant="icon" onSuccess={onUpdate} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
