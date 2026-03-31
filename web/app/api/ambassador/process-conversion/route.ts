/**
 * Process Ambassador Conversion
 *
 * POST /api/ambassador/process-conversion
 *
 * Called when a tenant makes their first paid subscription payment.
 * Calculates and credits ambassador commission.
 *
 * This endpoint should be called from:
 * - Stripe webhook handler (customer.subscription.created or payment_intent.succeeded)
 * - Platform admin manual conversion trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendAmbassadorConversionEmail } from '@/lib/email/templates/ambassador-conversion'
import { sendAmbassadorConversionNotification, sendAmbassadorTierUpgradeNotification } from '@/lib/ambassador/notifications'
import { timingSafeEqual } from 'crypto'
import { processConversionSchema } from '@/lib/schemas/ambassador'

/**
 * Verify service-to-service authorization
 */
function verifyInternalAuth(authHeader: string | null): boolean {
  const expected = process.env.INTERNAL_API_SECRET
  if (!expected || !authHeader) return false

  const provided = authHeader.replace('Bearer ', '')

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(provided, 'utf8')
    )
  } catch (_error: unknown) {
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify internal authorization (called from webhooks or cron)
  const authHeader = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')

  const isAuthorized =
    verifyInternalAuth(authHeader) ||
    (cronSecret && cronSecret === process.env.CRON_SECRET)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let rawPayload: unknown
  try {
    rawPayload = await request.json()
  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate input with Zod schema
  const validation = processConversionSchema.safeParse(rawPayload)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 }
    )
  }

  const { tenantId, subscriptionAmount } = validation.data

  const supabase = await createClient('service_role')

  try {
    // 1. Check if tenant has ambassador referral
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, referred_by_ambassador_id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      logger.warn('Tenant not found for conversion', { tenantId })
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (!tenant.referred_by_ambassador_id) {
      logger.info('Tenant has no ambassador referral', { tenantId })
      return NextResponse.json({
        success: true,
        message: 'No ambassador referral',
        converted: false,
      })
    }

    // 2. Get ambassador referral record
    const { data: referral, error: referralError } = await supabase
      .from('ambassador_referrals')
      .select('id, ambassador_id, status')
      .eq('tenant_id', tenantId)
      .single()

    if (referralError || !referral) {
      logger.warn('Ambassador referral record not found', {
        tenantId,
        ambassadorId: tenant.referred_by_ambassador_id,
      })
      return NextResponse.json({
        success: true,
        message: 'Referral record not found',
        converted: false,
      })
    }

    // 3. Check if already converted
    if (referral.status === 'converted') {
      logger.info('Referral already converted', { referralId: referral.id })
      return NextResponse.json({
        success: true,
        message: 'Already converted',
        converted: false,
      })
    }

    // 4. Process conversion using database function
    const { data: conversionResult, error: conversionError } = await supabase.rpc(
      'convert_ambassador_referral',
      {
        p_referral_id: referral.id,
        p_subscription_amount: subscriptionAmount,
      }
    )

    if (conversionError || conversionResult === false) {
      logger.error('Failed to convert ambassador referral', {
        referralId: referral.id,
        error: conversionError?.message,
      })
      return NextResponse.json(
        { error: 'Failed to process conversion' },
        { status: 500 }
      )
    }

    // 5. Get updated ambassador data for notification
    const { data: ambassador, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id, email, full_name, tier, commission_rate, total_earned, pending_payout, conversions_count, referral_code')
      .eq('id', referral.ambassador_id)
      .single()

    if (ambassadorError || !ambassador) {
      logger.error('Ambassador not found after conversion', {
        ambassadorId: referral.ambassador_id,
      })
      // Still return success since conversion was recorded
      return NextResponse.json({
        success: true,
        message: 'Conversion recorded but notification failed',
        converted: true,
      })
    }

    // 6. Get the updated referral to get commission amount
    const { data: updatedReferral } = await supabase
      .from('ambassador_referrals')
      .select('commission_amount, commission_rate')
      .eq('id', referral.id)
      .single()

    const commissionAmount = Number(updatedReferral?.commission_amount || 0)
    const commissionRate = Number(updatedReferral?.commission_rate || 0)

    // 7. Send notification email
    try {
      await sendAmbassadorConversionEmail({
        to: ambassador.email,
        ambassadorName: ambassador.full_name,
        clinicName: tenant.name,
        subscriptionAmount,
        commissionRate,
        commissionAmount,
        newBalance: Number(ambassador.pending_payout),
        referralCode: ambassador.referral_code,
        totalConversions: ambassador.conversions_count,
        tier: ambassador.tier,
      })

      logger.info('Ambassador conversion notification sent', {
        ambassadorId: ambassador.id,
        email: ambassador.email,
        commissionAmount,
      })
    } catch (emailError) {
      logger.warn('Failed to send ambassador conversion email', {
        ambassadorId: ambassador.id,
        error: emailError instanceof Error ? emailError.message : 'Unknown',
      })
      // Don't fail the request - conversion was successful
    }

    // 7.5. Send WhatsApp notification
    try {
      // Get ambassador phone for WhatsApp
      const { data: ambassadorWithPhone } = await supabase
        .from('ambassadors')
        .select('phone')
        .eq('id', ambassador.id)
        .single()

      if (ambassadorWithPhone?.phone) {
        await sendAmbassadorConversionNotification(
          {
            full_name: ambassador.full_name,
            phone: ambassadorWithPhone.phone,
            email: ambassador.email,
            pending_payout: Number(ambassador.pending_payout),
          },
          tenant.name,
          commissionAmount,
          commissionRate
        )
      }

      // Check for tier upgrade and send notification
      // Tier thresholds: embajador (1+), promotor (5+), super (10+)
      const conversions = ambassador.conversions_count
      const currentTier = ambassador.tier
      let expectedTier = 'embajador'
      if (conversions >= 10) expectedTier = 'super'
      else if (conversions >= 5) expectedTier = 'promotor'

      // If tier changed, send tier upgrade notification
      if (expectedTier !== currentTier && ambassadorWithPhone?.phone) {
        const commissionRates: Record<string, number> = {
          embajador: 30,
          promotor: 40,
          super: 50,
        }
        await sendAmbassadorTierUpgradeNotification(
          {
            full_name: ambassador.full_name,
            phone: ambassadorWithPhone.phone,
            email: ambassador.email,
          },
          expectedTier,
          conversions,
          commissionRates[expectedTier]
        )
        logger.info('Ambassador tier upgrade notification sent', {
          ambassadorId: ambassador.id,
          oldTier: currentTier,
          newTier: expectedTier,
        })
      }
    } catch (whatsappError) {
      logger.warn('Failed to send ambassador WhatsApp notification', {
        ambassadorId: ambassador.id,
        error: whatsappError instanceof Error ? whatsappError.message : 'Unknown',
      })
      // Don't fail the request - conversion was successful
    }

    // 8. Create in-app notification
    if (ambassador.id) {
      // Check if ambassador has a user_id to create notification
      const { data: ambData } = await supabase
        .from('ambassadors')
        .select('user_id')
        .eq('id', ambassador.id)
        .single()

      if (ambData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: ambData.user_id,
          title: '¡Nueva comisión ganada!',
          message: `${tenant.name} se convirtió en cliente. Ganaste Gs ${commissionAmount.toLocaleString()}.`,
        })
      }
    }

    logger.info('Ambassador conversion processed successfully', {
      tenantId,
      tenantName: tenant.name,
      ambassadorId: ambassador.id,
      referralId: referral.id,
      subscriptionAmount,
      commissionAmount,
      commissionRate,
    })

    return NextResponse.json({
      success: true,
      message: 'Conversion processed',
      converted: true,
      details: {
        ambassadorId: ambassador.id,
        ambassadorEmail: ambassador.email,
        commissionAmount,
        commissionRate,
        newTier: ambassador.tier,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error processing ambassador conversion', {
      tenantId,
      error: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
