/**
 * Domain types for appointments
 * Defines the core business entities and value objects
 */

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  vet_id?: string
  start_time: Date
  end_time: Date
  status: AppointmentStatus
  reason?: string
  notes?: string
  created_by: string
  updated_by?: string
  created_at: Date
  updated_at: Date

  // Relations
  pet?: {
    id: string
    name: string
    species: string
    breed?: string
    owner_id: string
    owner?: {
      id: string
      full_name: string
      phone?: string
      email?: string
    }
  }
  vet?: {
    id: string
    full_name: string
  }
}

export interface CreateAppointmentData {
  pet_id: string
  vet_id?: string
  start_time: Date
  end_time: Date
  reason?: string
}

export interface UpdateAppointmentData {
  vet_id?: string
  start_time?: Date
  end_time?: Date
  status?: AppointmentStatus
  reason?: string
  notes?: string
}

export interface AppointmentSlot {
  time: string
  available: boolean
  vet_id?: string
  vet_name?: string
}

export interface AvailabilityCheckParams {
  tenant_id: string
  date: string
  slot_duration_minutes?: number
  work_start?: string
  work_end?: string
  break_start?: string
  break_end?: string
  vet_id?: string
}

export interface AppointmentFilters {
  status?: AppointmentStatus[]
  vet_id?: string
  date_from?: Date
  date_to?: Date
  pet_id?: string
}

export interface AppointmentStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  no_show: number
  today_count: number
  this_week_count: number
}

export interface StatusTransition {
  from: AppointmentStatus
  to: AppointmentStatus
  allowed: boolean
  requires_staff?: boolean
  description?: string
}
