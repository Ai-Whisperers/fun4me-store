/**
 * Pet Size Classification Utility
 *
 * Classifies pets into size categories based on weight for service pricing.
 * Vets define explicit prices per size - no automatic calculations.
 */

export type PetSizeCategory = 'mini' | 'pequeño' | 'mediano' | 'grande' | 'gigante'

/**
 * Size pricing structure - explicit prices defined by vets
 */
export interface SizePricing {
  /** If set, this price applies to ALL sizes (overrides per-size prices) */
  any_size?: number | null
  /** Price for mini size (0-5 kg) */
  mini?: number | null
  /** Price for pequeño size (5-10 kg) */
  pequeño?: number | null
  /** Price for mediano size (10-25 kg) */
  mediano?: number | null
  /** Price for grande size (25-40 kg) */
  grande?: number | null
  /** Price for gigante size (40+ kg) */
  gigante?: number | null
}

/**
 * Weight ranges for each size category (in kg)
 */
export const SIZE_WEIGHT_RANGES: Record<PetSizeCategory, { min: number; max: number }> = {
  mini: { min: 0, max: 5 },
  pequeño: { min: 5, max: 10 },
  mediano: { min: 10, max: 25 },
  grande: { min: 25, max: 40 },
  gigante: { min: 40, max: Infinity },
}

/**
 * Human-readable labels for each size category (Spanish)
 */
export const SIZE_LABELS: Record<PetSizeCategory, string> = {
  mini: 'Mini (0-5 kg)',
  pequeño: 'Pequeño (5-10 kg)',
  mediano: 'Mediano (10-25 kg)',
  grande: 'Grande (25-40 kg)',
  gigante: 'Gigante (40+ kg)',
}

/**
 * Short labels for badges/chips
 */
export const SIZE_SHORT_LABELS: Record<PetSizeCategory, string> = {
  mini: 'Mini',
  pequeño: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
  gigante: 'Gigante',
}

/** All size categories in order */
export const ALL_SIZE_CATEGORIES: PetSizeCategory[] = [
  'mini',
  'pequeño',
  'mediano',
  'grande',
  'gigante',
]

/**
 * Classifies a pet into a size category based on weight
 * @param weightKg - Pet weight in kilograms
 * @returns Size category, defaults to 'mediano' if weight is null/undefined
 */
export function classifyPetSize(weightKg: number | null | undefined): PetSizeCategory {
  if (weightKg === null || weightKg === undefined) {
    return 'mediano' // Default for unknown weight
  }

  if (weightKg <= 5) return 'mini'
  if (weightKg <= 10) return 'pequeño'
  if (weightKg <= 25) return 'mediano'
  if (weightKg <= 40) return 'grande'
  return 'gigante'
}

/**
 * Gets the price for a service variant based on pet size
 *
 * Pricing priority:
 * 1. If `any_size` price is set → use that for all sizes
 * 2. Otherwise → use the explicit price for the pet's size
 * 3. If no price found → return null (price not available for this size)
 *
 * @param sizePricing - The size pricing object from the service variant
 * @param petSize - The pet's size category
 * @returns Price for this size, or null if not available
 */
export function getServicePriceForSize(
  sizePricing: SizePricing | undefined | null,
  petSize: PetSizeCategory
): number | null {
  if (!sizePricing) return null

  // If any_size is set, use that for all sizes
  if (sizePricing.any_size !== null && sizePricing.any_size !== undefined) {
    return sizePricing.any_size
  }

  // Get the explicit price for this size
  const price = sizePricing[petSize]
  return price !== null && price !== undefined ? price : null
}

/**
 * Checks if a variant has size-based pricing (different prices per size)
 * @param sizePricing - The size pricing object
 * @returns true if prices vary by size, false if single price for all
 */
export function hasSizeBasedPricing(sizePricing: SizePricing | undefined | null): boolean {
  if (!sizePricing) return false

  // If any_size is set, it's a flat price (not size-based)
  if (sizePricing.any_size !== null && sizePricing.any_size !== undefined) {
    return false
  }

  // Check if any size-specific prices are set
  return ALL_SIZE_CATEGORIES.some(
    (size) => sizePricing[size] !== null && sizePricing[size] !== undefined
  )
}

/**
 * Gets the minimum price from size pricing (for "Desde X" display)
 * @param sizePricing - The size pricing object
 * @returns Minimum price, or null if no prices set
 */
export function getMinPriceFromSizing(sizePricing: SizePricing | undefined | null): number | null {
  if (!sizePricing) return null

  // If any_size is set, that's the only price
  if (sizePricing.any_size !== null && sizePricing.any_size !== undefined) {
    return sizePricing.any_size
  }

  // Find minimum from size-specific prices
  const prices = ALL_SIZE_CATEGORIES.map((size) => sizePricing[size]).filter(
    (p): p is number => p !== null && p !== undefined
  )

  return prices.length > 0 ? Math.min(...prices) : null
}

/**
 * Gets the maximum price from size pricing
 * @param sizePricing - The size pricing object
 * @returns Maximum price, or null if no prices set
 */
export function getMaxPriceFromSizing(sizePricing: SizePricing | undefined | null): number | null {
  if (!sizePricing) return null

  // If any_size is set, that's the only price
  if (sizePricing.any_size !== null && sizePricing.any_size !== undefined) {
    return sizePricing.any_size
  }

  // Find maximum from size-specific prices
  const prices = ALL_SIZE_CATEGORIES.map((size) => sizePricing[size]).filter(
    (p): p is number => p !== null && p !== undefined
  )

  return prices.length > 0 ? Math.max(...prices) : null
}

/**
 * Formats a price for display in Paraguayan Guaraníes
 * @param price - Price in guaraníes
 * @returns Formatted string (e.g., "150.000 Gs")
 */
export function formatPriceGs(price: number | null | undefined): string {
  if (price === null || price === undefined) return '0 Gs'
  return `${price.toLocaleString('es-PY')} Gs`
}

/**
 * Gets the color class for a size badge
 * @param size - Pet size category
 * @returns Tailwind color classes for the badge
 */
export function getSizeBadgeColor(size: PetSizeCategory): string {
  const colors: Record<PetSizeCategory, string> = {
    mini: 'bg-pink-100 text-pink-700',
    pequeño: 'bg-blue-100 text-blue-700',
    mediano: 'bg-green-100 text-green-700',
    grande: 'bg-orange-100 text-orange-700',
    gigante: 'bg-purple-100 text-purple-700',
  }
  return colors[size]
}
