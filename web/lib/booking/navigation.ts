/**
 * Booking Navigation Logic
 *
 * Pure functions for managing booking wizard step navigation,
 * validation, and pet auto-selection.
 */

// Types
export type BookingStep = 'service' | 'pet' | 'datetime' | 'confirm' | 'success'

export interface BookingSelection {
  serviceId: string | null
  petId: string | null
  date: string
  time_slot: string
  notes: string
}

export interface Pet {
  id: string
  name: string
  species: string
}

export interface BookableService {
  id: string
  name: string
  duration: number
  price: number
}

export interface ServiceFromJSON {
  id: string
  title: string
  icon?: string
  category?: string
  booking?: {
    online_enabled?: boolean
    duration_minutes?: number
    price_from?: string
  }
}

export interface BookingValidation {
  valid: boolean
  errors: string[]
}

export interface TimeSlot {
  time: string
  available: boolean
  label: string
}

export type StepStatus = 'completed' | 'current' | 'upcoming'

// Constants
export const STEP_ORDER: BookingStep[] = ['service', 'pet', 'datetime', 'confirm']

export const INITIAL_SELECTION: BookingSelection = {
  serviceId: null,
  petId: null,
  date: '',
  time_slot: '',
  notes: '',
}

// Step Navigation

/**
 * Determines if navigation to a target step is allowed based on current selection state
 */
export function canNavigateToStep(
  currentStep: BookingStep,
  targetStep: BookingStep,
  selection: BookingSelection
): boolean {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  const targetIndex = STEP_ORDER.indexOf(targetStep)

  // Can always go back
  if (targetIndex < currentIndex) return true

  // Check if can proceed forward
  if (targetStep === 'pet' && !selection.serviceId) return false
  if (targetStep === 'datetime' && (!selection.serviceId || !selection.petId)) return false
  if (targetStep === 'confirm') {
    return !!(selection.serviceId && selection.petId && selection.date && selection.time_slot)
  }

  return true
}

/**
 * Determines the initial step based on pre-selected values
 */
export function determineInitialStep(
  hasInitialService: boolean,
  hasPetId: boolean
): BookingStep {
  if (hasInitialService && hasPetId) {
    return 'datetime' // Both service and pet selected, go to date
  }
  if (hasInitialService) {
    return 'pet' // Service selected, need pet
  }
  return 'service'
}

/**
 * Gets the status of a step in the progress stepper
 */
export function getStepStatus(stepIndex: number, currentIndex: number): StepStatus {
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

// Pet Selection

/**
 * Determines the pet ID based on user's pets and optional explicit selection
 * Auto-selects if user has only one pet
 */
export function determinePetId(
  userPets: Pet[],
  initialPetId?: string
): string | null {
  // Explicit param takes priority
  if (initialPetId && userPets.some((p) => p.id === initialPetId)) {
    return initialPetId
  }
  // Auto-select if user has single pet
  if (userPets.length === 1) {
    return userPets[0].id
  }
  return null
}

// Service Transformation

/**
 * Parses a price string (e.g., "50.000") to a number
 */
export function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  return parseInt(priceStr.replace(/\./g, ''), 10) || 0
}

/**
 * Transforms JSON services to bookable services, filtering only online-enabled ones
 */
export function transformServices(jsonServices: ServiceFromJSON[]): BookableService[] {
  return jsonServices
    .filter((s) => s.booking?.online_enabled === true)
    .map((s) => ({
      id: s.id,
      name: s.title,
      duration: s.booking?.duration_minutes || 30,
      price: parsePrice(s.booking?.price_from),
    }))
}

// Validation

/**
 * Validates a booking selection, returning validation result with errors
 */
export function validateBooking(selection: BookingSelection): BookingValidation {
  const errors: string[] = []

  if (!selection.serviceId) {
    errors.push('Por favor selecciona un servicio')
  }

  if (!selection.petId) {
    errors.push('Por favor selecciona una mascota')
  }

  if (!selection.date) {
    errors.push('Por favor selecciona una fecha')
  }

  if (!selection.time_slot) {
    errors.push('Por favor selecciona un horario')
  }

  // Validate date is not in the past
  if (selection.date) {
    const [year, month, day] = selection.date.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      errors.push('La fecha no puede ser en el pasado')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Time Slot Generation

/**
 * Generates time slots for a given time range
 */
export function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes: number,
  bookedSlots: string[] = []
): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const available = !bookedSlots.includes(time)
      const label = `${hour}:${String(minute).padStart(2, '0')}`

      slots.push({ time, available, label })
    }
  }

  return slots
}

/**
 * Calculates end time given start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes

  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = totalMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

/**
 * Formats a time range for display
 */
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`
}

// Date Utilities

/**
 * Gets a date string in YYYY-MM-DD format using local timezone
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Price Formatting

/**
 * Formats a price for display in Paraguayan Guarani format
 */
export function formatBookingPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '0'
  return price.toLocaleString('es-PY')
}

// Loading States

export interface LoadingState {
  isLoadingServices: boolean
  isLoadingSlots: boolean
  isSubmitting: boolean
}

/**
 * Gets the appropriate loading message based on current loading state
 */
export function getLoadingMessage(state: LoadingState): string | null {
  if (state.isLoadingServices) return 'Cargando servicios...'
  if (state.isLoadingSlots) return 'Cargando horarios disponibles...'
  if (state.isSubmitting) return 'Procesando reserva...'
  return null
}

// Error Handling

export interface BookingError {
  code: string
  message: string
}

const ERROR_MESSAGES: Record<string, string> = {
  SLOT_UNAVAILABLE: 'Este horario ya no está disponible. Por favor elige otro.',
  SERVICE_UNAVAILABLE: 'Este servicio no está disponible actualmente.',
  PET_NOT_FOUND: 'No se encontró la mascota seleccionada.',
  AUTH_REQUIRED: 'Debes iniciar sesión para reservar.',
  NETWORK_ERROR: 'Error de conexión. Por favor intenta de nuevo.',
}

/**
 * Gets a user-friendly error message from a booking error
 */
export function getErrorMessage(error: BookingError): string {
  return ERROR_MESSAGES[error.code] || error.message
}
