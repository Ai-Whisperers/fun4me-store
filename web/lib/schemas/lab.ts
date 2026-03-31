/**
 * Lab order validation schemas
 */

import { z } from 'zod'
import { uuidSchema, requiredString, optionalString } from './common'

/**
 * Result flags
 */
export const RESULT_FLAGS = [
  'low',
  'normal',
  'high',
  'critical_low',
  'critical_high',
] as const

/**
 * Schema for lab comment
 */
export const labCommentSchema = z.object({
  comment_text: requiredString('Comentario', 2000),
  interpretation: optionalString(2000),
})

export type LabCommentInput = z.infer<typeof labCommentSchema>

/**
 * Schema for lab result entry
 */
export const labResultItemSchema = z.object({
  test_id: uuidSchema,
  value: requiredString('Valor', 500),
  numeric_value: z.number().optional().nullable(),
  flag: z.enum(RESULT_FLAGS).optional().default('normal'),
})

/**
 * Schema for lab results submission
 */
export const labResultsSchema = z.object({
  results: z.array(labResultItemSchema).min(1, 'Al menos un resultado es requerido'),
})

export type LabResultsInput = z.infer<typeof labResultsSchema>
