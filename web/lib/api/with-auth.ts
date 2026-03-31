/**
 * Authentication middleware wrapper for API routes
 * ARCH-006: Create Auth Middleware Wrapper
 * Enhanced with rate limiting support
 *
 * @deprecated Use withApiAuth from '@/lib/auth/api-wrapper' instead.
 * This wrapper is maintained for backward compatibility during migration.
 * See: lib/auth/api-wrapper.ts for the new pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from './errors'
import { logger } from '@/lib/logger'
import { rateLimit, RateLimitType } from '@/lib/rate-limit'
import { scopedQueries, ScopedQueries } from '@/lib/supabase/scoped'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile as BaseUserProfile } from '@/lib/auth/types'

/**
 * User profile from the profiles table
 * @deprecated Import UserProfile from '@/lib/auth/types' instead
 */
export type UserProfile = Pick<BaseUserProfile, 'id' | 'tenant_id' | 'role' | 'full_name' | 'email'>

/**
 * Authentication context passed to handlers
 * @deprecated Import AuthContext from '@/lib/auth/types' and use ApiHandlerContext from '@/lib/auth/api-wrapper'
 */
export interface AuthContext {
  /** Authenticated Supabase user */
  user: User
  /** User's profile with tenant and role info */
  profile: UserProfile
  /** Supabase client for database operations */
  supabase: SupabaseClient
  /**
   * Tenant-scoped query builders - automatically filter by tenant_id
   * Use this instead of raw supabase client to ensure tenant isolation
   */
  scoped: ScopedQueries
  /** Request object */
  request: NextRequest
}

/**
 * Options for the withAuth wrapper
 */
export interface WithAuthOptions {
  /**
   * Required roles to access this route
   * If empty or undefined, any authenticated user can access
   */
  roles?: Array<'owner' | 'vet' | 'admin'>
  /**
   * Require a specific tenant ID (from URL params)
   * If true, validates user belongs to that tenant
   */
  requireTenant?: boolean
  /**
   * Rate limit type to apply to this route
   * Options: 'auth' (5/min), 'search' (30/min), 'write' (20/min), 'default' (60/min)
   * If undefined, no rate limiting is applied
   */
  rateLimit?: RateLimitType
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = NextResponse<any>

/**
 * Route context with dynamic params (for routes like /api/[id])
 */
export interface RouteContext<P = Record<string, string>> {
  params: Promise<P>
}

/**
 * Authenticated handler signature for routes without dynamic params
 */
type AuthHandler = (ctx: AuthContext) => Promise<ApiResponse>

/**
 * Authenticated handler signature for routes with dynamic params
 */
type AuthHandlerWithParams<P> = (ctx: AuthContext, context: RouteContext<P>) => Promise<ApiResponse>

/**
 * Wrap an API route handler with authentication and authorization
 *
 * @param handler - The async handler function to wrap
 * @param options - Optional configuration for roles and tenant validation
 * @returns Wrapped handler that validates auth before executing
 *
 * @example
 * ```typescript
 * // Using scoped queries for automatic tenant isolation (RECOMMENDED)
 * export const GET = withAuth(async ({ scoped }) => {
 *   // No need to add .eq('tenant_id', ...) - it's automatic!
 *   const { data } = await scoped.select('pets', '*');
 *   return NextResponse.json(data);
 * });
 *
 * // Raw supabase client still available when needed
 * export const GET = withAuth(async ({ profile, supabase }) => {
 *   const { data } = await supabase
 *     .from('pets')
 *     .select('*')
 *     .eq('tenant_id', profile.tenant_id);
 *   return NextResponse.json(data);
 * });
 *
 * // Route with dynamic params and rate limiting
 * export const DELETE = withAuth(
 *   async ({ scoped }, { params }) => {
 *     const { id } = await params;
 *     await scoped.delete('pets', (q) => q.eq('id', id));
 *     return new NextResponse(null, { status: 204 });
 *   },
 *   { roles: ['admin'], rateLimit: 'write' }
 * );
 *
 * // Staff-only route with financial rate limiting
 * export const POST = withAuth(
 *   async ({ scoped, request }) => {
 *     const body = await request.json();
 *     const { data } = await scoped.insert('invoices', body);
 *     return NextResponse.json(data);
 *   },
 *   { roles: ['vet', 'admin'], rateLimit: 'financial' }
 * );
 * ```
 */
export function withAuth(
  handler: AuthHandler,
  options?: WithAuthOptions
): (request: NextRequest) => Promise<ApiResponse>

export function withAuth<P extends Record<string, string>>(
  handler: AuthHandlerWithParams<P>,
  options?: WithAuthOptions
): (request: NextRequest, context: RouteContext<P>) => Promise<ApiResponse>

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthHandler | AuthHandlerWithParams<P>,
  options?: WithAuthOptions
) {
  return async (request: NextRequest, context?: RouteContext<P>): Promise<ApiResponse> => {
    try {
      // Apply rate limiting first (before auth to prevent DoS)
      if (options?.rateLimit) {
        const rateLimitResult = await rateLimit(request, options.rateLimit)
        if (!rateLimitResult.success) {
          return rateLimitResult.response
        }
      }

      // Create Supabase client
      const supabase = await createClient()

      // Validate user authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return apiError('UNAUTHORIZED', 401)
      }

      // Get user profile with tenant and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id, role, full_name, email')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return apiError('UNAUTHORIZED', 401, {
          details: { reason: 'Profile not found' },
        })
      }

      // Check role authorization
      if (options?.roles && options.roles.length > 0) {
        if (!options.roles.includes(profile.role as UserProfile['role'])) {
          return apiError('INSUFFICIENT_ROLE', 403, {
            details: {
              required: options.roles,
              current: profile.role,
            },
          })
        }
      }

      // Optional: Validate tenant from URL params
      if (options?.requireTenant && context) {
        const resolvedParams = await context.params
        const tenantParam = (resolvedParams as Record<string, string>)?.clinic

        if (tenantParam && tenantParam !== profile.tenant_id) {
          return apiError('FORBIDDEN', 403, {
            details: { reason: 'Tenant mismatch' },
          })
        }
      }

      // Create scoped queries for tenant isolation
      const scoped = scopedQueries(supabase, profile.tenant_id)

      // Execute the wrapped handler
      const authContext: AuthContext = {
        user,
        profile: profile as UserProfile,
        supabase,
        scoped,
        request,
      }

      // Call handler with or without context based on signature
      if (context) {
        return await (handler as AuthHandlerWithParams<P>)(authContext, context)
      }
      return await (handler as AuthHandler)(authContext)
    } catch (error: unknown) {
      logger.error('[API] Route handler error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('SERVER_ERROR', 500)
    }
  }
}

/**
 * Check if user is staff (vet or admin)
 * @deprecated Use AuthService.isStaff() from '@/lib/auth' instead
 */
export { isStaff, isAdmin } from '@/lib/auth/core'

/**
 * Helper to get tenant-filtered query
 */
export function tenantQuery<T extends { tenant_id: string }>(
  supabase: SupabaseClient,
  table: string,
  tenantId: string
) {
  return supabase.from(table).select('*').eq('tenant_id', tenantId)
}
