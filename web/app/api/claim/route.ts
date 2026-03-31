import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { trialConfig } from '@/lib/pricing/tiers'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

/**
 * Claim Website API
 *
 * Allows clinic owners to claim a pre-generated website.
 * This is part of the "Your website is already live" outreach strategy.
 *
 * Flow:
 * 1. Clinic receives WhatsApp/email with link to their pre-generated site
 * 2. They click "Claim" and provide their contact info
 * 3. We create their account, start trial, and give them access
 */

const claimSchema = z.object({
  clinicSlug: z.string().min(1, 'Clinic slug is required'),
  claimCode: z.string().min(1, 'Código de reclamo es requerido'),
  ownerName: z.string().min(2, 'Nombre es requerido'),
  ownerEmail: z.string().email('Email inválido'),
  ownerPhone: z.string().min(8, 'Teléfono es requerido'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
})

// SEC-020: Maximum failed claim attempts before lockout
const MAX_CLAIM_ATTEMPTS = 5
const LOCKOUT_MINUTES = 60

/**
 * Hash a claim code using SHA256 for storage
 * This allows us to verify codes without storing them in plaintext
 */
function hashClaimCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex')
}

/**
 * Verify a claim code against the stored hash using timing-safe comparison
 */
function verifyClaimCode(providedCode: string, storedHash: string): boolean {
  const providedHash = hashClaimCode(providedCode)
  try {
    return crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash))
  } catch (_error: unknown) {
    return false
  }
}

interface ClaimResponse {
  success: boolean
  message: string
  clinicId?: string
  redirectUrl?: string
}

/**
 * GET /api/claim?slug=clinic-name
 * Check if a clinic is available to claim
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { available: false, message: 'Clinic slug is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    const { data: clinic, error } = await supabase
      .from('tenants')
      .select('id, name, status, is_pregenerated, claimed_at, clinic_type, zone')
      .eq('id', slug)
      .single()

    if (error || !clinic) {
      return NextResponse.json({
        available: false,
        message: 'Clínica no encontrada',
      })
    }

    // Check if already claimed
    if (clinic.status === 'claimed' || clinic.status === 'active' || clinic.claimed_at) {
      return NextResponse.json({
        available: false,
        message: 'Esta clínica ya fue reclamada',
        clinic: {
          name: clinic.name,
          status: clinic.status,
        },
      })
    }

    // Available to claim
    return NextResponse.json({
      available: true,
      clinic: {
        name: clinic.name,
        type: clinic.clinic_type,
        zone: clinic.zone,
        isPregenerated: clinic.is_pregenerated,
      },
    })
  } catch (error) {
    logger.error('Error checking clinic availability', {
      slug,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { available: false, message: 'Error al verificar disponibilidad' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/claim
 * Claim a pre-generated clinic website
 * Rate limited: 5 requests per minute (auth - strict to prevent abuse)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ClaimResponse>> {
  // Apply rate limiting for auth operations (5 requests per minute)
  const rateLimitResult = await rateLimit(request, 'auth')
  if (!rateLimitResult.success) {
    return rateLimitResult.response as unknown as NextResponse<ClaimResponse>
  }

  const supabase = await createClient()

  try {
    const body = await request.json()

    // Validate input
    const parseResult = claimSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0].message,
        },
        { status: 400 }
      )
    }

    const { clinicSlug, claimCode, ownerName, ownerEmail, ownerPhone, password } = parseResult.data

    // Get client IP for audit logging
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // Check if clinic exists and is available
    const { data: clinic, error: clinicError } = await supabase
      .from('tenants')
      .select('*, claim_code, claim_attempts, claim_locked_until')
      .eq('id', clinicSlug)
      .single()

    if (clinicError || !clinic) {
      return NextResponse.json(
        { success: false, message: 'Clínica no encontrada' },
        { status: 404 }
      )
    }

    // Check if already claimed
    if (clinic.status === 'claimed' || clinic.status === 'active' || clinic.claimed_at) {
      return NextResponse.json(
        { success: false, message: 'Esta clínica ya fue reclamada por otro usuario' },
        { status: 409 }
      )
    }

    // SEC-020: Check if claim attempts are locked
    if (clinic.claim_locked_until && new Date(clinic.claim_locked_until) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(clinic.claim_locked_until).getTime() - Date.now()) / 60000)
      logger.warn('Claim attempt on locked clinic', { clinicSlug, email: ownerEmail, minutesRemaining })

      // Audit log the locked attempt
      await supabase.from('claim_audit_log').insert({
        clinic_id: clinicSlug,
        email_attempted: ownerEmail,
        ip_address: clientIp,
        success: false,
        failure_reason: 'Account locked due to too many attempts',
      })

      return NextResponse.json(
        { success: false, message: `Demasiados intentos. Intentá de nuevo en ${minutesRemaining} minutos.` },
        { status: 429 }
      )
    }

    // SEC-020: Verify claim code (required for pregenerated clinics)
    if (clinic.is_pregenerated && clinic.claim_code) {
      const isValidCode = verifyClaimCode(claimCode, clinic.claim_code)

      if (!isValidCode) {
        // Increment failed attempts
        const newAttempts = (clinic.claim_attempts || 0) + 1
        const shouldLock = newAttempts >= MAX_CLAIM_ATTEMPTS
        const lockUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null

        await supabase
          .from('tenants')
          .update({
            claim_attempts: newAttempts,
            claim_locked_until: lockUntil,
          })
          .eq('id', clinicSlug)

        // Audit log the failed attempt
        await supabase.from('claim_audit_log').insert({
          clinic_id: clinicSlug,
          email_attempted: ownerEmail,
          ip_address: clientIp,
          success: false,
          failure_reason: 'Invalid claim code',
        })

        logger.warn('Invalid claim code attempt', {
          clinicSlug,
          email: ownerEmail,
          attempts: newAttempts,
          locked: shouldLock,
        })

        const attemptsRemaining = MAX_CLAIM_ATTEMPTS - newAttempts
        if (shouldLock) {
          return NextResponse.json(
            { success: false, message: `Demasiados intentos fallidos. Intentá de nuevo en ${LOCKOUT_MINUTES} minutos.` },
            { status: 429 }
          )
        }

        return NextResponse.json(
          { success: false, message: `Código de reclamo inválido. ${attemptsRemaining} intentos restantes.` },
          { status: 401 }
        )
      }
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ownerEmail)
      .single()

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Este email ya está registrado. Por favor iniciá sesión o usá otro email.',
        },
        { status: 409 }
      )
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ownerEmail,
      password: password,
      options: {
        data: {
          full_name: ownerName,
          phone: ownerPhone,
          tenant_id: clinicSlug,
          role: 'admin',
        },
      },
    })

    if (authError || !authData.user) {
      logger.error('Error creating user for claim', {
        clinicSlug,
        email: ownerEmail,
        error: authError?.message,
      })
      return NextResponse.json(
        { success: false, message: 'Error al crear cuenta. Intentá de nuevo.' },
        { status: 500 }
      )
    }

    // Calculate trial end date
    const trialEndDate = new Date()
    trialEndDate.setMonth(trialEndDate.getMonth() + trialConfig.freeMonths)

    // Update clinic to claimed status
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claimed_by: authData.user.id,
        email: ownerEmail,
        phone: ownerPhone,
        plan: trialConfig.trialTier,
        plan_expires_at: trialEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', clinicSlug)

    if (updateError) {
      logger.error('Error updating clinic claim status', {
        clinicSlug,
        userId: authData.user.id,
        error: updateError.message,
      })
      // Don't fail the request, user is created
    }

    // Create profile for the owner
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      tenant_id: clinicSlug,
      email: ownerEmail,
      full_name: ownerName,
      phone: ownerPhone,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      logger.error('Error creating profile for claim', {
        clinicSlug,
        userId: authData.user.id,
        error: profileError.message,
      })
      // Don't fail - profile might be created by trigger
    }

    // SEC-020: Log successful claim in audit table
    await supabase.from('claim_audit_log').insert({
      clinic_id: clinicSlug,
      email_attempted: ownerEmail,
      ip_address: clientIp,
      success: true,
      failure_reason: null,
    })

    // Reset claim attempts on successful claim
    await supabase
      .from('tenants')
      .update({ claim_attempts: 0, claim_locked_until: null })
      .eq('id', clinicSlug)

    logger.info('Clinic claimed successfully', {
      clinicSlug,
      ownerEmail,
      userId: authData.user.id,
      trialEnds: trialEndDate.toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: '¡Felicitaciones! Tu clínica fue reclamada exitosamente.',
      clinicId: clinicSlug,
      redirectUrl: `/${clinicSlug}/dashboard`,
    })
  } catch (error) {
    logger.error('Claim error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { success: false, message: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
