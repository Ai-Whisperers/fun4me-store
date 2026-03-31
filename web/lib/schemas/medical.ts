/**
 * Medical records, vaccines, and prescription schemas
 */

import { z } from 'zod'
import { uuidSchema, optionalString, requiredString, enumSchema, pastDateSchema } from './common'

// ============================================
// Vaccines
// ============================================

/**
 * Schema for adding a vaccine record
 */
export const createVaccineSchema = z.object({
  pet_id: uuidSchema,
  vaccine_name: requiredString('Nombre de vacuna', 100),
  date_administered: pastDateSchema,
  next_due: z.string().datetime('Fecha inválida').optional().nullable(),
  administered_by: optionalString(100),
  batch_number: optionalString(50),
  manufacturer: optionalString(100),
  notes: optionalString(500),
})

export type CreateVaccineInput = z.infer<typeof createVaccineSchema>

/**
 * Schema for updating a vaccine record
 */
export const updateVaccineSchema = createVaccineSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateVaccineInput = z.infer<typeof updateVaccineSchema>

// ============================================
// Medical Records
// ============================================

/**
 * Medical record types
 */
export const MEDICAL_RECORD_TYPES = [
  'consultation',
  'surgery',
  'dental',
  'vaccination',
  'deworming',
  'emergency',
  'checkup',
  'lab_result',
  'imaging',
  'hospitalization',
  'other',
] as const
export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number]

/**
 * Schema for creating a medical record
 */
export const createMedicalRecordSchema = z.object({
  pet_id: uuidSchema,
  record_type: enumSchema(MEDICAL_RECORD_TYPES, 'Tipo de registro'),
  title: requiredString('Título', 200),
  description: optionalString(2000),
  diagnosis: optionalString(1000),
  treatment: optionalString(1000),
  notes: optionalString(2000),
  date: pastDateSchema.optional(), // Defaults to now
  attachments: z.array(z.string().url()).optional(),
})

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>

/**
 * Schema for updating a medical record
 */
export const updateMedicalRecordSchema = createMedicalRecordSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>

// ============================================
// Prescriptions
// ============================================

/**
 * Prescription status
 */
export const PRESCRIPTION_STATUSES = ['active', 'completed', 'cancelled'] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number]

/**
 * Administration routes
 */
export const ADMINISTRATION_ROUTES = [
  'oral',
  'topical',
  'injection_im',
  'injection_iv',
  'injection_sc',
  'inhalation',
  'ophthalmic',
  'otic',
  'rectal',
  'other',
] as const
export type AdministrationRoute = (typeof ADMINISTRATION_ROUTES)[number]

/**
 * Schema for creating a prescription
 */
export const createPrescriptionSchema = z.object({
  pet_id: uuidSchema,
  drug_name: requiredString('Nombre del medicamento', 200),
  dosage: requiredString('Dosis', 100),
  frequency: requiredString('Frecuencia', 100),
  duration: requiredString('Duración', 100),
  route: enumSchema(ADMINISTRATION_ROUTES, 'Vía de administración'),
  quantity: z.coerce.number().int().min(1, 'Cantidad debe ser al menos 1').optional(),
  instructions: optionalString(1000),
  warnings: optionalString(500),
  refills_allowed: z.coerce.number().int().min(0).max(10).default(0),
  start_date: z.string().datetime().optional(), // Defaults to now
  end_date: z.string().datetime().optional(),
  medical_record_id: uuidSchema.optional(), // Link to consultation
})

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>

/**
 * Schema for updating prescription status
 */
export const updatePrescriptionStatusSchema = z.object({
  id: uuidSchema,
  status: enumSchema(PRESCRIPTION_STATUSES, 'Estado'),
  notes: optionalString(500),
})

export type UpdatePrescriptionStatusInput = z.infer<typeof updatePrescriptionStatusSchema>

// ============================================
// API Prescription Schemas (for route handlers)
// ============================================

/**
 * Schema for drug item in prescription (API format)
 * Used when drugs are passed as a JSON array
 */
export const prescriptionDrugItemSchema = z.object({
  name: z.string().min(1, 'Nombre del medicamento requerido').max(200),
  dosage: z.string().min(1, 'Dosis requerida').max(100),
  frequency: z.string().min(1, 'Frecuencia requerida').max(100),
  duration: z.string().max(100).optional(),
  route: z.string().max(50).optional(),
  instructions: z.string().max(1000).optional(),
})

export type PrescriptionDrugItem = z.infer<typeof prescriptionDrugItemSchema>

/**
 * Schema for creating a prescription via API (multi-drug format)
 * VALID-004: Used by POST /api/prescriptions
 */
export const apiCreatePrescriptionSchema = z.object({
  pet_id: uuidSchema,
  drugs: z.array(prescriptionDrugItemSchema)
    .min(1, 'Debe incluir al menos un medicamento')
    .max(20, 'Máximo 20 medicamentos por receta'),
  notes: optionalString(2000),
  signature_hash: z.string().max(500).optional().nullable(),
  qr_code_url: z.string().url().max(500).optional().nullable(),
})

export type ApiCreatePrescriptionInput = z.infer<typeof apiCreatePrescriptionSchema>

/**
 * Schema for updating a prescription via API
 * VALID-004: Used by PUT /api/prescriptions
 */
export const apiUpdatePrescriptionSchema = z.object({
  id: uuidSchema,
  drugs: z.array(prescriptionDrugItemSchema).min(1).max(20).optional(),
  notes: optionalString(2000),
  status: enumSchema(PRESCRIPTION_STATUSES, 'Estado').optional(),
})

export type ApiUpdatePrescriptionInput = z.infer<typeof apiUpdatePrescriptionSchema>

// ============================================
// Diagnosis Codes
// ============================================

/**
 * Schema for searching diagnosis codes
 */
export const diagnosisSearchSchema = z.object({
  q: z.string().min(2, 'Ingrese al menos 2 caracteres').max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type DiagnosisSearchInput = z.infer<typeof diagnosisSearchSchema>

// ============================================
// Drug Dosages
// ============================================

/**
 * Schema for drug dosage calculation
 */
export const drugDosageCalculationSchema = z.object({
  drug_id: uuidSchema.optional(),
  drug_name: z.string().max(200).optional(),
  weight_kg: z.coerce.number().min(0.1, 'Peso inválido').max(500),
  species: z.enum(['dog', 'cat', 'other']).optional(),
})

export type DrugDosageCalculationInput = z.infer<typeof drugDosageCalculationSchema>

// ============================================
// Vaccine Reactions
// ============================================

/**
 * Reaction severity levels
 */
export const REACTION_SEVERITIES = ['mild', 'moderate', 'severe'] as const
export type ReactionSeverity = (typeof REACTION_SEVERITIES)[number]

/**
 * Schema for reporting a vaccine reaction
 */
export const createVaccineReactionSchema = z.object({
  pet_id: uuidSchema,
  vaccine_id: uuidSchema,
  reaction_type: requiredString('Tipo de reacción', 200),
  severity: enumSchema(REACTION_SEVERITIES, 'Severidad'),
  onset_time: optionalString(100), // e.g., "15 minutos después"
  symptoms: z.array(z.string().max(100)).min(1, 'Ingrese al menos un síntoma'),
  treatment_given: optionalString(1000),
  outcome: optionalString(500),
  notes: optionalString(1000),
})

export type CreateVaccineReactionInput = z.infer<typeof createVaccineReactionSchema>

// ============================================
// Euthanasia Assessment (HHHHHMM Scale)
// ============================================

/**
 * Schema for quality of life assessment
 */
export const euthanasiaAssessmentSchema = z.object({
  pet_id: uuidSchema,
  // HHHHHMM Scale (0-10 each)
  hurt_score: z.coerce.number().int().min(0).max(10),
  hunger_score: z.coerce.number().int().min(0).max(10),
  hydration_score: z.coerce.number().int().min(0).max(10),
  hygiene_score: z.coerce.number().int().min(0).max(10),
  happiness_score: z.coerce.number().int().min(0).max(10),
  mobility_score: z.coerce.number().int().min(0).max(10),
  more_good_days_score: z.coerce.number().int().min(0).max(10),
  // Additional context
  assessment_notes: optionalString(2000),
  recommendations: optionalString(1000),
})

export type EuthanasiaAssessmentInput = z.infer<typeof euthanasiaAssessmentSchema>
