/**
 * Authentication middleware for Next.js
 * Handles authentication checks at the request level
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { logger } from '@/lib/logger'

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  roles?: string[]
  publicPaths?: string[]
  redirectTo?: string
}

export function withAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async function middleware(request: NextRequest) {
    const { requireAuth = true, roles, publicPaths = [], redirectTo = '/auth/login' } = options

    const { pathname } = request.nextUrl

    // Skip middleware for public paths
    if (publicPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next()
    }

    // Skip middleware for static files, API routes, etc.
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.includes('.') ||
      pathname.startsWith('/favicon.ico')
    ) {
      return NextResponse.next()
    }

    try {
      // Check authentication
      const context = await AuthService.getContext()

      if (requireAuth && !context.isAuthenticated) {
        // Redirect to login for pages that require authentication
        const loginUrl = new URL(redirectTo, request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      if (context.isAuthenticated && roles && roles.length > 0) {
        // Check role authorization
        if (!roles.includes(context.profile.role)) {
          // Redirect to unauthorized page or return 403
          return new NextResponse('Forbidden', { status: 403 })
        }
      }

      // Add user context to headers for server components
      const response = NextResponse.next()
      if (context.isAuthenticated) {
        response.headers.set('x-user-id', context.user.id)
        response.headers.set('x-user-role', context.profile.role)
        response.headers.set('x-tenant-id', context.profile.tenant_id)
      }

      return response
    } catch (error: unknown) {
      logger.error('[AuthMiddleware] Error processing request', {
        error: error instanceof Error ? error.message : String(error),
        path: pathname,
      })
      // On auth error, redirect to login
      const loginUrl = new URL(redirectTo, request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
}
