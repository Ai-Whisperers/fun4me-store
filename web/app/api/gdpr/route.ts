/**
 * GDPR Data Subject Rights API
 *
 * COMP-001: Main GDPR endpoints for data access and erasure
 *
 * GET /api/gdpr - List user's GDPR requests
 * POST /api/gdpr - Create new GDPR request
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { GDPRRequestType, GDPRRequestResponse } from '@/lib/gdpr/types'
import { checkRateLimit, sendVerificationEmail } from '@/lib/gdpr'
import { logger } from '@/lib/utils/logger'

/**
 * Request schema for creating GDPR request
 */
const createRequestSchema = z.object({
  requestType: z.enum(['access', 'erasure', 'portability', 'rectification', 'restriction', 'objection']),
  reason: z.string().optional(),
})

/**
 * GET /api/gdpr
 * List user's GDPR requests
 */
export async function GET(_request: NextRequest) {
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Get GDPR requests
    const { data: requests, error } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching GDPR requests:', error)
      return NextResponse.json(
        { error: 'Error al obtener solicitudes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      requests: requests || [],
    })
  } catch (error) {
    logger.error('Error in GET /api/gdpr:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gdpr
 * Create new GDPR request
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

    // Parse and validate request body
    const body = await request.json()
    const validation = createRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { requestType, reason } = validation.data

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, email, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(user.id, requestType)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes',
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    // Check for pending requests of same type
    const { data: pendingRequests } = await supabase
      .from('gdpr_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', requestType)
      .in('status', ['pending', 'identity_verification', 'processing'])
      .limit(1)

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud pendiente de este tipo' },
        { status: 409 }
      )
    }

    // Create GDPR request
    const { data: gdprRequest, error: createError } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        request_type: requestType,
        status: 'pending',
        notes: reason,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating GDPR request:', createError)
      return NextResponse.json(
        { error: 'Error al crear solicitud' },
        { status: 500 }
      )
    }

    // Send verification email for sensitive operations
    const requiresVerification = ['erasure', 'portability', 'access'].includes(requestType)

    if (requiresVerification) {
      try {
        await sendVerificationEmail(user.id, gdprRequest.id, requestType)
      } catch (emailError) {
        logger.error('Error sending verification email:', emailError)
        // Don't fail the request, just note that email couldn't be sent
      }
    }

    // Calculate estimated completion days
    const estimatedDays: Record<GDPRRequestType, number> = {
      access: 3,
      portability: 3,
      erasure: 30,
      rectification: 7,
      restriction: 7,
      objection: 7,
    }

    const response: GDPRRequestResponse = {
      requestId: gdprRequest.id,
      status: gdprRequest.status,
      estimatedCompletionDays: estimatedDays[requestType as GDPRRequestType] || 30,
      verificationRequired: requiresVerification,
      message: requiresVerification
        ? 'Se ha enviado un email de verificación a tu correo'
        : 'Solicitud creada exitosamente',
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Error in POST /api/gdpr:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
