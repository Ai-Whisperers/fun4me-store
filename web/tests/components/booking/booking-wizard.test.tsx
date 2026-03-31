/**
 * BookingWizard Component Tests
 *
 * Tests the multi-step booking wizard including:
 * - Step navigation and state management
 * - Service selection and filtering
 * - Pet selection with auto-select for single pet
 * - Date/time slot selection
 * - Form validation
 * - Booking submission
 *
 * @ticket TICKET-UI-001
 */
import { describe, it, expect } from 'vitest'

// Import REAL functions from lib module - this is the key fix!
import {
  canNavigateToStep,
  determineInitialStep,
  getStepStatus,
  determinePetId,
  parsePrice,
  transformServices,
  validateBooking,
  generateTimeSlots,
  calculateEndTime,
  formatTimeRange,
  getLocalDateString,
  formatBookingPrice,
  getLoadingMessage,
  getErrorMessage,
  INITIAL_SELECTION,
  type BookingSelection,
  type Pet,
  type ServiceFromJSON,
  type LoadingState,
  type BookingError,
} from '@/lib/booking/navigation'

describe('Booking Store Logic', () => {
  describe('Step Navigation', () => {
    it('should allow navigating back without restrictions', () => {
      const selection: BookingSelection = { ...INITIAL_SELECTION }

      expect(canNavigateToStep('confirm', 'service', selection)).toBe(true)
      expect(canNavigateToStep('datetime', 'pet', selection)).toBe(true)
      expect(canNavigateToStep('pet', 'service', selection)).toBe(true)
    })

    it('should require service selection to go to pet step', () => {
      const noService: BookingSelection = { ...INITIAL_SELECTION }
      const withService: BookingSelection = { ...INITIAL_SELECTION, serviceId: 'svc-1' }

      expect(canNavigateToStep('service', 'pet', noService)).toBe(false)
      expect(canNavigateToStep('service', 'pet', withService)).toBe(true)
    })

    it('should require pet selection to go to datetime step', () => {
      const noPet: BookingSelection = { ...INITIAL_SELECTION, serviceId: 'svc-1' }
      const withPet: BookingSelection = { ...INITIAL_SELECTION, serviceId: 'svc-1', petId: 'pet-1' }

      expect(canNavigateToStep('pet', 'datetime', noPet)).toBe(false)
      expect(canNavigateToStep('pet', 'datetime', withPet)).toBe(true)
    })

    it('should require all fields to go to confirm step', () => {
      const incomplete: BookingSelection = {
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: '2024-01-15',
        time_slot: '',
        notes: '',
      }
      const complete: BookingSelection = {
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: '2024-01-15',
        time_slot: '09:00',
        notes: '',
      }

      expect(canNavigateToStep('datetime', 'confirm', incomplete)).toBe(false)
      expect(canNavigateToStep('datetime', 'confirm', complete)).toBe(true)
    })
  })

  describe('Pet Auto-Selection', () => {
    it('should auto-select when user has single pet', () => {
      const singlePet: Pet[] = [{ id: 'pet-1', name: 'Max', species: 'dog' }]
      expect(determinePetId(singlePet)).toBe('pet-1')
    })

    it('should not auto-select when user has multiple pets', () => {
      const multiplePets: Pet[] = [
        { id: 'pet-1', name: 'Max', species: 'dog' },
        { id: 'pet-2', name: 'Luna', species: 'cat' },
      ]
      expect(determinePetId(multiplePets)).toBeNull()
    })

    it('should use explicit petId when provided', () => {
      const multiplePets: Pet[] = [
        { id: 'pet-1', name: 'Max', species: 'dog' },
        { id: 'pet-2', name: 'Luna', species: 'cat' },
      ]
      expect(determinePetId(multiplePets, 'pet-2')).toBe('pet-2')
    })

    it('should ignore invalid explicit petId', () => {
      const pets: Pet[] = [{ id: 'pet-1', name: 'Max', species: 'dog' }]
      expect(determinePetId(pets, 'invalid-id')).toBe('pet-1') // Falls back to single-pet auto-select
    })
  })

  describe('Initial Step Determination', () => {
    it('should start at service step with no pre-selection', () => {
      expect(determineInitialStep(false, false)).toBe('service')
    })

    it('should start at pet step with service pre-selected', () => {
      expect(determineInitialStep(true, false)).toBe('pet')
    })

    it('should start at datetime step with both pre-selected', () => {
      expect(determineInitialStep(true, true)).toBe('datetime')
    })
  })

  describe('Service Transformation', () => {
    it('should only include online-enabled services', () => {
      const services: ServiceFromJSON[] = [
        { id: 's1', title: 'Consulta', booking: { online_enabled: true } },
        { id: 's2', title: 'Cirugía', booking: { online_enabled: false } },
        { id: 's3', title: 'Vacunación', booking: { online_enabled: true } },
      ]

      const result = transformServices(services)
      expect(result).toHaveLength(2)
      expect(result.map((s) => s.id)).toEqual(['s1', 's3'])
    })

    it('should parse prices correctly', () => {
      expect(parsePrice('50.000')).toBe(50000)
      expect(parsePrice('150.000')).toBe(150000)
      expect(parsePrice('1.500.000')).toBe(1500000)
      expect(parsePrice('')).toBe(0)
      expect(parsePrice(undefined)).toBe(0)
    })

    it('should use default duration when not specified', () => {
      const services: ServiceFromJSON[] = [
        { id: 's1', title: 'Consulta', booking: { online_enabled: true } },
      ]

      const result = transformServices(services)
      expect(result[0].duration).toBe(30)
    })

    it('should use specified duration', () => {
      const services: ServiceFromJSON[] = [
        { id: 's1', title: 'Consulta', booking: { online_enabled: true, duration_minutes: 45 } },
      ]

      const result = transformServices(services)
      expect(result[0].duration).toBe(45)
    })
  })

  describe('Booking Validation', () => {
    it('should validate complete booking', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const dateStr = getLocalDateString(futureDate)

      const selection: BookingSelection = {
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: dateStr,
        time_slot: '09:00',
        notes: '',
      }

      const result = validateBooking(selection)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require all fields', () => {
      const result = validateBooking(INITIAL_SELECTION)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(4)
    })

    it('should reject past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const selection: BookingSelection = {
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: getLocalDateString(pastDate),
        time_slot: '09:00',
        notes: '',
      }

      const result = validateBooking(selection)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('pasado'))).toBe(true)
    })
  })

  describe('Price Formatting', () => {
    it('should format Guarani prices correctly', () => {
      expect(formatBookingPrice(50000)).toBe('50.000')
      expect(formatBookingPrice(150000)).toBe('150.000')
      expect(formatBookingPrice(1500000)).toBe('1.500.000')
    })

    it('should handle null/undefined', () => {
      expect(formatBookingPrice(null)).toBe('0')
      expect(formatBookingPrice(undefined)).toBe('0')
    })

    it('should handle zero', () => {
      expect(formatBookingPrice(0)).toBe('0')
    })
  })

  describe('Date Utilities', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15) // January 15, 2024
      expect(getLocalDateString(date)).toBe('2024-01-15')
    })

    it('should pad single digit months', () => {
      const date = new Date(2024, 4, 5) // May 5, 2024
      expect(getLocalDateString(date)).toBe('2024-05-05')
    })

    it('should handle December', () => {
      const date = new Date(2024, 11, 25) // December 25, 2024
      expect(getLocalDateString(date)).toBe('2024-12-25')
    })
  })
})

describe('Booking Wizard UI States', () => {
  describe('Loading States', () => {
    it('should show service loading message', () => {
      const state: LoadingState = {
        isLoadingServices: true,
        isLoadingSlots: false,
        isSubmitting: false,
      }
      expect(getLoadingMessage(state)).toBe('Cargando servicios...')
    })

    it('should show slots loading message', () => {
      const state: LoadingState = {
        isLoadingServices: false,
        isLoadingSlots: true,
        isSubmitting: false,
      }
      expect(getLoadingMessage(state)).toBe('Cargando horarios disponibles...')
    })

    it('should show submitting message', () => {
      const state: LoadingState = {
        isLoadingServices: false,
        isLoadingSlots: false,
        isSubmitting: true,
      }
      expect(getLoadingMessage(state)).toBe('Procesando reserva...')
    })

    it('should return null when not loading', () => {
      const state: LoadingState = {
        isLoadingServices: false,
        isLoadingSlots: false,
        isSubmitting: false,
      }
      expect(getLoadingMessage(state)).toBeNull()
    })
  })

  describe('Error States', () => {
    it('should show slot unavailable message', () => {
      const error: BookingError = { code: 'SLOT_UNAVAILABLE', message: 'Slot not available' }
      expect(getErrorMessage(error)).toContain('ya no está disponible')
    })

    it('should show auth required message', () => {
      const error: BookingError = { code: 'AUTH_REQUIRED', message: 'Auth required' }
      expect(getErrorMessage(error)).toContain('iniciar sesión')
    })

    it('should fall back to original message', () => {
      const error: BookingError = { code: 'UNKNOWN', message: 'Something went wrong' }
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })
  })

  describe('Progress Stepper', () => {
    it('should mark previous steps as completed', () => {
      expect(getStepStatus(0, 2)).toBe('completed')
      expect(getStepStatus(1, 2)).toBe('completed')
    })

    it('should mark current step correctly', () => {
      expect(getStepStatus(2, 2)).toBe('current')
    })

    it('should mark future steps as upcoming', () => {
      expect(getStepStatus(3, 2)).toBe('upcoming')
      expect(getStepStatus(4, 2)).toBe('upcoming')
    })
  })
})

describe('Time Slot Generation', () => {
  it('should generate 30-minute slots', () => {
    const slots = generateTimeSlots(9, 12, 30)

    expect(slots).toHaveLength(6) // 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
    expect(slots[0].time).toBe('09:00')
    expect(slots[1].time).toBe('09:30')
    expect(slots[5].time).toBe('11:30')
  })

  it('should generate 15-minute slots', () => {
    const slots = generateTimeSlots(9, 10, 15)

    expect(slots).toHaveLength(4) // 9:00, 9:15, 9:30, 9:45
    expect(slots.map((s) => s.time)).toEqual(['09:00', '09:15', '09:30', '09:45'])
  })

  it('should mark booked slots as unavailable', () => {
    const bookedSlots = ['09:00', '10:30']
    const slots = generateTimeSlots(9, 12, 30, bookedSlots)

    const slot0900 = slots.find((s) => s.time === '09:00')
    const slot0930 = slots.find((s) => s.time === '09:30')
    const slot1030 = slots.find((s) => s.time === '10:30')

    expect(slot0900?.available).toBe(false)
    expect(slot0930?.available).toBe(true)
    expect(slot1030?.available).toBe(false)
  })

  it('should handle full day slots', () => {
    const slots = generateTimeSlots(8, 18, 60) // 8am to 6pm, hourly

    expect(slots).toHaveLength(10)
    expect(slots[0].time).toBe('08:00')
    expect(slots[9].time).toBe('17:00')
  })
})

describe('Booking Summary Calculations', () => {
  it('should calculate end time correctly', () => {
    expect(calculateEndTime('09:00', 30)).toBe('09:30')
    expect(calculateEndTime('09:30', 30)).toBe('10:00')
    expect(calculateEndTime('11:45', 45)).toBe('12:30')
  })

  it('should handle appointments crossing noon', () => {
    expect(calculateEndTime('11:30', 60)).toBe('12:30')
    expect(calculateEndTime('11:00', 120)).toBe('13:00')
  })

  it('should format time range', () => {
    expect(formatTimeRange('09:00', '09:30')).toBe('09:00 - 09:30')
    expect(formatTimeRange('14:00', '15:00')).toBe('14:00 - 15:00')
  })
})
