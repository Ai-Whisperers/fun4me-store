import { z } from 'zod'

/**
 * Schema for creating a consent document
 */
export const createConsentDocumentSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  pet_id: z.string().uuid('Invalid pet ID'),
  owner_id: z.string().uuid('Invalid owner ID'),
  custom_content: z.string().max(10000).nullish(),
  field_values: z.record(z.unknown()).optional().default({}),
  signature_data: z.string().min(1, 'Signature is required'),
  witness_signature_data: z.string().nullish(),
  witness_name: z.string().max(200).nullish(),
  id_verification_type: z.enum(['ci', 'passport', 'license', 'other']).nullish(),
  id_verification_number: z.string().max(50).nullish(),
  expires_at: z.string().datetime().nullish(),
})

export type CreateConsentDocumentInput = z.infer<typeof createConsentDocumentSchema>

/**
 * Schema for consent template
 */
export const createConsentTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['medical', 'surgical', 'anesthesia', 'euthanasia', 'research', 'data', 'other']),
  description: z.string().max(1000).nullish(),
  content: z.string().min(1).max(50000),
  fields: z.array(z.object({
    field_name: z.string(),
    field_type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
    field_label: z.string(),
    is_required: z.boolean().optional(),
    field_options: z.array(z.string()).nullish(),
    display_order: z.number().int().optional(),
  })).optional().default([]),
  requires_witness: z.boolean().optional().default(false),
  requires_id_verification: z.boolean().optional().default(false),
  can_be_revoked: z.boolean().optional().default(true),
  default_expiry_days: z.number().int().positive().nullish(),
  is_active: z.boolean().optional().default(true),
})

export type CreateConsentTemplateInput = z.infer<typeof createConsentTemplateSchema>

/**
 * Schema for updating consent template
 */
export const updateConsentTemplateSchema = createConsentTemplateSchema.partial()

export type UpdateConsentTemplateInput = z.infer<typeof updateConsentTemplateSchema>

/**
 * Schema for consent preferences
 */
export const updateConsentPreferencesSchema = z.object({
  marketing_email: z.boolean().optional(),
  marketing_sms: z.boolean().optional(),
  appointment_reminders: z.boolean().optional(),
  vaccination_reminders: z.boolean().optional(),
  data_sharing_research: z.boolean().optional(),
  data_sharing_partners: z.boolean().optional(),
})

export type UpdateConsentPreferencesInput = z.infer<typeof updateConsentPreferencesSchema>

/**
 * Schema for blanket consent
 */
export const createBlanketConsentSchema = z.object({
  pet_id: z.string().uuid('Invalid pet ID'),
  owner_id: z.string().uuid('Invalid owner ID'),
  consent_type: z.enum(['routine_care', 'emergency', 'all_procedures', 'hospitalization']),
  scope: z.string().min(1).max(2000),
  conditions: z.string().max(2000).nullish(),
  signature_data: z.string().min(1, 'Signature is required'),
  expires_at: z.string().datetime().nullish(),
})

export type CreateBlanketConsentInput = z.infer<typeof createBlanketConsentSchema>

/**
 * Schema for revoking blanket consent
 */
export const revokeBlanketConsentSchema = z.object({
  id: z.string().uuid('Invalid consent ID'),
  action: z.literal('revoke'),
  reason: z.string().max(1000).nullish(),
})

export type RevokeBlanketConsentInput = z.infer<typeof revokeBlanketConsentSchema>

/**
 * Schema for consent request
 */
export const createConsentRequestSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  pet_id: z.string().uuid('Invalid pet ID'),
  owner_id: z.string().uuid('Invalid owner ID'),
  due_date: z.string().datetime().nullish(),
  message: z.string().max(1000).nullish(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
})

export type CreateConsentRequestInput = z.infer<typeof createConsentRequestSchema>
