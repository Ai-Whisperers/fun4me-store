/**
 * Apply Referral Code API
 *
 * POST /api/referrals/apply - Apply a referral code to a new tenant signup
 *
 * Body:
 * - code: string - The referral code
 * - tenant_id: string - The new tenant's ID
 * - utm_source?: string
 * - utm_medium?: string
 * - utm_campaign?: string
 *
 * SECURITY: This endpoint requires internal authentication via X-Internal-Auth header.
 * Only called from the signup flow with service role and internal secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { timingSafeEqual } from 'crypto'

// Use service role for this endpoint
// Required environment variables - app will not function without these
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Rate limiting
const applyAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10 // applies per hour per IP
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = applyAttempts.get(ip)

  if (!record || record.resetAt < now) {
    applyAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Verify internal authentication using timing-safe comparison
 */
function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-internal-auth')
  const expectedToken = process.env.INTERNAL_API_SECRET

  // If no secret is configured, reject all requests (fail-safe)
  if (!expectedToken) {
    logger.error('INTERNAL_API_SECRET not configured - referral apply endpoint disabled')
    return false
  }

  if (!authHeader) {
    return false
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    const authBuffer = Buffer.from(authHeader)
    const expectedBuffer = Buffer.from(expectedToken)

    if (authBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(authBuffer, expectedBuffer)
  } catch (_error: unknown) {
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request)

  // Rate limiting check first
  if (!checkRateLimit(clientIp)) {
    logger.warn('Referral apply rate limit exceeded', { ip: clientIp })
    return NextResponse.json(
      { error: 'Demasiados intentos. Por favor espera antes de intentar nuevamente.' },
      { status: 429 }
    )
  }

  // SEC-014: Verify internal authentication
  if (!verifyInternalAuth(request)) {
    logger.warn('Unauthorized referral apply attempt', { ip: clientIp })
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code, tenant_id, utm_source, utm_medium, utm_campaign } = body

    if (!code || !tenant_id) {
      return NextResponse.json(
        { error: 'Código y tenant_id son requeridos' },
        { status: 400 }
      )
    }

    // Use service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      )
    }

    // Apply the referral using the database function
    const { data: referralId, error: applyError } = await supabase.rpc(
      'process_referral_signup',
      {
        p_referral_code: code.toUpperCase(),
        p_new_tenant_id: tenant_id,
        p_utm_source: utm_source || null,
        p_utm_medium: utm_medium || null,
        p_utm_campaign: utm_campaign || null,
      }
    )

    if (applyError) {
      logger.error('Failed to apply referral code', {
        tenantId: tenant_id,
        code,
        error: applyError.message,
      })

      // Handle specific errors
      if (applyError.message.includes('Invalid or expired')) {
        return NextResponse.json(
          { error: 'Código de referido inválido o expirado' },
          { status: 400 }
        )
      }
      if (applyError.message.includes('already been referred')) {
        return NextResponse.json(
          { error: 'Esta clínica ya tiene un referido asociado' },
          { status: 400 }
        )
      }
      if (applyError.message.includes('Cannot refer yourself')) {
        return NextResponse.json(
          { error: 'No puedes referirte a ti mismo' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Error al aplicar código de referido' },
        { status: 500 }
      )
    }

    // Get the referral details
    const { data: referral } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        referred_trial_bonus_days,
        referred_points_amount,
        referrer_tenant:referrer_tenant_id (
          name
        )
      `)
      .eq('id', referralId)
      .single()

    const rawReferrerTenant = referral?.referrer_tenant
    const referrerData = (Array.isArray(rawReferrerTenant) ? rawReferrerTenant[0] : rawReferrerTenant) as { name: string } | null

    return NextResponse.json({
      success: true,
      referral_id: referralId,
      message: 'Código de referido aplicado exitosamente',
      benefits: {
        trial_bonus_days: referral?.referred_trial_bonus_days || 60,
        loyalty_points: referral?.referred_points_amount || 500,
        referrer_name: referrerData?.name,
      },
    })
  } catch (e) {
    logger.error('Error in apply referral endpoint', {
      error: e instanceof Error ? e.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
