/**
 * Centralized authentication and authorization types
 * Provides consistent interfaces across the application
 */

import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'owner' | 'vet' | 'admin'

export interface UserProfile {
  id: string
  tenant_id: string
  role: UserRole
  full_name: string | null
  email: string | null
  phone?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_platform_admin: boolean
  created_at: string
  updated_at: string
}

export interface AuthContext {
  user: User
  profile: UserProfile
  supabase: SupabaseClient
  isAuthenticated: true
}

export interface UnauthenticatedContext {
  user: null
  profile: null
  supabase: SupabaseClient
  isAuthenticated: false
}

export type AppAuthContext = AuthContext | UnauthenticatedContext

export interface AuthOptions {
  roles?: UserRole[]
  requireTenant?: boolean
  requireActive?: boolean
}

export interface Permission {
  resource: string
  action: string
  scope?: 'own' | 'tenant' | 'global'
}

export interface AuthResult {
  success: boolean
  context?: AuthContext
  error?: {
    code: string
    message: string
    statusCode: number
  }
}
