/**
 * Legacy export for backwards compatibility
 *
 * This file has been refactored into a modular structure.
 * See: web/components/dashboard/pets-by-owner/
 *
 * The refactored version provides:
 * - Better separation of concerns
 * - Improved maintainability
 * - Reusable sub-components
 * - Custom hooks for business logic
 * - Type-safe interfaces
 *
 * @deprecated Use the modular version from pets-by-owner/index.tsx
 */

export { PetsByOwner } from './pets-by-owner/index'
export type { Owner, Pet, PetsByOwnerProps } from './pets-by-owner/types'
