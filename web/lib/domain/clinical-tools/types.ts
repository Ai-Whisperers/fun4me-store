/**
 * Clinical Tools Domain Types
 *
 * Types for clinical reference data and assessments:
 * - Diagnosis codes (VeNom, SNOMED, custom)
 * - Drug dosages and dose calculations
 * - Growth standards and percentile calculations
 * - Vaccine protocols
 * - Reproductive cycle tracking
 * - Euthanasia/quality of life assessments
 */

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

export type DiagnosisStandard = 'venom' | 'snomed' | 'custom'
export type Severity = 'mild' | 'moderate' | 'severe' | 'critical'
export type Species = 'dog' | 'cat' | 'bird' | 'rabbit' | 'all'

export type DrugCategory =
  | 'antibiotic'
  | 'analgesic'
  | 'nsaid'
  | 'corticosteroid'
  | 'antiemetic'
  | 'cardiac'
  | 'antifungal'
  | 'antiparasitic'
  | 'sedative'
  | 'steroid'
  | 'heartworm'
  | 'vaccine'
  | 'other'

export type DrugRoute =
  | 'oral'
  | 'PO'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'SQ'
  | 'topical'
  | 'inhaled'
  | 'rectal'
  | 'ophthalmic'
  | 'otic'

export type VaccineProtocolType = 'core' | 'non-core' | 'lifestyle'
export type CycleType = 'heat' | 'pregnancy' | 'lactation' | 'anestrus'
export type GrowthPercentile = 'P3' | 'P10' | 'P25' | 'P50' | 'P75' | 'P90' | 'P97'

// ===========================================================================
// CORE ENTITIES
// ===========================================================================

export interface DiagnosisCode {
  id: string
  code: string
  term: string
  standard: DiagnosisStandard
  category: string | null
  description: string | null
  species: string[]
  severity: Severity | null
  created_at: string
  updated_at: string
}

export interface DrugDosage {
  id: string
  name: string
  generic_name: string | null
  species: Species
  category: DrugCategory | null
  min_dose_mg_kg: number | null
  max_dose_mg_kg: number | null
  concentration_mg_ml: number | null
  route: DrugRoute | null
  frequency: string | null
  max_daily_dose_mg_kg: number | null
  contraindications: string[] | null
  side_effects: string[] | null
  notes: string | null
  requires_prescription: boolean
  created_at: string
  updated_at: string
}

export interface GrowthStandard {
  id: string
  species: 'dog' | 'cat'
  breed: string | null
  breed_category: string | null
  gender: 'male' | 'female' | null
  age_weeks: number
  weight_kg: number
  percentile: GrowthPercentile
  created_at: string
  updated_at: string
}

export interface VaccineProtocol {
  id: string
  vaccine_name: string
  vaccine_code: string
  species: 'dog' | 'cat' | 'all'
  protocol_type: VaccineProtocolType
  diseases_prevented: string[]
  first_dose_weeks: number | null
  booster_weeks: number[] | null
  booster_intervals_months: number[] | null
  revaccination_months: number | null
  duration_years: number | null
  manufacturer: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReproductiveCycle {
  id: string
  pet_id: string
  tenant_id: string
  cycle_type: CycleType
  cycle_start: string
  cycle_end: string | null
  mating_date: string | null
  expected_due_date: string | null
  actual_birth_date: string | null
  litter_size: number | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface EuthanasiaAssessment {
  id: string
  pet_id: string
  tenant_id: string
  hurt_score: number
  hunger_score: number
  hydration_score: number
  hygiene_score: number
  happiness_score: number
  mobility_score: number
  more_good_days_score: number
  total_score: number
  notes: string | null
  recommendations: string | null
  assessed_by: string | null
  assessed_at: string
  created_at: string
  updated_at: string
}

// ===========================================================================
// FILTER TYPES
// ===========================================================================

export interface DiagnosisCodeFilters {
  search?: string
  standard?: DiagnosisStandard
  category?: string
  species?: string
  severity?: Severity
}

export interface DrugFilters {
  search?: string
  species?: Species
  category?: DrugCategory
  route?: DrugRoute
  requiresPrescription?: boolean
}

export interface GrowthStandardFilters {
  species: 'dog' | 'cat'
  breed?: string
  breedCategory?: string
  gender?: 'male' | 'female'
  ageWeeks?: number
}

export interface VaccineProtocolFilters {
  species?: 'dog' | 'cat' | 'all'
  protocolType?: VaccineProtocolType
  search?: string
}

// ===========================================================================
// INPUT TYPES
// ===========================================================================

export interface CreateReproductiveCycleInput {
  pet_id: string
  cycle_type: CycleType
  cycle_start: string
  cycle_end?: string
  mating_date?: string
  expected_due_date?: string
  actual_birth_date?: string
  litter_size?: number
  notes?: string
  recorded_by?: string
}

export interface UpdateReproductiveCycleInput {
  cycle_end?: string
  actual_birth_date?: string
  litter_size?: number
  notes?: string
}

export interface CreateAssessmentInput {
  pet_id: string
  hurt_score: number
  hunger_score: number
  hydration_score: number
  hygiene_score: number
  happiness_score: number
  mobility_score: number
  more_good_days_score: number
  notes?: string
  recommendations?: string
  assessed_by?: string
}

// ===========================================================================
// RESULT TYPES
// ===========================================================================

export interface DoseCalculationResult {
  drug_name: string
  min_dose_mg: number | null
  max_dose_mg: number | null
  min_ml: number | null
  max_ml: number | null
  route: string | null
  frequency: string | null
  notes: string | null
}

export interface GrowthPercentileResult {
  percentile: string
  weightKg: number
  expectedP50: number | null
  status: 'underweight' | 'normal' | 'overweight' | 'no_data'
}

export interface QoLInterpretation {
  category: 'poor' | 'fair' | 'acceptable' | 'good'
  recommendation: string
}
