'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sanitizeRedirectUrl } from '@/lib/auth/redirect'

// TICKET-TYPE-002: Define proper state interface for server actions
interface ActionState {
  error?: string
  success?: boolean
  message?: string
}

// TICKET-FORM-003: Zod validation schemas
const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Formato de correo electrónico inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga (máximo 72 caracteres)'),
  fullName: z
    .string()
    .min(2, 'El nombre completo debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo (máximo 100 caracteres)')
    .trim(),
  clinic: z.string().min(1, 'La clínica es requerida'),
})

const loginSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido').toLowerCase().trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
  clinic: z.string().min(1, 'La clínica es requerida'),
})

const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Formato de correo electrónico inválido')
    .toLowerCase()
    .trim(),
  clinic: z.string().min(1, 'La clínica es requerida'),
})

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

/**
 * Helper to create a mock NextRequest from headers for rate limiting
 */
async function createMockRequest(): Promise<NextRequest> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

  // Create a minimal NextRequest-like object for rate limiting
  const url = `http://localhost${headersList.get('x-pathname') || '/'}`
  return new NextRequest(url, {
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
  })
}

export async function login(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Apply rate limiting (5 requests per minute for auth)
  const request = await createMockRequest()
  const rateLimitResult = await rateLimit(request, 'auth')

  if (!rateLimitResult.success) {
    const errorData = await rateLimitResult.response.json()
    return { error: errorData.error }
  }

  // TICKET-FORM-003: Validate with Zod
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    clinic: formData.get('clinic') as string,
  }

  const validation = loginSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    return { error: firstError.message }
  }

  const data = validation.data
  const redirectParam = (formData.get('redirect') ?? formData.get('returnTo')) as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    // Translate common Supabase errors to Spanish
    if (error.message.includes('Invalid login')) {
      return { error: 'Email o contraseña incorrectos' }
    }
    return { error: error.message }
  }

  // SEC-018: Sanitize redirect to prevent open redirect attacks
  const defaultRedirect = `/${data.clinic}/portal/dashboard`
  const redirectPath = sanitizeRedirectUrl(
    redirectParam || defaultRedirect,
    defaultRedirect,
    process.env.NEXT_PUBLIC_SITE_URL
  )

  revalidatePath(`/${data.clinic}/portal`, 'layout')
  redirect(redirectPath)
}

export async function signup(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Apply rate limiting (5 requests per minute for auth)
  const request = await createMockRequest()
  const rateLimitResult = await rateLimit(request, 'auth')

  if (!rateLimitResult.success) {
    const errorData = await rateLimitResult.response.json()
    return { error: errorData.error }
  }

  // TICKET-FORM-003: Validate with Zod schema
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
    clinic: formData.get('clinic') as string,
  }

  const validation = signupSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    return { error: firstError.message }
  }

  const data = validation.data

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  })

  if (error) {
    // Translate common Supabase errors to Spanish
    if (error.message.includes('already registered')) {
      return { error: 'Este email ya está registrado' }
    }
    if (error.message.includes('weak password')) {
      return {
        error: 'La contraseña es muy débil. Usa una combinación de letras, números y símbolos.',
      }
    }
    return { error: error.message }
  }

  // If email confirmation is disabled, we can redirect.
  // Ideally show "check email" message.
  return { success: true, message: '¡Cuenta creada! Revisa tu email para confirmar.' }
}

export async function loginWithGoogle(clinic: string) {
  const supabase = await createClient()

  // We need the origin to redirect back correctly
  // In server actions headers() can provide host but it's easier to handle redirect URL on client if possible,
  // currently createClient (server) needs a URL to redirect to.
  // For OAuth, it's often easier to initiate client-side or provide a hardcoded production URL.
  // Here we use a relative path which Supabase handles if configured, or the site URL.

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?redirect=/${clinic}/portal/dashboard`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }

  if (error) {
    logger.error('OAuth sign in error', {
      error: error.message,
    })
    // In a server action we can't easily alert, so we might return error state if not redirecting
    throw new Error(error.message)
  }
}

export async function requestPasswordReset(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Apply rate limiting (5 requests per minute for auth)
  const request = await createMockRequest()
  const rateLimitResult = await rateLimit(request, 'auth')

  if (!rateLimitResult.success) {
    const errorData = await rateLimitResult.response.json()
    return { error: errorData.error }
  }

  // TICKET-FORM-003: Validate with Zod
  const rawData = {
    email: formData.get('email') as string,
    clinic: formData.get('clinic') as string,
  }

  const validation = passwordResetSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    return { error: firstError.message }
  }

  const data = validation.data

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${data.clinic}/portal/reset-password`,
  })

  if (error) {
    // Log error but don't reveal if email exists (security best practice)
    logger.error('Password reset request failed', {
      error: error.message,
    })
  }

  // Always return success to prevent email enumeration attacks
  return { success: true }
}

export async function updatePassword(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // TICKET-FORM-003: Validate with Zod
  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validation = updatePasswordSchema.safeParse(rawData)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    return { error: firstError.message }
  }

  const data = validation.data

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password: data.password })

  if (error) {
    logger.error('Update password failed', {
      error: error.message,
    })
    return { error: 'Error al actualizar la contraseña. El enlace puede haber expirado.' }
  }

  return { success: true }
}

export async function logout(clinic: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('Logout failed', {
      error: error.message,
    })
    throw new Error('Error al cerrar sesión')
  }

  revalidatePath(`/${clinic}/portal`, 'layout')
  redirect(`/${clinic}/portal/login`)
}
