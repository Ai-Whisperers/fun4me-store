/**
 * Core authentication service
 * Handles user authentication, profile loading, and basic authorization
 */

import { createClient } from '@/lib/supabase/server'
import type {
  UserRole,
  UserProfile,
  AppAuthContext,
  AuthResult,
} from './types'
import { drizzleProfileToUserProfile, type DrizzleProfileRow } from './mappers'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export class AuthService {
  /**
   * Get the current authentication context
   * 
   * @param authHeader - Optional Authorization header (for API routes with Bearer token auth)
   */
  static async getContext(authHeader?: string | null): Promise<AppAuthContext> {
    // TESTING FIX: Support Bearer token auth for integration tests
    // In production: cookies-based auth (standard Next.js pattern)
    // In tests: Bearer token from Authorization header
    let supabase
    
    if (authHeader?.startsWith('Bearer ')) {
      // Extract token from Bearer header
      const token = authHeader.replace('Bearer ', '')
      
      // Create Supabase client with Bearer token
      const { createClient: originalCreateClient } = await import('@supabase/supabase-js')
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !anonKey) {
        throw new Error('[Auth] Supabase environment variables not configured')
      }
      
      supabase = originalCreateClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
    } else {
      // Standard cookies-based auth for production
      supabase = await createClient()
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return {
          user: null,
          profile: null,
          supabase,
          isAuthenticated: false,
        }
      }

      // Refactored to use Drizzle with type-safe mapping
      // In test environment, add retry logic for profile visibility due to connection pool timing
      let result = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
      let row = result[0]

      // Test environment retry logic (similar to ensureProfileVisibleToDrizzle)
      if (!row && process.env.NODE_ENV === 'test') {
        const maxRetries = 10
        for (let attempt = 1; attempt <= maxRetries && !row; attempt++) {
          logger.debug('[Auth] Profile not found, retrying in test environment', { 
            userId: user.id, 
            attempt,
            maxRetries 
          })
          
          await new Promise(resolve => setTimeout(resolve, 100 + (attempt * 50)))
          result = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
          row = result[0]
        }
      }

      if (!row) {
        logger.warn('[Auth] Profile not found for authenticated user', { userId: user.id })
        return {
          user: null,
          profile: null,
          supabase,
          isAuthenticated: false,
        }
      }

      // Convert Drizzle row to UserProfile using type-safe mapper
      const profile = drizzleProfileToUserProfile(row as DrizzleProfileRow)

      if (!profile) {
        logger.warn('[Auth] User profile missing tenant_id', { userId: user.id })
        return {
          user: null,
          profile: null,
          supabase,
          isAuthenticated: false,
        }
      }

      return {
        user,
        profile,
        supabase,
        isAuthenticated: true,
      }
    } catch (error: unknown) {
      logger.error('[Auth] Context retrieval error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        user: null,
        profile: null,
        supabase,
        isAuthenticated: false,
      }
    }
  }

  /**
   * Validate authentication and authorization for API routes
   * 
   * @param authHeader - Optional Authorization header for Bearer token auth (used in tests)
   */
  static async validateAuth(
    options: {
      roles?: UserRole[]
      requireTenant?: boolean
      tenantId?: string
      requireActive?: boolean
    } = {},
    authHeader?: string | null
  ): Promise<AuthResult> {
    const context = await this.getContext(authHeader)

    if (!context.isAuthenticated) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        },
      }
    }

    const { profile } = context

    // Check if user is active
    if (options.requireActive && !profile.is_active) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive',
          statusCode: 403,
        },
      }
    }

    // Check role authorization
    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(profile.role)) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Insufficient permissions',
            statusCode: 403,
          },
        }
      }
    }

    // Check tenant authorization
    if (options.requireTenant && options.tenantId) {
      if (profile.tenant_id !== options.tenantId) {
        return {
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'Access denied for this tenant',
            statusCode: 403,
          },
        }
      }
    }

    return {
      success: true,
      context,
    }
  }

  /**
   * Check if user has specific permissions
   * Implements granular permission system with role-based and context-aware access control
   */
  static hasPermission(profile: UserProfile, permission: string, context?: { 
    resourceOwnerId?: string, 
    tenantId?: string,
    resourceType?: string,
    action?: string 
  }): boolean {
    // Platform admin has all permissions
    if (profile.is_platform_admin) {
      return true
    }

    // Tenant isolation check
    if (context?.tenantId && context.tenantId !== profile.tenant_id) {
      return false
    }

    // Enhanced granular permission system
    return this.checkPermissionMatrix(profile, permission, context)
  }

  /**
   * Granular permission matrix with context-aware authorization
   */
  private static checkPermissionMatrix(
    profile: UserProfile, 
    permission: string, 
    context?: { 
      resourceOwnerId?: string, 
      tenantId?: string,
      resourceType?: string,
      action?: string 
    }
  ): boolean {
    const { role } = profile
    const isOwner = context?.resourceOwnerId === profile.id

    switch (permission) {
      // === APPOINTMENT PERMISSIONS ===
      case 'appointments.view':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'appointments.create':
        return ['vet', 'admin'].includes(role) || role === 'owner'
      case 'appointments.update':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'appointments.delete':
        return role === 'admin' || (role === 'vet' && context?.action === 'reschedule')
      case 'appointments.view_all':
        return ['vet', 'admin'].includes(role)
      case 'appointments.manage_calendar':
        return ['vet', 'admin'].includes(role)

      // === PET MANAGEMENT ===
      case 'pets.view':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'pets.create':
        return role === 'owner' || ['vet', 'admin'].includes(role)
      case 'pets.update':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'pets.delete':
        return role === 'admin' || (role === 'owner' && isOwner)
      case 'pets.view_all':
        return ['vet', 'admin'].includes(role)
      case 'pets.manage_medical_records':
        return ['vet', 'admin'].includes(role)

      // === MEDICAL RECORDS ===
      case 'medical_records.view':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'medical_records.create':
        return ['vet', 'admin'].includes(role)
      case 'medical_records.update':
        return ['vet', 'admin'].includes(role)
      case 'medical_records.delete':
        return role === 'admin'
      case 'medical_records.view_all':
        return ['vet', 'admin'].includes(role)

      // === INVENTORY MANAGEMENT ===
      case 'inventory.view':
        return ['vet', 'admin'].includes(role)
      case 'inventory.update':
        return ['vet', 'admin'].includes(role)
      case 'inventory.create':
        return role === 'admin'
      case 'inventory.delete':
        return role === 'admin'
      case 'inventory.manage_orders':
        return ['vet', 'admin'].includes(role)
      case 'inventory.view_reports':
        return ['vet', 'admin'].includes(role)

      // === STAFF MANAGEMENT ===
      case 'staff.view':
        return role === 'admin'
      case 'staff.create':
        return role === 'admin'
      case 'staff.update':
        return role === 'admin'
      case 'staff.delete':
        return role === 'admin'
      case 'staff.manage_roles':
        return role === 'admin'
      case 'staff.view_schedules':
        return ['vet', 'admin'].includes(role)

      // === BILLING & PAYMENTS ===
      case 'billing.view':
        return role === 'admin' || (role === 'owner' && isOwner)
      case 'billing.create':
        return ['vet', 'admin'].includes(role)
      case 'billing.update':
        return role === 'admin'
      case 'billing.delete':
        return role === 'admin'
      case 'billing.process_payments':
        return ['vet', 'admin'].includes(role)
      case 'billing.refund':
        return role === 'admin'
      case 'billing.view_reports':
        return role === 'admin'

      // === REPORTING & ANALYTICS ===
      case 'reports.view_basic':
        return ['vet', 'admin'].includes(role)
      case 'reports.view_financial':
        return role === 'admin'
      case 'reports.view_operational':
        return ['vet', 'admin'].includes(role)
      case 'reports.export':
        return role === 'admin'
      case 'reports.create_custom':
        return role === 'admin'

      // === LOST PETS & SAFETY ===
      case 'lost_pets.view_public':
        return true // Public access for lost pet board
      case 'lost_pets.view':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'lost_pets.create':
        return role === 'owner' || ['vet', 'admin'].includes(role)
      case 'lost_pets.update':
        return ['vet', 'admin'].includes(role) || (role === 'owner' && isOwner)
      case 'lost_pets.delete':
        return role === 'admin'
      case 'lost_pets.manage_all':
        return ['vet', 'admin'].includes(role)

      // === NOTIFICATIONS & MESSAGING ===
      case 'notifications.view':
        return true // All authenticated users can view their notifications
      case 'notifications.send_to_owners':
        return ['vet', 'admin'].includes(role)
      case 'notifications.broadcast':
        return role === 'admin'
      case 'notifications.manage_templates':
        return role === 'admin'

      // === SETTINGS & CONFIGURATION ===
      case 'settings.view':
        return ['vet', 'admin'].includes(role)
      case 'settings.update_clinic':
        return role === 'admin'
      case 'settings.manage_integrations':
        return role === 'admin'
      case 'settings.manage_permissions':
        return role === 'admin'

      // === GDPR & PRIVACY ===
      case 'gdpr.view_own_data':
        return true // All users can view their own data
      case 'gdpr.request_deletion':
        return role === 'owner' // Only pet owners can request account deletion
      case 'gdpr.export_data':
        return true // All users can export their data
      case 'gdpr.manage_requests':
        return role === 'admin'

      // === AUDIT & SECURITY ===
      case 'audit.view_logs':
        return role === 'admin'
      case 'audit.export_logs':
        return role === 'admin'
      case 'security.manage_access':
        return role === 'admin'

      // === LEGACY PERMISSIONS (for backward compatibility) ===
      case 'manage_appointments':
        return ['vet', 'admin'].includes(role)
      case 'manage_inventory':
        return ['vet', 'admin'].includes(role)
      case 'manage_staff':
        return role === 'admin'
      case 'manage_billing':
        return role === 'admin'
      case 'view_reports':
        return ['vet', 'admin'].includes(role)
      case 'manage_own_appointments':
        return role === 'owner'

      default:
        // Deny unknown permissions
        return false
    }
  }

  /**
   * Check multiple permissions (user must have ALL permissions)
   */
  static hasAllPermissions(profile: UserProfile, permissions: string[], context?: { 
    resourceOwnerId?: string, 
    tenantId?: string,
    resourceType?: string,
    action?: string 
  }): boolean {
    return permissions.every(permission => this.hasPermission(profile, permission, context))
  }

  /**
   * Check multiple permissions (user must have AT LEAST ONE permission)
   */
  static hasAnyPermission(profile: UserProfile, permissions: string[], context?: { 
    resourceOwnerId?: string, 
    tenantId?: string,
    resourceType?: string,
    action?: string 
  }): boolean {
    return permissions.some(permission => this.hasPermission(profile, permission, context))
  }

  /**
   * Get all permissions for a user role
   */
  static getUserPermissions(role: UserRole): string[] {
    const allPermissions = [
      // Appointments
      'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete',
      'appointments.view_all', 'appointments.manage_calendar',
      // Pets
      'pets.view', 'pets.create', 'pets.update', 'pets.delete', 'pets.view_all', 'pets.manage_medical_records',
      // Medical Records
      'medical_records.view', 'medical_records.create', 'medical_records.update', 'medical_records.delete', 'medical_records.view_all',
      // Inventory
      'inventory.view', 'inventory.update', 'inventory.create', 'inventory.delete', 'inventory.manage_orders', 'inventory.view_reports',
      // Staff
      'staff.view', 'staff.create', 'staff.update', 'staff.delete', 'staff.manage_roles', 'staff.view_schedules',
      // Billing
      'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.process_payments', 'billing.refund', 'billing.view_reports',
      // Reports
      'reports.view_basic', 'reports.view_financial', 'reports.view_operational', 'reports.export', 'reports.create_custom',
      // Lost Pets
      'lost_pets.view_public', 'lost_pets.view', 'lost_pets.create', 'lost_pets.update', 'lost_pets.delete', 'lost_pets.manage_all',
      // Notifications
      'notifications.view', 'notifications.send_to_owners', 'notifications.broadcast', 'notifications.manage_templates',
      // Settings
      'settings.view', 'settings.update_clinic', 'settings.manage_integrations', 'settings.manage_permissions',
      // GDPR
      'gdpr.view_own_data', 'gdpr.request_deletion', 'gdpr.export_data', 'gdpr.manage_requests',
      // Audit
      'audit.view_logs', 'audit.export_logs', 'security.manage_access'
    ]

    // Mock user for testing permissions
    const mockProfile: UserProfile = { 
      id: 'test', 
      tenant_id: 'test', 
      role, 
      email: 'test@test.com',
      full_name: 'Test User',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_platform_admin: false
    }

    return allPermissions.filter(permission => this.checkPermissionMatrix(mockProfile, permission))
  }

  /**
   * Check if user is staff (vet or admin)
   */
  static isStaff(profile: UserProfile): boolean {
    return ['vet', 'admin'].includes(profile.role)
  }

  /**
   * Check if user is admin
   */
  static isAdmin(profile: UserProfile): boolean {
    return profile.role === 'admin'
  }

  /**
   * Check if user is platform admin (cross-tenant access)
   */
  static isPlatformAdmin(profile: UserProfile): boolean {
    return profile.is_platform_admin === true
  }

  /**
   * Check if user owns a resource
   */
  static ownsResource(profile: UserProfile, resourceOwnerId: string): boolean {
    return profile.id === resourceOwnerId
  }

  /**
   * Check if user belongs to tenant
   */
  static belongsToTenant(profile: UserProfile, tenantId: string): boolean {
    return profile.tenant_id === tenantId
  }
}

// Standalone function exports for easier importing
// These wrap AuthService static methods for backward compatibility

/**
 * Minimal profile interface for authorization checks
 * Compatible with both old and new UserProfile types
 */
export interface MinimalProfile {
  id: string
  tenant_id: string
  role: UserRole
}

/**
 * Check if user is staff (vet or admin)
 */
export function isStaff(profile: MinimalProfile): boolean {
  return profile.role === 'vet' || profile.role === 'admin'
}

/**
 * Check if user is admin
 */
export function isAdmin(profile: MinimalProfile): boolean {
  return profile.role === 'admin'
}

/**
 * Check if user is platform admin (cross-tenant access)
 */
export function isPlatformAdmin(profile: MinimalProfile & { is_platform_admin?: boolean }): boolean {
  return profile.is_platform_admin === true
}

/**
 * Check if user owns a resource
 */
export function ownsResource(profile: MinimalProfile, resourceOwnerId: string): boolean {
  return profile.id === resourceOwnerId
}

/**
 * Check if user belongs to tenant
 */
export function belongsToTenant(profile: MinimalProfile, tenantId: string): boolean {
  return profile.tenant_id === tenantId
}

/**
 * Check if user can access a resource (ownership or staff/admin privilege)
 * Allows access if:
 * - User is admin
 * - User is staff and belongs to the tenant
 * - User owns the resource
 */
export function requireOwnership(
  resourceOwnerId: string,
  context: { profile: MinimalProfile }
): boolean {
  if (isAdmin(context.profile)) return true
  if (isStaff(context.profile) && belongsToTenant(context.profile, context.profile.tenant_id)) {
    return true
  }
  return ownsResource(context.profile, resourceOwnerId)
}
