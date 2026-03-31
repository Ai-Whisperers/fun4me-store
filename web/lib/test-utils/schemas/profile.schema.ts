import { z } from 'zod'

/**
 * Profile Schema
 * Validates user profile records before insertion
 */
export const ProfileSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1).optional().nullable(),
    role: z.enum(['owner', 'vet', 'admin']),
    full_name: z.string().min(1).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(6).optional().nullable(),
    avatar_url: z.string().url().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    neighborhood: z.string().optional().nullable(),
    preferences: z.record(z.string(), z.unknown()).optional().nullable(),
    client_code: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // Staff (vet/admin) require full_name and email
      if (data.role === 'vet' || data.role === 'admin') {
        return data.full_name && data.email
      }
      return true
    },
    { message: 'Staff (vet/admin) must have full_name and email' }
  )

export type ProfileInput = z.input<typeof ProfileSchema>
export type Profile = z.output<typeof ProfileSchema>

/**
 * Clinic Profile Schema
 * Links users to multiple clinics (junction table)
 */
export const ClinicProfileSchema = z.object({
  profile_id: z.string().uuid(),
  tenant_id: z.string().min(1),
  role: z.enum(['owner', 'vet', 'admin']),
  is_primary: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
})

export type ClinicProfileInput = z.input<typeof ClinicProfileSchema>
export type ClinicProfile = z.output<typeof ClinicProfileSchema>

/**
 * Staff Profile Schema
 * Additional staff-specific information
 */
export const StaffProfileSchema = z.object({
  id: z.string().uuid().optional(),
  profile_id: z.string().uuid(),
  tenant_id: z.string().min(1),
  specialization: z.string().optional().nullable(),
  license_number: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  consultation_fee: z.number().min(0).optional().nullable(),
  is_available: z.boolean().default(true),
})

export type StaffProfileInput = z.input<typeof StaffProfileSchema>
export type StaffProfile = z.output<typeof StaffProfileSchema>
