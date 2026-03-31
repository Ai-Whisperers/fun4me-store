/**
 * Middleware utilities
 * Centralized middleware for authentication, rate limiting, logging, and CORS
 */

// Authentication middleware
export { withAuthMiddleware, type AuthMiddlewareOptions } from './auth'

// Rate limiting middleware
export {
  withRateLimit,
  authRateLimit,
  apiRateLimit,
  bookingRateLimit,
  getRateLimiter,
  type RateLimitOptions,
} from './rate-limit'

// Logging middleware
export { withLogging, requestLogger, debugLogger, type LoggingOptions } from './logging'

// CORS middleware
export { withCORS, apiCORS, webhookCORS, type CORSOptions } from './cors'
