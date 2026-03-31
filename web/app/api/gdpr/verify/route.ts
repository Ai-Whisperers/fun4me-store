/**
 * GDPR Verification API
 *
 * COMP-001: Identity verification for GDPR requests
 *
 * GET /api/gdpr/verify - Verify email token
 * POST /api/gdpr/verify - Verify password
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { verifyEmailToken, verifyPassword } from '@/lib/gdpr'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/utils/logger'

/**
 * Password verification schema
 */
const passwordVerifySchema = z.object({
  requestId: z.string().uuid('ID de solicitud inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

/**
 * GET /api/gdpr/verify
 * Verify email token and redirect
 *
 * Query params:
 * - request: GDPR request ID
 * - token: Verification token
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per token per hour (prevents brute-force)
    const rateLimitResult = await rateLimit(request, 'gdpr')
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    const requestId = request.nextUrl.searchParams.get('request')
    const token = request.nextUrl.searchParams.get('token')

    if (!requestId || !token) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL('/portal/settings?error=invalid_verification', request.url)
      )
    }

    // Verify token
    const isValid = await verifyEmailToken(requestId, token)

    if (!isValid) {
      return NextResponse.redirect(
        new URL('/portal/settings?error=verification_failed', request.url)
      )
    }

    // Get request details to determine next action
    const supabase = await createClient()
    const { data: gdprRequest } = await supabase
      .from('gdpr_requests')
      .select('request_type')
      .eq('id', requestId)
      .single()

    // Redirect based on request type
    const redirectUrls: Record<string, string> = {
      access: `/portal/settings/privacy?verified=true&request=${requestId}`,
      erasure: `/portal/settings/delete-account?verified=true&request=${requestId}`,
      portability: `/portal/settings/privacy?verified=true&request=${requestId}&action=export`,
      rectification: `/portal/settings/profile?verified=true&request=${requestId}`,
    }

    const redirectUrl = redirectUrls[gdprRequest?.request_type || ''] || '/portal/settings?verified=true'

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    logger.error('Error in GET /api/gdpr/verify:', error)
    return NextResponse.redirect(
      new URL('/portal/settings?error=verification_error', request.url)
    )
  }
}

/**
 * POST /api/gdpr/verify
 * Verify identity using password
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting: 5 password attempts per hour (prevents brute-force)
    const rateLimitResult = await rateLimit(request, 'gdpr', user.id)
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = passwordVerifySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { requestId, password } = validation.data

    // Verify request belongs to user
    const { data: gdprRequest } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single()

    if (!gdprRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    if (gdprRequest.status !== 'identity_verification' && gdprRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta solicitud ya fue verificada o procesada' },
        { status: 409 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(user.id, password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 403 }
      )
    }

    // Update request status
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'processing',
        verification_token: null,
        verification_expires_at: null,
      })
      .eq('id', requestId)

    return NextResponse.json({
      success: true,
      message: 'Identidad verificada exitosamente',
      requestId,
    })
  } catch (error) {
    logger.error('Error in POST /api/gdpr/verify:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
