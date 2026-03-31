import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * This module provides utilities to protect against CSRF attacks by:
 * 1. Generating secure random tokens stored in httpOnly cookies
 * 2. Validating tokens sent via request headers
 * 3. Using the Synchronizer Token Pattern
 *
 * Usage:
 * - Call generateCsrfToken() in forms/pages that need protection
 * - Include token in request headers as 'x-csrf-token'
 * - Call validateCsrfToken() in API routes to verify
 *
 * @module lib/security/csrf
 */

const CSRF_COOKIE_NAME = '__csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generates a new CSRF token and stores it in an httpOnly cookie.
 *
 * @returns Promise<string> The generated CSRF token
 *
 * @example
 * // In a server component or API route
 * const token = await generateCsrfToken()
 * // Send token to client to include in form/headers
 */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return token
}

/**
 * Validates a CSRF token from request headers against the stored cookie.
 *
 * @param request - The incoming HTTP request
 * @returns Promise<boolean> True if token is valid, false otherwise
 *
 * @example
 * // In an API route
 * export async function POST(request: Request) {
 *   if (!await validateCsrfToken(request)) {
 *     return NextResponse.json(
 *       { error: 'Token CSRF inválido' },
 *       { status: 403 }
 *     )
 *   }
 *   // ... proceed with request
 * }
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Deletes the CSRF token cookie.
 * Call this after successful form submission or logout.
 *
 * @returns Promise<void>
 *
 * @example
 * // After processing a protected form
 * await clearCsrfToken()
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CSRF_COOKIE_NAME)
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares two strings in constant time.
 *
 * @param a - First string
 * @param b - Second string
 * @returns boolean True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Extracts CSRF token from request headers.
 * Useful for logging or debugging.
 *
 * @param request - The incoming HTTP request
 * @returns string | null The CSRF token from headers, or null if not present
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  return request.headers.get(CSRF_HEADER_NAME)
}
