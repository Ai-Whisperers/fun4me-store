/**
 * Redirect URL utilities for authentication flows
 * BUG-002: Standardizes redirect parameter handling across the codebase
 */

/**
 * Standard redirect parameter name
 * Using 'redirect' as the primary parameter for consistency
 */
export const REDIRECT_PARAM = 'redirect'

/**
 * Creates a login URL with an optional return path
 *
 * @example
 * createLoginUrl('terrapet') // '/terrapet/portal/login'
 * createLoginUrl('terrapet', '/terrapet/portal/pets') // '/terrapet/portal/login?redirect=%2Fterrapet%2Fportal%2Fpets'
 */
export function createLoginUrl(clinic: string, returnPath?: string): string {
  const base = `/${clinic}/portal/login`
  if (returnPath) {
    return `${base}?${REDIRECT_PARAM}=${encodeURIComponent(returnPath)}`
  }
  return base
}

/**
 * Creates a signup URL with an optional return path
 */
export function createSignupUrl(clinic: string, returnPath?: string): string {
  const base = `/${clinic}/portal/signup`
  if (returnPath) {
    return `${base}?${REDIRECT_PARAM}=${encodeURIComponent(returnPath)}`
  }
  return base
}

/**
 * Gets the return URL from search params, checking all possible parameter names
 * for backwards compatibility
 *
 * Supports: redirect, returnTo, next (in order of priority)
 *
 * @example
 * getReturnUrl(searchParams, '/portal') // Returns redirect param or fallback
 */
export function getReturnUrl(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  fallback: string
): string {
  if (searchParams instanceof URLSearchParams) {
    return (
      searchParams.get('redirect') ||
      searchParams.get('returnTo') ||
      searchParams.get('next') ||
      fallback
    )
  }

  // Handle Next.js searchParams object
  const sp = searchParams as Record<string, string | string[] | undefined>
  const redirect = sp.redirect
  const returnTo = sp.returnTo
  const next = sp.next

  return (
    (typeof redirect === 'string' ? redirect : undefined) ||
    (typeof returnTo === 'string' ? returnTo : undefined) ||
    (typeof next === 'string' ? next : undefined) ||
    fallback
  )
}

/**
 * Validates a redirect URL to prevent open redirect attacks
 * Only allows relative paths and same-origin URLs
 */
export function isValidRedirectUrl(url: string, allowedOrigin?: string): boolean {
  // Must start with / for relative paths
  if (url.startsWith('/')) {
    // Reject protocol-relative URLs (//example.com)
    if (url.startsWith('//')) return false
    return true
  }

  // If absolute URL, must match allowed origin
  if (allowedOrigin) {
    try {
      const parsed = new URL(url)
      const allowed = new URL(allowedOrigin)
      return parsed.origin === allowed.origin
    } catch (_error: unknown) {
      return false
    }
  }

  return false
}

/**
 * Sanitizes a redirect URL, returning fallback if invalid
 */
export function sanitizeRedirectUrl(url: string, fallback: string, allowedOrigin?: string): string {
  if (isValidRedirectUrl(url, allowedOrigin)) {
    return url
  }
  return fallback
}
