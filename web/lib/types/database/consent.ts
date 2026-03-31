/**
 * Consent Database Tables
 * ConsentTemplate, ConsentDocument
 */

import type { ConsentCategory, ConsentStatus, SignatureType } from './enums'

// =============================================================================
// CONSENT
// =============================================================================

export interface ConsentTemplate {
  id: string
  tenant_id: string | null
  code: string
  name: string
  category: ConsentCategory
  title: string
  description: string | null
  content_html: string
  requires_witness: boolean
  requires_id_verification: boolean
  requires_payment_acknowledgment: boolean
  min_age_to_sign: number
  validity_days: number | null
  can_be_revoked: boolean
  language: string
  is_active: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ConsentDocument {
  id: string
  tenant_id: string
  template_id: string | null
  document_number: string
  pet_id: string | null
  owner_id: string | null
  appointment_id: string | null
  hospitalization_id: string | null
  invoice_id: string | null
  medical_record_id: string | null
  template_version: number | null
  rendered_content_html: string
  field_values: Record<string, unknown>
  signer_name: string
  signer_email: string | null
  signer_phone: string | null
  signer_id_type: string | null
  signer_id_number: string | null
  signer_relationship: string | null
  signature_type: SignatureType
  signature_data: string | null
  signature_hash: string | null
  witness_name: string | null
  witness_signature_data: string | null
  witness_signed_at: string | null
  facilitated_by: string | null
  signed_at: string
  expires_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  revocation_reason: string | null
  status: ConsentStatus
  ip_address: string | null
  user_agent: string | null
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}
