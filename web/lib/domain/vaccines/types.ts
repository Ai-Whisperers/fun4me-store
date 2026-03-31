/**
 * Vaccines Domain Types
 *
 * Types for vaccine records, templates, and reactions.
 */

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

export type VaccineStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled'
export type VaccineRoute =
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
export type ReactionSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ReactionType = 'local' | 'systemic' | 'allergic' | 'anaphylactic' | 'other'

// ===========================================================================
// CORE ENTITIES
// ===========================================================================

export interface Vaccine {
  id: string
  pet_id: string
  administered_by_clinic: string | null
  template_id: string | null
  administered_by: string | null
  name: string
  batch_number: string | null
  manufacturer: string | null
  route: VaccineRoute | null
  dosage: string | null
  lot_expiry: string | null
  administered_date: string
  next_due_date: string | null
  status: VaccineStatus
  vet_signature: string | null
  certificate_url: string | null
  adverse_reactions: string | null
  photos: string[]
  notes: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  created_at: string
  updated_at: string
}

export interface VaccineWithRelations extends Vaccine {
  pet?: {
    id: string
    name: string
    species: string
    tenant_id?: string
    owner?: { full_name: string }
  }
  administered_by_profile?: {
    id: string
    full_name: string
  }
}

export interface VaccineTemplate {
  id: string
  tenant_id: string | null
  name: string
  code: string | null
  species: string[]
  description: string | null
  min_age_weeks: number | null
  recommended_age_weeks: number | null
  booster_interval_days: number | null
  is_required: boolean
  display_order: number
  is_active: boolean
}

export interface VaccineReaction {
  id: string
  tenant_id: string
  pet_id: string
  vaccine_id: string | null
  vaccine_name: string
  vaccine_brand: string | null
  reaction_date: string
  onset_hours: number | null
  severity: ReactionSeverity
  reaction_type: ReactionType | null
  symptoms: string[]
  treatment: string | null
  outcome: string | null
  hospitalization_required: boolean
  recovery_days: number | null
  notes: string | null
  reported_by: string | null
  created_at: string
  updated_at: string
}

// ===========================================================================
// INPUT TYPES
// ===========================================================================

export interface RecordVaccineInput {
  pet_id: string
  name: string
  administered_date: string
  template_id?: string
  batch_number?: string
  manufacturer?: string
  route?: VaccineRoute
  dosage?: string
  lot_expiry?: string
  next_due_date?: string
  vet_signature?: string
  notes?: string
  administered_by?: string
}

export interface ScheduleVaccineInput {
  pet_id: string
  name: string
  scheduled_date: string
  template_id?: string
  notes?: string
}

export interface CompleteVaccineInput extends Record<string, unknown> {
  vaccine_id: string
  administered_at: string
  administered_by: string
  lot_number?: string | null
  manufacturer?: string | null
  expiry_date?: string | null
  notes?: string | null
  next_due_date?: string | null
}

export interface RecordReactionInput {
  pet_id: string
  vaccine_id?: string
  vaccine_name: string
  vaccine_brand?: string
  reaction_date: string
  onset_hours?: number
  severity: ReactionSeverity
  reaction_type?: ReactionType
  symptoms?: string[]
  treatment?: string
  hospitalization_required?: boolean
  notes?: string
  reported_by?: string
}

// ===========================================================================
// FILTER TYPES
// ===========================================================================

export interface VaccineFilters {
  pet_id?: string
  status?: VaccineStatus
  from_date?: string
  to_date?: string
  overdue_only?: boolean
  due_within_days?: number
}

// ===========================================================================
// STATISTICS
// ===========================================================================

export interface VaccineStats {
  total_vaccines: number
  completed_this_month: number
  scheduled_upcoming: number
  overdue_count: number
  reactions_this_year: number
}
