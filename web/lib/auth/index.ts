/**
 * Centralized authentication and authorization system
 * Provides unified auth patterns across API routes, server actions, and components
 */

// Core types
export type {
  UserRole,
  UserProfile,
  AuthContext,
  UnauthenticatedContext,
  AppAuthContext,
  AuthOptions,
  Permission,
  AuthResult,
} from './types'

// Core service and utilities
export {
  AuthService,
  isStaff,
  isAdmin,
  isPlatformAdmin,
  ownsResource,
  belongsToTenant,
  requireOwnership,
  type MinimalProfile,
} from './core'

// API route wrappers
export {
  withApiAuth,
  withApiAuthParams,
  requireOwnership as requireApiOwnership,
  requireTenantAccess as requireApiTenantAccess,
  type ApiHandlerContext,
  type ApiHandlerContextWithParams,
  type ApiRouteOptions,
  type RequestLogger,
  type PerformanceTracker,
} from './api-wrapper'

// Server action wrappers
export {
  withActionAuth,
  requireOwnership as requireActionOwnership,
  requireTenantAccess as requireActionTenantAccess,
  createTenantQuery,
  type ActionOptions,
} from './action-wrapper'

// Role-based authorization
export { requireStaff, requireAdmin } from './require-staff'
export { requireOwner } from './require-owner'

// Redirect utilities (BUG-002)
export {
  REDIRECT_PARAM,
  createLoginUrl,
  createSignupUrl,
  getReturnUrl,
  isValidRedirectUrl,
  sanitizeRedirectUrl,
} from './redirect'

// Fast auth for high-frequency endpoints (PERF-001)
export { getFastAuth, getSessionAuth } from './fast-auth'
export {
  getCachedSession,
  cacheSession,
  clearCachedSession,
  clearAllCachedSessions,
  getCacheStats,
} from './session-cache'

// Auth monitoring and security (S004-T002)
export {
  logAuthAttempt,
  logSuccessfulLogin,
  logFailedLogin,
  checkSuspiciousActivity,
  withAuthMonitoring,
  getAuthActivitySummary,
  getClientInfo,
  type AuthAttempt,
  type AuthAttemptAlert,
} from './monitoring'
