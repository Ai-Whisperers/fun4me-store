/**
 * Consent Module
 *
 * COMP-003: Granular consent tracking for user preferences
 *
 * This module provides types, utilities, and services for managing
 * user consent preferences for marketing, data processing, etc.
 */

// Types
export type {
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentStatus,
  ConsentAnalytics,
  ConsentPreferenceWithHistory,
  CreateConsentPreferenceInput,
  UpdateConsentPreferenceInput,
  BulkConsentUpdateInput,
  ConsentType,
  ConsentSource,
} from './types'

// Constants
export {
  CONSENT_TYPES,
  CONSENT_SOURCES,
  CONSENT_DESCRIPTIONS,
  REQUIRED_CONSENT_TYPES,
  OPTIONAL_CONSENT_TYPES,
  MARKETING_CONSENT_TYPES,
} from './types'

// Type guards and utilities
export {
  isValidConsentType,
  isValidConsentSource,
  getAllConsentTypes,
  getConsentLabel,
  getConsentDescription,
  isRequiredConsent,
  isMarketingConsent,
} from './types'

// Service functions
export {
  getUserPreferences,
  getConsentStatus,
  hasConsent,
  getPreference,
  setPreference,
  bulkUpdatePreferences,
  withdrawConsent,
  grantConsent,
  getAuditHistory,
  getConsentAnalytics,
  exportUserConsentData,
  initializeUserPreferences,
} from './preference-service'
