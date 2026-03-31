/**
 * Type-safe mappers for converting between database models and domain types
 *
 * Eliminates unsafe `as unknown as` casts by providing explicit mapping functions
 */

import type { UserProfile, UserRole } from './types'
import { isUserRole } from '@/lib/utils/type-guards'
import { logger } from '@/lib/logger'

/**
 * Drizzle profile row type (camelCase from schema)
 */
export interface DrizzleProfileRow {
  id: string
  tenantId: string | null
  role: string
  fullName: string | null
  email: string | null
  phone?: string | null
  avatarUrl?: string | null
  isPlatformAdmin?: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

/**
 * Supabase profile row type (snake_case from database)
 */
export interface SupabaseProfileRow {
  id: string
  tenant_id: string | null
  role: string
  full_name: string | null
  email: string | null
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  is_platform_admin?: boolean
  created_at: string
  updated_at: string
}

/**
 * Type guard for UserRole
 */
function validateRole(role: string): UserRole {
  if (isUserRole(role)) {
    return role
  }
  // Default to owner if invalid role (shouldn't happen with DB constraints)
  logger.warn('[Auth] Invalid role encountered, defaulting to owner', { invalidRole: role })
  return 'owner'
}

/**
 * Convert Drizzle profile row to UserProfile
 */
export function drizzleProfileToUserProfile(row: DrizzleProfileRow): UserProfile | null {
  // tenant_id is required for UserProfile
  if (!row.tenantId) {
    return null
  }

  return {
    id: row.id,
    tenant_id: row.tenantId,
    role: validateRole(row.role),
    full_name: row.fullName,
    email: row.email,
    phone: row.phone ?? null,
    avatar_url: row.avatarUrl ?? null,
    is_active: true, // Drizzle schema doesn't have is_active column, default to true
    is_platform_admin: row.isPlatformAdmin ?? false,
    created_at: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
    updated_at: typeof row.updatedAt === 'string' ? row.updatedAt : row.updatedAt.toISOString(),
  }
}

/**
 * Convert Supabase profile row to UserProfile
 */
export function supabaseProfileToUserProfile(row: SupabaseProfileRow): UserProfile | null {
  // tenant_id is required for UserProfile
  if (!row.tenant_id) {
    return null
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    role: validateRole(row.role),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    avatar_url: row.avatar_url ?? null,
    is_active: row.is_active ?? true,
    is_platform_admin: row.is_platform_admin ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Validate that a raw object has required profile fields
 */
export function isValidProfileRow(row: unknown): row is SupabaseProfileRow {
  if (typeof row !== 'object' || row === null) {
    return false
  }

  const obj = row as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    (typeof obj.tenant_id === 'string' || obj.tenant_id === null) &&
    typeof obj.role === 'string'
  )
}
