import { z } from 'zod'

/**
 * Tenant Schema
 * Validates tenant records before insertion
 */
export const TenantSchema = z
  .object({
    id: z
      .string()
      .min(2, 'Tenant ID must be at least 2 characters')
      .max(50, 'Tenant ID must be at most 50 characters')
      .regex(
        /^[a-z][a-z0-9_-]*$/,
        'Tenant ID must start with lowercase letter and contain only lowercase, numbers, underscore, or hyphen'
      ),
    name: z
      .string()
      .min(2, 'Tenant name must be at least 2 characters')
      .max(100, 'Tenant name must be at most 100 characters'),
    // Optional fields from database
    plan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('free'),
    is_active: z.boolean().default(true),
    // Extended fields from JSON (not all stored in DB)
    legal_name: z.string().optional().nullable(),
    ruc: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    website_url: z.string().url().optional().nullable(),
    // Nested objects - use any() for flexibility
    settings: z.any().optional().nullable(),
    business_hours: z.any().optional().nullable(),
    // Timestamps
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .passthrough()

export type TenantInput = z.input<typeof TenantSchema>
export type Tenant = z.output<typeof TenantSchema>

/**
 * Document Sequence Schema
 * For generating sequential document numbers
 */
export const DocumentSequenceSchema = z.object({
  tenant_id: z.string().min(1),
  document_type: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  current_sequence: z.number().int().min(0).default(0),
  prefix: z.string().optional().nullable(),
})

export type DocumentSequenceInput = z.input<typeof DocumentSequenceSchema>
export type DocumentSequence = z.output<typeof DocumentSequenceSchema>
