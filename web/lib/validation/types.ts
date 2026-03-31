/**
 * Centralized validation system types
 */

export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface FieldRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  url?: boolean
  min?: number
  max?: number
  custom?: (value: unknown, data?: unknown) => boolean | string
  message?: string
}

export interface ValidationSchema {
  [field: string]: FieldRule | FieldRule[]
}

export interface ValidationContext {
  userId?: string
  tenantId?: string
  operation?: string
}
