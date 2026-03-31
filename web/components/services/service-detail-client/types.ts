/**
 * Service Detail Client Types
 *
 * Shared type definitions for service detail page components.
 */

import type { Service, ServiceVariant, PetForService } from '@/lib/types/services'

export interface ServiceDetailConfig {
  name: string
  contact: {
    whatsapp_number?: string
  }
  ui_labels?: {
    services?: {
      description_label?: string
      includes_label?: string
      table_variant?: string
      table_price?: string
    }
  }
}

/** Minimal service info for navigation */
export interface ServiceNavItem {
  id: string
  title: string
  icon?: string
}

export interface ServiceDetailClientProps {
  service: Service
  allServices: ServiceNavItem[]
  config: ServiceDetailConfig
  clinic: string
  isLoggedIn: boolean
}

export interface PriceInfo {
  basePrice: number
  petPrices: Array<{ petId: string; petName: string; petSize: string; price: number }>
  totalPrice: number
  isSizeDependent: boolean
}

export type CalculatedPrices = Record<string, PriceInfo>

// Re-export for convenience
export type { Service, ServiceVariant, PetForService }
