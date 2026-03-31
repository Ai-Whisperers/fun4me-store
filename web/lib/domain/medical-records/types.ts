/**
 * Medical Records Domain Types
 *
 * Type definitions for medical records, vaccines, and prescriptions.
 */

// =============================================================================
// MEDICAL RECORD TYPES
// =============================================================================

export type MedicalRecordType =
  | 'consultation'
  | 'exam'
  | 'surgery'
  | 'hospitalization'
  | 'wellness'
  | 'emergency'
  | 'follow_up'
  | 'vaccination'
  | 'lab_result'
  | 'imaging'

export interface MedicalRecord {
  id: string
  pet_id: string
  tenant_id: string
  vet_id: string | null
  record_type: MedicalRecordType
  visit_date: string
  chief_complaint?: string | null
  history?: string | null
  physical_exam?: string | null
  weight_kg?: number | null
  temperature_celsius?: number | null
  heart_rate_bpm?: number | null
  respiratory_rate_rpm?: number | null
  blood_pressure?: string | null
  body_condition_score?: number | null
  diagnosis_code?: string | null
  diagnosis_text?: string | null
  assessment?: string | null
  clinical_notes?: string | null
  treatment_plan?: string | null
  medications_prescribed?: string | null
  followup_date?: string | null
  follow_up_notes?: string | null
  is_emergency?: boolean
  requires_followup?: boolean
  notes?: string | null
  attachments?: string[]
  deleted_at?: string | null
  deleted_by?: string | null
  created_at: string
  updated_at: string
}

export interface MedicalRecordWithDetails extends MedicalRecord {
  pet?: {
    id: string
    name: string
    species: string
    breed?: string | null
    owner_id?: string
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
}

export interface CreateMedicalRecordInput {
  pet_id: string
  vet_id?: string | null
  record_type: MedicalRecordType
  visit_date?: string
  chief_complaint?: string | null
  history?: string | null
  physical_exam?: string | null
  weight_kg?: number | null
  temperature_celsius?: number | null
  heart_rate_bpm?: number | null
  respiratory_rate_rpm?: number | null
  blood_pressure?: string | null
  body_condition_score?: number | null
  diagnosis_code?: string | null
  diagnosis_text?: string | null
  assessment?: string | null
  clinical_notes?: string | null
  treatment_plan?: string | null
  medications_prescribed?: string | null
  followup_date?: string | null
  follow_up_notes?: string | null
  is_emergency?: boolean
  requires_followup?: boolean
  notes?: string | null
  attachments?: string[]
}

export interface MedicalRecordFilters {
  pet_id?: string
  record_type?: MedicalRecordType
  from_date?: string
  to_date?: string
  is_emergency?: boolean
  page?: number
  limit?: number
}

// =============================================================================
// VACCINE TYPES (part of medical records)
// =============================================================================
// NOTE: Vaccine types have been moved to lib/domain/vaccines/types.ts
// Import from there instead to avoid duplicate exports:
// import type { Vaccine, VaccineFilters, VaccineWithDetails } from '../vaccines/types'

// =============================================================================
// VACCINE TYPES (legacy - kept for medical-records repository compatibility)
// =============================================================================
// Note: The vaccines domain has its own types in lib/domain/vaccines/types.ts
// These are kept here for backward compatibility with medical-records repository

export type VaccineStatus = 'pending' | 'verified' | 'expired'

export interface Vaccine {
  id: string
  pet_id: string
  name: string
  administered_date: string
  next_due_date?: string | null
  batch_number?: string | null
  administered_by?: string | null
  verified_by?: string | null
  status: VaccineStatus
  notes?: string | null
  certificate_url?: string | null
  photos?: string[]
  created_at: string
  updated_at: string
}

export interface VaccineWithDetails extends Vaccine {
  pet?: {
    id: string
    name: string
    species: string
    breed?: string | null
    tenant_id: string
  } | null
  administered_by_profile?: {
    id: string
    full_name: string
  } | null
  verified_by_profile?: {
    id: string
    full_name: string
  } | null
  reactions?: Array<{
    id: string
    reaction_detail: string
    severity?: string
    created_at: string
  }>
}

export interface CreateVaccineInput {
  pet_id: string
  name: string
  administered_date: string
  next_due_date?: string | null
  batch_number?: string | null
  notes?: string | null
  certificate_url?: string | null
  photos?: string[]
}

export interface VaccineFilters {
  pet_id?: string
  status?: VaccineStatus
  upcoming?: boolean
  overdue?: boolean
  from_date?: string
  to_date?: string
}

// =============================================================================
// PRESCRIPTION TYPES
// =============================================================================

export interface MedicationItem {
  name: string
  dose: string
  frequency: string
  duration?: string
  instructions?: string
}

export interface Prescription {
  id: string
  pet_id: string
  tenant_id: string
  vet_id: string
  medications: MedicationItem[]
  diagnosis?: string | null
  notes?: string | null
  valid_until: string
  signature_url?: string | null
  created_at: string
}

export interface PrescriptionWithDetails extends Prescription {
  pet?: {
    id: string
    name: string
    species: string
    breed?: string | null
    owner_id?: string
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
}

export interface CreatePrescriptionInput {
  pet_id: string
  medications: MedicationItem[]
  diagnosis?: string | null
  notes?: string | null
  valid_until: string
  signature_url?: string | null
}

// =============================================================================
// LIST RESULTS
// =============================================================================

export interface MedicalRecordListResult {
  records: MedicalRecordWithDetails[]
  count: number
  page: number
  limit: number
}

// VaccineListResult moved to lib/domain/vaccines/types.ts
