import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { getDomainMapping, isCustomDomain } from '@/lib/domains'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================================================
// RATE LIMITING
// Upstash-based rate limiting for API protection
// ============================================================================

// Check if Upstash Redis is configured
const isRateLimitingEnabled = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Only create rate limiters if Upstash Redis is configured
let generalRateLimit: Ratelimit | null = null
let authRateLimit: Ratelimit | null = null

if (isRateLimitingEnabled) {
  try {
    // General API rate limiting - 100 requests per minute per IP
    generalRateLimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
    })

    // Stricter rate limiting for auth endpoints - 10 requests per minute per IP
    authRateLimit = new Ratelimit({
      redis: Redis.fromEnv(), 
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    })
  } catch (error) {
    console.error('[RATE LIMIT] Failed to initialize rate limiters:', error)
  }
}

// ============================================================================
// MIDDLEWARE LOGGING
// Lightweight logger for Edge runtime (can't use full logger module)
// ============================================================================

type LogLevel = 'info' | 'warn' | 'error'

interface MiddlewareLogContext {
  requestId: string
  path: string
  method: string
  userId?: string
  role?: string
  ip?: string
  duration?: number
  from?: string
  to?: string
  reason?: string
  [key: string]: unknown
}

/**
 * Lightweight logger for middleware (Edge runtime compatible)
 * Outputs JSON in production, pretty format in development
 */
function middlewareLog(
  level: LogLevel,
  message: string,
  context: MiddlewareLogContext
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    source: 'middleware',
    ...context,
  }

  if (process.env.NODE_ENV === 'production') {
    // JSON output for log aggregation
    // eslint-disable-next-line no-console
    console[level](JSON.stringify(entry))
  } else {
    // Pretty output for development
    const levelColors: Record<LogLevel, string> = {
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    }
    const reset = '\x1b[0m'
    const dim = '\x1b[2m'
    const color = levelColors[level]

    const parts = [
      `req=${context.requestId.slice(0, 8)}`,
      context.userId ? `user=${context.userId.slice(0, 8)}` : null,
      context.role ? `role=${context.role}` : null,
      context.duration !== undefined ? `${context.duration}ms` : null,
    ].filter(Boolean)

    // eslint-disable-next-line no-console
    console[level](
      `${dim}${new Date().toLocaleTimeString()}${reset} ${color}[MW]${reset} ${message} ${dim}[${context.method} ${context.path}]${reset}`,
      parts.length > 0 ? `${dim}(${parts.join(' | ')})${reset}` : ''
    )
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const path = request.nextUrl.pathname
  const requestId = crypto.randomUUID()

  // Extract client info for logging
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const baseLogContext: MiddlewareLogContext = {
    requestId,
    path,
    method: request.method,
    ip,
  }

  // Skip root path
  if (path === '/') {
    return NextResponse.next()
  }

  // ============================================================================
  // RATE LIMITING
  // Apply rate limiting before other middleware logic
  // ============================================================================

  // Determine which rate limiter to use based on path
  const isAuthEndpoint = path.includes('/api/auth') || path.includes('/portal/login') || path.includes('/portal/signup')
  const isApiEndpoint = path.startsWith('/api/')
  
  // Only apply rate limiting to API endpoints and auth pages if rate limiting is enabled
  if ((isApiEndpoint || isAuthEndpoint) && isRateLimitingEnabled) {
    const rateLimiter = isAuthEndpoint ? authRateLimit : generalRateLimit
    const limitType = isAuthEndpoint ? 'auth' : 'api'
    
    if (rateLimiter) {
      try {
        // Use IP address for rate limiting
        const identifier = ip
        const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)
        
        middlewareLog(success ? 'info' : 'warn', `Rate limit ${success ? 'passed' : 'exceeded'}`, {
          ...baseLogContext,
          rateLimitType: limitType,
          remaining,
          limit,
          reset: new Date(reset).toISOString(),
        })
        
        if (!success) {
          // Return 429 Too Many Requests with proper headers
          const rateLimitResponse = new NextResponse('Too Many Requests', { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
              'Retry-After': Math.round((reset - Date.now()) / 1000).toString(),
              'Content-Type': 'text/plain',
              'x-request-id': requestId,
            }
          })
          
          return rateLimitResponse
        }
        
        // Add rate limit headers to successful responses (will be added to final response)
        baseLogContext.rateLimitRemaining = remaining
        baseLogContext.rateLimitLimit = limit
      } catch (error) {
        middlewareLog('error', 'Rate limiting error - continuing without rate limit', {
          ...baseLogContext,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // Continue without rate limiting if there's an error
      }
    }
  } else if ((isApiEndpoint || isAuthEndpoint) && !isRateLimitingEnabled) {
    // Log when rate limiting is skipped due to missing configuration
    middlewareLog('warn', 'Rate limiting skipped - Upstash Redis not configured', {
      ...baseLogContext,
      endpointType: isAuthEndpoint ? 'auth' : 'api',
    })
  }

  // ============================================================================
  // CUSTOM DOMAIN RESOLUTION
  // Resolve custom domains to tenant slugs via URL rewriting
  // ============================================================================

  const host = request.headers.get('host')
  if (host && isCustomDomain(host)) {
    const domainMapping = getDomainMapping(host)
    if (domainMapping) {
      const tenant = domainMapping.tenant
      // Check if path already starts with tenant slug
      if (!path.startsWith(`/${tenant}`)) {
        const url = request.nextUrl.clone()
        url.pathname = `/${tenant}${path}`

        middlewareLog('info', 'Custom domain resolved', {
          ...baseLogContext,
          domain: host,
          tenant,
          from: path,
          to: url.pathname,
        })

        return NextResponse.rewrite(url)
      }
    }
  }

  // Create response with pathname and request ID headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add headers to response for downstream code and correlation
  response.headers.set('x-pathname', path)
  response.headers.set('x-request-id', requestId)
  
  // Add rate limit headers if rate limiting was applied
  if (baseLogContext.rateLimitLimit) {
    response.headers.set('X-RateLimit-Limit', baseLogContext.rateLimitLimit.toString())
    response.headers.set('X-RateLimit-Remaining', baseLogContext.rateLimitRemaining?.toString() || '0')
  }

  // OPTIMIZATION: Skip auth for public routes to reduce latency
  // Public routes don't need session refresh (saves ~50-100ms per request)
  const isPublicRoute =
    !path.includes('/portal') && !path.includes('/dashboard') && !path.includes('/cart/checkout')

  if (isPublicRoute) {
    const duration = Math.round(performance.now() - startTime)
    middlewareLog('info', 'Public route accessed', {
      ...baseLogContext,
      duration,
      routeType: 'public',
    })
    return response
  }

  // Refresh session - this is critical for Supabase SSR
  // Without this, session tokens can expire between requests
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Update cookies in the request for downstream code
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        // Create new response with updated cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.headers.set('x-pathname', path)
        response.headers.set('x-request-id', requestId)
        // Set cookies in the response for the browser
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // This will refresh the session if expired
  // IMPORTANT: Do not use getSession() here - it doesn't refresh tokens
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Redirect authenticated users away from login page
  if (user && path.endsWith('/portal/login')) {
    const clinicSlug = path.split('/')[1]
    // Redirect to /portal which handles role-based routing
    url.pathname = `/${clinicSlug}/portal`

    const duration = Math.round(performance.now() - startTime)
    middlewareLog('info', 'Authenticated user redirected from login', {
      ...baseLogContext,
      userId: user.id,
      duration,
      from: path,
      to: url.pathname,
    })

    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('x-request-id', requestId)
    
    // Add rate limit headers if rate limiting was applied
    if (baseLogContext.rateLimitLimit) {
      redirectResponse.headers.set('X-RateLimit-Limit', baseLogContext.rateLimitLimit.toString())
      redirectResponse.headers.set('X-RateLimit-Remaining', baseLogContext.rateLimitRemaining?.toString() || '0')
    }
    
    return redirectResponse
  }

  // 1. Protected Routes Pattern Matching
  // Staff dashboard: /[clinic]/dashboard/* (NOT /portal/dashboard which is owner's home)
  const isStaffDashboard = /^\/[^/]+\/dashboard(\/|$)/.test(path)
  const isPortal = path.includes('/portal')
  const isProtected = isStaffDashboard || isPortal

  // 2. Auth Check - redirect unauthenticated users to login page
  // EXCEPT if they're already trying to access the login or signup pages
  const isAuthPage = path.endsWith('/portal/login') || path.endsWith('/portal/signup')
  if (isProtected && !user && !isAuthPage) {
    const parts = path.split('/').filter(Boolean)
    const clinicSlug = parts[0]

    // Redirect to the actual login page, not the home page
    url.pathname = `/${clinicSlug}/portal/login`
    url.searchParams.set('returnTo', path)

    const duration = Math.round(performance.now() - startTime)
    middlewareLog('warn', 'Unauthenticated access attempt - redirecting to login', {
      ...baseLogContext,
      duration,
      routeType: isStaffDashboard ? 'dashboard' : 'portal',
      from: path,
      to: url.pathname,
    })

    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('x-request-id', requestId)
    
    // Add rate limit headers if rate limiting was applied
    if (baseLogContext.rateLimitLimit) {
      redirectResponse.headers.set('X-RateLimit-Limit', baseLogContext.rateLimitLimit.toString())
      redirectResponse.headers.set('X-RateLimit-Remaining', baseLogContext.rateLimitRemaining?.toString() || '0')
    }
    
    return redirectResponse
  }

  // 3. Role Check (Authorization)
  if (user && isStaffDashboard) {
    // Staff dashboards are for Staff (vet/admin) only
    // We need to fetch the profile role.
    // Optimization: Check metadata first if available, otherwise DB
    let role = user.user_metadata?.role

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role
    }

    if (!['vet', 'admin'].includes(role)) {
      // Forbidden: Redirect to portal or home
      const parts = path.split('/').filter(Boolean)
      const clinicSlug = parts[0]
      url.pathname = `/${clinicSlug}/portal` // Send them to the owner portal

      const duration = Math.round(performance.now() - startTime)
      middlewareLog('warn', 'Insufficient role for dashboard access', {
        ...baseLogContext,
        userId: user.id,
        role: role || 'unknown',
        duration,
        from: path,
        to: url.pathname,
        reason: 'role_insufficient',
      })

      const redirectResponse = NextResponse.redirect(url)
      redirectResponse.headers.set('x-request-id', requestId)
      
      // Add rate limit headers if rate limiting was applied
      if (baseLogContext.rateLimitLimit) {
        redirectResponse.headers.set('X-RateLimit-Limit', baseLogContext.rateLimitLimit.toString())
        redirectResponse.headers.set('X-RateLimit-Remaining', baseLogContext.rateLimitRemaining?.toString() || '0')
      }
      
      return redirectResponse
    }

    // Dashboard access granted
    const duration = Math.round(performance.now() - startTime)
    middlewareLog('info', 'Dashboard access granted', {
      ...baseLogContext,
      userId: user.id,
      role,
      duration,
      routeType: 'dashboard',
    })
  } else if (user && isPortal) {
    // Portal access (any authenticated user)
    const duration = Math.round(performance.now() - startTime)
    middlewareLog('info', 'Portal access granted', {
      ...baseLogContext,
      userId: user.id,
      duration,
      routeType: 'portal',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (.png, .jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)',
  ],
}
