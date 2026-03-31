/**
 * Ambassador API
 *
 * GET /api/ambassador - Get current ambassador profile
 * POST /api/ambassador - Register as a new ambassador
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono es requerido'),
  // SEC-021: Standardize password requirements to 8 chars (matches signup)
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  type: z.enum(['student', 'assistant', 'teacher', 'other']),
  university: z.string().optional(),
  institution: z.string().optional(),
})

/**
 * GET /api/ambassador
 * Get current user's ambassador profile
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: ambassador, error } = await supabase
    .from('ambassadors')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !ambassador) {
    return NextResponse.json({ error: 'No eres embajador' }, { status: 404 })
  }

  // Generate shareable URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.com'
  const shareUrl = `${baseUrl}/signup?amb=${ambassador.referral_code}`

  return NextResponse.json({
    ...ambassador,
    share_url: shareUrl,
    share_message: `¡Únete a Vetic usando mi código ${ambassador.referral_code} y obtén 2 meses extra de prueba! ${shareUrl}`,
  })
}

/**
 * POST /api/ambassador
 * Register as a new ambassador
 * Rate limited: 5 requests per minute (auth - strict to prevent abuse)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting for auth operations (5 requests per minute)
  const rateLimitResult = await rateLimit(request, 'auth')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  const supabase = await createClient()

  try {
    const body = await request.json()

    // Validate input
    const parseResult = registerSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { fullName, email, phone, password, type, university, institution } = parseResult.data

    // Check if email already registered as ambassador
    const { data: existingAmbassador } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('email', email)
      .single()

    if (existingAmbassador) {
      return NextResponse.json(
        { error: 'Este email ya está registrado como embajador' },
        { status: 409 }
      )
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          is_ambassador: true,
        },
      },
    })

    if (authError || !authData.user) {
      logger.error('Error creating ambassador user', { email, error: authError?.message })
      return NextResponse.json(
        { error: 'Error al crear cuenta. Intentá de nuevo.' },
        { status: 500 }
      )
    }

    // Generate referral code
    const { data: referralCode, error: codeError } = await supabase.rpc('generate_ambassador_code', {
      p_name: fullName,
    })

    if (codeError) {
      logger.error('Error generating ambassador code', { error: codeError.message })
      return NextResponse.json(
        { error: 'Error al generar código de referido' },
        { status: 500 }
      )
    }

    // Create ambassador record
    const { data: ambassador, error: createError } = await supabase
      .from('ambassadors')
      .insert({
        email,
        full_name: fullName,
        phone,
        user_id: authData.user.id,
        type,
        university: university || null,
        institution: institution || null,
        referral_code: referralCode,
        status: 'pending', // Needs approval
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating ambassador', { email, error: createError.message })
      return NextResponse.json(
        { error: 'Error al registrar embajador' },
        { status: 500 }
      )
    }

    logger.info('New ambassador registered', {
      ambassadorId: ambassador.id,
      email,
      type,
      code: referralCode,
    })

    return NextResponse.json({
      success: true,
      message: 'Registro exitoso. Tu cuenta será revisada y activada pronto.',
      ambassador: {
        id: ambassador.id,
        email: ambassador.email,
        referral_code: ambassador.referral_code,
        status: ambassador.status,
      },
    })
  } catch (error) {
    logger.error('Ambassador registration error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { error: 'Error al procesar el registro' },
      { status: 500 }
    )
  }
}
