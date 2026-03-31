/**
 * Message validation schemas
 */

import { z } from 'zod'
import { requiredString, optionalString } from './common'

/**
 * Template categories
 */
export const TEMPLATE_CATEGORIES = [
  'appointment',
  'reminder',
  'followup',
  'marketing',
  'notification',
  'other',
] as const

/**
 * Schema for template query
 */
export const templateQuerySchema = z.object({
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
})

export type TemplateQueryInput = z.infer<typeof templateQuerySchema>

/**
 * Schema for creating a message template
 */
export const createTemplateSchema = z.object({
  name: requiredString('Nombre', 100),
  category: z.enum(TEMPLATE_CATEGORIES, {
    message: 'Categoría inválida',
  }),
  subject: optionalString(200),
  content: requiredString('Contenido', 5000),
  variables: z.array(z.string()).optional().default([]),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

/**
 * Schema for quick reply creation
 */
export const createQuickReplySchema = z.object({
  shortcut: requiredString('Atajo', 50),
  content: requiredString('Contenido', 1000),
  is_shared: z.boolean().optional().default(false),
})

export type CreateQuickReplyInput = z.infer<typeof createQuickReplySchema>

/**
 * Schema for quick reply deletion query
 */
export const deleteQuickReplyQuerySchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type DeleteQuickReplyQueryInput = z.infer<typeof deleteQuickReplyQuerySchema>

/**
 * Schema for message attachment upload
 */
export const uploadAttachmentFormSchema = z.object({
  conversation_id: z.string().uuid('ID de conversación inválido'),
})

export type UploadAttachmentFormInput = z.infer<typeof uploadAttachmentFormSchema>
