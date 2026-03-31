/**
 * Appointment Entity Types - Single Source of Truth
 *
 * This file contains the canonical Appointment type and all derived variants.
 * Import from here instead of defining inline types.
 *
 * @example
 * ```typescript
 * import type { Appointment, AppointmentWithDetails, AppointmentCardData } from '@/lib/types/entities/appointment'
 * ```
 */

import type { AppointmentStatus } from '../database/enums'
import type { PetSummary, PetCardData } from './pet'

// =============================================================================
// BASE APPOINTMENT TYPE (Database Entity)
// =============================================================================

/**
 * Base Appointment entity - matches database schema exactly
 */
export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string | null
  service_id?: string | null
  created_by: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  reason: string
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// =============================================================================
// DERIVED TYPES
// =============================================================================

/**
 * Appointment summary for lists
 */
export type AppointmentSummary = Pick<
  Appointment,
  'id' | 'start_time' | 'end_time' | 'status' | 'reason'
>

/**
 * Appointment card data - for portal appointment lists
 */
export interface AppointmentCardData {
  id: string
  tenant_id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  notes?: string | null
  pet: PetCardData
}

/**
 * Appointment with pet and service details
 */
export interface AppointmentWithDetails extends Appointment {
  pet: PetCardData & {
    owner?: {
      id: string
      full_name: string
      email: string | null
      phone?: string | null
    } | null
  }
  service?: {
    id: string
    name: string
    duration_minutes?: number | null
    base_price?: number
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
}

/**
 * Appointment for calendar display
 */
export interface AppointmentCalendarEvent {
  id: string
  title: string
  start: Date | string
  end: Date | string
  status: AppointmentStatus
  pet: PetSummary
  vet_id?: string | null
  service_id?: string | null
  resourceId?: string
}

/**
 * Form data for creating an appointment
 */
export interface AppointmentFormData {
  pet_id: string
  service_id?: string | null
  vet_id?: string | null
  start_time: string
  end_time?: string
  reason: string
  notes?: string
}

/**
 * Data for creating an appointment via API
 */
export interface CreateAppointmentInput {
  tenant_id: string
  pet_id: string
  service_id?: string | null
  vet_id?: string | null
  created_by: string
  start_time: string
  end_time: string
  reason: string
  notes?: string
}

/**
 * Data for updating an appointment
 */
export type UpdateAppointmentInput = Partial<Omit<CreateAppointmentInput, 'tenant_id' | 'created_by'>>

/**
 * Data for rescheduling an appointment
 */
export interface RescheduleAppointmentInput {
  appointment_id: string
  new_start_time: string
  new_end_time?: string
}

/**
 * Appointment slot for availability checking
 */
export interface AppointmentSlot {
  start_time: string
  end_time: string
  is_available: boolean
  vet_id?: string | null
}

/**
 * Extended appointment status for UI display
 * Maps to database status with additional granularity
 */
export type AppointmentDisplayStatus =
  | 'scheduled'    // pending in DB
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

// =============================================================================
// ACTION RESULT TYPES
// =============================================================================

/**
 * Result of cancelling an appointment
 */
export interface CancelAppointmentResult {
  success?: boolean
  error?: string
}

/**
 * Result of rescheduling an appointment
 */
export interface RescheduleAppointmentResult {
  success?: boolean
  error?: string
  newDate?: string
  newTime?: string
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

/**
 * Status badge styling configuration
 */
export const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
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
    label: 'No Asistio',
    className: 'bg-orange-100 text-orange-800',
  },
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an appointment can be cancelled
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
 */
export function canRescheduleAppointment(appointment: { start_time: string; status: string }): boolean {
  return canCancelAppointment(appointment)
}

/**
 * Format appointment date for display
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
 * Format appointment time for display
 */
export function formatAppointmentTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format appointment date and time for display
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
