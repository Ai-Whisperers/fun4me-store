/**
 * Appointment/booking validation schemas
 */

import { z } from 'zod'
import { uuidSchema, futureDateSchema, optionalString, enumSchema } from './common'
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@/lib/types/status'

// Re-export for backward compatibility
export { APPOINTMENT_STATUSES, type AppointmentStatus }

/**
 * Schema for creating a new appointment
 */
export const createAppointmentSchema = z.object({
  clinic_slug: z.string().optional(),
  pet_id: uuidSchema,
  service_id: uuidSchema,
  appointment_date: futureDateSchema,
  time_slot: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)'),
  vet_id: uuidSchema.optional(),
  notes: optionalString(500),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

/**
 * Schema for updating an appointment
 */
export const updateAppointmentSchema = z.object({
  id: uuidSchema,
  appointment_date: futureDateSchema.optional(),
  time_slot: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)')
    .optional(),
  status: enumSchema(APPOINTMENT_STATUSES, 'Estado').optional(),
  vet_id: uuidSchema.optional(),
  notes: optionalString(500),
})

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>

/**
 * Schema for cancelling an appointment
 */
export const cancelAppointmentSchema = z.object({
  id: uuidSchema,
  cancellation_reason: optionalString(500),
})

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>

/**
 * Schema for appointment query parameters
 */
export const appointmentQuerySchema = z.object({
  status: enumSchema(APPOINTMENT_STATUSES, 'Estado').optional(),
  pet_id: uuidSchema.optional(),
  service_id: uuidSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type AppointmentQueryParams = z.infer<typeof appointmentQuerySchema>

/**
 * Schema for checking availability
 */
export const availabilityCheckSchema = z.object({
  service_id: uuidSchema,
  date: z.string().datetime(),
  duration_minutes: z.coerce.number().int().min(15).max(480).default(30),
})

export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>

/**
 * Schema for booking wizard form data
 */
export const bookingWizardSchema = z.object({
  // Step 1: Service selection
  service_id: uuidSchema,
  service_name: z.string().optional(), // For confirmation display

  // Step 2: Date/time selection
  appointment_date: futureDateSchema,

  // Step 3: Pet selection
  pet_id: uuidSchema,
  pet_name: z.string().optional(), // For confirmation display

  // Step 4: Additional info
  notes: optionalString(500),
  contact_phone: z
    .string()
    .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número inválido')
    .optional(),
})

export type BookingWizardInput = z.infer<typeof bookingWizardSchema>
