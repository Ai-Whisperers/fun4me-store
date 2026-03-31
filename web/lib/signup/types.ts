/**
 * Clinic Signup Types
 *
 * TypeScript interfaces for the self-service clinic signup system.
 */

import type { TierId } from '@/lib/pricing/tiers'

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Step 1: Clinic Info
 */
export interface ClinicInfoData {
  clinicName: string
  slug: string
  ruc: string | null
}

/**
 * Step 2: Contact Details
 */
export interface ContactData {
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
}

/**
 * Step 3: Admin Account
 */
export interface AdminAccountData {
  adminEmail: string
  adminPassword: string
  adminFullName: string
  referralCode: string | null
}

/**
 * Step 4: Branding
 */
export interface BrandingData {
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}

/**
 * Complete signup form data
 */
export interface SignupFormData
  extends ClinicInfoData,
    ContactData,
    AdminAccountData,
    BrandingData {}

// ============================================================================
// API Types
// ============================================================================

/**
 * POST /api/signup request body
 */
export interface SignupRequest {
  // Clinic Info (Step 1)
  clinicName: string
  slug: string
  ruc: string | null

  // Contact (Step 2)
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string

  // Admin Account (Step 3)
  adminEmail: string
  adminPassword: string
  adminFullName: string

  // Branding (Step 4)
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}

/**
 * POST /api/signup response
 */
export interface SignupResponse {
  success: boolean
  tenantId: string
  redirectUrl: string
  message: string
}

/**
 * Signup error response
 */
export interface SignupErrorResponse {
  success: false
  error: string
  code?: SignupErrorCode
  field?: string
}

/**
 * Error codes for specific error handling
 */
export type SignupErrorCode =
  | 'SLUG_TAKEN'
  | 'EMAIL_EXISTS'
  | 'INVALID_SLUG'
  | 'RESERVED_SLUG'
  | 'INVALID_RUC'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'UPLOAD_FAILED'
  | 'DB_ERROR'
  | 'AUTH_ERROR'
  | 'CONTENT_GENERATION_FAILED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'

/**
 * GET /api/signup/check-slug response
 */
export interface CheckSlugResponse {
  available: boolean
  suggestion: string | null
  reason?: 'taken' | 'reserved' | 'invalid_format'
}

/**
 * POST /api/signup/upload-logo response
 */
export interface UploadLogoResponse {
  success: boolean
  url?: string
  error?: string
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Tenant record to be inserted
 */
export interface TenantInsert {
  id: string
  name: string
  legal_name: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  country: string
  ruc: string | null
  logo_url: string | null

  // Subscription
  subscription_tier: TierId
  is_trial: boolean
  trial_start_date: string
  trial_end_date: string
  billing_cycle: 'monthly' | 'annual'

  // Settings
  settings: TenantSettings
  features_enabled: string[]

  // Metadata
  signup_source: string
  is_active: boolean
}

/**
 * Tenant settings JSONB
 */
export interface TenantSettings {
  currency: string
  timezone: string
  locale: string
}

// ============================================================================
// Content Generation Types
// ============================================================================

/**
 * Input for config.json generation
 */
export interface ConfigGeneratorInput {
  slug: string
  clinicName: string
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
  logoUrl: string | null
}

/**
 * Input for theme.json generation
 */
export interface ThemeGeneratorInput {
  primaryColor: string
  secondaryColor: string
}

/**
 * Color scale (50-950)
 */
export interface ColorScale {
  main: string
  light: string
  dark: string
  contrast: string
  '50': string
  '100': string
  '200': string
  '300': string
  '400': string
  '500': string
  '600': string
  '700': string
  '800': string
  '900': string
  '950': string
  rgb: string
}

// ============================================================================
// Wizard State Types
// ============================================================================

/**
 * Current wizard step (1-5)
 */
export type WizardStep = 1 | 2 | 3 | 4 | 5

/**
 * Wizard step configuration
 */
export interface WizardStepConfig {
  id: WizardStep
  label: string
  description: string
}

/**
 * Complete wizard state
 */
export interface SignupWizardState {
  step: WizardStep
  data: SignupFormData
  errors: Partial<Record<keyof SignupFormData, string>>
  isSubmitting: boolean
  isCheckingSlug: boolean
  isUploadingLogo: boolean
  slugAvailable: boolean | null
}

// ============================================================================
// Paraguay-Specific Types
// ============================================================================

/**
 * Paraguay cities for dropdown
 */
export const PARAGUAY_CITIES = [
  'Asuncion',
  'Ciudad del Este',
  'San Lorenzo',
  'Luque',
  'Capiata',
  'Lambare',
  'Fernando de la Mora',
  'Limpio',
  'Nemby',
  'Encarnacion',
  'Mariano Roque Alonso',
  'Pedro Juan Caballero',
  'Villa Elisa',
  'Caaguazu',
  'Coronel Oviedo',
  'Itaugua',
  'Presidente Franco',
  'Concepcion',
  'Villarrica',
  'Pilar',
] as const

export type ParaguayCity = (typeof PARAGUAY_CITIES)[number]

/**
 * Reserved slugs that cannot be used
 */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'registro',
  'signup',
  'login',
  'logout',
  'platform',
  'dashboard',
  'portal',
  'store',
  'tienda',
  'setup',
  'test',
  'demo',
  'www',
  'mail',
  'ftp',
  'blog',
  'help',
  'support',
  'about',
  'nosotros',
  'pricing',
  'precios',
  'funcionalidades',
  'features',
  'contact',
  'contacto',
  'terms',
  'privacy',
  'legal',
  'static',
  'assets',
  'public',
  '_next',
  'vercel',
] as const

export type ReservedSlug = (typeof RESERVED_SLUGS)[number]

// ============================================================================
// Trial Configuration
// ============================================================================

/**
 * Trial settings
 */
export const TRIAL_CONFIG = {
  /** Trial duration in days */
  durationDays: 90,
  /** Tier given during trial */
  tier: 'profesional' as TierId,
  /** Features enabled during trial */
  features: ['core', 'store', 'booking', 'lab', 'hospitalization'],
} as const
