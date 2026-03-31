/**
 * Core validation engine
 * Provides centralized validation with consistent error handling
 */

import type {
  ValidationError,
  ValidationResult,
  FieldRule,
  ValidationSchema,
  ValidationContext,
} from './types'

export class ValidationEngine {
  /**
   * Validate data against a schema
   */
  static validate(
    data: Record<string, unknown>,
    schema: ValidationSchema,
    context?: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field]
      const fieldErrors = this.validateField(field, value, rules)

      errors.push(...fieldErrors)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a single field against its rules
   */
  private static validateField(
    field: string,
    value: unknown,
    rules: FieldRule | FieldRule[]
  ): ValidationError[] {
    const ruleArray = Array.isArray(rules) ? rules : [rules]
    const errors: ValidationError[] = []

    for (const rule of ruleArray) {
      const error = this.validateRule(field, value, rule)
      if (error) {
        errors.push(error)
        // If this is a required field validation and it failed, don't check other rules
        if ((rule.required && value === undefined) || value === null || value === '') {
          break
        }
      }
    }

    return errors
  }

  /**
   * Validate a single rule
   */
  private static validateRule(field: string, value: unknown, rule: FieldRule): ValidationError | null {
    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        field,
        code: 'REQUIRED',
        message: rule.message || `${field} es requerido`,
      }
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return null
    }

    // String validations
    if (typeof value === 'string') {
      // Length validations
      if (rule.minLength && value.length < rule.minLength) {
        return {
          field,
          code: 'MIN_LENGTH',
          message: rule.message || `${field} debe tener al menos ${rule.minLength} caracteres`,
        }
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          field,
          code: 'MAX_LENGTH',
          message: rule.message || `${field} debe tener máximo ${rule.maxLength} caracteres`,
        }
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          field,
          code: 'PATTERN',
          message: rule.message || `${field} tiene un formato inválido`,
        }
      }

      // Email validation
      if (rule.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return {
            field,
            code: 'EMAIL',
            message: rule.message || `${field} debe ser un email válido`,
          }
        }
      }

      // URL validation
      if (rule.url) {
        try {
          new URL(value)
        } catch (_error: unknown) {
          return {
            field,
            code: 'URL',
            message: rule.message || `${field} debe ser una URL válida`,
          }
        }
      }
    }

    // Number validations
    if (typeof value === 'number' && !isNaN(value)) {
      if (rule.min !== undefined && value < rule.min) {
        return {
          field,
          code: 'MIN',
          message: rule.message || `${field} debe ser mayor o igual a ${rule.min}`,
        }
      }

      if (rule.max !== undefined && value > rule.max) {
        return {
          field,
          code: 'MAX',
          message: rule.message || `${field} debe ser menor o igual a ${rule.max}`,
        }
      }
    }

    // Date validations
    if (value instanceof Date) {
      // For date validations, we can add more rules here
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value)
      if (result === false) {
        return {
          field,
          code: 'CUSTOM',
          message: rule.message || `${field} no cumple con las reglas de validación`,
        }
      }
      if (typeof result === 'string') {
        return {
          field,
          code: 'CUSTOM',
          message: result,
        }
      }
    }

    return null
  }

  /**
   * Validate and throw if invalid
   */
  static validateOrThrow(
    data: Record<string, unknown>,
    schema: ValidationSchema,
    context?: ValidationContext
  ): void {
    const result = this.validate(data, schema, context)

    if (!result.isValid) {
      throw result.errors
    }
  }

  /**
   * Sanitize validation errors for client consumption
   */
  static sanitizeErrors(errors: ValidationError[]): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {}

    for (const error of errors) {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = []
      }
      fieldErrors[error.field].push(error.message)
    }

    return fieldErrors
  }
}
