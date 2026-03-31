/**
 * Calendar Types
 * Types for the calendar and staff scheduling system
 * Designed for integration with react-big-calendar
 */

// =============================================================================
// BASE TYPES
// =============================================================================

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

// =============================================================================
// CALENDAR EVENTS (react-big-calendar compatible)
// =============================================================================

export type CalendarEventType = 'appointment' | 'block' | 'time_off' | 'shift' | 'task'

/**
 * Base calendar event for react-big-calendar
 * The `resource` property contains all custom event data
 */
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: CalendarEventType
  resourceId?: string // Staff ID for resource view
  status?: string
  color?: string
  allDay?: boolean
  /** Custom data for event rendering and interactions */
  resource?: CalendarEventResource
  /** @deprecated Use resource instead */
  data?: {
    appointment_id?: string
    pet_id?: string
    pet_name?: string
    client_name?: string
    service_name?: string
    reason?: string
    time_off_type?: string
  }
}

/**
 * Resource data attached to calendar events (react-big-calendar pattern)
 */
export interface CalendarEventResource {
  type: CalendarEventType
  staffId?: string
  staffName?: string
  staffColor?: string
  petId?: string
  petName?: string
  ownerId?: string
  ownerName?: string
  status?: string
  notes?: string
  // Type-specific IDs
  appointmentId?: string
  shiftId?: string
  timeOffId?: string
  timeOffType?: string
  shiftType?: string
  serviceId?: string
  serviceName?: string
  species?: string
  reason?: string
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda'

export interface CalendarFilters {
  staffId?: string
  serviceId?: string
  status?: string
}

// =============================================================================
// STAFF SCHEDULING
// =============================================================================

export interface StaffMember {
  id: string
  user_id: string
  full_name: string
  job_title: string
  color_code: string
  can_be_booked: boolean
}

export interface StaffSchedule {
  id: string
  staff_profile_id: string
  name: string
  is_active: boolean
  effective_from: string
  effective_to?: string | null
  entries?: StaffScheduleEntry[]
}

export interface StaffScheduleEntry {
  id: string
  schedule_id: string
  day_of_week: DayOfWeek
  start_time: string // HH:MM
  end_time: string // HH:MM
  break_start?: string | null
  break_end?: string | null
  location?: string | null
}

/**
 * Staff schedule with profile data for display
 */
export interface StaffScheduleWithProfile extends StaffSchedule {
  staff_profile: {
    id: string
    user_id: string
    job_title: string
    color_code: string
    can_be_booked: boolean
  }
  profile?: {
    full_name: string
    avatar_url?: string | null
  }
}

// =============================================================================
// AVAILABILITY OVERRIDES
// =============================================================================

export type AvailabilityOverrideType = 'available' | 'unavailable' | 'modified'

/**
 * One-off availability override for a specific date
 */
export interface StaffAvailabilityOverride {
  id: string
  staff_profile_id: string
  tenant_id: string
  override_date: string
  override_type: AvailabilityOverrideType
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
  created_at: string
  updated_at: string
}

/**
 * Computed availability for a specific date
 */
export interface StaffAvailability {
  staffId: string
  staffName: string
  date: string
  isAvailable: boolean
  slots: AvailabilitySlot[]
}

export interface AvailabilitySlot {
  start: string // HH:MM
  end: string // HH:MM
  type: 'working' | 'break' | 'blocked'
}

// =============================================================================
// TIME OFF
// =============================================================================

export type TimeOffStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'withdrawn'

export interface TimeOffType {
  id: string
  code: string
  name: string
  description?: string | null
  is_paid: boolean
  requires_approval: boolean
  max_days_per_year?: number | null
  min_notice_days: number
  color_code: string
  is_active: boolean
  allows_half_day?: boolean
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
  total_hours?: number | null
  reason?: string | null
  status: TimeOffStatus
  requested_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  time_off_type?: TimeOffType
  staff?: {
    id: string
    full_name: string
  }
}

export interface TimeOffBalance {
  id: string
  staff_profile_id: string
  time_off_type_id: string
  year: number
  allocated_days: number
  used_days: number
  pending_days: number
  carried_over_days: number
  available_days: number
  time_off_type?: TimeOffType
}

/**
 * Time off request with full details for display
 */
export interface TimeOffRequestWithDetails extends TimeOffRequest {
  time_off_type: TimeOffType
  staff: {
    id: string
    full_name: string
    job_title?: string
    color_code?: string
    avatar_url?: string | null
  }
  reviewer?: {
    full_name: string
  } | null
  covering_staff?: {
    full_name: string
  } | null
}

// =============================================================================
// SHIFTS
// =============================================================================

export type ShiftType = 'regular' | 'overtime' | 'on_call' | 'emergency' | 'training' | 'meeting'
export type ShiftStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export interface StaffShift {
  id: string
  staff_profile_id: string
  tenant_id: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string | null
  actual_end?: string | null
  break_minutes: number
  shift_type: ShiftType
  location?: string | null
  status: ShiftStatus
  clock_in_at?: string | null
  clock_out_at?: string | null
  notes?: string | null
  staff?: StaffMember
}

// =============================================================================
// FORM DATA
// =============================================================================

/**
 * Form data for schedule entries (camelCase for forms)
 */
export interface ScheduleEntryFormData {
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  location?: string
}

/** @deprecated Use ScheduleEntryFormData instead */
export type StaffScheduleEntryFormData = ScheduleEntryFormData

/**
 * Database record format for schedule entries (snake_case for DB)
 */
export interface ScheduleEntryDbData {
  day_of_week: number
  start_time: string
  end_time: string
  break_start?: string | null
  break_end?: string | null
  location?: string | null
}

/**
 * Form data for creating/updating a staff schedule
 */
export interface StaffScheduleFormData {
  staffProfileId: string
  name: string
  effectiveFrom: string
  effectiveTo?: string
  timezone: string
  notes?: string
  entries: ScheduleEntryFormData[]
}

export interface TimeOffRequestFormData {
  time_off_type_id: string
  start_date: string
  end_date: string
  start_half_day?: boolean
  end_half_day?: boolean
  reason?: string
}

/**
 * Form data for quick add appointment from calendar
 */
export interface QuickAddAppointmentFormData {
  petId: string
  serviceId?: string
  vetId?: string
  startTime: Date
  endTime: Date
  reason: string
  notes?: string
}

/**
 * Form data for creating a shift
 */
export interface ShiftFormData {
  staff_profile_id: string
  scheduled_start: string
  scheduled_end: string
  shift_type: ShiftType
  location?: string
  notes?: string
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface CalendarActionResult {
  success?: boolean
  error?: string
  data?: unknown
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  success: boolean
  error?: string
}

export interface StaffSchedulesResponse {
  schedules: StaffScheduleWithProfile[]
  success: boolean
  error?: string
}

export interface TimeOffRequestsResponse {
  requests: TimeOffRequestWithDetails[]
  success: boolean
  error?: string
}

export interface StaffListResponse {
  staff: StaffMember[]
  success: boolean
  error?: string
}

export interface AvailabilityResponse {
  availability: StaffAvailability[]
  success: boolean
  error?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

export const SHORT_DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
}

/**
 * Get day name from day of week
 */
export function getDayName(dayOfWeek: DayOfWeek, short = false): string {
  return short ? SHORT_DAY_NAMES[dayOfWeek] : DAY_NAMES[dayOfWeek]
}

export const TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  denied: 'Rechazada',
  cancelled: 'Cancelada',
  withdrawn: 'Retirada',
}

export const TIME_OFF_STATUS_COLORS: Record<TimeOffStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  withdrawn: 'bg-gray-100 text-gray-500',
}

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  no_show: 'No Asistió',
  cancelled: 'Cancelado',
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'Regular',
  overtime: 'Horas Extra',
  on_call: 'Guardia',
  emergency: 'Emergencia',
  training: 'Capacitación',
  meeting: 'Reunión',
}

export const EVENT_COLORS: Record<string, string> = {
  // Appointment statuses
  pending: '#3B82F6', // blue
  confirmed: '#10B981', // green
  checked_in: '#F59E0B', // yellow
  in_progress: '#8B5CF6', // purple
  completed: '#6B7280', // gray
  cancelled: '#EF4444', // red
  no_show: '#F97316', // orange
  // Other events
  time_off: '#EC4899', // pink
  block: '#1F2937', // dark gray
  shift: '#06B6D4', // cyan
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format time string (HH:MM) for display
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  return `${hour}:${minutes}`
}

/**
 * Convert appointments to calendar events
 */
export function appointmentToCalendarEvent(appointment: {
  id: string
  start_time: string
  end_time: string
  status: string
  reason?: string | null
  pet?: { name: string } | null
  service?: { name: string } | null
}): CalendarEvent {
  const petName = appointment.pet?.name || 'Sin mascota'
  const serviceName = appointment.service?.name || appointment.reason || 'Cita'

  return {
    id: appointment.id,
    title: `${petName} - ${serviceName}`,
    start: new Date(appointment.start_time),
    end: new Date(appointment.end_time),
    type: 'appointment',
    status: appointment.status,
    color: EVENT_COLORS[appointment.status] || EVENT_COLORS.pending,
    data: {
      appointment_id: appointment.id,
      pet_name: petName,
      service_name: serviceName,
    },
  }
}

/**
 * Convert time off request to calendar event
 */
export function timeOffToCalendarEvent(request: TimeOffRequest, staffName: string): CalendarEvent {
  const typeName = request.time_off_type?.name || 'Ausencia'

  return {
    id: `timeoff-${request.id}`,
    title: `${staffName}: ${typeName}`,
    start: new Date(request.start_date),
    end: new Date(request.end_date),
    type: 'time_off',
    resourceId: request.staff_profile_id,
    allDay: true,
    color: request.time_off_type?.color_code || EVENT_COLORS.time_off,
    data: {
      time_off_type: typeName,
      reason: request.reason || undefined,
    },
  }
}

/**
 * Convert shift to calendar event
 */
export function shiftToCalendarEvent(shift: StaffShift): CalendarEvent {
  const staffName = shift.staff?.full_name || 'Personal'
  const shiftLabel = SHIFT_TYPE_LABELS[shift.shift_type] || 'Turno'

  return {
    id: `shift-${shift.id}`,
    title: `${staffName}: ${shiftLabel}`,
    start: new Date(shift.scheduled_start),
    end: new Date(shift.scheduled_end),
    type: 'shift',
    resourceId: shift.staff_profile_id,
    status: shift.status,
    color: EVENT_COLORS.shift,
    data: {
      reason: shift.notes || undefined,
    },
  }
}

/**
 * Get date range for calendar view
 */
export function getViewDateRange(date: Date, view: CalendarView): { start: Date; end: Date } {
  const start = new Date(date)
  const end = new Date(date)

  switch (view) {
    case 'day':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'week': {
      // Start from Sunday
      const dayOfWeek = start.getDay()
      start.setDate(start.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0) // Last day of month
      end.setHours(23, 59, 59, 999)
      break
    case 'agenda':
      // Next 7 days
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() + 7)
      end.setHours(23, 59, 59, 999)
      break
  }

  return { start, end }
}

/**
 * Check if a time slot is within working hours
 */
export function isWithinSchedule(time: Date, entries: StaffScheduleEntry[]): boolean {
  const dayOfWeek = time.getDay()
  const timeString = time.toTimeString().slice(0, 5) // HH:MM

  const entry = entries.find((e) => e.day_of_week === dayOfWeek)
  if (!entry) return false

  return timeString >= entry.start_time && timeString < entry.end_time
}

/**
 * Check if dates overlap
 */
export function datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Check if staff is available on a specific date
 * Considers schedule, overrides, and time off
 */
export function isStaffAvailable(
  schedule: StaffSchedule | null,
  overrides: StaffAvailabilityOverride[],
  timeOffRequests: TimeOffRequest[],
  date: Date
): boolean {
  const dateStr = date.toISOString().split('T')[0]

  // Check for approved time off
  const hasTimeOff = timeOffRequests.some(
    (req) => req.status === 'approved' && dateStr >= req.start_date && dateStr <= req.end_date
  )
  if (hasTimeOff) return false

  // Check for overrides
  const override = overrides.find((o) => o.override_date === dateStr)
  if (override) {
    return override.override_type !== 'unavailable'
  }

  // Check schedule
  if (!schedule?.entries?.length) return false
  const dayOfWeek = date.getDay() as DayOfWeek
  return schedule.entries.some((entry) => entry.day_of_week === dayOfWeek)
}

/**
 * Calculate working hours from schedule entries
 */
export function calculateWeeklyHours(entries: StaffScheduleEntry[]): number {
  return entries.reduce((total, entry) => {
    const [startH, startM] = entry.start_time.split(':').map(Number)
    const [endH, endM] = entry.end_time.split(':').map(Number)
    const hours = (endH * 60 + endM - startH * 60 - startM) / 60

    // Subtract break if present
    if (entry.break_start && entry.break_end) {
      const [breakStartH, breakStartM] = entry.break_start.split(':').map(Number)
      const [breakEndH, breakEndM] = entry.break_end.split(':').map(Number)
      const breakHours = (breakEndH * 60 + breakEndM - breakStartH * 60 - breakStartM) / 60
      return total + hours - breakHours
    }

    return total + hours
  }, 0)
}

/**
 * Format duration in hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

/**
 * Get time slots for a day based on schedule
 */
export function getAvailableTimeSlots(
  schedule: StaffSchedule | null,
  date: Date,
  slotDurationMinutes: number = 30
): string[] {
  if (!schedule?.entries?.length) return []

  const dayOfWeek = date.getDay() as DayOfWeek
  const entry = schedule.entries.find((e) => e.day_of_week === dayOfWeek)
  if (!entry) return []

  const slots: string[] = []
  const [startH, startM] = entry.start_time.split(':').map(Number)
  const [endH, endM] = entry.end_time.split(':').map(Number)
  const [breakStartH, breakStartM] = entry.break_start?.split(':').map(Number) || [0, 0]
  const [breakEndH, breakEndM] = entry.break_end?.split(':').map(Number) || [0, 0]

  let currentMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  const breakStartMinutes = entry.break_start ? breakStartH * 60 + breakStartM : 0
  const breakEndMinutes = entry.break_end ? breakEndH * 60 + breakEndM : 0

  while (currentMinutes + slotDurationMinutes <= endMinutes) {
    // Skip if slot falls within break
    const slotEnd = currentMinutes + slotDurationMinutes
    const isDuringBreak =
      entry.break_start &&
      entry.break_end &&
      currentMinutes < breakEndMinutes &&
      slotEnd > breakStartMinutes

    if (!isDuringBreak) {
      const hours = Math.floor(currentMinutes / 60)
      const mins = currentMinutes % 60
      slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
    }

    currentMinutes += slotDurationMinutes
  }

  return slots
}
