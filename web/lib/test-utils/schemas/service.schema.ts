import { z } from 'zod'

/**
 * Service Schema
 */
// Schema matching actual database columns
export const ServiceSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1),
    name: z.string().min(2).max(100),
    description: z.string().optional().nullable(),

    category: z.enum([
      'consultation',
      'vaccination',
      'grooming',
      'surgery',
      'diagnostic',
      'dental',
      'emergency',
      'hospitalization',
      'treatment',
      'identification',
      'other',
    ]),

    base_price: z.number().min(0),
    currency: z.string().default('PYG'),
    tax_rate: z.number().min(0).max(100).optional().nullable(),

    duration_minutes: z.number().int().positive(),
    buffer_minutes: z.number().int().min(0).default(0),
    max_daily_bookings: z.number().int().positive().optional().nullable(),

    requires_appointment: z.boolean().default(true),
    available_days: z.array(z.number().int().min(1).max(7)).optional().nullable(),
    available_start_time: z.string().optional().nullable(),
    available_end_time: z.string().optional().nullable(),

    requires_deposit: z.boolean().default(false),
    deposit_percentage: z.number().min(0).max(100).optional().nullable(),

    species_allowed: z.array(z.string()).optional().nullable(),

    display_order: z.number().int().default(100),
    is_featured: z.boolean().default(false),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),

    is_active: z.boolean().default(true),

    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .passthrough() // Allow extra fields from JSON that will be stripped

export type ServiceInput = z.input<typeof ServiceSchema>
export type Service = z.output<typeof ServiceSchema>

/**
 * Appointment Schema
 */
export const AppointmentSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1),
    pet_id: z.string().uuid(),
    service_id: z.string().uuid().optional().nullable(),
    vet_id: z.string().uuid().optional().nullable(),
    created_by: z.string().uuid().optional().nullable(),

    start_time: z.string().datetime(),
    end_time: z.string().datetime(),

    status: z
      .enum([
        'scheduled',
        'confirmed',
        'checked_in',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ])
      .default('scheduled'),

    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    internal_notes: z.string().optional().nullable(),

    is_recurring: z.boolean().default(false),
    recurrence_rule: z.string().optional().nullable(),
    parent_appointment_id: z.string().uuid().optional().nullable(),

    reminder_sent: z.boolean().default(false),
    reminder_sent_at: z.string().datetime().optional().nullable(),

    checked_in_at: z.string().datetime().optional().nullable(),
    completed_at: z.string().datetime().optional().nullable(),
    cancelled_at: z.string().datetime().optional().nullable(),
    cancellation_reason: z.string().optional().nullable(),

    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      return new Date(data.end_time) > new Date(data.start_time)
    },
    { message: 'End time must be after start time' }
  )

export type AppointmentInput = z.input<typeof AppointmentSchema>
export type Appointment = z.output<typeof AppointmentSchema>

/**
 * Staff Schedule Schema
 */
export const StaffScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  staff_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  day_of_week: z.number().int().min(0).max(6), // 0 = Sunday

  start_time: z.string(), // HH:MM format
  end_time: z.string(),

  break_start: z.string().optional().nullable(),
  break_end: z.string().optional().nullable(),

  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type StaffScheduleInput = z.input<typeof StaffScheduleSchema>
export type StaffSchedule = z.output<typeof StaffScheduleSchema>

/**
 * Staff Time Off Schema
 */
export const StaffTimeOffSchema = z
  .object({
    id: z.string().uuid().optional(),
    staff_id: z.string().uuid(),
    tenant_id: z.string().min(1).optional(),
    type_id: z.string().uuid().optional().nullable(),

    start_date: z.string().date(),
    end_date: z.string().date(),

    reason: z.string().optional().nullable(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),

    approved_by: z.string().uuid().optional().nullable(),
    approved_at: z.string().datetime().optional().nullable(),

    created_at: z.string().datetime().optional(),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: 'End date must be on or after start date',
  })

export type StaffTimeOffInput = z.input<typeof StaffTimeOffSchema>
export type StaffTimeOff = z.output<typeof StaffTimeOffSchema>

/**
 * Time Off Type Schema
 * Matches DB: time_off_types (is_paid, max_days_per_year, code, requires_documentation, icon)
 */
export const TimeOffTypeSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().optional().nullable(), // NULL = global template
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional().nullable(),
  is_paid: z.boolean().default(true),
  max_days_per_year: z.number().int().positive().optional().nullable(),
  requires_approval: z.boolean().default(true),
  requires_documentation: z.boolean().default(false),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type TimeOffTypeInput = z.input<typeof TimeOffTypeSchema>
export type TimeOffType = z.output<typeof TimeOffTypeSchema>

/**
 * Consent Template Schema
 */
export const ConsentTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1).optional().nullable(),
  code: z.string().min(1),
  name: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional().nullable(),
  version: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
  requires_witness: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type ConsentTemplateInput = z.input<typeof ConsentTemplateSchema>
export type ConsentTemplate = z.output<typeof ConsentTemplateSchema>

/**
 * Consent Document Schema
 */
export const ConsentDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  pet_id: z.string().uuid(),
  template_id: z.string().uuid(),
  client_id: z.string().uuid(),

  signed_at: z.string().datetime(),
  signature_url: z.string().url().optional().nullable(),
  signature_data: z.string().optional().nullable(),

  witness_name: z.string().optional().nullable(),
  witness_signature_url: z.string().url().optional().nullable(),

  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),

  created_at: z.string().datetime().optional(),
})

export type ConsentDocumentInput = z.input<typeof ConsentDocumentSchema>
export type ConsentDocument = z.output<typeof ConsentDocumentSchema>
