/**
 * Settings validation schemas
 */

import { z } from 'zod'
import { requiredString, optionalString, emailSchema, phoneSchema } from './common'

/**
 * Schema for general clinic settings
 */
export const generalSettingsSchema = z.object({
  clinic: requiredString('Clinic slug'),
  name: requiredString('Nombre de la clínica'),
  tagline: optionalString(100),
  contact: z
    .object({
      email: emailSchema.optional().or(z.literal('')),
      phone: phoneSchema.optional().or(z.literal('')),
      whatsapp: phoneSchema.optional().or(z.literal('')),
      address: optionalString(200),
    })
    .optional(),
  hours: z.record(z.string(), z.string()).optional(),
  settings: z
    .object({
      currency: z.string().default('PYG'),
      emergency_24h: z.boolean().default(false),
    })
    .optional(),
})

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>
