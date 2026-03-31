/**
 * Privacy Policy Types
 *
 * COMP-002: Type definitions for privacy policy management
 */

/**
 * Privacy policy status
 */
export type PrivacyPolicyStatus = 'draft' | 'published' | 'archived'

/**
 * Supported languages for privacy policy
 */
export type PrivacyLanguage = 'es' | 'en'

/**
 * A version of the privacy policy
 */
export interface PrivacyPolicy {
  id: string
  tenantId: string
  version: string
  status: PrivacyPolicyStatus
  effectiveDate: string
  expiresAt?: string

  // Content in multiple languages
  contentEs: string // Spanish version (required)
  contentEn?: string // English version (optional)

  // Change summary for user notification
  changeSummary: string[]

  // Whether this version requires users to re-accept
  requiresReacceptance: boolean

  // Previous version reference
  previousVersionId?: string

  // Metadata
  createdBy: string
  createdAt: string
  publishedAt?: string
  publishedBy?: string
}

/**
 * User's acceptance of a privacy policy version
 */
export interface PrivacyAcceptance {
  id: string
  userId: string
  tenantId: string
  policyId: string
  policyVersion: string
  acceptedAt: string

  // Audit trail
  ipAddress?: string
  userAgent?: string

  // Optional acceptance context
  acceptanceMethod: AcceptanceMethod
  locationContext?: string // e.g., "registration", "policy_update", "manual"
}

/**
 * Methods by which a user can accept the policy
 */
export type AcceptanceMethod =
  | 'checkbox' // Explicit checkbox during registration
  | 'button' // "Accept" button on modal
  | 'implicit' // Continued use after notification
  | 'api' // Programmatic acceptance

/**
 * Input for creating a new privacy policy version
 */
export interface CreatePrivacyPolicyInput {
  version: string
  effectiveDate: string
  contentEs: string
  contentEn?: string
  changeSummary: string[]
  requiresReacceptance: boolean
  previousVersionId?: string
}

/**
 * Input for updating a draft policy
 */
export interface UpdatePrivacyPolicyInput {
  version?: string
  effectiveDate?: string
  contentEs?: string
  contentEn?: string
  changeSummary?: string[]
  requiresReacceptance?: boolean
}

/**
 * Input for accepting a policy
 */
export interface AcceptPolicyInput {
  policyId: string
  acceptanceMethod: AcceptanceMethod
  locationContext?: string
}

/**
 * Response for checking user's acceptance status
 */
export interface AcceptanceStatus {
  hasAccepted: boolean
  acceptedVersion?: string
  acceptedAt?: string
  currentVersion: string
  needsReacceptance: boolean
  policy?: PrivacyPolicy
}

/**
 * Privacy policy with acceptance stats (for admin views)
 */
export interface PrivacyPolicyWithStats extends PrivacyPolicy {
  acceptanceCount: number
  acceptanceRate: number
  totalUsers: number
}

/**
 * Acceptance report entry
 */
export interface AcceptanceReportEntry {
  userId: string
  userEmail: string
  userName: string
  policyVersion: string
  acceptedAt: string
  acceptanceMethod: AcceptanceMethod
}

/**
 * Privacy policy comparison for showing differences
 */
export interface PolicyComparison {
  currentVersion: string
  previousVersion: string
  changes: PolicyChange[]
}

/**
 * Individual change between policy versions
 */
export interface PolicyChange {
  type: 'added' | 'removed' | 'modified'
  section: string
  description: string
}

/**
 * Default policy content template
 */
export const DEFAULT_POLICY_SECTIONS = {
  introduction: 'Introducción',
  dataCollected: 'Datos que recopilamos',
  howWeUseData: 'Cómo utilizamos sus datos',
  dataSharing: 'Compartición de datos',
  dataRetention: 'Retención de datos',
  userRights: 'Sus derechos',
  cookies: 'Cookies y tecnologías similares',
  security: 'Seguridad de datos',
  children: 'Privacidad de menores',
  changes: 'Cambios a esta política',
  contact: 'Contacto',
} as const

/**
 * Version format regex (semver-like)
 */
export const VERSION_REGEX = /^\d+\.\d+(\.\d+)?$/

/**
 * Validate version string format
 */
export function isValidVersion(version: string): boolean {
  return VERSION_REGEX.test(version)
}

/**
 * Compare two versions (returns -1, 0, or 1)
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  const maxLength = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0

    if (numA < numB) return -1
    if (numA > numB) return 1
  }

  return 0
}

/**
 * Increment version (minor bump)
 */
export function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number)

  if (parts.length === 2) {
    parts[1]++
  } else if (parts.length === 3) {
    parts[2]++
  } else {
    parts.push(1)
  }

  return parts.join('.')
}
