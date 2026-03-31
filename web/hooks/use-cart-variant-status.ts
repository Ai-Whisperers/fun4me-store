'use client'

import { useMemo } from 'react'
import { useCart } from '@/context/cart-context'

/**
 * Status of a specific service variant in the cart
 */
export interface VariantCartStatus {
  /** Pet IDs that have this variant in cart */
  petsInCart: string[]
  /** Pet names for display */
  petNames: string[]
  /** Total count of items for this variant */
  count: number
  /** Whether any pets have this variant */
  hasItems: boolean
}

/**
 * Hook to check which pets have a specific service variant in cart
 *
 * @param serviceId - The service ID to check
 * @param variantName - The variant name to check
 * @returns VariantCartStatus with pet info and count
 *
 * @example
 * const { petNames, count, hasItems } = useCartVariantStatus("svc-123", "Baño Completo");
 *
 * // Display: "Ya en carrito: Luna, Max"
 * {hasItems && <span>Ya en carrito: {petNames.join(", ")}</span>}
 */
export function useCartVariantStatus(serviceId: string, variantName: string): VariantCartStatus {
  const { items } = useCart()

  return useMemo(() => {
    // Filter items matching this service + variant
    const matchingItems = items.filter(
      (item) =>
        item.type === 'service' &&
        item.service_id === serviceId &&
        item.variant_name === variantName &&
        item.pet_id &&
        item.pet_name
    )

    // Extract unique pets (avoid duplicates)
    const petMap = new Map<string, string>()
    let totalCount = 0

    for (const item of matchingItems) {
      if (item.pet_id && item.pet_name) {
        petMap.set(item.pet_id, item.pet_name)
        totalCount += item.quantity
      }
    }

    const petsInCart = Array.from(petMap.keys())
    const petNames = Array.from(petMap.values())

    return {
      petsInCart,
      petNames,
      count: totalCount,
      hasItems: petsInCart.length > 0,
    }
  }, [items, serviceId, variantName])
}

/**
 * Hook to check all variants of a service and their cart status
 *
 * @param serviceId - The service ID to check
 * @returns Map of variant name to VariantCartStatus
 */
export function useServiceCartStatus(serviceId: string): Map<string, VariantCartStatus> {
  const { items } = useCart()

  return useMemo(() => {
    const variantMap = new Map<string, VariantCartStatus>()

    // Filter to service items for this service
    const serviceItems = items.filter(
      (item) =>
        item.type === 'service' && item.service_id === serviceId && item.pet_id && item.pet_name
    )

    // Group by variant
    for (const item of serviceItems) {
      const variantName = item.variant_name || 'default'
      const existing = variantMap.get(variantName)

      if (existing) {
        // Add pet if not already in list
        if (item.pet_id && item.pet_name && !existing.petsInCart.includes(item.pet_id)) {
          existing.petsInCart.push(item.pet_id)
          existing.petNames.push(item.pet_name)
        }
        existing.count += item.quantity
      } else {
        variantMap.set(variantName, {
          petsInCart: item.pet_id ? [item.pet_id] : [],
          petNames: item.pet_name ? [item.pet_name] : [],
          count: item.quantity,
          hasItems: true,
        })
      }
    }

    return variantMap
  }, [items, serviceId])
}
