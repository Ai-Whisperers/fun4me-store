/**
 * Clinic Configuration Types - Barrel Export
 *
 * This file re-exports all types from the split modules for backward compatibility.
 * Import from '@/lib/types/clinic-config' or '@/lib/types/clinic-config.ts' (legacy)
 */

// Labels
export * from './labels'
export * from './dashboard-labels'
export * from './ui-labels'

// Config
export * from './config'

// Theme
export * from './theme'

// Content
export * from './content'

// ============================================================================
// Complete Clinic Data Type
// ============================================================================

import type { ClinicConfig } from './config'
import type { ClinicTheme } from './theme'
import type { ClinicImages, HomeData, ServicesData, AboutData, TestimonialsData, FaqData, LegalData } from './content'

export interface ClinicData {
  config: ClinicConfig
  theme: ClinicTheme
  images?: ClinicImages
  home: HomeData
  services: ServicesData
  about: AboutData
  testimonials?: TestimonialsData
  faq?: FaqData
  legal?: LegalData
}
