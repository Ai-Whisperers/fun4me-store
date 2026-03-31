/**
 * Clinic Configuration Types
 * Core config structures for clinic settings
 */

import type { UiLabels } from './ui-labels'

// ============================================================================
// Contact & Social
// ============================================================================

export interface ContactInfo {
  whatsapp_number: string
  phone_display: string
  email: string
  address: string
  city?: string
  country?: string
  google_maps_id?: string
  coordinates?: {
    lat: number
    lng: number
  }
  /** Emergency phone number (24h) */
  emergencyPhone?: string
}

export interface SocialLinks {
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
}

export interface HoursInfo {
  weekdays?: string
  saturday?: string
  sunday?: string
  holidays?: string
}

// ============================================================================
// Module Settings
// ============================================================================

export interface ModuleSettings {
  toxic_checker: boolean
  age_calculator: boolean
  growth_charts?: boolean
  vaccine_tracker?: boolean
  qr_tags?: boolean
  loyalty_program?: boolean
  online_store?: boolean
  booking?: boolean
  telemedicine?: boolean
  services_page?: boolean
}

export interface ClinicSettings {
  currency: string
  currency_symbol?: string
  locale?: string
  timezone?: string
  emergency_24h: boolean
  accepts_insurance?: boolean
  insurance_providers?: string[]
  delivery_enabled?: boolean
  delivery_minimum?: number
  delivery_zones?: string[]
  modules: ModuleSettings
  /** Google Sheets template URL for inventory import */
  inventory_template_google_sheet_url?: string | null
  /** BUG-015: Tax rate as decimal (0.1 = 10%). Default 10% (IVA Paraguay) */
  tax_rate?: number
  /** Tax name displayed to customers (e.g., 'IVA', 'VAT') */
  tax_name?: string
  /** Whether prices already include tax */
  is_tax_inclusive?: boolean
  /** Tax identification number (RUC in Paraguay) */
  ruc?: string
}

// ============================================================================
// Branding & Stats
// ============================================================================

export interface BrandingAssets {
  logo_url?: string
  logo_dark_url?: string
  logo_width?: number
  logo_height?: number
  favicon_url?: string
  hero_image_url?: string
  og_image_url?: string
  apple_touch_icon?: string
}

export interface StatsInfo {
  pets_served?: string
  years_experience?: string
  emergency_hours?: string
  rating?: string
}

// ============================================================================
// Complete Clinic Config
// ============================================================================

export interface ClinicConfig {
  id: string
  name: string
  tagline?: string
  contact: ContactInfo
  social?: SocialLinks
  hours?: HoursInfo
  settings: ClinicSettings
  ui_labels: UiLabels
  branding?: BrandingAssets
  stats?: StatsInfo
  /** Module toggles (shortcut, also available in settings.modules) */
  modules?: {
    toxicFoodChecker?: boolean
    ageCalculator?: boolean
    [key: string]: boolean | undefined
  }
}
