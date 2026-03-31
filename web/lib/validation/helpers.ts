/**
 * Validation helper functions
 * Convenient methods for common validation scenarios
 */

import { ValidationEngine } from './core'
import type { ValidationSchema, ValidationResult, ValidationContext } from './types'

// Re-export core functions
export const validate = ValidationEngine.validate.bind(ValidationEngine)
export const validateOrThrow = ValidationEngine.validateOrThrow.bind(ValidationEngine)
export const sanitizeErrors = ValidationEngine.sanitizeErrors.bind(ValidationEngine)

// Helper for API validation
export function validateApiData(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  context?: ValidationContext
): ValidationResult {
  return ValidationEngine.validate(data, schema, context)
}

// Helper for action validation
export function validateActionData(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  context?: ValidationContext
): { success: boolean; errors?: Record<string, string[]> } {
  const result = ValidationEngine.validate(data, schema, context)

  if (result.isValid) {
    return { success: true }
  }

  return {
    success: false,
    errors: ValidationEngine.sanitizeErrors(result.errors),
  }
}

// Helper to validate and transform errors for API responses
export function validateForApi(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  context?: ValidationContext
) {
  const result = ValidationEngine.validate(data, schema, context)

  if (!result.isValid) {
    return {
      isValid: false,
      fieldErrors: ValidationEngine.sanitizeErrors(result.errors),
    }
  }

  return { isValid: true, data }
}

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[1-9][\d]{0,15}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  alpha: /^[a-zA-ZÀ-ÿ\s'-]+$/,
  alphanumeric: /^[a-zA-ZÀ-ÿ0-9\s'-]+$/,
  numeric: /^\d+$/,
  currency: /^\d+(\.\d{1,2})?$/,
}

// Common validation rules
export const rules = {
  required: (message?: string) => ({ required: true, message }),
  minLength: (min: number, message?: string) => ({ minLength: min, message }),
  maxLength: (max: number, message?: string) => ({ maxLength: max, message }),
  pattern: (regex: RegExp, message?: string) => ({ pattern: regex, message }),
  email: (message?: string) => ({ email: true, message }),
  url: (message?: string) => ({ url: true, message }),
  min: (min: number, message?: string) => ({ min, message }),
  max: (max: number, message?: string) => ({ max, message }),
  custom: (fn: (value: unknown) => boolean | string, message?: string) => ({ custom: fn, message }),
}
