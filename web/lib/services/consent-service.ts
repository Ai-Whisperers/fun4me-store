/**
 * Consent Management Service
 *
 * Handles consent templates, signed consent documents, and user consent preferences.
 * Supports both procedure-based consents (surgical, anesthetic, etc.) and
 * preference-based consents (marketing, data processing, etc.).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseService, ServiceResult } from './base-service';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
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
// INPUT TYPES
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

export interface ConsentAnalytics {
  consent_type: ConsentPreferenceType;
  total_users: number;
  granted_count: number;
  withdrawn_count: number;
  grant_rate: number;
  changes_last_30_days: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export class ConsentService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  // ===========================================================================
  // TEMPLATE METHODS
  // ===========================================================================

  /**
   * List consent templates for a tenant
   */
  async listTemplates(
    tenantId: string,
    filters: TemplateFilters = {}
  ): Promise<ServiceResult<ConsentTemplate[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('consent_templates')
        .select('*')
        .is('deleted_at', null)
        .order('category')
        .order('name');

      // Include both tenant-specific and global templates
      if (filters.include_global !== false) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      } else {
        query = query.eq('tenant_id', tenantId);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConsentTemplate[];
    }, 'Error al listar plantillas de consentimiento');
  }

  /**
   * Get a single consent template by ID
   */
  async getTemplate(templateId: string): Promise<ServiceResult<ConsentTemplate>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_templates')
        .select('*')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as ConsentTemplate;
    }, 'Error al obtener plantilla de consentimiento');
  }

  /**
   * Get a template by code (useful for programmatic lookups)
   */
  async getTemplateByCode(
    tenantId: string,
    code: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_templates')
        .select('*')
        .eq('code', code)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .order('tenant_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data as ConsentTemplate;
    }, 'Error al obtener plantilla por código');
  }

  /**
   * Create a new consent template
   */
  async createTemplate(
    tenantId: string,
    data: CreateTemplateData,
    createdBy: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    return this.handleError(async () => {
      const { data: template, error } = await this.supabase
        .from('consent_templates')
        .insert({
          tenant_id: tenantId,
          code: data.code,
          name: data.name,
          category: data.category,
          title: data.title,
          content_html: data.content_html,
          requires_witness: data.requires_witness ?? false,
          validity_days: data.validity_days,
          requires_id_verification: data.requires_id_verification ?? false,
          can_be_revoked: data.can_be_revoked ?? true,
          default_expiry_days: data.default_expiry_days,
          version: '1.0',
          is_active: true,
          is_current: true,
          created_by: createdBy,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return template as ConsentTemplate;
    }, 'Error al crear plantilla de consentimiento');
  }

  /**
   * Update a consent template (creates new version)
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateData,
    updatedBy: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    return this.handleError(async () => {
      // If content changed, use the versioning function
      if (data.content_html || data.title) {
        const { data: result, error: versionError } = await this.supabase.rpc(
          'create_consent_template_version',
          {
            p_template_id: templateId,
            p_title: data.title,
            p_content_html: data.content_html,
            p_change_summary: data.change_summary,
            p_user_id: updatedBy,
          }
        );

        if (versionError) throw versionError;
      }

      // Update other fields
      const updateData: Record<string, unknown> = {
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.requires_witness !== undefined) updateData.requires_witness = data.requires_witness;
      if (data.validity_days !== undefined) updateData.validity_days = data.validity_days;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.requires_id_verification !== undefined) {
        updateData.requires_id_verification = data.requires_id_verification;
      }
      if (data.can_be_revoked !== undefined) updateData.can_be_revoked = data.can_be_revoked;
      if (data.default_expiry_days !== undefined) {
        updateData.default_expiry_days = data.default_expiry_days;
      }

      const { data: template, error } = await this.supabase
        .from('consent_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return template as ConsentTemplate;
    }, 'Error al actualizar plantilla de consentimiento');
  }

  /**
   * Soft delete a consent template
   */
  async deleteTemplate(
    templateId: string,
    deletedBy: string
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('consent_templates')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          is_active: false,
        })
        .eq('id', templateId);

      if (error) throw error;
    }, 'Error al eliminar plantilla de consentimiento');
  }

  /**
   * Get version history for a template
   */
  async getTemplateVersions(
    templateId: string
  ): Promise<ServiceResult<ConsentTemplateVersion[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as ConsentTemplateVersion[];
    }, 'Error al obtener historial de versiones');
  }

  /**
   * Rollback template to a previous version
   */
  async rollbackTemplate(
    templateId: string,
    targetVersionNumber: number,
    userId: string
  ): Promise<ServiceResult<string>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc(
        'rollback_consent_template_version',
        {
          p_template_id: templateId,
          p_target_version_number: targetVersionNumber,
          p_user_id: userId,
        }
      );

      if (error) throw error;
      return data as string;
    }, 'Error al restaurar versión de plantilla');
  }

  // ===========================================================================
  // DOCUMENT METHODS
  // ===========================================================================

  /**
   * List consent documents for a tenant
   */
  async listDocuments(
    tenantId: string,
    filters: DocumentFilters = {}
  ): Promise<ServiceResult<ConsentDocument[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('consent_documents')
        .select('*, template:consent_templates(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters.template_id) {
        query = query.eq('template_id', filters.template_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.appointment_id) {
        query = query.eq('appointment_id', filters.appointment_id);
      }

      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConsentDocument[];
    }, 'Error al listar documentos de consentimiento');
  }

  /**
   * Get a single consent document by ID
   */
  async getDocument(documentId: string): Promise<ServiceResult<ConsentDocument>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_documents')
        .select('*, template:consent_templates(*)')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data as ConsentDocument;
    }, 'Error al obtener documento de consentimiento');
  }

  /**
   * Create a new consent document (pending signature)
   */
  async createDocument(
    tenantId: string,
    data: CreateDocumentData
  ): Promise<ServiceResult<ConsentDocument>> {
    return this.handleError(async () => {
      // Get template to check validity
      const { data: template, error: templateError } = await this.supabase
        .from('consent_templates')
        .select('validity_days, default_expiry_days')
        .eq('id', data.template_id)
        .single();

      if (templateError) throw templateError;

      // Calculate expiry date if template has validity
      let expiresAt: string | null = null;
      const validityDays = template.validity_days || template.default_expiry_days;
      if (validityDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + validityDays);
        expiresAt = expiry.toISOString();
      }

      const { data: document, error } = await this.supabase
        .from('consent_documents')
        .insert({
          tenant_id: tenantId,
          template_id: data.template_id,
          pet_id: data.pet_id,
          client_id: data.client_id,
          appointment_id: data.appointment_id,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('*, template:consent_templates(*)')
        .single();

      if (error) throw error;
      return document as ConsentDocument;
    }, 'Error al crear documento de consentimiento');
  }

  /**
   * Sign a consent document
   */
  async signDocument(
    documentId: string,
    data: SignDocumentData
  ): Promise<ServiceResult<ConsentDocument>> {
    return this.handleError(async () => {
      const { data: document, error } = await this.supabase
        .from('consent_documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_url: data.signature_url,
          witness_name: data.witness_name,
          witness_signature_url: data.witness_signature_url,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
        })
        .eq('id', documentId)
        .eq('status', 'pending')
        .select('*, template:consent_templates(*)')
        .single();

      if (error) throw error;

      // Log the signing action
      await this.logDocumentAction(document.tenant_id, documentId, 'signed', {
        ip_address: data.ip_address,
        user_agent: data.user_agent,
      });

      return document as ConsentDocument;
    }, 'Error al firmar documento de consentimiento');
  }

  /**
   * Revoke a signed consent document
   */
  async revokeDocument(
    documentId: string,
    data: RevokeDocumentData,
    revokedBy: string
  ): Promise<ServiceResult<ConsentDocument>> {
    return this.handleError(async () => {
      // First check if template allows revocation
      const { data: current, error: fetchError } = await this.supabase
        .from('consent_documents')
        .select('tenant_id, template:consent_templates(can_be_revoked)')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      const template = (current.template as { can_be_revoked: boolean }[] | null)?.[0];
      if (!template?.can_be_revoked) {
        throw new Error('Este consentimiento no puede ser revocado');
      }

      const { data: document, error } = await this.supabase
        .from('consent_documents')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_reason: data.reason,
        })
        .eq('id', documentId)
        .eq('status', 'signed')
        .select('*, template:consent_templates(*)')
        .single();

      if (error) throw error;

      // Log the revocation
      await this.logDocumentAction(current.tenant_id, documentId, 'revoked', {
        performed_by: revokedBy,
        reason: data.reason,
      });

      return document as ConsentDocument;
    }, 'Error al revocar documento de consentimiento');
  }

  /**
   * Mark document as email sent
   */
  async markDocumentSent(
    documentId: string,
    sentBy: string
  ): Promise<ServiceResult<ConsentDocument>> {
    return this.handleError(async () => {
      const { data: document, error } = await this.supabase
        .from('consent_documents')
        .update({
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select('*, template:consent_templates(*)')
        .single();

      if (error) throw error;

      // Log the send action
      await this.logDocumentAction(document.tenant_id, documentId, 'sent', {
        performed_by: sentBy,
      });

      return document as ConsentDocument;
    }, 'Error al marcar documento como enviado');
  }

  /**
   * Check if a valid consent exists for a pet/template combination
   */
  async hasValidConsent(
    petId: string,
    templateCode: string
  ): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_documents')
        .select('id, expires_at')
        .eq('pet_id', petId)
        .eq('status', 'signed')
        .eq('template.code', templateCode)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .limit(1);

      if (error) throw error;
      return data.length > 0;
    }, 'Error al verificar consentimiento válido');
  }

  // ===========================================================================
  // PREFERENCE METHODS
  // ===========================================================================

  /**
   * Get all consent preferences for a user
   */
  async getUserPreferences(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<ConsentPreference[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('consent_type');

      if (error) throw error;
      return data as ConsentPreference[];
    }, 'Error al obtener preferencias de consentimiento');
  }

  /**
   * Check if user has a specific consent
   */
  async hasPreferenceConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentPreferenceType
  ): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc('has_consent', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_consent_type: consentType,
      });

      if (error) throw error;
      return data as boolean;
    }, 'Error al verificar consentimiento');
  }

  /**
   * Update a user's consent preference
   */
  async updatePreference(
    userId: string,
    tenantId: string,
    consentType: ConsentPreferenceType,
    data: UpdatePreferenceData
  ): Promise<ServiceResult<ConsentPreference>> {
    return this.handleError(async () => {
      const now = new Date().toISOString();

      const { data: preference, error } = await this.supabase
        .from('consent_preferences')
        .upsert(
          {
            user_id: userId,
            tenant_id: tenantId,
            consent_type: consentType,
            granted: data.granted,
            granted_at: data.granted ? now : null,
            withdrawn_at: !data.granted ? now : null,
            source: data.source ?? 'settings',
          },
          {
            onConflict: 'user_id,tenant_id,consent_type',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return preference as ConsentPreference;
    }, 'Error al actualizar preferencia de consentimiento');
  }

  /**
   * Bulk update multiple consent preferences
   */
  async updatePreferences(
    userId: string,
    tenantId: string,
    preferences: Array<{
      consent_type: ConsentPreferenceType;
      granted: boolean;
    }>,
    source: ConsentSource = 'settings'
  ): Promise<ServiceResult<ConsentPreference[]>> {
    return this.handleError(async () => {
      const now = new Date().toISOString();

      const records = preferences.map((p) => ({
        user_id: userId,
        tenant_id: tenantId,
        consent_type: p.consent_type,
        granted: p.granted,
        granted_at: p.granted ? now : null,
        withdrawn_at: !p.granted ? now : null,
        source,
      }));

      const { data, error } = await this.supabase
        .from('consent_preferences')
        .upsert(records, {
          onConflict: 'user_id,tenant_id,consent_type',
        })
        .select();

      if (error) throw error;
      return data as ConsentPreference[];
    }, 'Error al actualizar preferencias de consentimiento');
  }

  /**
   * Get consent preference audit history for a user
   */
  async getPreferenceAuditHistory(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<ConsentPreferenceAudit[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_preference_audit')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data as ConsentPreferenceAudit[];
    }, 'Error al obtener historial de cambios');
  }

  /**
   * Get consent analytics for a tenant
   */
  async getConsentAnalytics(
    tenantId: string
  ): Promise<ServiceResult<ConsentAnalytics[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc('get_consent_analytics', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as ConsentAnalytics[];
    }, 'Error al obtener análisis de consentimiento');
  }

  // ===========================================================================
  // AUDIT METHODS
  // ===========================================================================

  /**
   * Log a consent document action
   */
  private async logDocumentAction(
    tenantId: string,
    documentId: string,
    action: ConsentAuditAction,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.supabase.from('consent_audit_log').insert({
        tenant_id: tenantId,
        document_id: documentId,
        action,
        metadata,
      });
    } catch (_error: unknown) {
      // Don't fail the main operation if audit logging fails
      logger.error('[Consent] Failed to log consent action', { action });
    }
  }

  /**
   * Get audit log for a document
   */
  async getDocumentAuditLog(
    documentId: string
  ): Promise<ServiceResult<ConsentAuditLog[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_audit_log')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConsentAuditLog[];
    }, 'Error al obtener registro de auditoría');
  }

  // ===========================================================================
  // BLANKET CONSENT METHODS
  // ===========================================================================

  /**
   * Get blanket consents for a client
   */
  async getBlanketConsents(
    tenantId: string,
    clientId: string
  ): Promise<ServiceResult<ConsentDocument[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('consent_documents')
        .select('*, template:consent_templates(*)')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .is('pet_id', null)
        .eq('status', 'signed')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (error) throw error;
      return data as ConsentDocument[];
    }, 'Error al obtener consentimientos generales');
  }
}
