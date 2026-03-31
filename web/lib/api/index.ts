/**
 * API utilities and helpers
 * Centralized API functionality
 */

// Authentication wrappers (new system)
export { withApiAuth, withApiAuthParams } from '@/lib/auth'

// Error handling
export { apiSuccess, handleApiError } from '@/lib/errors'

// Response patterns
export * from './responses'

/**
 * @deprecated Legacy exports - use withApiAuth from '@/lib/auth' instead
 * These are maintained for backward compatibility during migration
 */
export { withAuth, type AuthContext, type RouteContext } from './with-auth'
export { apiError, validationError, type ApiErrorResponse } from './errors'
