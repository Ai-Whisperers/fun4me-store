/**
 * Appointments domain
 * Provides a complete domain-driven architecture for appointment management
 */

// Types
export type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilters,
  AppointmentStats,
  AppointmentSlot,
  AvailabilityCheckParams,
} from './types'

// Infrastructure
export { AppointmentRepository } from './repository'

// Business logic
export { AppointmentService } from './service'
