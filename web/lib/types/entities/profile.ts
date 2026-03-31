/**
 * Profile Entity Types - Single Source of Truth
 *
 * This file contains the canonical Profile type and all derived variants.
 * Import from here instead of defining inline types.
 *
 * @example
 * ```typescript
 * import type { Profile, ProfileSummary, StaffProfile } from '@/lib/types/entities/profile'
 * ```
 */

// =============================================================================
// BASE PROFILE TYPE (Database Entity)
// =============================================================================

/**
 * User role in the system
 */
export type UserRole = 'owner' | 'vet' | 'admin'

/**
 * Base Profile entity - matches database schema exactly
 */
export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  secondary_phone: string | null
  role: UserRole
  tenant_id: string | null
  avatar_url: string | null
  // Owner-specific fields
  address: string | null
  city: string | null
  client_code: string | null
  document_type: string | null
  document_number: string | null
  preferred_contact: string | null
  notes: string | null
  // Staff-specific fields
  signature_url: string | null
  license_number: string | null
  specializations: string[] | null
  bio: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// =============================================================================
// DERIVED TYPES
// =============================================================================

/**
 * Minimal profile reference - for dropdowns, mentions
 */
export type ProfileSummary = Pick<Profile, 'id' | 'full_name' | 'email'>

/**
 * Profile with avatar - for cards, lists
 */
export type ProfileWithAvatar = Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>

/**
 * Client profile - pet owner information
 */
export interface ClientProfile extends Profile {
  pets?: Array<{
    id: string
    name: string
    species: string
  }>
  total_pets?: number
  last_visit?: string | null
}

/**
 * Staff profile - vet/admin information
 * Note: license_number and specializations already in base Profile
 */
export interface StaffProfile extends Profile {
  schedule?: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
}

/**
 * Form data for creating/updating a profile
 */
export type ProfileFormData = Omit<Profile, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>

/**
 * Data for inviting a new user
 */
export interface InviteUserInput {
  email: string
  role: UserRole
  full_name?: string
}

/**
 * Profile for authentication context
 */
export interface AuthProfile {
  id: string
  tenant_id: string
  role: UserRole
  full_name: string
  email: string | null
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if profile is staff (vet or admin)
 */
export function isStaff(profile: { role: UserRole } | null | undefined): boolean {
  return profile?.role === 'vet' || profile?.role === 'admin'
}

/**
 * Check if profile is admin
 */
export function isAdmin(profile: { role: UserRole } | null | undefined): boolean {
  return profile?.role === 'admin'
}

/**
 * Check if profile is pet owner
 */
export function isOwner(profile: { role: UserRole } | null | undefined): boolean {
  return profile?.role === 'owner'
}

/**
 * Get role display label
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Propietario',
    vet: 'Veterinario',
    admin: 'Administrador',
  }
  return labels[role] || role
}
