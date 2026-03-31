/**
 * Consent Repository - Data Access Layer
 *
 * Handles all database operations for consent management.
 * Separated from business logic for better testing and maintenance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ConsentTemplate,
  ConsentTemplateVersion,
  ConsentDocument,
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentAuditLog,
  ConsentPreferenceType,
  ConsentAuditAction,
  ConsentSource,
  ConsentAnalytics,
  TemplateFilters,
  DocumentFilters,
  CreateTemplateData,
  UpdateTemplateData,
  CreateDocumentData,
  SignDocumentData,
  RevokeDocumentData,
  UpdatePreferenceData,
} from './types';

export class ConsentRepository {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // TEMPLATE OPERATIONS
  // ==========================================================================

  async listTemplates(tenantId: string, filters: TemplateFilters = {}): Promise<ConsentTemplate[]> {
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
  }

  async getTemplateById(templateId: string): Promise<ConsentTemplate | null> {
    const { data, error } = await this.supabase
      .from('consent_templates')
      .select('*')
      .eq('id', templateId)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data as ConsentTemplate;
  }

  async getTemplateByCode(tenantId: string, code: string): Promise<ConsentTemplate | null> {
    const { data, error } = await this.supabase
      .from('consent_templates')
      .select('*')
      .eq('code', code)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('tenant_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data as ConsentTemplate;
  }

  async createTemplate(
    tenantId: string,
    data: CreateTemplateData,
    createdBy: string
  ): Promise<ConsentTemplate> {
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
  }

  async updateTemplate(
    templateId: string,
    data: UpdateTemplateData,
    updatedBy: string
  ): Promise<ConsentTemplate> {
    // If content changed, use the versioning function
    if (data.content_html || data.title) {
      const { error: versionError } = await this.supabase.rpc(
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
  }

  async deleteTemplate(templateId: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('consent_templates')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        is_active: false,
      })
      .eq('id', templateId);

    if (error) throw error;
  }

  async getTemplateVersions(templateId: string): Promise<ConsentTemplateVersion[]> {
    const { data, error } = await this.supabase
      .from('consent_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data as ConsentTemplateVersion[];
  }

  async rollbackTemplate(
    templateId: string,
    targetVersionNumber: number,
    userId: string
  ): Promise<string> {
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
  }

  // ==========================================================================
  // DOCUMENT OPERATIONS
  // ==========================================================================

  async listDocuments(tenantId: string, filters: DocumentFilters = {}): Promise<ConsentDocument[]> {
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
  }

  async getDocumentById(documentId: string): Promise<ConsentDocument | null> {
    const { data, error } = await this.supabase
      .from('consent_documents')
      .select('*, template:consent_templates(*)')
      .eq('id', documentId)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data as ConsentDocument;
  }

  async createDocument(
    tenantId: string,
    data: CreateDocumentData,
    expiresAt: string | null
  ): Promise<ConsentDocument> {
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
  }

  async signDocument(documentId: string, data: SignDocumentData): Promise<ConsentDocument> {
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
    return document as ConsentDocument;
  }

  async revokeDocument(documentId: string, data: RevokeDocumentData): Promise<ConsentDocument> {
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
    return document as ConsentDocument;
  }

  async markDocumentSent(documentId: string): Promise<ConsentDocument> {
    const { data: document, error } = await this.supabase
      .from('consent_documents')
      .update({
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, template:consent_templates(*)')
      .single();

    if (error) throw error;
    return document as ConsentDocument;
  }

  async checkValidConsent(petId: string, templateCode: string): Promise<boolean> {
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
  }

  async getTemplateValidityInfo(templateId: string): Promise<{ validity_days?: number; default_expiry_days?: number } | null> {
    const { data, error } = await this.supabase
      .from('consent_templates')
      .select('validity_days, default_expiry_days')
      .eq('id', templateId)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data;
  }

  async getDocumentWithTemplate(documentId: string): Promise<{ tenant_id: string; template: { can_be_revoked: boolean }[] | null } | null> {
    const { data, error } = await this.supabase
      .from('consent_documents')
      .select('tenant_id, template:consent_templates(can_be_revoked)')
      .eq('id', documentId)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data;
  }

  async getBlanketConsents(tenantId: string, clientId: string): Promise<ConsentDocument[]> {
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
  }

  // ==========================================================================
  // PREFERENCE OPERATIONS
  // ==========================================================================

  async getUserPreferences(userId: string, tenantId: string): Promise<ConsentPreference[]> {
    const { data, error } = await this.supabase
      .from('consent_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('consent_type');

    if (error) throw error;
    return data as ConsentPreference[];
  }

  async hasPreferenceConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentPreferenceType
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('has_consent', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_consent_type: consentType,
    });

    if (error) throw error;
    return data as boolean;
  }

  async upsertPreference(
    userId: string,
    tenantId: string,
    consentType: ConsentPreferenceType,
    data: UpdatePreferenceData
  ): Promise<ConsentPreference> {
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
  }

  async bulkUpsertPreferences(
    userId: string,
    tenantId: string,
    preferences: Array<{
      consent_type: ConsentPreferenceType;
      granted: boolean;
    }>,
    source: ConsentSource = 'settings'
  ): Promise<ConsentPreference[]> {
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
  }

  async getPreferenceAuditHistory(userId: string, tenantId: string): Promise<ConsentPreferenceAudit[]> {
    const { data, error } = await this.supabase
      .from('consent_preference_audit')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data as ConsentPreferenceAudit[];
  }

  async getConsentAnalytics(tenantId: string): Promise<ConsentAnalytics[]> {
    const { data, error } = await this.supabase.rpc('get_consent_analytics', {
      p_tenant_id: tenantId,
    });

    if (error) throw error;
    return data as ConsentAnalytics[];
  }

  // ==========================================================================
  // AUDIT OPERATIONS
  // ==========================================================================

  async logDocumentAction(
    tenantId: string,
    documentId: string,
    action: ConsentAuditAction,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await this.supabase.from('consent_audit_log').insert({
      tenant_id: tenantId,
      document_id: documentId,
      action,
      metadata,
    });

    if (error) throw error;
  }

  async getDocumentAuditLog(documentId: string): Promise<ConsentAuditLog[]> {
    const { data, error } = await this.supabase
      .from('consent_audit_log')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ConsentAuditLog[];
  }
}