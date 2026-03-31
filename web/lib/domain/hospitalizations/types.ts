/**
 * Hospitalizations Domain Types
 *
 * Type definitions for kennels, hospitalizations, vitals, medications, treatments, feedings, and notes.
 */

// =============================================================================
// KENNEL TYPES
// =============================================================================

export type KennelType =
  | 'standard'
  | 'isolation'
  | 'icu'
  | 'recovery'
  | 'large'
  | 'small'
  | 'extra-large'
  | 'oxygen'
  | 'exotic'

export type KennelStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved'

export interface Kennel {
  id: string
  tenant_id: string
  name: string
  code: string
  location: string | null
  kennel_type: KennelType
  max_occupancy: number
  current_occupancy: number
  max_weight_kg: number | null
  features: string[] | null
  daily_rate: number
  current_status: KennelStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface KennelFilters {
  status?: KennelStatus
  type?: KennelType
  isActive?: boolean
  minWeight?: number
}

export interface CreateKennelInput {
  name: string
  code: string
  location?: string
  kennel_type?: KennelType
  max_occupancy?: number
  max_weight_kg?: number
  features?: string[]
  daily_rate?: number
}

export interface UpdateKennelInput {
  name?: string
  location?: string
  kennel_type?: KennelType
  max_occupancy?: number
  max_weight_kg?: number
  features?: string[]
  daily_rate?: number
  current_status?: KennelStatus
  is_active?: boolean
}

// =============================================================================
// HOSPITALIZATION TYPES
// =============================================================================

export type HospitalizationStatus =
  | 'admitted'
  | 'in_treatment'
  | 'stable'
  | 'critical'
  | 'recovering'
  | 'discharged'
  | 'deceased'
  | 'transferred'

export type AcuityLevel = 'low' | 'normal' | 'high' | 'critical'

export interface Hospitalization {
  id: string
  tenant_id: string
  pet_id: string
  kennel_id: string | null
  primary_vet_id: string | null
  admitted_by: string | null
  admission_number: string
  admitted_at: string
  expected_discharge: string | null
  actual_discharge: string | null
  reason: string
  diagnosis: string | null
  notes: string | null
  discharge_instructions: string | null
  acuity_level: AcuityLevel
  status: HospitalizationStatus
  discharge_notes: string | null
  discharged_by: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  estimated_cost: number | null
  actual_cost: number | null
  invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface HospitalizationFilters {
  status?: HospitalizationStatus | HospitalizationStatus[]
  acuityLevel?: AcuityLevel
  petId?: string
  vetId?: string
  kennelId?: string
  activeOnly?: boolean
}

export interface AdmitPatientInput {
  pet_id: string
  kennel_id?: string
  primary_vet_id?: string
  admitted_by?: string
  reason: string
  diagnosis?: string
  notes?: string
  acuity_level?: AcuityLevel
  expected_discharge?: string
  estimated_cost?: number
}

export interface UpdateHospitalizationInput {
  kennel_id?: string
  primary_vet_id?: string
  diagnosis?: string
  notes?: string
  acuity_level?: AcuityLevel
  expected_discharge?: string
  estimated_cost?: number
}

export interface DischargePatientInput {
  discharge_notes?: string
  discharge_instructions?: string
  discharged_by?: string
  actual_cost?: number
  follow_up_required?: boolean
  follow_up_date?: string
  invoice_id?: string
}

// =============================================================================
// VITALS TYPES
// =============================================================================

export type Mentation = 'bright' | 'quiet' | 'dull' | 'obtunded' | 'comatose'
export type HydrationStatus = 'normal' | 'mild' | 'moderate' | 'severe'

export interface HospitalizationVitals {
  id: string
  hospitalization_id: string
  tenant_id: string
  temperature: number | null
  heart_rate: number | null
  respiratory_rate: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  spo2: number | null
  weight_kg: number | null
  pain_score: number | null
  mentation: Mentation | null
  hydration_status: HydrationStatus | null
  notes: string | null
  recorded_by: string | null
  recorded_at: string
  created_at: string
}

export interface RecordVitalsInput {
  temperature?: number
  heart_rate?: number
  respiratory_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  spo2?: number
  weight_kg?: number
  pain_score?: number
  mentation?: Mentation
  hydration_status?: HydrationStatus
  notes?: string
  recorded_by?: string
}

// =============================================================================
// MEDICATION TYPES
// =============================================================================

export type MedicationStatus = 'scheduled' | 'administered' | 'skipped' | 'held'
export type MedicationRoute =
  | 'oral'
  | 'IV'
  | 'IM'
  | 'SQ'
  | 'topical'
  | 'inhaled'
  | 'rectal'
  | 'ophthalmic'
  | 'otic'

export interface HospitalizationMedication {
  id: string
  hospitalization_id: string
  tenant_id: string
  medication_name: string
  dose: string
  route: MedicationRoute | null
  frequency: string | null
  scheduled_at: string | null
  administered_at: string | null
  skipped_reason: string | null
  status: MedicationStatus
  administered_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleMedicationInput {
  medication_name: string
  dose: string
  route?: MedicationRoute
  frequency?: string
  scheduled_at?: string
  notes?: string
}

export interface AdministerMedicationInput {
  administered_by?: string
  administered_at?: string
  notes?: string
}

// =============================================================================
// TREATMENT TYPES
// =============================================================================

export type TreatmentStatus = 'scheduled' | 'performed' | 'skipped' | 'pending'

export interface HospitalizationTreatment {
  id: string
  hospitalization_id: string
  tenant_id: string
  treatment_type: string
  description: string
  scheduled_at: string | null
  performed_at: string | null
  status: TreatmentStatus
  performed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleTreatmentInput {
  treatment_type: string
  description: string
  scheduled_at?: string
  notes?: string
}

export interface PerformTreatmentInput {
  performed_by?: string
  performed_at?: string
  notes?: string
}

// =============================================================================
// FEEDING TYPES
// =============================================================================

export type FeedingStatus = 'scheduled' | 'completed' | 'refused' | 'partial'
export type FeedingMethod = 'oral' | 'syringe' | 'tube' | 'assisted'

export interface HospitalizationFeeding {
  id: string
  hospitalization_id: string
  tenant_id: string
  food_type: string
  amount: string | null
  method: FeedingMethod | null
  scheduled_at: string | null
  fed_at: string | null
  consumed_amount: string | null
  appetite_score: number | null
  vomited: boolean
  status: FeedingStatus
  fed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleFeedingInput {
  food_type: string
  amount?: string
  method?: FeedingMethod
  scheduled_at?: string
  notes?: string
}

export interface CompleteFeedingInput {
  fed_by?: string
  fed_at?: string
  consumed_amount?: string
  appetite_score?: number
  vomited?: boolean
  notes?: string
}

// =============================================================================
// NOTE TYPES
// =============================================================================

export type NoteType = 'progress' | 'doctor' | 'nursing' | 'discharge' | 'owner_update' | 'other'

export interface HospitalizationNote {
  id: string
  hospitalization_id: string
  tenant_id: string
  note_type: NoteType
  content: string
  created_by: string | null
  created_at: string
}

export interface CreateNoteInput {
  note_type?: NoteType
  content: string
  created_by?: string
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface HospitalizationStats {
  totalKennels: number
  availableKennels: number
  occupiedKennels: number
  activeHospitalizations: number
  criticalPatients: number
  dischargedToday: number
}
