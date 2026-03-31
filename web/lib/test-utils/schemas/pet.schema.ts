import { z } from 'zod'

/**
 * Pet Schema
 * Validates pet records before insertion
 */
export const PetSchema = z
  .object({
    id: z.string().uuid().optional(),
    owner_id: z.string().uuid(),
    tenant_id: z.string().min(1).optional().nullable(),
    name: z.string().min(1).max(100),
    species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other']),
    breed: z.string().optional().nullable(),
    birth_date: z.string().date().optional().nullable(),
    gender: z.enum(['male', 'female', 'unknown']).optional().nullable(),
    weight_kg: z.number().positive().optional().nullable(),
    color: z.string().optional().nullable(),
    microchip_number: z.string().optional().nullable(),
    photo_url: z.string().url().optional().nullable(),
    is_neutered: z.boolean().default(false),
    allergies: z.array(z.string()).max(50).optional().nullable(),
    chronic_conditions: z.array(z.string()).max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // Birth date must be in the past
      if (data.birth_date) {
        return new Date(data.birth_date) <= new Date()
      }
      return true
    },
    { message: 'Birth date must be in the past' }
  )

export type PetInput = z.input<typeof PetSchema>
export type Pet = z.output<typeof PetSchema>

/**
 * Vaccine Schema
 * Validates vaccine records before insertion
 */
export const VaccineSchema = z
  .object({
    id: z.string().uuid().optional(),
    pet_id: z.string().uuid(),
    administered_by_clinic: z.string().min(1).optional().nullable(),
    name: z.string().min(2).max(100),
    brand: z.string().optional().nullable(),
    batch_number: z.string().optional().nullable(),
    administered_date: z.string().datetime().or(z.string().date()),
    next_due_date: z.string().datetime().or(z.string().date()).optional().nullable(),
    administered_by: z.string().uuid().optional().nullable(),
    status: z.enum(['scheduled', 'completed', 'missed', 'cancelled']).default('completed'),
    route: z
      .enum(['subcutaneous', 'intramuscular', 'intranasal', 'oral', 'topical', 'other'])
      .optional()
      .nullable(),
    site: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // next_due_date must be after administered_date
      if (data.administered_date && data.next_due_date) {
        return new Date(data.next_due_date) >= new Date(data.administered_date)
      }
      return true
    },
    { message: 'Next due date must be after administered date' }
  )

export type VaccineInput = z.input<typeof VaccineSchema>
export type Vaccine = z.output<typeof VaccineSchema>

/**
 * Vaccine Reaction Schema
 */
export const VaccineReactionSchema = z.object({
  id: z.string().uuid().optional(),
  pet_id: z.string().uuid(),
  vaccine_id: z.string().uuid().optional().nullable(),
  reaction_type: z.enum(['local', 'systemic', 'allergic', 'anaphylactic', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  onset_hours: z.number().min(0).optional().nullable(),
  recovery_days: z.number().min(0).optional().nullable(),
  symptoms: z.string().optional().nullable(),
  treatment: z.string().optional().nullable(),
  reported_by: z.string().uuid().optional().nullable(),
  reported_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
})

export type VaccineReactionInput = z.input<typeof VaccineReactionSchema>
export type VaccineReaction = z.output<typeof VaccineReactionSchema>

/**
 * Medical Record Schema
 */
export const MedicalRecordSchema = z.object({
  id: z.string().uuid().optional(),
  pet_id: z.string().uuid(),
  tenant_id: z.string().min(1),
  vet_id: z.string().uuid().optional().nullable(),
  appointment_id: z.string().uuid().optional().nullable(),
  record_type: z.enum([
    'consultation',
    'surgery',
    'emergency',
    'vaccination',
    'checkup',
    'dental',
    'grooming',
    'lab_result',
    'imaging',
    'follow_up',
    'other',
  ]),
  visit_date: z.string().datetime().or(z.string().date()),
  chief_complaint: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  diagnosis_code_id: z.string().uuid().optional().nullable(),
  treatment: z.string().optional().nullable(),
  prescription: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  weight_kg: z.number().positive().optional().nullable(),
  temperature_c: z.number().min(30).max(45).optional().nullable(),
  heart_rate: z.number().int().min(20).max(400).optional().nullable(),
  respiratory_rate: z.number().int().min(5).max(150).optional().nullable(),
  body_condition_score: z.number().int().min(1).max(9).optional().nullable(),
  follow_up_date: z.string().datetime().or(z.string().date()).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type MedicalRecordInput = z.input<typeof MedicalRecordSchema>
export type MedicalRecord = z.output<typeof MedicalRecordSchema>
