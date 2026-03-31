/**
 * Hospitalization validation schemas
 * For patient admission, vital signs, medications, and discharge
 */

import { z } from 'zod'
import { HOSPITALIZATION_STATUSES } from '../types/status'
import { uuidSchema, requiredString, optionalString, enumSchema } from './common'

// =============================================================================
// HOSPITALIZATION
// =============================================================================

/**
 * Acuity levels for patient monitoring
 */
export const ACUITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type AcuityLevel = (typeof ACUITY_LEVELS)[number]

/**
 * Schema for admitting a patient to hospitalization
 */
export const createHospitalizationSchema = z.object({
  pet_id: uuidSchema,
  kennel_id: uuidSchema,
  admitted_at: z.string().datetime().optional(), // Defaults to now
  expected_discharge: z.string().datetime().optional(),
  reason: requiredString('Motivo de internación', 1000),
  diagnosis: optionalString(1000),
  treatment_plan: optionalString(2000),
  acuity_level: enumSchema(ACUITY_LEVELS, 'Nivel de urgencia').default('medium'),
  special_instructions: optionalString(1000),
})

export type CreateHospitalizationInput = z.infer<typeof createHospitalizationSchema>

/**
 * Schema for updating hospitalization details
 */
export const updateHospitalizationSchema = createHospitalizationSchema.partial().extend({
  status: z.enum(HOSPITALIZATION_STATUSES).optional(),
  discharged_at: z.string().datetime().optional(),
  discharge_notes: optionalString(1000),
  discharge_instructions: optionalString(2000),
})

export type UpdateHospitalizationInput = z.infer<typeof updateHospitalizationSchema>

/**
 * Schema for discharging a patient
 */
export const dischargePatientSchema = z.object({
  discharged_at: z.string().datetime().optional(), // Defaults to now
  discharge_notes: requiredString('Notas de alta', 1000),
  discharge_instructions: optionalString(2000),
  follow_up_date: z.string().datetime().optional(),
})

export type DischargePatientInput = z.infer<typeof dischargePatientSchema>

// =============================================================================
// VITAL SIGNS
// =============================================================================

/**
 * Schema for recording vital signs
 */
export const recordVitalsSchema = z.object({
  hospitalization_id: uuidSchema,
  temperature: z.number().min(30).max(45).optional(),
  heart_rate: z.number().int().min(20).max(300).optional(),
  respiratory_rate: z.number().int().min(5).max(100).optional(),
  blood_pressure_systolic: z.number().int().min(50).max(250).optional(),
  blood_pressure_diastolic: z.number().int().min(30).max(150).optional(),
  weight_kg: z.number().min(0.1).max(200).optional(),
  pain_score: z.number().int().min(0).max(10).optional(),
  capillary_refill_time: z.number().min(0).max(10).optional(), // seconds
  mucous_membrane_color: optionalString(50),
  hydration_status: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  attitude: z.enum(['alert', 'quiet', 'depressed', 'comatose']).optional(),
  notes: optionalString(500),
})

export type RecordVitalsInput = z.infer<typeof recordVitalsSchema>

// =============================================================================
// MEDICATIONS
// =============================================================================

/**
 * Administration routes for medications
 */
export const MEDICATION_ROUTES = [
  'oral',
  'iv',
  'im',
  'sc',
  'topical',
  'ophthalmic',
  'otic',
  'rectal',
  'inhalation',
] as const
export type MedicationRoute = (typeof MEDICATION_ROUTES)[number]

/**
 * Schema for recording medication administration
 */
export const recordMedicationSchema = z.object({
  hospitalization_id: uuidSchema,
  medication_name: requiredString('Nombre del medicamento', 200),
  dose: requiredString('Dosis', 100),
  route: enumSchema(MEDICATION_ROUTES, 'Vía de administración'),
  administered_at: z.string().datetime().optional(), // Defaults to now
  administered_by: uuidSchema.optional(), // Staff member
  notes: optionalString(500),
  adverse_reaction: z.boolean().default(false),
  reaction_details: optionalString(1000),
})

export type RecordMedicationInput = z.infer<typeof recordMedicationSchema>

// =============================================================================
// FEEDINGS
// =============================================================================

/**
 * Food types for feeding logs
 */
export const FOOD_TYPES = [
  'dry',
  'wet',
  'prescription',
  'raw',
  'homemade',
  'liquid',
  'syringe_fed',
] as const
export type FoodType = (typeof FOOD_TYPES)[number]

/**
 * Schema for recording feeding
 */
export const recordFeedingSchema = z.object({
  hospitalization_id: uuidSchema,
  food_type: enumSchema(FOOD_TYPES, 'Tipo de alimento'),
  amount: requiredString('Cantidad', 100), // e.g., "50g", "2 tazas"
  amount_consumed: optionalString(100),
  fed_at: z.string().datetime().optional(), // Defaults to now
  fed_by: uuidSchema.optional(),
  appetite: z.enum(['none', 'poor', 'fair', 'good', 'excellent']).optional(),
  vomited: z.boolean().default(false),
  notes: optionalString(500),
})

export type RecordFeedingInput = z.infer<typeof recordFeedingSchema>

// =============================================================================
// TREATMENTS
// =============================================================================

/**
 * Treatment types
 */
export const TREATMENT_TYPES = [
  'wound_care',
  'bandage_change',
  'catheter_care',
  'iv_fluid',
  'oxygen_therapy',
  'nebulization',
  'physical_therapy',
  'grooming',
  'other',
] as const
export type TreatmentType = (typeof TREATMENT_TYPES)[number]

/**
 * Schema for recording treatments
 */
export const recordTreatmentSchema = z.object({
  hospitalization_id: uuidSchema,
  treatment_type: enumSchema(TREATMENT_TYPES, 'Tipo de tratamiento'),
  description: requiredString('Descripción', 1000),
  performed_at: z.string().datetime().optional(), // Defaults to now
  performed_by: uuidSchema.optional(),
  outcome: optionalString(500),
  next_scheduled: z.string().datetime().optional(),
  notes: optionalString(500),
})

export type RecordTreatmentInput = z.infer<typeof recordTreatmentSchema>

// =============================================================================
// KENNEL MANAGEMENT
// =============================================================================

/**
 * Kennel types
 */
export const KENNEL_TYPES = [
  'standard',
  'large',
  'small',
  'icu',
  'isolation',
  'exotic',
  'recovery',
] as const
export type KennelType = (typeof KENNEL_TYPES)[number]

/**
 * Schema for creating a kennel
 */
export const createKennelSchema = z.object({
  name: requiredString('Nombre', 100),
  code: requiredString('Código', 20),
  kennel_type: enumSchema(KENNEL_TYPES, 'Tipo de jaula'),
  daily_rate: z.number().nonnegative().optional(),
  description: optionalString(500),
  max_occupancy: z.number().int().min(1).default(1),
})

export type CreateKennelInput = z.infer<typeof createKennelSchema>

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for hospitalization query parameters
 */
export const hospitalizationQuerySchema = z.object({
  status: z.enum(HOSPITALIZATION_STATUSES).optional(),
  kennel_id: uuidSchema.optional(),
  pet_id: uuidSchema.optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  acuity_level: z.enum(ACUITY_LEVELS).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type HospitalizationQueryParams = z.infer<typeof hospitalizationQuerySchema>
