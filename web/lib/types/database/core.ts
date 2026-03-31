/**
 * Core Database Tables
 * Tenant, Profile, and ClinicInvite types
 */

import type { UserRole } from './enums'

// =============================================================================
// CORE TABLES
// =============================================================================

export interface Tenant {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  secondary_phone: string | null
  role: UserRole
  tenant_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ClinicInvite {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  token: string
  accepted_at: string | null
  created_at: string
}
