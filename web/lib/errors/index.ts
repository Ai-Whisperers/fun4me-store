/**
 * Unified error handling system
 * Provides consistent error types, handling, and responses across the application
 */

// Types
export type {
  AppError,
  ErrorCode,
  ErrorContext,
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ErrorSeverity,
  ErrorCategory,
  ERROR_CODES,
} from './types'

// Core service
export { ErrorService } from './core'

// Helper functions
export {
  createError,
  fromUnknown,
  notFound,
  forbidden,
  validationError,
  conflict,
  businessRuleViolation,
  databaseError,
  externalServiceError,
  unauthorized,
  insufficientRole,
  actionSuccess,
  actionError,
  apiSuccess,
  handleApiError,
  handleActionError,
  isRetryable,
  getUserMessage,
  sanitize,
} from './helpers'
