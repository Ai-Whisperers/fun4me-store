/**
 * Service Types
 *
 * TypeScript interfaces for the services JSON-CMS schema
 */

import type { PetSizeCategory, SizePricing } from '@/lib/utils/pet-size'

/**
 * Service variant with optional size-based pricing
 *
 * Pricing Model:
 * - If `size_pricing` is NOT set → use `price_value` as single price
 * - If `size_pricing.any_size` is set → use that price for all sizes
 * - If `size_pricing` has per-size prices → use the price for the pet's size
 */
export interface ServiceVariant {
  name: string
  description?: string
  /** Display string for the price (e.g., "60.000 Gs" or "Desde 48.000 Gs") */
  price_display: string
  /** Optional image URL for the specific variant (e.g. icon) */
  image?: string
  /** Base/default price (used when no size pricing is defined) */
  price_value: number
  /**
   * Size-based pricing. If set, prices are looked up by pet size.
   * - `any_size`: Single price for ALL sizes (overrides per-size)
   * - `mini`, `pequeño`, `mediano`, `grande`, `gigante`: Explicit price per size
   */
  size_pricing?: SizePricing
}

/**
 * Service details section
 */
export interface ServiceDetails {
  description?: string
  duration_minutes?: number
  includes?: string[]
}

/**
 * Booking configuration
 */
export interface ServiceBooking {
  online_enabled?: boolean
  emergency_available?: boolean
}

/**
 * Complete service definition (matches services.json structure)
 *
 * Note: Some properties can exist both at root level and nested in `details`.
 * The JSON-CMS may use either format depending on the clinic's configuration.
 */
export interface Service {
  id: string
  visible?: boolean
  category: string
  title: string
  icon?: string
  summary?: string
  image?: string
  /** Direct image URL (alternative to `image`) */
  image_url?: string
  /** Direct description (alternative to `details.description`) */
  description?: string
  /** Direct base price (for simple pricing without variants) */
  base_price?: number
  /** Direct duration (alternative to `details.duration_minutes`) */
  duration_minutes?: number
  details?: ServiceDetails
  variants?: ServiceVariant[]
  booking?: ServiceBooking
}

/**
 * Services JSON file structure
 */
export interface ServicesData {
  meta?: {
    title?: string
    subtitle?: string
  }
  services: Service[]
}

/**
 * Service cart item - extended info for services in cart
 */
export interface ServiceCartItem {
  service_id: string
  service_title: string
  variant_name: string
  pet_id: string
  pet_name: string
  pet_size: PetSizeCategory
  /** The price for this specific size */
  price: number
  /** Whether this variant has size-based pricing */
  has_size_pricing: boolean
}

/**
 * Pet info for service selection
 */
export interface PetForService {
  id: string
  name: string
  species: string
  breed: string | null
  weight_kg: number | null
  photo_url: string | null
  size_category: PetSizeCategory
}

/**
 * Helper type for service selection state
 */
export interface ServiceSelectionState {
  service: Service
  variant: ServiceVariant
  selectedPet: PetForService | null
  calculatedPrice: number
}
