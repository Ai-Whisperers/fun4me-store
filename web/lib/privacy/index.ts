/**
 * Privacy Policy Module
 *
 * COMP-002: Privacy Policy Automation
 *
 * This module provides comprehensive privacy policy management including:
 * - Policy versioning with draft/publish/archive lifecycle
 * - User acceptance tracking with audit trail
 * - Re-acceptance flow for policy updates
 * - Admin reporting and statistics
 */

// Types
export type {
  PrivacyPolicyStatus,
  PrivacyLanguage,
  PrivacyPolicy,
  PrivacyAcceptance,
  AcceptanceMethod,
  CreatePrivacyPolicyInput,
  UpdatePrivacyPolicyInput,
  AcceptPolicyInput,
  AcceptanceStatus,
  PrivacyPolicyWithStats,
  AcceptanceReportEntry,
  PolicyComparison,
  PolicyChange,
} from './types'

// Type utilities
export {
  DEFAULT_POLICY_SECTIONS,
  VERSION_REGEX,
  isValidVersion,
  compareVersions,
  incrementVersion,
} from './types'

// Policy management services
export {
  getCurrentPolicy,
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  publishPolicy,
  archivePolicy,
} from './policy-service'

// Acceptance services
export {
  getAcceptanceStatus,
  acceptPolicy,
} from './policy-service'

// Admin/reporting services
export {
  getPolicyWithStats,
  getAcceptanceReport,
  comparePolicies,
} from './policy-service'
