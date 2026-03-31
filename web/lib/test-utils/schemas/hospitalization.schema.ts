import { z } from 'zod'

/**
 * Hospitalization Schema
 * Validates hospitalization records before insertion
 *
 * CRITICAL: admission_number is required (NOT NULL in database)
 */
export const HospitalizationSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1),
    pet_id: z.string().uuid(),
    kennel_id: z.string().uuid().optional().nullable(),

    // CRITICAL: Required field - unique per tenant
    admission_number: z.string().min(1, 'admission_number is required'),

    admitted_at: z
      .string()
      .datetime()
      .or(z.date().transform((d) => d.toISOString())),
    expected_discharge: z.string().datetime().optional().nullable(),
    actual_discharge: z.string().datetime().optional().nullable(),

    // DB constraint: char_length(reason) >= 3
    reason: z.string().min(3, 'reason must be at least 3 characters'),

    diagnosis: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    discharge_instructions: z.string().optional().nullable(),

    status: z
      .enum([
        'admitted',
        'in_treatment',
        'stable',
        'critical',
        'recovering',
        'discharged',
        'deceased',
        'transferred',
      ])
      .default('admitted'),

    // Note: 'stable' is NOT a valid acuity_level - use 'normal' instead
    acuity_level: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),

    primary_vet_id: z.string().uuid().optional().nullable(),
    admitted_by: z.string().uuid().optional().nullable(),
    discharged_by: z.string().uuid().optional().nullable(),

    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // actual_discharge must be after admitted_at
      if (data.actual_discharge && data.admitted_at) {
        return new Date(data.actual_discharge) >= new Date(data.admitted_at)
      }
      return true
    },
    { message: 'Discharge date must be after admission date' }
  )

export type HospitalizationInput = z.input<typeof HospitalizationSchema>
export type Hospitalization = z.output<typeof HospitalizationSchema>

/**
 * Hospitalization Vitals Schema
 */
export const HospitalizationVitalsSchema = z.object({
  id: z.string().uuid().optional(),
  hospitalization_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(), // Auto-set by trigger

  temperature: z.number().min(30).max(45).optional().nullable(),
  heart_rate: z.number().int().min(20).max(400).optional().nullable(),
  respiratory_rate: z.number().int().min(5).max(150).optional().nullable(),
  blood_pressure_systolic: z.number().int().min(40).max(300).optional().nullable(),
  blood_pressure_diastolic: z.number().int().min(20).max(200).optional().nullable(),
  oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
  weight_kg: z.number().positive().optional().nullable(),
  pain_score: z.number().int().min(0).max(10).optional().nullable(),
  mentation: z.enum(['bright', 'quiet', 'dull', 'obtunded', 'comatose']).optional().nullable(),

  notes: z.string().optional().nullable(),
  recorded_by: z.string().uuid().optional().nullable(),
  recorded_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
})

export type HospitalizationVitalsInput = z.input<typeof HospitalizationVitalsSchema>
export type HospitalizationVitals = z.output<typeof HospitalizationVitalsSchema>

/**
 * Hospitalization Medication Schema
 */
export const HospitalizationMedicationSchema = z.object({
  id: z.string().uuid().optional(),
  hospitalization_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(), // Auto-set by trigger

  medication_name: z.string().min(1),
  dose: z.string().min(1),
  route: z.enum(['oral', 'IV', 'IM', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic']),
  frequency: z.string().optional().nullable(),

  scheduled_at: z.string().datetime().optional().nullable(),
  administered_at: z.string().datetime().optional().nullable(),
  administered_by: z.string().uuid().optional().nullable(),

  status: z.enum(['scheduled', 'administered', 'skipped', 'held']).default('scheduled'),
  notes: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type HospitalizationMedicationInput = z.input<typeof HospitalizationMedicationSchema>
export type HospitalizationMedication = z.output<typeof HospitalizationMedicationSchema>

/**
 * Hospitalization Treatment Schema
 */
export const HospitalizationTreatmentSchema = z.object({
  id: z.string().uuid().optional(),
  hospitalization_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  treatment_type: z.string().min(1),
  description: z.string().min(1),

  scheduled_at: z.string().datetime().optional().nullable(),
  performed_at: z.string().datetime().optional().nullable(),
  performed_by: z.string().uuid().optional().nullable(),

  status: z.enum(['scheduled', 'performed', 'skipped', 'pending']).default('scheduled'),
  notes: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type HospitalizationTreatmentInput = z.input<typeof HospitalizationTreatmentSchema>
export type HospitalizationTreatment = z.output<typeof HospitalizationTreatmentSchema>

/**
 * Hospitalization Feeding Schema
 */
export const HospitalizationFeedingSchema = z.object({
  id: z.string().uuid().optional(),
  hospitalization_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  food_type: z.string().min(1),
  amount: z.string().optional().nullable(),
  method: z.enum(['oral', 'syringe', 'tube', 'assisted']).default('oral'),

  scheduled_at: z.string().datetime().optional().nullable(),
  fed_at: z.string().datetime().optional().nullable(),
  fed_by: z.string().uuid().optional().nullable(),

  appetite_score: z.number().int().min(0).max(5).optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'refused', 'partial']).default('scheduled'),
  notes: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type HospitalizationFeedingInput = z.input<typeof HospitalizationFeedingSchema>
export type HospitalizationFeeding = z.output<typeof HospitalizationFeedingSchema>

/**
 * Hospitalization Notes Schema
 */
export const HospitalizationNoteSchema = z.object({
  id: z.string().uuid().optional(),
  hospitalization_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  content: z.string().min(1),
  note_type: z
    .enum(['progress', 'doctor', 'nursing', 'discharge', 'owner_update', 'other'])
    .default('progress'),

  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type HospitalizationNoteInput = z.input<typeof HospitalizationNoteSchema>
export type HospitalizationNote = z.output<typeof HospitalizationNoteSchema>

/**
 * Kennel Schema
 */
export const KennelSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1),
    name: z.string().min(1),
    code: z.string().min(1),

    kennel_type: z
      .enum([
        'standard',
        'isolation',
        'icu',
        'recovery',
        'large',
        'small',
        'extra-large',
        'oxygen',
        'exotic',
      ])
      .default('standard'),

    max_occupancy: z.number().int().positive().default(1),
    current_occupancy: z.number().int().min(0).default(0),
    daily_rate: z.number().min(0).default(0),

    current_status: z
      .enum(['available', 'occupied', 'cleaning', 'maintenance', 'reserved'])
      .default('available'),

    description: z.string().optional().nullable(),
    features: z.array(z.string()).optional().nullable(),

    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine((data) => data.current_occupancy <= data.max_occupancy, {
    message: 'Current occupancy cannot exceed max occupancy',
  })

export type KennelInput = z.input<typeof KennelSchema>
export type Kennel = z.output<typeof KennelSchema>

/**
 * Helper: Generate admission number
 */
export function generateAdmissionNumber(index: number, date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  return `ADM-${year}-${String(index).padStart(4, '0')}`
}
