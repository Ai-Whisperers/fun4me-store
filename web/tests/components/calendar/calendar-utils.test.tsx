/**
 * Calendar Component Tests
 *
 * Tests the calendar utilities and logic including:
 * - Date/time slot generation
 * - Availability calculation
 * - Appointment overlap detection
 * - View modes (day/week/month)
 * - Business hours handling
 *
 * @ticket TICKET-UI-003
 */
import { describe, it, expect } from 'vitest'

describe('Calendar Date Utilities', () => {
  const formatDateForDisplay = (date: Date, locale: string = 'es-PY'): string => {
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTimeForDisplay = (date: Date): string => {
    return date.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getWeekEnd = (date: Date): Date => {
    const start = getWeekStart(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const getMonthEnd = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }

  it('should format date in Spanish', () => {
    const date = new Date(2024, 0, 15) // January 15, 2024
    const formatted = formatDateForDisplay(date)

    expect(formatted.toLowerCase()).toContain('enero')
    expect(formatted).toContain('15')
    expect(formatted).toContain('2024')
  })

  it('should format time in 24h format', () => {
    const date = new Date(2024, 0, 15, 14, 30) // 2:30 PM
    const formatted = formatTimeForDisplay(date)

    expect(formatted).toBe('14:30')
  })

  it('should get correct week start (Monday)', () => {
    // Wednesday, January 17, 2024
    const wednesday = new Date(2024, 0, 17)
    const weekStart = getWeekStart(wednesday)

    expect(weekStart.getDay()).toBe(1) // Monday
    expect(weekStart.getDate()).toBe(15)
  })

  it('should get correct week end (Sunday)', () => {
    const wednesday = new Date(2024, 0, 17)
    const weekEnd = getWeekEnd(wednesday)

    expect(weekEnd.getDay()).toBe(0) // Sunday
    expect(weekEnd.getDate()).toBe(21)
  })

  it('should get correct month boundaries', () => {
    const midJanuary = new Date(2024, 0, 15)

    const monthStart = getMonthStart(midJanuary)
    const monthEnd = getMonthEnd(midJanuary)

    expect(monthStart.getDate()).toBe(1)
    expect(monthEnd.getDate()).toBe(31)
  })

  it('should handle February correctly', () => {
    const february = new Date(2024, 1, 15) // February 2024 (leap year)
    const monthEnd = getMonthEnd(february)

    expect(monthEnd.getDate()).toBe(29) // Leap year
  })
})

describe('Business Hours', () => {
  interface BusinessHours {
    dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
    openTime: string
    closeTime: string
    isOpen: boolean
  }

  const defaultBusinessHours: BusinessHours[] = [
    { dayOfWeek: 0, openTime: '09:00', closeTime: '13:00', isOpen: true }, // Sunday (limited)
    { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true }, // Monday
    { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true }, // Tuesday
    { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true }, // Wednesday
    { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true }, // Thursday
    { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true }, // Friday
    { dayOfWeek: 6, openTime: '09:00', closeTime: '14:00', isOpen: true }, // Saturday (limited)
  ]

  const isBusinessOpen = (date: Date, hours: BusinessHours[]): boolean => {
    const dayHours = hours.find((h) => h.dayOfWeek === date.getDay())
    if (!dayHours?.isOpen) return false

    const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return currentTime >= dayHours.openTime && currentTime < dayHours.closeTime
  }

  const getBusinessHoursForDay = (dayOfWeek: number, hours: BusinessHours[]): BusinessHours | null => {
    return hours.find((h) => h.dayOfWeek === dayOfWeek) || null
  }

  it('should return true during business hours', () => {
    // Monday at 10:00
    const mondayMorning = new Date(2024, 0, 15, 10, 0)
    expect(isBusinessOpen(mondayMorning, defaultBusinessHours)).toBe(true)
  })

  it('should return false outside business hours', () => {
    // Monday at 19:00
    const mondayEvening = new Date(2024, 0, 15, 19, 0)
    expect(isBusinessOpen(mondayEvening, defaultBusinessHours)).toBe(false)
  })

  it('should return false before opening', () => {
    // Monday at 7:00
    const mondayEarly = new Date(2024, 0, 15, 7, 0)
    expect(isBusinessOpen(mondayEarly, defaultBusinessHours)).toBe(false)
  })

  it('should get correct hours for Saturday', () => {
    const saturdayHours = getBusinessHoursForDay(6, defaultBusinessHours)

    expect(saturdayHours?.openTime).toBe('09:00')
    expect(saturdayHours?.closeTime).toBe('14:00')
  })
})

describe('Appointment Overlap Detection', () => {
  interface Appointment {
    id: string
    startTime: Date
    endTime: Date
    vetId: string
  }

  const doAppointmentsOverlap = (a: Appointment, b: Appointment): boolean => {
    // Different vets, no overlap concern
    if (a.vetId !== b.vetId) return false

    // Check time overlap
    return a.startTime < b.endTime && a.endTime > b.startTime
  }

  const findOverlappingAppointments = (
    newAppointment: Appointment,
    existingAppointments: Appointment[]
  ): Appointment[] => {
    return existingAppointments.filter((existing) =>
      doAppointmentsOverlap(newAppointment, existing)
    )
  }

  const isSlotAvailable = (
    slotStart: Date,
    slotEnd: Date,
    vetId: string,
    existingAppointments: Appointment[]
  ): boolean => {
    const testAppointment: Appointment = {
      id: 'test',
      startTime: slotStart,
      endTime: slotEnd,
      vetId,
    }

    return findOverlappingAppointments(testAppointment, existingAppointments).length === 0
  }

  it('should detect overlapping appointments', () => {
    const appt1: Appointment = {
      id: '1',
      startTime: new Date(2024, 0, 15, 9, 0),
      endTime: new Date(2024, 0, 15, 10, 0),
      vetId: 'vet-1',
    }

    const appt2: Appointment = {
      id: '2',
      startTime: new Date(2024, 0, 15, 9, 30),
      endTime: new Date(2024, 0, 15, 10, 30),
      vetId: 'vet-1',
    }

    expect(doAppointmentsOverlap(appt1, appt2)).toBe(true)
  })

  it('should allow adjacent appointments', () => {
    const appt1: Appointment = {
      id: '1',
      startTime: new Date(2024, 0, 15, 9, 0),
      endTime: new Date(2024, 0, 15, 10, 0),
      vetId: 'vet-1',
    }

    const appt2: Appointment = {
      id: '2',
      startTime: new Date(2024, 0, 15, 10, 0), // Starts exactly when first ends
      endTime: new Date(2024, 0, 15, 11, 0),
      vetId: 'vet-1',
    }

    expect(doAppointmentsOverlap(appt1, appt2)).toBe(false)
  })

  it('should allow different vets at same time', () => {
    const appt1: Appointment = {
      id: '1',
      startTime: new Date(2024, 0, 15, 9, 0),
      endTime: new Date(2024, 0, 15, 10, 0),
      vetId: 'vet-1',
    }

    const appt2: Appointment = {
      id: '2',
      startTime: new Date(2024, 0, 15, 9, 0),
      endTime: new Date(2024, 0, 15, 10, 0),
      vetId: 'vet-2', // Different vet
    }

    expect(doAppointmentsOverlap(appt1, appt2)).toBe(false)
  })

  it('should check slot availability', () => {
    const existingAppointments: Appointment[] = [
      {
        id: '1',
        startTime: new Date(2024, 0, 15, 9, 0),
        endTime: new Date(2024, 0, 15, 10, 0),
        vetId: 'vet-1',
      },
    ]

    // Slot overlaps with existing
    const overlappingStart = new Date(2024, 0, 15, 9, 30)
    const overlappingEnd = new Date(2024, 0, 15, 10, 30)
    expect(isSlotAvailable(overlappingStart, overlappingEnd, 'vet-1', existingAppointments)).toBe(false)

    // Slot is after existing
    const availableStart = new Date(2024, 0, 15, 10, 0)
    const availableEnd = new Date(2024, 0, 15, 11, 0)
    expect(isSlotAvailable(availableStart, availableEnd, 'vet-1', existingAppointments)).toBe(true)
  })
})

describe('Calendar View Modes', () => {
  type ViewMode = 'day' | 'week' | 'month' | 'agenda'

  interface ViewConfig {
    mode: ViewMode
    slotDuration: number // minutes
    minTime: string
    maxTime: string
  }

  const getDefaultViewConfig = (mode: ViewMode): ViewConfig => {
    const baseConfig = {
      minTime: '07:00',
      maxTime: '20:00',
    }

    switch (mode) {
      case 'day':
        return { ...baseConfig, mode, slotDuration: 15 }
      case 'week':
        return { ...baseConfig, mode, slotDuration: 30 }
      case 'month':
        return { ...baseConfig, mode, slotDuration: 60 }
      case 'agenda':
        return { ...baseConfig, mode, slotDuration: 30 }
      default:
        return { ...baseConfig, mode: 'week', slotDuration: 30 }
    }
  }

  const getDaysInView = (mode: ViewMode): number => {
    switch (mode) {
      case 'day':
        return 1
      case 'week':
        return 7
      case 'month':
        return 35 // 5 weeks * 7 days (approximate)
      case 'agenda':
        return 7
      default:
        return 7
    }
  }

  it('should configure day view with 15-minute slots', () => {
    const config = getDefaultViewConfig('day')
    expect(config.slotDuration).toBe(15)
  })

  it('should configure week view with 30-minute slots', () => {
    const config = getDefaultViewConfig('week')
    expect(config.slotDuration).toBe(30)
  })

  it('should return correct days for each view', () => {
    expect(getDaysInView('day')).toBe(1)
    expect(getDaysInView('week')).toBe(7)
    expect(getDaysInView('month')).toBe(35)
  })
})

describe('Appointment Status Display', () => {
  type AppointmentStatus =
    | 'scheduled'
    | 'confirmed'
    | 'checked_in'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'

  interface StatusDisplay {
    label: string
    color: string
    bgColor: string
  }

  const getStatusDisplay = (status: AppointmentStatus): StatusDisplay => {
    const displays: Record<AppointmentStatus, StatusDisplay> = {
      scheduled: { label: 'Agendada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      confirmed: { label: 'Confirmada', color: 'text-green-600', bgColor: 'bg-green-100' },
      checked_in: { label: 'En espera', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      in_progress: { label: 'En progreso', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      completed: { label: 'Completada', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      cancelled: { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-100' },
      no_show: { label: 'No asistió', color: 'text-red-600', bgColor: 'bg-red-100' },
    }

    return displays[status]
  }

  it('should display correct label for scheduled', () => {
    expect(getStatusDisplay('scheduled').label).toBe('Agendada')
  })

  it('should display correct label for confirmed', () => {
    expect(getStatusDisplay('confirmed').label).toBe('Confirmada')
  })

  it('should display correct colors for completed', () => {
    const display = getStatusDisplay('completed')
    expect(display.color).toContain('gray')
    expect(display.bgColor).toContain('gray')
  })

  it('should display red for cancelled', () => {
    const display = getStatusDisplay('cancelled')
    expect(display.color).toContain('red')
  })
})

describe('Time Slot Grid Generation', () => {
  interface TimeSlot {
    time: string
    label: string
    isHour: boolean
  }

  const generateTimeGrid = (
    startHour: number,
    endHour: number,
    intervalMinutes: number
  ): TimeSlot[] => {
    const slots: TimeSlot[] = []

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        const label = minute === 0 ? `${hour}:00` : ''
        const isHour = minute === 0

        slots.push({ time, label, isHour })
      }
    }

    return slots
  }

  it('should generate correct number of slots', () => {
    const slots = generateTimeGrid(8, 18, 30) // 10 hours, 30-min intervals
    expect(slots).toHaveLength(20) // 2 slots per hour * 10 hours
  })

  it('should mark hour boundaries', () => {
    const slots = generateTimeGrid(8, 10, 15)
    const hourSlots = slots.filter((s) => s.isHour)

    expect(hourSlots).toHaveLength(2) // 8:00 and 9:00
  })

  it('should have labels only for hour marks', () => {
    const slots = generateTimeGrid(8, 9, 15)

    expect(slots[0].label).toBe('8:00') // 8:00
    expect(slots[1].label).toBe('') // 8:15
    expect(slots[2].label).toBe('') // 8:30
    expect(slots[3].label).toBe('') // 8:45
  })
})

describe('Event Positioning', () => {
  interface EventPosition {
    top: number // percentage from top
    height: number // percentage of container height
    left: number // percentage from left (for overlapping events)
    width: number // percentage of container width
  }

  const calculateEventPosition = (
    startTime: Date,
    endTime: Date,
    dayStartHour: number,
    dayEndHour: number
  ): EventPosition => {
    const totalMinutes = (dayEndHour - dayStartHour) * 60
    const startMinutes =
      (startTime.getHours() - dayStartHour) * 60 + startTime.getMinutes()
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)

    const top = (startMinutes / totalMinutes) * 100
    const height = (durationMinutes / totalMinutes) * 100

    return {
      top: Math.max(0, Math.min(100, top)),
      height: Math.max(0, Math.min(100 - top, height)),
      left: 0,
      width: 100,
    }
  }

  it('should position event at top for first slot', () => {
    const start = new Date(2024, 0, 15, 8, 0) // 8:00
    const end = new Date(2024, 0, 15, 9, 0) // 9:00

    const position = calculateEventPosition(start, end, 8, 18)

    expect(position.top).toBe(0)
    expect(position.height).toBe(10) // 1 hour out of 10 hours = 10%
  })

  it('should position 30-min appointment correctly', () => {
    const start = new Date(2024, 0, 15, 10, 0) // 10:00
    const end = new Date(2024, 0, 15, 10, 30) // 10:30

    const position = calculateEventPosition(start, end, 8, 18)

    expect(position.top).toBe(20) // 2 hours from start = 20%
    expect(position.height).toBe(5) // 30 min = 5%
  })

  it('should handle events starting mid-hour', () => {
    const start = new Date(2024, 0, 15, 8, 30) // 8:30
    const end = new Date(2024, 0, 15, 9, 30) // 9:30

    const position = calculateEventPosition(start, end, 8, 18)

    expect(position.top).toBeCloseTo(5, 1) // 30 min from start = 5%
    expect(position.height).toBeCloseTo(10, 1) // 1 hour = 10%
  })
})

describe('Drag and Drop Time Calculation', () => {
  const calculateNewTimeFromDrop = (
    originalStart: Date,
    pixelDelta: number,
    containerHeight: number,
    dayStartHour: number,
    dayEndHour: number,
    snapMinutes: number = 15
  ): Date => {
    const totalMinutes = (dayEndHour - dayStartHour) * 60
    const minutesDelta = (pixelDelta / containerHeight) * totalMinutes

    // Snap to interval
    const snappedMinutes = Math.round(minutesDelta / snapMinutes) * snapMinutes

    const newTime = new Date(originalStart)
    newTime.setMinutes(newTime.getMinutes() + snappedMinutes)

    return newTime
  }

  it('should calculate new time after drag', () => {
    const original = new Date(2024, 0, 15, 9, 0)
    // Drag 10% down in a 10-hour view (60 min / 600 total min = 10%)
    // Container is 600px, drag 60px (10%)
    const newTime = calculateNewTimeFromDrop(original, 60, 600, 8, 18, 15)

    expect(newTime.getHours()).toBe(10) // Moved 1 hour forward
    expect(newTime.getMinutes()).toBe(0)
  })

  it('should snap to 15-minute intervals', () => {
    const original = new Date(2024, 0, 15, 9, 0)
    // Drag 7.5% (45 min) - should snap to 45 min
    const newTime = calculateNewTimeFromDrop(original, 45, 600, 8, 18, 15)

    expect(newTime.getMinutes()).toBe(45)
  })
})
