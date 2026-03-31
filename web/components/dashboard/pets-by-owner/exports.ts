/**
 * Central export file for PetsByOwner module
 *
 * This file provides a single import point for all components,
 * hooks, types, and utilities from the pets-by-owner module.
 */

// Main component
export { PetsByOwner } from './index'

// Sub-components
export { SearchHeader } from './SearchHeader'
export { OwnerList } from './OwnerList'
export { OwnerListItem } from './OwnerListItem'
export { OwnerDetailsCard } from './OwnerDetailsCard'
export { PetsSection } from './PetsSection'
export { PetCard } from './PetCard'
export { EmptyState } from './EmptyState'

// Custom hooks
export { useOwnerFiltering } from './useOwnerFiltering'

// Utilities
export { formatDate, calculateAge, isClientActive, getSpeciesEmoji } from './utils'

// Types
export type { Pet, Owner, PetsByOwnerProps } from './types'
