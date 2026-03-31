/**
 * Insurance Database Tables
 * InsuranceProvider, PetInsurancePolicy, InsuranceClaim
 */

import type { InsuranceClaimType, InsuranceClaimStatus, InsurancePolicyStatus } from './enums'

// =============================================================================
// INSURANCE
// =============================================================================

export interface InsuranceProvider {
  id: string
  name: string
  code: string
  logo_url: string | null
  website: string | null
  claims_phone: string | null
  claims_email: string | null
  claims_fax: string | null
  claims_address: string | null
  api_endpoint: string | null
  supports_electronic_claims: boolean
  supports_pre_auth: boolean
  provider_portal_url: string | null
  claim_submission_method: 'manual' | 'email' | 'fax' | 'portal' | 'api'
  typical_processing_days: number
  requires_itemized_invoice: boolean
  requires_medical_records: boolean
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PetInsurancePolicy {
  id: string
  tenant_id: string
  pet_id: string
  provider_id: string
  policy_number: string
  group_number: string | null
  member_id: string | null
  policyholder_name: string
  policyholder_phone: string | null
  policyholder_email: string | null
  policyholder_address: string | null
  effective_date: string
  expiration_date: string | null
  enrollment_date: string | null
  plan_name: string | null
  plan_type: 'accident_only' | 'accident_illness' | 'comprehensive' | 'wellness' | 'custom' | null
  annual_limit: number | null
  per_incident_limit: number | null
  lifetime_limit: number | null
  deductible_amount: number | null
  deductible_type: 'annual' | 'per_incident' | 'per_condition'
  coinsurance_percentage: number | null
  copay_amount: number | null
  accident_waiting_period: number
  illness_waiting_period: number
  orthopedic_waiting_period: number
  pre_existing_conditions: string[] | null
  excluded_conditions: string[] | null
  coverage_notes: string | null
  status: InsurancePolicyStatus
  verified_at: string | null
  verified_by: string | null
  policy_document_url: string | null
  created_at: string
  updated_at: string
}

export interface InsuranceClaim {
  id: string
  tenant_id: string
  policy_id: string
  pet_id: string
  claim_number: string | null
  provider_claim_number: string | null
  invoice_id: string | null
  medical_record_id: string | null
  hospitalization_id: string | null
  claim_type: InsuranceClaimType
  date_of_service: string
  diagnosis: string
  diagnosis_code: string | null
  treatment_description: string
  total_charges: number
  claimed_amount: number
  deductible_applied: number
  coinsurance_amount: number
  approved_amount: number | null
  paid_amount: number | null
  adjustment_amount: number
  adjustment_reason: string | null
  status: InsuranceClaimStatus
  submitted_at: string | null
  acknowledged_at: string | null
  processed_at: string | null
  paid_at: string | null
  closed_at: string | null
  submission_method: 'email' | 'fax' | 'portal' | 'api' | 'mail' | null
  confirmation_number: string | null
  payment_method: 'check' | 'eft' | 'credit' | null
  payment_reference: string | null
  payment_to: 'clinic' | 'policyholder' | null
  denial_reason: string | null
  denial_code: string | null
  can_appeal: boolean
  appeal_deadline: string | null
  submitted_by: string | null
  processed_by: string | null
  internal_notes: string | null
  provider_notes: string | null
  created_at: string
  updated_at: string
}
