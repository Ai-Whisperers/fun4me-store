/**
 * Calendar Container Module
 *
 * Main calendar component with event loading, filtering, and modal management.
 *
 * @example
 * ```tsx
 * import { CalendarContainer } from './calendar-container'
 *
 * <CalendarContainer
 *   initialEvents={events}
 *   staff={staff}
 *   pets={pets}
 *   services={services}
 *   clinicSlug="terrapet"
 *   onCreateAppointment={handleCreate}
 * />
 * ```
 */

export { CalendarContainer } from './CalendarContainer'
export { FilterToolbar } from './FilterToolbar'

export type {
  Pet,
  Service,
  Staff,
  CalendarContainerProps,
  FilterToolbarProps,
} from './types'
