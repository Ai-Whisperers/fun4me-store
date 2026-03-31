/**
 * Booking module barrel export
 *
 * Centralizes exports for the booking wizard and related components
 */

export { default as BookingWizard } from './booking-wizard'
export { ServiceSelection } from './booking-wizard/ServiceSelection'
export { PetSelection } from './booking-wizard/PetSelection'
// DateTimeSelection removed - clinic will contact customer to schedule
export { Confirmation } from './booking-wizard/Confirmation'
export { SuccessScreen } from './booking-wizard/SuccessScreen'
export { BookingSummary } from './booking-wizard/BookingSummary'
export { formatPrice } from '@/lib/store/booking-store'
export type {
  BookingSelection,
  BookableService,
  ServiceFromJSON,
  Pet,
  ClinicConfig,
  User,
  Step,
} from './booking-wizard/types'

// Waitlist
export { JoinWaitlistButton } from './join-waitlist-button'

// Recurrences
export { RecurrenceSelector } from './recurrence-selector'
export { RecurrencePreview } from './recurrence-preview'
