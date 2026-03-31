/**
 * Consent Domain - Type Definitions
 * 
 * Types for consent management including templates, documents, preferences, and audit logs.
 */

// =============================================================================
// ENUMS & UNIONS
// =============================================================================

// Template categories for procedure-based consents
export type ConsentCategory =
  | 'surgical'
  | 'anesthetic'
  | 'diagnostic'
  | 'therapeutic'
  | 'vaccination'
  | 'euthanasia'
  | 'general';

// User preference consent types
export type ConsentPreferenceType =
  | 'medical_treatment'
  | 'data_processing'
  | 'marketing_email'
  | 'marketing_sms'
  | 'third_party_sharing'
  | 'analytics_cookies'
  | 'photo_sharing'
  | 'marketing_whatsapp'
  | 'push_notifications';

// Consent source tracking
export type ConsentSource =
  | 'signup'
  | 'settings'
  | 'procedure'
  | 'banner'
  | 'api'
  | 'import';

// Consent document status
export type ConsentDocumentStatus =
  | 'pending'
  | 'signed'
  | 'revoked'
  | 'expired';

// Consent audit action
export type ConsentAuditAction =
  | 'signed'
  | 'revoked'
  | 'viewed'
  | 'downloaded'
  | 'sent';

// =============================================================================
// CORE ENTITIES
// =============================================================================

// Consent template
export interface ConsentTemplate {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  category: ConsentCategory;
  title: string;
  content_html: string;
  requires_witness: boolean;
  validity_days: number | null;
  version: string;
  is_active: boolean;
  is_current: boolean;
  requires_id_verification: boolean;
  can_be_revoked: boolean;
  default_expiry_days: number | null;
  published_at: string | null;
  change_summary: string | null;
  parent_version_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Template version history
export interface ConsentTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  version_label: string;
  title: string;
  content_html: string;
  change_summary: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

// Signed consent document
export interface ConsentDocument {
  id: string;
  tenant_id: string;
  template_id: string;
  pet_id: string | null;
  client_id: string;
  appointment_id: string | null;
  status: ConsentDocumentStatus;
  signed_at: string | null;
  signature_url: string | null;
  witness_name: string | null;
  witness_signature_url: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  email_sent_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  template?: ConsentTemplate;
}

// User consent preference
export interface ConsentPreference {
  id: string;
  user_id: string;
  tenant_id: string;
  consent_type: ConsentPreferenceType;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
  source: ConsentSource;
  version: number;
  created_at: string;
  updated_at: string;
}

// Consent preference audit entry
export interface ConsentPreferenceAudit {
  id: string;
  preference_id: string;
  user_id: string;
  tenant_id: string;
  consent_type: ConsentPreferenceType;
  old_value: boolean | null;
  new_value: boolean;
  source: ConsentSource;
  ip_address: string | null;
  user_agent: string | null;
  changed_at: string;
}

// Consent audit log entry
export interface ConsentAuditLog {
  id: string;
  tenant_id: string;
  document_id: string;
  action: ConsentAuditAction;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// INPUT & FILTER TYPES
// =============================================================================

export interface CreateTemplateData {
  code: string;
  name: string;
  category: ConsentCategory;
  title: string;
  content_html: string;
  requires_witness?: boolean;
  validity_days?: number | null;
  requires_id_verification?: boolean;
  can_be_revoked?: boolean;
  default_expiry_days?: number | null;
}

export interface UpdateTemplateData {
  name?: string;
  title?: string;
  content_html?: string;
  requires_witness?: boolean;
  validity_days?: number | null;
  is_active?: boolean;
  requires_id_verification?: boolean;
  can_be_revoked?: boolean;
  default_expiry_days?: number | null;
  change_summary?: string;
}

export interface CreateDocumentData {
  template_id: string;
  pet_id?: string | null;
  client_id: string;
  appointment_id?: string | null;
}

export interface SignDocumentData {
  signature_url: string;
  witness_name?: string | null;
  witness_signature_url?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface RevokeDocumentData {
  reason: string;
}

export interface UpdatePreferenceData {
  granted: boolean;
  source?: ConsentSource;
}

export interface TemplateFilters {
  category?: ConsentCategory;
  is_active?: boolean;
  include_global?: boolean;
  search?: string;
}

export interface DocumentFilters {
  pet_id?: string;
  client_id?: string;
  template_id?: string;
  status?: ConsentDocumentStatus;
  appointment_id?: string;
  from_date?: string;
  to_date?: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface ConsentAnalytics {
  consent_type: ConsentPreferenceType;
  total_users: number;
  granted_count: number;
  withdrawn_count: number;
  grant_rate: number;
  changes_last_30_days: number;
}

// Service result wrapper for backward compatibility
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}