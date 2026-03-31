/**
 * Safety & Public Health Domain Types
 *
 * Types for lost pet tracking, sighting reports, match suggestions,
 * and disease surveillance/epidemiology reporting.
 */

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

export type LostPetStatus = 'lost' | 'found' | 'reunited'
export type MatchStatus = 'pending' | 'reviewing' | 'confirmed' | 'rejected'
export type DiseaseOutcome = 'recovered' | 'deceased' | 'ongoing' | 'unknown'
export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'critical'

// ===========================================================================
// CORE ENTITIES
// ===========================================================================

export interface LostPet {
  id: string
  pet_id: string
  tenant_id: string
  status: LostPetStatus
  last_seen_location: string | null
  last_seen_lat: number | null
  last_seen_lng: number | null
  last_seen_at: string | null
  reported_by: string | null
  contact_phone: string | null
  contact_email: string | null
  found_at: string | null
  found_location: string | null
  found_by: string | null
  notes: string | null
  description: string | null
  distinctive_features: string | null
  wearing: string | null
  reward_offered: boolean
  reward_amount: number | null
  is_public: boolean
  share_url: string | null
  photos: string[]
  created_at: string
  updated_at: string
  // Joined data
  pet?: {
    id: string
    name: string
    species: string
    breed: string | null
    color: string | null
    photo_url: string | null
    microchip_number: string | null
    owner_id: string
  }
}

export interface PetSighting {
  id: string
  lost_pet_id: string
  reporter_name: string | null
  reporter_email: string | null
  reporter_phone: string | null
  sighting_date: string
  sighting_location: string
  sighting_lat: number | null
  sighting_lng: number | null
  description: string | null
  photo_url: string | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface MatchReason {
  type: 'breed' | 'color' | 'location' | 'microchip' | 'features' | 'species'
  score: number
  description: string
}

export interface PetMatchSuggestion {
  id: string
  lost_report_id: string
  found_report_id: string | null
  found_pet_id: string | null
  confidence_score: number
  match_reasons: MatchReason[]
  status: MatchStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  lost_report?: LostPet
  found_report?: LostPet
}

export interface DiseaseReport {
  id: string
  tenant_id: string
  diagnosis_code: string | null
  diagnosis_name: string
  species: string
  location_zone: string | null
  latitude: number | null
  longitude: number | null
  case_date: string
  case_count: number
  outcome: DiseaseOutcome | null
  severity: DiseaseSeverity | null
  pet_age_months: number | null
  pet_breed: string | null
  pet_sex: string | null
  reported_by: string | null
  lab_confirmed: boolean
  lab_order_id: string | null
  is_notifiable: boolean
  notified_authority: boolean
  notified_at: string | null
  notes: string | null
  created_at: string
}

export interface DiseaseAlert {
  diagnosis_code: string
  diagnosis_name: string
  species: string
  case_count: number
  first_case: string
  last_case: string
  location_zone: string | null
}

// ===========================================================================
// INPUT TYPES
// ===========================================================================

export interface ReportLostPetInput {
  pet_id: string
  last_seen_location?: string
  last_seen_lat?: number
  last_seen_lng?: number
  last_seen_at?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
  description?: string
  distinctive_features?: string
  wearing?: string
  reward_offered?: boolean
  reward_amount?: number
  is_public?: boolean
  photos?: string[]
}

export interface UpdateLostPetInput {
  status?: LostPetStatus
  last_seen_location?: string
  last_seen_lat?: number
  last_seen_lng?: number
  last_seen_at?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
  description?: string
  distinctive_features?: string
  wearing?: string
  reward_offered?: boolean
  reward_amount?: number
  is_public?: boolean
  photos?: string[]
  found_location?: string
}

export interface ReportSightingInput {
  lost_pet_id: string
  reporter_name?: string
  reporter_email?: string
  reporter_phone?: string
  sighting_date?: string
  sighting_location: string
  sighting_lat?: number
  sighting_lng?: number
  description?: string
  photo_url?: string
}

export interface ReviewMatchInput {
  status: MatchStatus
  review_notes?: string
}

export interface CreateDiseaseReportInput {
  diagnosis_code?: string
  diagnosis_name: string
  species: string
  location_zone?: string
  latitude?: number
  longitude?: number
  case_date?: string
  case_count?: number
  outcome?: DiseaseOutcome
  severity?: DiseaseSeverity
  pet_age_months?: number
  pet_breed?: string
  pet_sex?: string
  lab_confirmed?: boolean
  lab_order_id?: string
  is_notifiable?: boolean
  notes?: string
}

// ===========================================================================
// FILTER TYPES
// ===========================================================================

export interface LostPetFilters {
  status?: LostPetStatus
  species?: string
  is_public?: boolean
  near_lat?: number
  near_lng?: number
  radius_km?: number
  from_date?: string
  to_date?: string
}

export interface DiseaseReportFilters {
  diagnosis_code?: string
  species?: string
  location_zone?: string
  severity?: DiseaseSeverity
  outcome?: DiseaseOutcome
  from_date?: string
  to_date?: string
  is_notifiable?: boolean
  lab_confirmed?: boolean
}

// ===========================================================================
// STATISTICS
// ===========================================================================

export interface ZoneStats {
  location_zone: string
  total_cases: number
  unique_diagnoses: number
  species_breakdown: Record<string, number>
}
