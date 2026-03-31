import { describe, it, expect } from 'vitest'
import {
  getDayName,
  formatTime,
  getViewDateRange,
  isWithinSchedule,
  datesOverlap,
  isStaffAvailable,
  calculateWeeklyHours,
  formatDuration,
  getAvailableTimeSlots,
  appointmentToCalendarEvent,
  DAY_NAMES,
  SHORT_DAY_NAMES,
  TIME_OFF_STATUS_LABELS,
  SHIFT_STATUS_LABELS,
  SHIFT_TYPE_LABELS,
  EVENT_COLORS,
  type DayOfWeek,
  type StaffSchedule,
  type StaffScheduleEntry,
  type StaffAvailabilityOverride,
  type TimeOffRequest,
} from '@/lib/types/calendar'

// =============================================================================
// DAY NAME UTILITIES
// =============================================================================

describe('getDayName', () => {
  it('returns full day names in Spanish', () => {
    expect(getDayName(0)).toBe('Domingo')
    expect(getDayName(1)).toBe('Lunes')
    expect(getDayName(2)).toBe('Martes')
    expect(getDayName(3)).toBe('Miércoles')
    expect(getDayName(4)).toBe('Jueves')
    expect(getDayName(5)).toBe('Viernes')
    expect(getDayName(6)).toBe('Sábado')
  })

  it('returns short day names when short=true', () => {
    expect(getDayName(0, true)).toBe('Dom')
    expect(getDayName(1, true)).toBe('Lun')
    expect(getDayName(2, true)).toBe('Mar')
    expect(getDayName(3, true)).toBe('Mié')
    expect(getDayName(4, true)).toBe('Jue')
    expect(getDayName(5, true)).toBe('Vie')
    expect(getDayName(6, true)).toBe('Sáb')
  })
})

describe('DAY_NAMES constants', () => {
  it('has all days defined', () => {
    expect(Object.keys(DAY_NAMES)).toHaveLength(7)
    expect(Object.keys(SHORT_DAY_NAMES)).toHaveLength(7)
  })
})

// =============================================================================
// TIME FORMATTING
// =============================================================================

describe('formatTime', () => {
  it('formats 24-hour time correctly', () => {
    expect(formatTime('08:00')).toBe('8:00')
    expect(formatTime('12:30')).toBe('12:30')
    expect(formatTime('17:45')).toBe('17:45')
    expect(formatTime('00:00')).toBe('0:00')
    expect(formatTime('23:59')).toBe('23:59')
  })
})

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(45)).toBe('45 min')
  })

  it('formats hours only', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(120)).toBe('2h')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min')
    expect(formatDuration(150)).toBe('2h 30min')
  })
})

// =============================================================================
// DATE RANGE UTILITIES
// =============================================================================

describe('getViewDateRange', () => {
  it('returns correct range for day view', () => {
    const date = new Date('2024-06-15T12:00:00')
    const range = getViewDateRange(date, 'day')

    expect(range.start.getHours()).toBe(0)
    expect(range.start.getMinutes()).toBe(0)
    expect(range.end.getHours()).toBe(23)
    expect(range.end.getMinutes()).toBe(59)
    expect(range.start.getDate()).toBe(15)
    expect(range.end.getDate()).toBe(15)
  })

  it('returns correct range for week view', () => {
    // June 15, 2024 is a Saturday
    const date = new Date('2024-06-15T12:00:00')
    const range = getViewDateRange(date, 'week')

    // Week should start on Sunday (June 9) and end on Saturday (June 15)
    expect(range.start.getDay()).toBe(0) // Sunday
    expect(range.end.getDay()).toBe(6) // Saturday
  })

  it('returns correct range for month view', () => {
    const date = new Date('2024-06-15T12:00:00')
    const range = getViewDateRange(date, 'month')

    expect(range.start.getDate()).toBe(1) // First of month
    expect(range.end.getDate()).toBe(30) // Last day of June
    expect(range.end.getMonth()).toBe(5) // Still June
  })

  it('returns correct range for agenda view (next 7 days)', () => {
    const date = new Date('2024-06-15T12:00:00')
    const range = getViewDateRange(date, 'agenda')

    // Start should be beginning of the day
    expect(range.start.getHours()).toBe(0)
    // End should be 7 days later
    const daysDiff = Math.round(
      (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
    )
    expect(daysDiff).toBeGreaterThanOrEqual(7)
    expect(daysDiff).toBeLessThanOrEqual(8)
  })
})

// =============================================================================
// SCHEDULE UTILITIES
// =============================================================================

describe('isWithinSchedule', () => {
  const entries: StaffScheduleEntry[] = [
    {
      id: '1',
      schedule_id: 'schedule-1',
      day_of_week: 1 as DayOfWeek, // Monday
      start_time: '08:00',
      end_time: '17:00',
      break_start: null,
      break_end: null,
      location: null,
    },
    {
      id: '2',
      schedule_id: 'schedule-1',
      day_of_week: 2 as DayOfWeek, // Tuesday
      start_time: '09:00',
      end_time: '18:00',
      break_start: null,
      break_end: null,
      location: null,
    },
  ]

  it('returns true when time is within schedule', () => {
    // Monday at 10:00
    const time = new Date('2024-06-17T10:00:00') // June 17, 2024 is Monday
    expect(isWithinSchedule(time, entries)).toBe(true)
  })

  it('returns false when time is outside schedule hours', () => {
    // Monday at 07:00 (before start)
    const timeBefore = new Date('2024-06-17T07:00:00')
    expect(isWithinSchedule(timeBefore, entries)).toBe(false)

    // Monday at 18:00 (after end)
    const timeAfter = new Date('2024-06-17T18:00:00')
    expect(isWithinSchedule(timeAfter, entries)).toBe(false)
  })

  it('returns false when day is not in schedule', () => {
    // Wednesday (not in schedule)
    const time = new Date('2024-06-19T10:00:00')
    expect(isWithinSchedule(time, entries)).toBe(false)
  })

  it('returns false for empty entries', () => {
    const time = new Date('2024-06-17T10:00:00')
    expect(isWithinSchedule(time, [])).toBe(false)
  })
})

describe('calculateWeeklyHours', () => {
  it('calculates total hours without breaks', () => {
    const entries: StaffScheduleEntry[] = [
      {
        id: '1',
        schedule_id: 'schedule-1',
        day_of_week: 1 as DayOfWeek,
        start_time: '08:00',
        end_time: '17:00', // 9 hours
        break_start: null,
        break_end: null,
        location: null,
      },
      {
        id: '2',
        schedule_id: 'schedule-1',
        day_of_week: 2 as DayOfWeek,
        start_time: '08:00',
        end_time: '17:00', // 9 hours
        break_start: null,
        break_end: null,
        location: null,
      },
    ]

    expect(calculateWeeklyHours(entries)).toBe(18)
  })

  it('subtracts break time from total', () => {
    const entries: StaffScheduleEntry[] = [
      {
        id: '1',
        schedule_id: 'schedule-1',
        day_of_week: 1 as DayOfWeek,
        start_time: '08:00',
        end_time: '17:00', // 9 hours
        break_start: '12:00',
        break_end: '13:00', // 1 hour break
        location: null,
      },
    ]

    expect(calculateWeeklyHours(entries)).toBe(8)
  })

  it('returns 0 for empty entries', () => {
    expect(calculateWeeklyHours([])).toBe(0)
  })
})

describe('getAvailableTimeSlots', () => {
  const schedule: StaffSchedule = {
    id: 'schedule-1',
    staff_profile_id: 'staff-1',
    name: 'Regular',
    is_active: true,
    effective_from: '2024-01-01',
    effective_to: null,
    entries: [
      {
        id: '1',
        schedule_id: 'schedule-1',
        day_of_week: 1 as DayOfWeek, // Monday
        start_time: '08:00',
        end_time: '12:00',
        break_start: null,
        break_end: null,
        location: null,
      },
    ],
  }

  it('returns time slots based on schedule', () => {
    // Monday
    const date = new Date('2024-06-17T00:00:00')
    const slots = getAvailableTimeSlots(schedule, date, 60) // 1 hour slots

    expect(slots).toContain('08:00')
    expect(slots).toContain('09:00')
    expect(slots).toContain('10:00')
    expect(slots).toContain('11:00')
    expect(slots).not.toContain('12:00') // End time
    expect(slots).toHaveLength(4)
  })

  it('returns empty array for day not in schedule', () => {
    // Sunday (not in schedule)
    const date = new Date('2024-06-16T00:00:00')
    const slots = getAvailableTimeSlots(schedule, date, 30)

    expect(slots).toHaveLength(0)
  })

  it('returns empty array for null schedule', () => {
    const date = new Date('2024-06-17T00:00:00')
    const slots = getAvailableTimeSlots(null, date, 30)

    expect(slots).toHaveLength(0)
  })
})

// =============================================================================
// AVAILABILITY UTILITIES
// =============================================================================

describe('isStaffAvailable', () => {
  const schedule: StaffSchedule = {
    id: 'schedule-1',
    staff_profile_id: 'staff-1',
    name: 'Regular',
    is_active: true,
    effective_from: '2024-01-01',
    effective_to: null,
    entries: [
      {
        id: '1',
        schedule_id: 'schedule-1',
        day_of_week: 1 as DayOfWeek, // Monday
        start_time: '08:00',
        end_time: '17:00',
        break_start: null,
        break_end: null,
        location: null,
      },
    ],
  }

  it('returns true when staff is available', () => {
    const date = new Date('2024-06-17T10:00:00') // Monday
    expect(isStaffAvailable(schedule, [], [], date)).toBe(true)
  })

  it('returns false when day not in schedule', () => {
    const date = new Date('2024-06-18T10:00:00') // Tuesday
    expect(isStaffAvailable(schedule, [], [], date)).toBe(false)
  })

  it('returns false when staff has approved time off', () => {
    const date = new Date('2024-06-17T10:00:00') // Monday
    const timeOffRequests: TimeOffRequest[] = [
      {
        id: 'to-1',
        staff_profile_id: 'staff-1',
        tenant_id: 'clinic-1',
        time_off_type_id: 'type-1',
        start_date: '2024-06-17',
        end_date: '2024-06-17',
        start_half_day: false,
        end_half_day: false,
        total_days: 1,
        total_hours: null,
        reason: null,
        status: 'approved',
        requested_at: '2024-06-01',
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
      },
    ]

    expect(isStaffAvailable(schedule, [], timeOffRequests, date)).toBe(false)
  })

  it('returns false when unavailability override exists', () => {
    const date = new Date('2024-06-17T10:00:00') // Monday
    const overrides: StaffAvailabilityOverride[] = [
      {
        id: 'override-1',
        staff_profile_id: 'staff-1',
        tenant_id: 'clinic-1',
        override_date: '2024-06-17',
        override_type: 'unavailable',
        start_time: null,
        end_time: null,
        reason: 'Personal',
        created_at: '2024-06-01',
        updated_at: '2024-06-01',
      },
    ]

    expect(isStaffAvailable(schedule, overrides, [], date)).toBe(false)
  })

  it('returns true when available override exists', () => {
    const date = new Date('2024-06-18T10:00:00') // Tuesday (not in schedule)
    const overrides: StaffAvailabilityOverride[] = [
      {
        id: 'override-1',
        staff_profile_id: 'staff-1',
        tenant_id: 'clinic-1',
        override_date: '2024-06-18',
        override_type: 'available',
        start_time: '08:00',
        end_time: '17:00',
        reason: 'Extra day',
        created_at: '2024-06-01',
        updated_at: '2024-06-01',
      },
    ]

    expect(isStaffAvailable(schedule, overrides, [], date)).toBe(true)
  })

  it('returns false for null schedule without overrides', () => {
    const date = new Date('2024-06-17T10:00:00')
    expect(isStaffAvailable(null, [], [], date)).toBe(false)
  })
})

// =============================================================================
// DATE OVERLAP UTILITIES
// =============================================================================

describe('datesOverlap', () => {
  it('returns true for overlapping dates', () => {
    const start1 = new Date('2024-06-17T08:00:00')
    const end1 = new Date('2024-06-17T10:00:00')
    const start2 = new Date('2024-06-17T09:00:00')
    const end2 = new Date('2024-06-17T11:00:00')

    expect(datesOverlap(start1, end1, start2, end2)).toBe(true)
  })

  it('returns false for non-overlapping dates', () => {
    const start1 = new Date('2024-06-17T08:00:00')
    const end1 = new Date('2024-06-17T10:00:00')
    const start2 = new Date('2024-06-17T10:00:00')
    const end2 = new Date('2024-06-17T12:00:00')

    expect(datesOverlap(start1, end1, start2, end2)).toBe(false)
  })

  it('returns true when one contains the other', () => {
    const start1 = new Date('2024-06-17T08:00:00')
    const end1 = new Date('2024-06-17T12:00:00')
    const start2 = new Date('2024-06-17T09:00:00')
    const end2 = new Date('2024-06-17T11:00:00')

    expect(datesOverlap(start1, end1, start2, end2)).toBe(true)
  })
})

// =============================================================================
// EVENT CONVERSION
// =============================================================================

describe('appointmentToCalendarEvent', () => {
  it('converts appointment to calendar event', () => {
    const appointment = {
      id: 'apt-1',
      start_time: '2024-06-17T10:00:00',
      end_time: '2024-06-17T11:00:00',
      status: 'confirmed',
      reason: 'Vacunación',
      pet: { name: 'Max' },
      service: { name: 'Vacuna' },
    }

    const event = appointmentToCalendarEvent(appointment)

    expect(event.id).toBe('apt-1')
    expect(event.title).toBe('Max - Vacuna')
    expect(event.type).toBe('appointment')
    expect(event.status).toBe('confirmed')
    expect(event.start).toBeInstanceOf(Date)
    expect(event.end).toBeInstanceOf(Date)
  })

  it('handles missing pet', () => {
    const appointment = {
      id: 'apt-1',
      start_time: '2024-06-17T10:00:00',
      end_time: '2024-06-17T11:00:00',
      status: 'pending',
      reason: 'Consulta',
      pet: null,
      service: null,
    }

    const event = appointmentToCalendarEvent(appointment)

    expect(event.title).toBe('Sin mascota - Consulta')
  })

  it('uses reason when no service', () => {
    const appointment = {
      id: 'apt-1',
      start_time: '2024-06-17T10:00:00',
      end_time: '2024-06-17T11:00:00',
      status: 'pending',
      reason: 'Emergencia',
      pet: { name: 'Luna' },
      service: null,
    }

    const event = appointmentToCalendarEvent(appointment)

    expect(event.title).toBe('Luna - Emergencia')
  })
})

// =============================================================================
// CONSTANTS
// =============================================================================

describe('STATUS_LABELS constants', () => {
  it('has all time off statuses defined', () => {
    expect(TIME_OFF_STATUS_LABELS).toHaveProperty('pending')
    expect(TIME_OFF_STATUS_LABELS).toHaveProperty('approved')
    expect(TIME_OFF_STATUS_LABELS).toHaveProperty('denied')
    expect(TIME_OFF_STATUS_LABELS).toHaveProperty('cancelled')
    expect(TIME_OFF_STATUS_LABELS).toHaveProperty('withdrawn')
  })

  it('has all shift statuses defined', () => {
    expect(SHIFT_STATUS_LABELS).toHaveProperty('scheduled')
    expect(SHIFT_STATUS_LABELS).toHaveProperty('confirmed')
    expect(SHIFT_STATUS_LABELS).toHaveProperty('in_progress')
    expect(SHIFT_STATUS_LABELS).toHaveProperty('completed')
    expect(SHIFT_STATUS_LABELS).toHaveProperty('no_show')
    expect(SHIFT_STATUS_LABELS).toHaveProperty('cancelled')
  })

  it('has all shift types defined', () => {
    expect(SHIFT_TYPE_LABELS).toHaveProperty('regular')
    expect(SHIFT_TYPE_LABELS).toHaveProperty('overtime')
    expect(SHIFT_TYPE_LABELS).toHaveProperty('on_call')
    expect(SHIFT_TYPE_LABELS).toHaveProperty('emergency')
    expect(SHIFT_TYPE_LABELS).toHaveProperty('training')
    expect(SHIFT_TYPE_LABELS).toHaveProperty('meeting')
  })
})

describe('EVENT_COLORS constant', () => {
  it('has colors for appointment statuses', () => {
    expect(EVENT_COLORS).toHaveProperty('pending')
    expect(EVENT_COLORS).toHaveProperty('confirmed')
    expect(EVENT_COLORS).toHaveProperty('completed')
    expect(EVENT_COLORS).toHaveProperty('cancelled')
  })

  it('has colors for event types', () => {
    expect(EVENT_COLORS).toHaveProperty('time_off')
    expect(EVENT_COLORS).toHaveProperty('block')
    expect(EVENT_COLORS).toHaveProperty('shift')
  })
})
