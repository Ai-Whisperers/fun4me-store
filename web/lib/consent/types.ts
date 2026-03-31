/**
 * Consent Preference Types
 *
 * COMP-003: Granular consent tracking for user preferences
 *
 * This module defines the consent types for user preference management,
 * separate from the existing procedure-based consent templates.
 */

/**
 * Available consent types for user preferences
 */
export const CONSENT_TYPES = {
  /** Consent for medical treatment of pets */
  MEDICAL_TREATMENT: 'medical_treatment',
  /** Consent for processing personal data */
  DATA_PROCESSING: 'data_processing',
  /** Consent for receiving marketing emails */
  MARKETING_EMAIL: 'marketing_email',
  /** Consent for receiving marketing SMS */
  MARKETING_SMS: 'marketing_sms',
  /** Consent for sharing data with third parties */
  THIRD_PARTY_SHARING: 'third_party_sharing',
  /** Consent for analytics and tracking cookies */
  ANALYTICS_COOKIES: 'analytics_cookies',
  /** Consent for sharing pet photos on social media */
  PHOTO_SHARING: 'photo_sharing',
  /** Consent for receiving WhatsApp messages */
  MARKETING_WHATSAPP: 'marketing_whatsapp',
  /** Consent for receiving push notifications */
  PUSH_NOTIFICATIONS: 'push_notifications',
} as const

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES]

/**
 * Source of consent change
 */
export const CONSENT_SOURCES = {
  /** During user signup */
  SIGNUP: 'signup',
  /** From settings page */
  SETTINGS: 'settings',
  /** During a procedure */
  PROCEDURE: 'procedure',
  /** From cookie banner */
  BANNER: 'banner',
  /** Via API */
  API: 'api',
  /** Bulk import */
  IMPORT: 'import',
} as const

export type ConsentSource = (typeof CONSENT_SOURCES)[keyof typeof CONSENT_SOURCES]

/**
 * User consent preference
 */
export interface ConsentPreference {
  id: string
  userId: string
  tenantId: string
  consentType: ConsentType
  granted: boolean
  grantedAt: string | null
  withdrawnAt: string | null
  source: ConsentSource
  version: number
  createdAt: string
  updatedAt: string
}

/**
 * Consent preference for creation
 */
export interface CreateConsentPreferenceInput {
  consentType: ConsentType
  granted: boolean
  source: ConsentSource
}

/**
 * Consent preference for update
 */
export interface UpdateConsentPreferenceInput {
  granted: boolean
  source: ConsentSource
}

/**
 * Consent audit log entry
 */
export interface ConsentPreferenceAudit {
  id: string
  preferenceId: string
  userId: string
  tenantId: string
  consentType: ConsentType
  oldValue: boolean | null
  newValue: boolean
  source: ConsentSource
  ipAddress: string | null
  userAgent: string | null
  changedAt: string
}

/**
 * Consent status summary for a user
 */
export interface ConsentStatus {
  userId: string
  tenantId: string
  preferences: Record<ConsentType, ConsentPreference | null>
  lastUpdated: string | null
}

/**
 * Consent preference with audit history
 */
export interface ConsentPreferenceWithHistory extends ConsentPreference {
  history: ConsentPreferenceAudit[]
}

/**
 * Bulk consent update input
 */
export interface BulkConsentUpdateInput {
  preferences: Array<{
    consentType: ConsentType
    granted: boolean
  }>
  source: ConsentSource
}

/**
 * Consent analytics summary
 */
export interface ConsentAnalytics {
  tenantId: string
  consentType: ConsentType
  totalUsers: number
  grantedCount: number
  withdrawnCount: number
  neverSetCount: number
  grantRate: number
  changesLast30Days: number
}

/**
 * Default consent descriptions in Spanish
 */
export const CONSENT_DESCRIPTIONS: Record<ConsentType, { label: string; description: string }> = {
  [CONSENT_TYPES.MEDICAL_TREATMENT]: {
    label: 'Tratamiento médico',
    description: 'Autorizo el tratamiento médico de mis mascotas según las recomendaciones del veterinario.',
  },
  [CONSENT_TYPES.DATA_PROCESSING]: {
    label: 'Procesamiento de datos',
    description:
      'Autorizo el procesamiento de mis datos personales para la gestión de citas y servicios veterinarios.',
  },
  [CONSENT_TYPES.MARKETING_EMAIL]: {
    label: 'Correos promocionales',
    description: 'Deseo recibir ofertas, promociones y novedades por correo electrónico.',
  },
  [CONSENT_TYPES.MARKETING_SMS]: {
    label: 'Mensajes SMS',
    description: 'Deseo recibir recordatorios y ofertas por mensaje de texto.',
  },
  [CONSENT_TYPES.THIRD_PARTY_SHARING]: {
    label: 'Compartir con terceros',
    description:
      'Autorizo compartir mis datos con laboratorios y proveedores asociados para mejorar el servicio.',
  },
  [CONSENT_TYPES.ANALYTICS_COOKIES]: {
    label: 'Cookies analíticas',
    description: 'Permito el uso de cookies para analizar el uso del sitio y mejorar la experiencia.',
  },
  [CONSENT_TYPES.PHOTO_SHARING]: {
    label: 'Compartir fotos',
    description: 'Autorizo el uso de fotos de mis mascotas en redes sociales y materiales promocionales.',
  },
  [CONSENT_TYPES.MARKETING_WHATSAPP]: {
    label: 'Mensajes de WhatsApp',
    description: 'Deseo recibir recordatorios y ofertas por WhatsApp.',
  },
  [CONSENT_TYPES.PUSH_NOTIFICATIONS]: {
    label: 'Notificaciones push',
    description: 'Deseo recibir notificaciones push en mi dispositivo.',
  },
}

/**
 * Consent types that are required (cannot be disabled for service to function)
 */
export const REQUIRED_CONSENT_TYPES: ConsentType[] = [
  CONSENT_TYPES.DATA_PROCESSING,
]

/**
 * Consent types that are optional
 */
export const OPTIONAL_CONSENT_TYPES: ConsentType[] = [
  CONSENT_TYPES.MEDICAL_TREATMENT,
  CONSENT_TYPES.MARKETING_EMAIL,
  CONSENT_TYPES.MARKETING_SMS,
  CONSENT_TYPES.THIRD_PARTY_SHARING,
  CONSENT_TYPES.ANALYTICS_COOKIES,
  CONSENT_TYPES.PHOTO_SHARING,
  CONSENT_TYPES.MARKETING_WHATSAPP,
  CONSENT_TYPES.PUSH_NOTIFICATIONS,
]

/**
 * Marketing consent types (for easy bulk toggle)
 */
export const MARKETING_CONSENT_TYPES: ConsentType[] = [
  CONSENT_TYPES.MARKETING_EMAIL,
  CONSENT_TYPES.MARKETING_SMS,
  CONSENT_TYPES.MARKETING_WHATSAPP,
  CONSENT_TYPES.PUSH_NOTIFICATIONS,
]

/**
 * Check if a consent type is valid
 */
export function isValidConsentType(type: string): type is ConsentType {
  return Object.values(CONSENT_TYPES).includes(type as ConsentType)
}

/**
 * Check if a consent source is valid
 */
export function isValidConsentSource(source: string): source is ConsentSource {
  return Object.values(CONSENT_SOURCES).includes(source as ConsentSource)
}

/**
 * Get all consent types
 */
export function getAllConsentTypes(): ConsentType[] {
  return Object.values(CONSENT_TYPES)
}

/**
 * Get consent type label in Spanish
 */
export function getConsentLabel(type: ConsentType): string {
  return CONSENT_DESCRIPTIONS[type]?.label ?? type
}

/**
 * Get consent type description in Spanish
 */
export function getConsentDescription(type: ConsentType): string {
  return CONSENT_DESCRIPTIONS[type]?.description ?? ''
}

/**
 * Check if consent type is required
 */
export function isRequiredConsent(type: ConsentType): boolean {
  return REQUIRED_CONSENT_TYPES.includes(type)
}

/**
 * Check if consent type is marketing related
 */
export function isMarketingConsent(type: ConsentType): boolean {
  return MARKETING_CONSENT_TYPES.includes(type)
}
