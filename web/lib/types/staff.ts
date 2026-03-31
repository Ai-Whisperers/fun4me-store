/**
 * Staff and team management types
 *
 * Note: Core staff types (StaffMember, StaffSchedule, TimeOffRequest, etc.)
 * are defined in calendar.ts to support calendar functionality.
 * This file contains additional staff-specific types and utilities.
 */

/**
 * Extended staff profile with additional fields for dashboard/management
 */
export interface StaffProfileExtended {
  id: string
  profile_id: string
  tenant_id: string
  specialization?: string
  license_number?: string
  bio?: string
  photo_url?: string
  is_available_for_appointments: boolean
  hire_date?: string
  employment_status?: 'active' | 'on_leave' | 'terminated'
  created_at: string
  // Joined from profiles
  full_name: string
  email: string
  phone?: string
  role: 'vet' | 'admin'
}

/**
 * Check if a staff member is available on a specific date and time
 */
export interface StaffAvailabilityCheck {
  staff_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  reason?: 'time_off' | 'outside_schedule' | 'booked' | 'not_accepting_appointments'
}

/**
 * Staff performance metrics
 */
export interface StaffPerformance {
  staff_id: string
  staff_name: string
  period: string
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  revenue_generated: number
  average_appointment_duration: number
  client_satisfaction_score?: number
}

/**
 * Staff workload summary
 */
export interface StaffWorkload {
  staff_id: string
  staff_name: string
  week_start: string
  total_scheduled_hours: number
  total_booked_hours: number
  utilization_rate: number
  appointments_count: number
}

/**
 * Staff credentials and certifications
 */
export interface StaffCredential {
  id: string
  staff_id: string
  credential_type: 'license' | 'certification' | 'degree' | 'training'
  name: string
  issuing_organization: string
  credential_number?: string
  issue_date: string
  expiration_date?: string
  status: 'active' | 'expired' | 'suspended'
  document_url?: string
}
