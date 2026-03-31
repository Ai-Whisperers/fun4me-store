/**
 * Signup validation schemas
 */

import { z } from 'zod'

/**
 * Schema for logo upload form data
 */
export const uploadLogoFormSchema = z.object({
  slug: z.string().max(50).optional().nullable(),
})

export type UploadLogoFormInput = z.infer<typeof uploadLogoFormSchema>

/**
 * Schema for onboarding completion
 */
export const onboardingCompleteSchema = z.object({
  clinic: z.string().min(1, 'Clinic es requerido'),
})

export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>
