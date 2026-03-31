/**
 * Consent Service - Business Logic Layer
 *
 * Handles consent operations with business logic and validation.
 * Uses ServiceResult for backward compatibility with legacy service.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ConsentRepository } from './repository';
import { logger } from '@/lib/logger';
import type {
  ConsentTemplate,
  ConsentTemplateVersion,
  ConsentDocument,
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentAuditLog,
  ConsentPreferenceType,
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
  ServiceResult,
} from './types';

export class ConsentService {
  private repository: ConsentRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new ConsentRepository(supabase);
  }

  // ==========================================================================
  // TEMPLATE METHODS
  // ==========================================================================

  /**
   * List consent templates for a tenant
   */
  async listTemplates(
    tenantId: string,
    filters: TemplateFilters = {}
  ): Promise<ServiceResult<ConsentTemplate[]>> {
    try {
      const templates = await this.repository.listTemplates(tenantId, filters);
      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al listar plantillas de consentimiento',
      };
    }
  }

  /**
   * Get a single consent template by ID
   */
  async getTemplate(templateId: string): Promise<ServiceResult<ConsentTemplate>> {
    try {
      const template = await this.repository.getTemplateById(templateId);
      return {
        success: true,
        data: template || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener plantilla de consentimiento',
      };
    }
  }

  /**
   * Get a template by code (useful for programmatic lookups)
   */
  async getTemplateByCode(
    tenantId: string,
    code: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    try {
      const template = await this.repository.getTemplateByCode(tenantId, code);
      return {
        success: true,
        data: template || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener plantilla por código',
      };
    }
  }

  /**
   * Create a new consent template
   */
  async createTemplate(
    tenantId: string,
    data: CreateTemplateData,
    createdBy: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    try {
      const template = await this.repository.createTemplate(tenantId, data, createdBy);
      return {
        success: true,
        data: template,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear plantilla de consentimiento',
      };
    }
  }

  /**
   * Update a consent template (creates new version)
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateData,
    updatedBy: string
  ): Promise<ServiceResult<ConsentTemplate>> {
    try {
      const template = await this.repository.updateTemplate(templateId, data, updatedBy);
      return {
        success: true,
        data: template,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar plantilla de consentimiento',
      };
    }
  }

  /**
   * Soft delete a consent template
   */
  async deleteTemplate(
    templateId: string,
    deletedBy: string
  ): Promise<ServiceResult<void>> {
    try {
      await this.repository.deleteTemplate(templateId, deletedBy);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar plantilla de consentimiento',
      };
    }
  }

  /**
   * Get version history for a template
   */
  async getTemplateVersions(
    templateId: string
  ): Promise<ServiceResult<ConsentTemplateVersion[]>> {
    try {
      const versions = await this.repository.getTemplateVersions(templateId);
      return {
        success: true,
        data: versions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener historial de versiones',
      };
    }
  }

  /**
   * Rollback template to a previous version
   */
  async rollbackTemplate(
    templateId: string,
    targetVersionNumber: number,
    userId: string
  ): Promise<ServiceResult<string>> {
    try {
      const result = await this.repository.rollbackTemplate(templateId, targetVersionNumber, userId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al restaurar versión de plantilla',
      };
    }
  }

  // ==========================================================================
  // DOCUMENT METHODS
  // ==========================================================================

  /**
   * List consent documents for a tenant
   */
  async listDocuments(
    tenantId: string,
    filters: DocumentFilters = {}
  ): Promise<ServiceResult<ConsentDocument[]>> {
    try {
      const documents = await this.repository.listDocuments(tenantId, filters);
      return {
        success: true,
        data: documents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al listar documentos de consentimiento',
      };
    }
  }

  /**
   * Get a single consent document by ID
   */
  async getDocument(documentId: string): Promise<ServiceResult<ConsentDocument>> {
    try {
      const document = await this.repository.getDocumentById(documentId);
      return {
        success: true,
        data: document || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener documento de consentimiento',
      };
    }
  }

  /**
   * Create a new consent document (pending signature)
   */
  async createDocument(
    tenantId: string,
    data: CreateDocumentData
  ): Promise<ServiceResult<ConsentDocument>> {
    try {
      // Get template to check validity
      const templateInfo = await this.repository.getTemplateValidityInfo(data.template_id);
      
      if (!templateInfo) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Calculate expiry date if template has validity
      let expiresAt: string | null = null;
      const validityDays = templateInfo.validity_days || templateInfo.default_expiry_days;
      if (validityDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + validityDays);
        expiresAt = expiry.toISOString();
      }

      const document = await this.repository.createDocument(tenantId, data, expiresAt);
      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear documento de consentimiento',
      };
    }
  }

  /**
   * Sign a consent document
   */
  async signDocument(
    documentId: string,
    data: SignDocumentData
  ): Promise<ServiceResult<ConsentDocument>> {
    try {
      const document = await this.repository.signDocument(documentId, data);

      // Log the signing action
      try {
        await this.repository.logDocumentAction(document.tenant_id, documentId, 'signed', {
          ip_address: data.ip_address,
          user_agent: data.user_agent,
        });
      } catch (logError) {
        // Don't fail the main operation if audit logging fails
        logger.error('[Consent] Failed to log consent action', { action: 'signed', error: logError });
      }

      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al firmar documento de consentimiento',
      };
    }
  }

  /**
   * Revoke a signed consent document
   */
  async revokeDocument(
    documentId: string,
    data: RevokeDocumentData,
    revokedBy: string
  ): Promise<ServiceResult<ConsentDocument>> {
    try {
      // First check if template allows revocation
      const docWithTemplate = await this.repository.getDocumentWithTemplate(documentId);
      
      if (!docWithTemplate) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      const template = docWithTemplate.template?.[0];
      if (!template?.can_be_revoked) {
        return {
          success: false,
          error: 'Este consentimiento no puede ser revocado',
        };
      }

      const document = await this.repository.revokeDocument(documentId, data);

      // Log the revocation
      try {
        await this.repository.logDocumentAction(docWithTemplate.tenant_id, documentId, 'revoked', {
          performed_by: revokedBy,
          reason: data.reason,
        });
      } catch (logError) {
        // Don't fail the main operation if audit logging fails
        logger.error('[Consent] Failed to log consent action', { action: 'revoked', error: logError });
      }

      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al revocar documento de consentimiento',
      };
    }
  }

  /**
   * Mark document as email sent
   */
  async markDocumentSent(
    documentId: string,
    sentBy: string
  ): Promise<ServiceResult<ConsentDocument>> {
    try {
      const document = await this.repository.markDocumentSent(documentId);

      // Log the send action
      try {
        await this.repository.logDocumentAction(document.tenant_id, documentId, 'sent', {
          performed_by: sentBy,
        });
      } catch (logError) {
        // Don't fail the main operation if audit logging fails
        logger.error('[Consent] Failed to log consent action', { action: 'sent', error: logError });
      }

      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al marcar documento como enviado',
      };
    }
  }

  /**
   * Check if a valid consent exists for a pet/template combination
   */
  async hasValidConsent(
    petId: string,
    templateCode: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const hasConsent = await this.repository.checkValidConsent(petId, templateCode);
      return {
        success: true,
        data: hasConsent,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al verificar consentimiento válido',
      };
    }
  }

  // ==========================================================================
  // PREFERENCE METHODS
  // ==========================================================================

  /**
   * Get all consent preferences for a user
   */
  async getUserPreferences(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<ConsentPreference[]>> {
    try {
      const preferences = await this.repository.getUserPreferences(userId, tenantId);
      return {
        success: true,
        data: preferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener preferencias de consentimiento',
      };
    }
  }

  /**
   * Check if user has a specific consent
   */
  async hasPreferenceConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentPreferenceType
  ): Promise<ServiceResult<boolean>> {
    try {
      const hasConsent = await this.repository.hasPreferenceConsent(userId, tenantId, consentType);
      return {
        success: true,
        data: hasConsent,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al verificar consentimiento',
      };
    }
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
    try {
      const preference = await this.repository.upsertPreference(userId, tenantId, consentType, data);
      return {
        success: true,
        data: preference,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar preferencia de consentimiento',
      };
    }
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
    try {
      const updatedPreferences = await this.repository.bulkUpsertPreferences(
        userId,
        tenantId,
        preferences,
        source
      );
      return {
        success: true,
        data: updatedPreferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar preferencias de consentimiento',
      };
    }
  }

  /**
   * Get consent preference audit history for a user
   */
  async getPreferenceAuditHistory(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<ConsentPreferenceAudit[]>> {
    try {
      const history = await this.repository.getPreferenceAuditHistory(userId, tenantId);
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener historial de cambios',
      };
    }
  }

  /**
   * Get consent analytics for a tenant
   */
  async getConsentAnalytics(
    tenantId: string
  ): Promise<ServiceResult<ConsentAnalytics[]>> {
    try {
      const analytics = await this.repository.getConsentAnalytics(tenantId);
      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener análisis de consentimiento',
      };
    }
  }

  // ==========================================================================
  // AUDIT METHODS
  // ==========================================================================

  /**
   * Get audit log for a document
   */
  async getDocumentAuditLog(
    documentId: string
  ): Promise<ServiceResult<ConsentAuditLog[]>> {
    try {
      const auditLog = await this.repository.getDocumentAuditLog(documentId);
      return {
        success: true,
        data: auditLog,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener registro de auditoría',
      };
    }
  }

  // ==========================================================================
  // BLANKET CONSENT METHODS
  // ==========================================================================

  /**
   * Get blanket consents for a client
   */
  async getBlanketConsents(
    tenantId: string,
    clientId: string
  ): Promise<ServiceResult<ConsentDocument[]>> {
    try {
      const consents = await this.repository.getBlanketConsents(tenantId, clientId);
      return {
        success: true,
        data: consents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener consentimientos generales',
      };
    }
  }
}