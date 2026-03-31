/**
 * Authentication validation schemas
 */

import { z } from 'zod'
import { emailSchema, requiredString } from './common'

/**
 * User roles
 */
export const USER_ROLES = ['owner', 'vet', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Schema for login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Schema for signup
 */
export const signupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Contraseña debe tener al menos una mayúscula')
      .regex(/[a-z]/, 'Contraseña debe tener al menos una minúscula')
      .regex(/[0-9]/, 'Contraseña debe tener al menos un número'),
    confirm_password: z.string(),
    full_name: requiredString('Nombre completo', 100),
    phone: z
      .string()
      .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número de teléfono inválido')
      .optional(),
    accept_terms: z.literal(true, {
      message: 'Debe aceptar los términos y condiciones',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })

export type SignupInput = z.infer<typeof signupSchema>

/**
 * Schema for password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

/**
 * Schema for password reset
 */
export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Contraseña debe tener al menos una mayúscula')
      .regex(/[a-z]/, 'Contraseña debe tener al menos una minúscula')
      .regex(/[0-9]/, 'Contraseña debe tener al menos un número'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })

export type PasswordResetInput = z.infer<typeof passwordResetSchema>

/**
 * Schema for profile update
 */
export const updateProfileSchema = z.object({
  full_name: requiredString('Nombre completo', 100).optional(),
  phone: z
    .string()
    .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número de teléfono inválido')
    .optional()
    .nullable(),
  avatar_url: z.string().url('URL de avatar inválida').optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * Schema for changing password
 */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Contraseña actual es requerida'),
    new_password: z
      .string()
      .min(8, 'Nueva contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Nueva contraseña debe tener al menos una mayúscula')
      .regex(/[a-z]/, 'Nueva contraseña debe tener al menos una minúscula')
      .regex(/[0-9]/, 'Nueva contraseña debe tener al menos un número'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['new_password'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Schema for inviting a user to a clinic
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'vet', 'admin'], {
    message: 'Rol inválido',
  }),
  message: z.string().max(500, 'Mensaje muy largo').optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>
