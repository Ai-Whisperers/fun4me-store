/**
 * Common validation schemas shared across the application
 */

import { z } from 'zod'

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('ID inválido')

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .min(1, 'Email es requerido')
  .email('Formato de email inválido')

/**
 * Phone number validation (Paraguay format)
 */
export const phoneSchema = z
  .string()
  .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número de teléfono inválido')

/**
 * Date string validation (ISO format)
 */
export const dateStringSchema = z.string().datetime('Fecha inválida')

/**
 * Future date validation
 */
export const futureDateSchema = z
  .string()
  .datetime('Fecha inválida')
  .refine((date) => new Date(date) > new Date(), 'La fecha debe ser futura')

/**
 * Past date validation
 */
export const pastDateSchema = z
  .string()
  .datetime('Fecha inválida')
  .refine((date) => new Date(date) <= new Date(), 'La fecha debe ser pasada o actual')

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Search/filter parameters
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  filter: z.record(z.string(), z.string()).optional(),
})

/**
 * Currency amount (positive number with 2 decimal places)
 */
export const currencySchema = z
  .number()
  .min(0, 'El monto debe ser positivo')
  .transform((val) => Math.round(val * 100) / 100)

/**
 * Percentage (0-100)
 */
export const percentageSchema = z
  .number()
  .min(0, 'Porcentaje debe ser entre 0 y 100')
  .max(100, 'Porcentaje debe ser entre 0 y 100')

/**
 * Non-empty string with max length
 * VALID-002: Trims whitespace and rejects whitespace-only strings
 */
export function requiredString(fieldName: string, maxLength: number = 255) {
  return z
    .string()
    .transform((s) => s.trim()) // Trim whitespace first
    .pipe(
      z
        .string()
        .min(1, `${fieldName} es requerido`)
        .max(maxLength, `${fieldName} muy largo (máx ${maxLength} caracteres)`)
    )
}

/**
 * Optional string with max length
 * VALID-002: Trims whitespace and converts empty/whitespace to undefined
 */
export function optionalString(maxLength: number = 255) {
  return z
    .string()
    .transform((s) => s.trim() || undefined) // Trim and convert empty to undefined
    .pipe(
      z
        .string()
        .max(maxLength, `Texto muy largo (máx ${maxLength} caracteres)`)
        .optional()
    )
}

/**
 * Helper to create enum schema with Spanish error message
 */
export function enumSchema<T extends string>(values: readonly T[], fieldName: string) {
  return z.enum(values as [T, ...T[]], {
    message: `${fieldName} inválido`,
  })
}

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

/**
 * Strong password validation rules
 * - Minimum 8 characters
 * - At least one uppercase
 * - At least one lowercase
 * - At least one number
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
  .regex(/[a-z]/, 'La contraseña debe tener al menos una minúscula')
  .regex(/[0-9]/, 'La contraseña debe tener al menos un número')

/**
 * Password confirmation refinement
 * Use with .refine() on password + confirm_password objects
 */
export const passwordsMatchRefinement = {
  check: (data: { password: string; confirm_password: string }) =>
    data.password === data.confirm_password,
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'] as const,
}

// =============================================================================
// PHONE VALIDATION (Paraguay)
// =============================================================================

/**
 * Phone number validation - Paraguay mobile format
 * Accepts: +595981234567, 0981234567, 981234567
 */
export const phoneSchemaOptional = z
  .string()
  .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número de teléfono inválido')
  .optional()
  .nullable()

// =============================================================================
// TIME VALIDATION
// =============================================================================

/**
 * Time slot validation (HH:MM format)
 */
export const timeSlotSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:MM)')

// =============================================================================
// URL VALIDATION
// =============================================================================

/**
 * Optional URL validation
 */
export const optionalUrlSchema = z
  .string()
  .url('URL inválida')
  .optional()
  .nullable()

// =============================================================================
// ID SCHEMA HELPERS
// =============================================================================

/**
 * Required UUID with custom field name for errors
 */
export function requiredUuid(fieldName: string = 'ID') {
  return z.string().uuid(`${fieldName} inválido`)
}

/**
 * Optional UUID
 */
export const optionalUuidSchema = z.string().uuid('ID inválido').optional()

// =============================================================================
// WEIGHT VALIDATION (for pets)
// =============================================================================

/**
 * Pet weight validation (0-500 kg)
 */
export const petWeightSchema = z.coerce
  .number()
  .min(0, 'El peso debe ser positivo')
  .max(500, 'Peso inválido')
  .optional()
  .nullable()

// =============================================================================
// NOTES/DESCRIPTION VALIDATION
// =============================================================================

/**
 * Notes field (up to 1000 characters)
 */
export const notesSchema = optionalString(1000)

/**
 * Short notes (up to 500 characters)
 */
export const shortNotesSchema = optionalString(500)

/**
 * Long description (up to 5000 characters)
 */
export const longDescriptionSchema = optionalString(5000)
