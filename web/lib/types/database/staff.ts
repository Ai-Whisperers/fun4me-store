/**
 * Staff Database Tables
 * StaffProfile, StaffShift, TimeOffRequest, StaffTask
 */

import type { EmploymentType, EmploymentStatus, ShiftType, TimeOffRequestStatus } from './enums'

// =============================================================================
// STAFF
// =============================================================================

export interface StaffProfile {
  id: string
  user_id: string
  tenant_id: string
  employee_id: string | null
  hire_date: string | null
  termination_date: string | null
  employment_type: EmploymentType
  employment_status: EmploymentStatus
  job_title: string
  department: string | null
  specializations: string[] | null
  license_number: string | null
  license_expiry: string | null
  preferred_shift: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible' | null
  max_hours_per_week: number
  can_work_weekends: boolean
  can_work_holidays: boolean
  work_phone: string | null
  work_email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  hourly_rate: number | null
  salary_type: 'hourly' | 'salary' | 'commission' | null
  certifications: Record<string, unknown>[]
  skills: string[] | null
  languages: string[]
  color_code: string
  can_be_booked: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StaffShift {
  id: string
  staff_profile_id: string
  tenant_id: string
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  break_minutes: number
  shift_type: ShiftType
  location: string | null
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled'
  clock_in_at: string | null
  clock_out_at: string | null
  clock_in_method: 'manual' | 'badge' | 'biometric' | 'app' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffRequest {
  id: string
  staff_profile_id: string
  tenant_id: string
  time_off_type_id: string
  start_date: string
  end_date: string
  start_half_day: boolean
  end_half_day: boolean
  total_days: number
  total_hours: number | null
  reason: string | null
  attachment_url: string | null
  status: TimeOffRequestStatus
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  coverage_notes: string | null
  covering_staff_id: string | null
  created_at: string
  updated_at: string
}

export interface StaffTask {
  id: string
  tenant_id: string
  assigned_to: string | null
  assigned_by: string | null
  title: string
  description: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  reminder_at: string | null
  pet_id: string | null
  appointment_id: string | null
  hospitalization_id: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
