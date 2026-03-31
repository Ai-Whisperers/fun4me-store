/**
 * Consent Domain - Public API
 * 
 * This is the single entry point for the consent domain.
 * All external modules should import from this file only.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Enums & Unions
  ConsentCategory,
  ConsentPreferenceType,
  ConsentSource,
  ConsentDocumentStatus,
  ConsentAuditAction,
  
  // Core Entities
  ConsentTemplate,
  ConsentTemplateVersion,
  ConsentDocument,
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentAuditLog,
  
  // Input & Filter Types
  CreateTemplateData,
  UpdateTemplateData,
  CreateDocumentData,
  SignDocumentData,
  RevokeDocumentData,
  UpdatePreferenceData,
  TemplateFilters,
  DocumentFilters,
  
  // Result Types
  ConsentAnalytics,
  ServiceResult,
} from './types';

// =============================================================================
// CLASS EXPORTS
// =============================================================================

export { ConsentRepository } from './repository';
export { ConsentService } from './service';

// =============================================================================
// CONVENIENCE FACTORY
// =============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { ConsentService } from './service';

/**
 * Create a new ConsentService instance with proper dependency injection
 * 
 * @param supabase - Authenticated Supabase client
 * @returns Configured ConsentService ready to use
 * 
 * @example
 * ```typescript
 * import { createConsentService } from '@/lib/domain/consent';
 * 
 * const supabase = await createClient();
 * const service = createConsentService(supabase);
 * 
 * const result = await service.listTemplates(tenantId);
 * ```
 */
export function createConsentService(supabase: SupabaseClient): ConsentService {
  return new ConsentService(supabase);
}