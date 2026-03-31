/**
 * Unified API route wrapper with centralized authentication
 * Replaces the old withAuth wrapper with improved error handling and consistency
 *
 * Features:
 * - Automatic request-scoped logging with context
 * - Performance tracking with checkpoints
 * - Request ID correlation across logs
 * - Sentry error capture with context
 * - Rate limiting support
 * - Tenant isolation via scoped queries
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './core'
import { apiError, type ApiErrorType } from '@/lib/api/errors'
import type { AuthContext, UserRole } from './types'
import { scopedQueries, type ScopedQueries } from '@/lib/supabase/scoped'
import { rateLimit, type RateLimitType } from '@/lib/rate-limit'
import {
  createRequestLogger,
  createPerformanceTracker,
} from '@/lib/logger'

// Import Sentry conditionally
type SentryType = typeof import('@sentry/nextjs')
let Sentry: SentryType | null = null
import('@sentry/nextjs')
  .then((m) => {
    Sentry = m
  })
  .catch(() => {
    // Sentry not configured
  })

// Type for Sentry span (when Sentry is available)
type SentrySpan = ReturnType<SentryType['startInactiveSpan']>

/**
 * Request-scoped logger type
 */
export type RequestLogger = ReturnType<typeof createRequestLogger>

/**
 * Performance tracker type
 */
export type PerformanceTracker = ReturnType<typeof createPerformanceTracker>

export interface ApiHandlerContext extends AuthContext {
  request: NextRequest
  /**
   * Tenant-scoped query builders - automatically filter by tenant_id
   * Use this instead of raw supabase client to ensure tenant isolation
   */
  scoped: ScopedQueries
  /**
   * Request-scoped logger with automatic context (requestId, tenant, user, etc.)
   * Use this for all logging within API handlers
   */
  log: RequestLogger
  /**
   * Performance tracker for timing checkpoints
   * Call perf.checkpoint('name') to mark timing points
   * Automatically logs duration on response
   */
  perf: PerformanceTracker
  /**
   * Unique request ID for log correlation
   * Also set in response headers as x-request-id
   */
  requestId: string
}

/**
 * API handler context with route params for dynamic routes
 * @template P - The params type (e.g., { id: string })
 */
export type ApiHandlerContextWithParams<P = Record<string, string>> = ApiHandlerContext & {
  params: P
}

export interface ApiRouteOptions {
  roles?: UserRole[]
  requireTenant?: boolean
  requireActive?: boolean
  /** Rate limit type for this endpoint */
  rateLimit?: RateLimitType
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler = (context: ApiHandlerContext) => Promise<NextResponse<any>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandlerWithParams<P> = (context: ApiHandlerContextWithParams<P>) => Promise<NextResponse<any>>

/**
 * Enhanced API route wrapper with centralized authentication
 *
 * @example
 * ```typescript
 * export const GET = withApiAuth(
 *   async ({ profile, supabase, log }) => {
 *     log.info('Fetching pets', { action: 'pets.list' })
 *     const data = await supabase.from('pets').select('*')
 *     return NextResponse.json(data)
 *   },
 *   { roles: ['vet', 'admin'] }
 * )
 * ```
 */
export function withApiAuth(
  handler: ApiHandler,
  options: ApiRouteOptions = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (request: NextRequest) => Promise<NextResponse<any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: NextRequest): Promise<NextResponse<any>> => {
    // Generate unique request ID for log correlation
    const requestId =
      request.headers.get('x-request-id') || crypto.randomUUID()
    const url = new URL(request.url)
    const path = url.pathname

    // Extract client info
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    // Create performance tracker
    const perf = createPerformanceTracker(requestId)

    // Create initial logger (will be enhanced after auth)
    let log = createRequestLogger(request, { requestId })

    // Log request start
    log.debug('API request started', { path, method: request.method })

    // Start Sentry transaction if available
    let sentryTransaction: SentrySpan | null = null
    if (Sentry) {
      sentryTransaction = Sentry.startInactiveSpan({
        name: `${request.method} ${path}`,
        op: 'http.server',
        forceTransaction: true,
      })
    }

    try {
      // Validate authentication
      perf.checkpoint('auth_start')
      
      // TESTING FIX: Extract Bearer token for test environment
      // In tests, auth comes from Authorization header, not cookies
      const authHeader = request.headers.get('authorization')
      const authResult = await AuthService.validateAuth(options, authHeader)
      
      perf.checkpoint('auth_complete')

      if (!authResult.success || !authResult.context) {
        // Non-null assertions safe: !success guarantees error exists
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const errorCode = authResult.error!.code as ApiErrorType
        log.warn('Authentication failed', {
          errorCode,
          statusCode: authResult.error!.statusCode,
          path,
        })

        const response = apiError(errorCode, authResult.error!.statusCode, {
          details: authResult.error,
        })
        response.headers.set('x-request-id', requestId)
        perf.finish({ statusCode: authResult.error!.statusCode })
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        return response
      }

      // Enhance logger with user context
      const { profile, user } = authResult.context
      log = createRequestLogger(request, {
        requestId,
        tenant: profile.tenant_id,
        userId: user.id,
        userRole: profile.role,
        ip,
      })

      // Set Sentry user context
      if (Sentry) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
        })
        Sentry.setTag('tenant', profile.tenant_id)
        Sentry.setTag('userRole', profile.role)
      }

      // Apply rate limiting if configured
      if (options.rateLimit) {
        perf.checkpoint('ratelimit_start')
        const rateLimitResult = await rateLimit(request, options.rateLimit, user.id)
        perf.checkpoint('ratelimit_complete')

        if (!rateLimitResult.success) {
          log.warn('Rate limit exceeded', {
            action: 'rate_limit.exceeded',
            path,
            rateLimit: options.rateLimit,
          })
          const response = rateLimitResult.response
          response.headers.set('x-request-id', requestId)
          perf.finish({ statusCode: 429 })
          return response
        }
      }

      // Set tenant context for optimized RLS performance
      // This enables is_staff_of_fast() to use session variables instead of subqueries
      await authResult.context.supabase.rpc('set_tenant_context', {
        p_tenant_id: profile.tenant_id,
        p_user_role: profile.role,
      })
      perf.checkpoint('tenant_context_set')

      // Execute handler with scoped queries and logging context
      perf.checkpoint('handler_start')
      const context: ApiHandlerContext = {
        ...authResult.context,
        request,
        scoped: scopedQueries(authResult.context.supabase, profile.tenant_id),
        log,
        perf,
        requestId,
      }

      const response = await handler(context)
      perf.checkpoint('handler_complete')

      // Add correlation headers to response
      response.headers.set('x-request-id', requestId)

      // Log success and finalize timing
      const statusCode = response.status
      const duration = perf.finish({ statusCode, path })
      response.headers.set('x-response-time', `${duration}ms`)

      log.info('API request completed', {
        statusCode,
        duration,
        path,
        action: 'request.success',
      })

      // Finish Sentry transaction
      if (sentryTransaction) {
        sentryTransaction.setStatus({ code: statusCode < 400 ? 1 : 2 })
        sentryTransaction.end()
      }

      return response
    } catch (error: unknown) {
      // Log error with full context
      log.error('API route error', {
        error: error instanceof Error ? error : new Error(String(error)),
        path,
        action: 'request.error',
      })

      // Capture in Sentry
      if (Sentry) {
        Sentry.captureException(error)
        if (sentryTransaction) {
          sentryTransaction.setStatus({ code: 2 })
          sentryTransaction.end()
        }
      }

      const duration = perf.finish({ statusCode: 500, path })
      const response = apiError('SERVER_ERROR', 500)
      response && response.headers && response.headers.set('x-request-id', requestId)
      response && response.headers && response.headers.set('x-response-time', `${duration}ms`)
      return response
    }
  }
}

/**
 * API route wrapper for routes with dynamic parameters
 *
 * @example
 * ```typescript
 * export const GET = withApiAuthParams<{ id: string }>(
 *   async ({ params, log }) => {
 *     log.info('Fetching pet', { action: 'pet.get', resourceId: params.id })
 *     const data = await supabase.from('pets').select('*').eq('id', params.id)
 *     return NextResponse.json(data)
 *   },
 *   { roles: ['vet', 'admin'] }
 * )
 * ```
 */
export function withApiAuthParams<P extends Record<string, string>>(
  handler: ApiHandlerWithParams<P>,
  options: ApiRouteOptions & {
    paramName?: keyof P
  } = {}
): (
  request: NextRequest,
  context: { params: Promise<P> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<NextResponse<any>> {
  return async (
    request: NextRequest,
    context: { params: Promise<P> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<NextResponse<any>> => {
    // Generate unique request ID for log correlation
    const requestId =
      request.headers.get('x-request-id') || crypto.randomUUID()
    const url = new URL(request.url)
    const path = url.pathname

    // Extract client info
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    // Create performance tracker
    const perf = createPerformanceTracker(requestId)

    // Create initial logger (will be enhanced after auth)
    let log = createRequestLogger(request, { requestId })

    // Log request start
    log.debug('API request started', { path, method: request.method })

    // Start Sentry transaction if available
    let sentryTransaction: SentrySpan | null = null
    if (Sentry) {
      sentryTransaction = Sentry.startInactiveSpan({
        name: `${request.method} ${path}`,
        op: 'http.server',
        forceTransaction: true,
      })
    }

    try {
      const params = await context.params

      // Extract tenant ID from params if needed
      const tenantId =
        options.requireTenant && options.paramName
          ? (params[options.paramName] as string)
          : undefined

      // Validate authentication
      perf.checkpoint('auth_start')
      
      // TESTING FIX: Extract Bearer token for test environment
      // In tests, auth comes from Authorization header, not cookies
      const authHeader = request.headers.get('authorization')
      const authResult = await AuthService.validateAuth({
        ...options,
        tenantId,
      }, authHeader)
      
      perf.checkpoint('auth_complete')

      if (!authResult.success || !authResult.context) {
        // Non-null assertions safe: !success guarantees error exists
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const errorCode = authResult.error!.code as ApiErrorType
        log.warn('Authentication failed', {
          errorCode,
          statusCode: authResult.error!.statusCode,
          path,
        })

        const response = apiError(errorCode, authResult.error!.statusCode, {
          details: authResult.error,
        })
        response.headers.set('x-request-id', requestId)
        perf.finish({ statusCode: authResult.error!.statusCode })
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        return response
      }

      // Enhance logger with user context
      const { profile, user } = authResult.context
      log = createRequestLogger(request, {
        requestId,
        tenant: profile.tenant_id,
        userId: user.id,
        userRole: profile.role,
        ip,
      })

      // Set Sentry user context
      if (Sentry) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
        })
        Sentry.setTag('tenant', profile.tenant_id)
        Sentry.setTag('userRole', profile.role)
      }

      // Apply rate limiting if configured
      if (options.rateLimit) {
        perf.checkpoint('ratelimit_start')
        const rateLimitResult = await rateLimit(request, options.rateLimit, user.id)
        perf.checkpoint('ratelimit_complete')

        if (!rateLimitResult.success) {
          log.warn('Rate limit exceeded', {
            action: 'rate_limit.exceeded',
            path,
            rateLimit: options.rateLimit,
          })
          const response = rateLimitResult.response
          response.headers.set('x-request-id', requestId)
          perf.finish({ statusCode: 429 })
          return response
        }
      }

      // Set tenant context for optimized RLS performance
      // This enables is_staff_of_fast() to use session variables instead of subqueries
      await authResult.context.supabase.rpc('set_tenant_context', {
        p_tenant_id: profile.tenant_id,
        p_user_role: profile.role,
      })
      perf.checkpoint('tenant_context_set')

      // Execute handler with scoped queries and logging context
      perf.checkpoint('handler_start')
      const handlerContext: ApiHandlerContextWithParams<P> = {
        ...authResult.context,
        request,
        scoped: scopedQueries(authResult.context.supabase, profile.tenant_id),
        params,
        log,
        perf,
        requestId,
      }

      const response = await handler(handlerContext)
      perf.checkpoint('handler_complete')

      // Add correlation headers to response
      response.headers.set('x-request-id', requestId)

      // Log success and finalize timing
      const statusCode = response.status
      const duration = perf.finish({ statusCode, path })
      response.headers.set('x-response-time', `${duration}ms`)

      log.info('API request completed', {
        statusCode,
        duration,
        path,
        action: 'request.success',
      })

      // Finish Sentry transaction
      if (sentryTransaction) {
        sentryTransaction.setStatus({ code: statusCode < 400 ? 1 : 2 })
        sentryTransaction.end()
      }

      return response
    } catch (error: unknown) {
      // Log error with full context
      log.error('API route error', {
        error: error instanceof Error ? error : new Error(String(error)),
        path,
        action: 'request.error',
      })

      // Capture in Sentry
      if (Sentry) {
        Sentry.captureException(error)
        if (sentryTransaction) {
          sentryTransaction.setStatus({ code: 2 })
          sentryTransaction.end()
        }
      }

      const duration = perf.finish({ statusCode: 500, path })
      const response = apiError('SERVER_ERROR', 500)
      response && response.headers && response.headers.set('x-request-id', requestId)
      response && response.headers && response.headers.set('x-response-time', `${duration}ms`)
      return response
    }
  }
}

// Re-export from core
export { requireOwnership } from './core'

/**
 * Utility function to check tenant access within handlers
 */
export function requireTenantAccess(tenantId: string, context: AuthContext): boolean {
  return (
    AuthService.belongsToTenant(context.profile, tenantId) || AuthService.isAdmin(context.profile)
  )
}
