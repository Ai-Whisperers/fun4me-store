/**
 * Ambassador validation schemas
 */

import { z } from 'zod'
import { requiredString, uuidSchema } from './common'

/**
 * Schema for ambassador code validation query
 */
export const validateCodeQuerySchema = z.object({
  code: requiredString('Código', 50),
})

export type ValidateCodeQueryInput = z.infer<typeof validateCodeQuerySchema>

/**
 * Schema for ambassador conversion processing
 */
export const processConversionSchema = z.object({
  tenantId: uuidSchema,
  subscriptionAmount: z.number().positive('El monto debe ser positivo'),
})

export type ProcessConversionInput = z.infer<typeof processConversionSchema>

/**
 * Schema for ambassador referrals query
 */
export const referralsQuerySchema = z.object({
  status: z.enum(['pending', 'trial_started', 'converted', 'expired']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ReferralsQueryInput = z.infer<typeof referralsQuerySchema>
