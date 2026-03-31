// =============================================================================
// APPOINTMENT TYPES - Pet Owner Appointment Management
// =============================================================================
// Extended types for appointment features beyond the base database types.
// =============================================================================

import type { Appointment as BaseAppointment, Pet, Service } from './database'

/**
 * Extended appointment status for display purposes
 * Maps to database status but with UI-friendly labels
 */
export type AppointmentDisplayStatus =
  | 'scheduled' // pending in DB
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

/**
 * Appointment with joined pet and service data for display
 */
export interface AppointmentWithDetails extends BaseAppointment {
  pet: Pick<Pet, 'id' | 'name' | 'species' | 'photo_url'>
  service?: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'base_price'> | null
}

/**
 * Appointment card display data (minimal for list views)
 */
export interface AppointmentCardData {
  id: string
  tenant_id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  notes?: string | null
  pet: {
    id: string
    name: string
    species: string
    photo_url?: string | null
  }
}

/**
 * Result types for server actions
 */
export interface CancelAppointmentResult {
  success?: boolean
  error?: string
}

export interface RescheduleAppointmentResult {
  success?: boolean
  error?: string
  newDate?: string
  newTime?: string
}

/**
 * Status badge styling configuration
 */
export const statusConfig: Record<
  string,
  {
    label: string
    className: string
  }
> = {
  pending: {
    label: 'Programada',
    className: 'bg-blue-100 text-blue-800',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-green-100 text-green-800',
  },
  checked_in: {
    label: 'Registrada',
    className: 'bg-yellow-100 text-yellow-800',
  },
  in_progress: {
    label: 'En Progreso',
    className: 'bg-purple-100 text-purple-800',
  },
  completed: {
    label: 'Completada',
    className: 'bg-gray-100 text-gray-800',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-red-100 text-red-800',
  },
  no_show: {
    label: 'No Asistió',
    className: 'bg-orange-100 text-orange-800',
  },
}

/**
 * Utility to format appointment date for display
 */
export function formatAppointmentDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Utility to format appointment date and time for display
 */
export function formatAppointmentDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Utility to format appointment time for display
 */
export function formatAppointmentTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Check if an appointment can be cancelled
 * (must be in the future and not already cancelled/completed)
 */
export function canCancelAppointment(appointment: { start_time: string; status: string }): boolean {
  const appointmentDate = new Date(appointment.start_time)
  const now = new Date()
  const isFuture = appointmentDate > now
  const isCancellable = !['cancelled', 'completed', 'no_show'].includes(appointment.status)
  return isFuture && isCancellable
}

/**
 * Check if an appointment can be rescheduled
 * (must be in the future and not cancelled/completed)
 */
export function canRescheduleAppointment(appointment: {
  start_time: string
  status: string
}): boolean {
  return canCancelAppointment(appointment)
}
