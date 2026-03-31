/**
 * Clinic Signup Validation Schemas
 *
 * Zod schemas for validating signup form data at each step
 * and the complete signup request.
 */

import { z } from 'zod'
import { RESERVED_SLUGS, PARAGUAY_CITIES } from './types'

// ============================================================================
// Slug Validation
// ============================================================================

/**
 * Slug format: lowercase letters, numbers, and hyphens
 * Must start with a letter, 3-30 characters
 */
const slugRegex = /^[a-z][a-z0-9-]{2,29}$/

/**
 * Check if slug is reserved
 */
function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number])
}

export const slugSchema = z
  .string()
  .min(3, 'El slug debe tener al menos 3 caracteres')
  .max(30, 'El slug no puede tener mas de 30 caracteres')
  .regex(
    slugRegex,
    'El slug solo puede contener letras minusculas, numeros y guiones, y debe comenzar con una letra'
  )
  .refine((slug) => !isReservedSlug(slug), {
    message: 'Este nombre esta reservado. Por favor elige otro.',
  })

// ============================================================================
// RUC Validation (Paraguay Tax ID)
// ============================================================================

/**
 * Paraguay RUC format: XXXXXXXX-X (8 digits, dash, 1 digit)
 * Or older format: XXXXXXX-X (7 digits)
 */
const rucRegex = /^\d{7,8}-\d$/

export const rucSchema = z
  .string()
  .regex(rucRegex, 'Formato de RUC invalido. Use: 12345678-9')
  .nullable()
  .optional()
  .transform((val) => val || null)

// ============================================================================
// Phone Validation
// ============================================================================

/**
 * Paraguay phone display format (flexible)
 */
export const phoneDisplaySchema = z
  .string()
  .min(8, 'Numero de telefono muy corto')
  .max(20, 'Numero de telefono muy largo')

/**
 * WhatsApp number (digits only, Paraguay format)
 */
const whatsappRegex = /^595\d{9}$/

export const whatsappSchema = z
  .string()
  .regex(whatsappRegex, 'Use formato: 595XXXXXXXXX (ej: 595981123456)')

// ============================================================================
// Password Validation
// ============================================================================

export const passwordSchema = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(100, 'La contrasena es muy larga')
  .refine((password) => /[A-Z]/.test(password), {
    message: 'La contrasena debe contener al menos una letra mayuscula',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'La contrasena debe contener al menos una letra minuscula',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'La contrasena debe contener al menos un numero',
  })

// ============================================================================
// Color Validation
// ============================================================================

/**
 * Hex color format
 */
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

export const hexColorSchema = z.string().regex(hexColorRegex, 'Color invalido. Use formato: #RRGGBB')

// ============================================================================
// Step Schemas
// ============================================================================

/**
 * Step 1: Clinic Info
 */
export const clinicInfoSchema = z.object({
  clinicName: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener mas de 100 caracteres')
    .transform((val) => val.trim()),
  slug: slugSchema,
  ruc: rucSchema,
})

/**
 * Step 2: Contact Details
 */
export const contactSchema = z.object({
  email: z.string().email('Email invalido'),
  phone: phoneDisplaySchema,
  whatsapp: whatsappSchema,
  address: z
    .string()
    .min(5, 'La direccion debe tener al menos 5 caracteres')
    .max(200, 'La direccion es muy larga'),
  city: z.enum(PARAGUAY_CITIES as unknown as [string, ...string[]], {
    message: 'Selecciona una ciudad valida',
  }),
})

/**
 * Step 3: Admin Account
 */
export const adminAccountSchema = z.object({
  adminEmail: z.string().email('Email invalido'),
  adminPassword: passwordSchema,
  adminFullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .transform((val) => val.trim()),
  referralCode: z
    .string()
    .max(20, 'Codigo muy largo')
    .nullable()
    .optional()
    .transform((val) => val?.trim() || null),
})

/**
 * Step 4: Branding
 */
export const brandingSchema = z.object({
  logoUrl: z.string().url('URL invalida').nullable().optional().default(null),
  primaryColor: hexColorSchema.default('#3B82F6'),
  secondaryColor: hexColorSchema.default('#10B981'),
})

// ============================================================================
// Complete Signup Schema
// ============================================================================

/**
 * Complete signup request validation
 */
export const signupRequestSchema = z.object({
  // Step 1: Clinic Info
  clinicName: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener mas de 100 caracteres')
    .transform((val) => val.trim()),
  slug: slugSchema,
  ruc: rucSchema,

  // Step 2: Contact
  email: z.string().email('Email de la clinica invalido'),
  phone: phoneDisplaySchema,
  whatsapp: whatsappSchema,
  address: z.string().min(5, 'La direccion debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'Selecciona una ciudad'),

  // Step 3: Admin Account
  adminEmail: z.string().email('Email del administrador invalido'),
  adminPassword: passwordSchema,
  adminFullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .transform((val) => val.trim()),
  referralCode: z
    .string()
    .max(20, 'Codigo muy largo')
    .nullable()
    .optional()
    .transform((val) => val?.trim() || null),

  // Step 4: Branding
  logoUrl: z.string().url().nullable().optional().default(null),
  primaryColor: hexColorSchema.default('#3B82F6'),
  secondaryColor: hexColorSchema.default('#10B981'),
})

export type SignupRequestInput = z.input<typeof signupRequestSchema>
export type SignupRequestOutput = z.output<typeof signupRequestSchema>

// ============================================================================
// Check Slug Schema
// ============================================================================

export const checkSlugSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug requerido')
    .transform((val) => val.toLowerCase().trim()),
})

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a single step
 */
export function validateStep(
  step: number,
  data: Record<string, unknown>
): { success: true; data: unknown } | { success: false; errors: Record<string, string> } {
  const schemas: Record<number, z.ZodSchema> = {
    1: clinicInfoSchema,
    2: contactSchema,
    3: adminAccountSchema,
    4: brandingSchema,
  }

  const schema = schemas[step]
  if (!schema) {
    return { success: true, data }
  }

  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    errors[path] = issue.message
  })

  return { success: false, errors }
}

/**
 * Generate slug from clinic name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, 30) // Max length
}

/**
 * Generate slug suggestion when taken
 */
export function generateSlugSuggestion(baseSlug: string, existingSlugs: string[]): string {
  let counter = 2
  let suggestion = `${baseSlug}-${counter}`

  while (existingSlugs.includes(suggestion) || isReservedSlug(suggestion)) {
    counter++
    suggestion = `${baseSlug}-${counter}`

    // Safety limit
    if (counter > 100) {
      suggestion = `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      break
    }
  }

  return suggestion
}
