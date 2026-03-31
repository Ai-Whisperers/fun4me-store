/**
 * Error handling helper functions
 * Convenience methods for common error scenarios
 */

import { ErrorService } from './core'
import type { ErrorContext } from './types'

// Quick error creators
export const createError = ErrorService.create.bind(ErrorService)
export const fromUnknown = ErrorService.fromUnknown.bind(ErrorService)

// Common error helpers
export function notFound(resource: string = 'Recurso', context?: ErrorContext) {
  return ErrorService.create('NOT_FOUND', `${resource} no encontrado`, context)
}

export function forbidden(action: string = 'esta acción', context?: ErrorContext) {
  return ErrorService.create('FORBIDDEN', `Sin permisos para ${action}`, context)
}

export function validationError(fieldErrors: Record<string, string[]>, context?: ErrorContext) {
  return ErrorService.validationError(fieldErrors, context)
}

export function conflict(resource: string = 'recurso', context?: ErrorContext) {
  return ErrorService.create('CONFLICT', `Conflicto con ${resource} existente`, context)
}

export function businessRuleViolation(rule: string, context?: ErrorContext) {
  return ErrorService.create('BUSINESS_RULE_VIOLATION', `Violación de regla: ${rule}`, context)
}

// Database error helpers
export function databaseError(operation: string, context?: ErrorContext) {
  return ErrorService.create('DATABASE_ERROR', `Error de base de datos en ${operation}`, context)
}

// External service error helpers
export function externalServiceError(service: string, context?: ErrorContext) {
  return ErrorService.create(
    'EXTERNAL_SERVICE_ERROR',
    `Error en servicio externo: ${service}`,
    context
  )
}

// Authentication helpers
export function unauthorized(context?: ErrorContext) {
  return ErrorService.create('UNAUTHORIZED', undefined, context)
}

export function insufficientRole(requiredRole: string, context?: ErrorContext) {
  return ErrorService.create('INSUFFICIENT_ROLE', `Se requiere rol: ${requiredRole}`, context)
}

// Action result helpers
export const actionSuccess = ErrorService.actionSuccess.bind(ErrorService)
export const actionError = ErrorService.actionError.bind(ErrorService)

// API response helpers
export const apiSuccess = ErrorService.apiSuccess.bind(ErrorService)

// Error handling wrappers
export const handleApiError = ErrorService.handleApiError.bind(ErrorService)
export const handleActionError = ErrorService.handleActionError.bind(ErrorService)

// Utility functions
export const isRetryable = ErrorService.isRetryable.bind(ErrorService)
export const getUserMessage = ErrorService.getUserMessage.bind(ErrorService)
export const sanitize = ErrorService.sanitize.bind(ErrorService)
