/**
 * Hospitalization Database Tables
 * Kennel, Hospitalization, Vitals, Treatment
 */

import type {
  KennelType,
  KennelStatus,
  HospitalizationType,
  HospitalizationStatus,
  AcuityLevel,
} from './enums'

// =============================================================================
// HOSPITALIZATION
// =============================================================================

export interface Kennel {
  id: string
  tenant_id: string
  name: string
  code: string
  location: string | null
  kennel_type: KennelType
  size_category: 'small' | 'medium' | 'large' | 'xlarge'
  max_weight_kg: number | null
  species_allowed: string[]
  has_oxygen: boolean
  has_heating: boolean
  has_iv_pole: boolean
  has_camera: boolean
  daily_rate: number
  icu_surcharge: number
  is_active: boolean
  current_status: KennelStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Hospitalization {
  id: string
  tenant_id: string
  pet_id: string
  kennel_id: string | null
  hospitalization_number: string
  hospitalization_type: HospitalizationType
  admitted_at: string
  expected_discharge_at: string | null
  actual_discharge_at: string | null
  admitted_by: string | null
  discharged_by: string | null
  primary_vet_id: string | null
  admission_reason: string
  admission_diagnosis: string | null
  admission_weight_kg: number | null
  discharge_diagnosis: string | null
  discharge_weight_kg: number | null
  discharge_instructions: string | null
  treatment_plan: Record<string, unknown>
  diet_instructions: string | null
  feeding_schedule: Record<string, unknown>[]
  status: HospitalizationStatus
  acuity_level: AcuityLevel
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  owner_consent_given: boolean
  estimated_daily_cost: number | null
  deposit_amount: number
  deposit_paid: boolean
  invoice_id: string | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface HospitalizationVitals {
  id: string
  hospitalization_id: string
  recorded_by: string | null
  recorded_at: string
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  oxygen_saturation: number | null
  weight_kg: number | null
  pain_score: number | null
  pain_location: string | null
  hydration_status:
    | 'normal'
    | 'mild_dehydration'
    | 'moderate_dehydration'
    | 'severe_dehydration'
    | null
  mental_status: 'alert' | 'responsive' | 'lethargic' | 'obtunded' | 'comatose' | null
  appetite: 'normal' | 'decreased' | 'none' | 'increased' | null
  observations: string | null
  created_at: string
}

export interface HospitalizationTreatment {
  id: string
  hospitalization_id: string
  treatment_type:
    | 'medication'
    | 'procedure'
    | 'fluid_therapy'
    | 'feeding'
    | 'wound_care'
    | 'physical_therapy'
    | 'diagnostic'
    | 'other'
  treatment_name: string
  scheduled_at: string
  completed_at: string | null
  scheduled_by: string | null
  performed_by: string | null
  dosage: string | null
  route: string | null
  quantity: number | null
  unit: string | null
  status: 'scheduled' | 'completed' | 'skipped' | 'refused' | 'held'
  skip_reason: string | null
  response: string | null
  adverse_reaction: boolean
  adverse_reaction_details: string | null
  is_billable: boolean
  service_id: string | null
  charge_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}
