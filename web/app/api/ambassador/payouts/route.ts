/**
 * Ambassador Payouts API
 *
 * GET /api/ambassador/payouts - List ambassador's payout history
 * POST /api/ambassador/payouts - Request a new payout
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const MINIMUM_PAYOUT = 500000 // Gs 500,000 minimum payout

const payoutRequestSchema = z.object({
  bankName: z.string().min(1, 'Nombre del banco es requerido'),
  bankAccount: z.string().min(1, 'Número de cuenta es requerido'),
  bankHolderName: z.string().min(1, 'Nombre del titular es requerido'),
})

/**
 * GET /api/ambassador/payouts
 * List payout history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get ambassador ID
  const { data: ambassador, error: ambError } = await supabase
    .from('ambassadors')
    .select('id, pending_payout, total_paid, bank_name, bank_account, bank_holder_name')
    .eq('user_id', user.id)
    .single()

  if (ambError || !ambassador) {
    return NextResponse.json({ error: 'No eres embajador' }, { status: 404 })
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get payouts
  const { data: payouts, error, count } = await supabase
    .from('ambassador_payouts')
    .select('*', { count: 'exact' })
    .eq('ambassador_id', ambassador.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Failed to fetch ambassador payouts', {
      ambassadorId: ambassador.id,
      error: error.message,
    })
    return NextResponse.json({ error: 'Error al cargar pagos' }, { status: 500 })
  }

  return NextResponse.json({
    payouts,
    summary: {
      pending_payout: ambassador.pending_payout,
      total_paid: ambassador.total_paid,
      minimum_payout: MINIMUM_PAYOUT,
      can_request_payout: ambassador.pending_payout >= MINIMUM_PAYOUT,
      saved_bank_details: ambassador.bank_name
        ? {
            bank_name: ambassador.bank_name,
            bank_account: ambassador.bank_account,
            bank_holder_name: ambassador.bank_holder_name,
          }
        : null,
    },
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

/**
 * POST /api/ambassador/payouts
 * Request a new payout
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input
    const parseResult = payoutRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { bankName, bankAccount, bankHolderName } = parseResult.data

    // Get ambassador
    const { data: ambassador, error: ambError } = await supabase
      .from('ambassadors')
      .select('id, pending_payout')
      .eq('user_id', user.id)
      .single()

    if (ambError || !ambassador) {
      return NextResponse.json({ error: 'No eres embajador' }, { status: 404 })
    }

    // Check minimum payout
    if (ambassador.pending_payout < MINIMUM_PAYOUT) {
      return NextResponse.json(
        {
          error: `Monto mínimo para retiro es Gs ${MINIMUM_PAYOUT.toLocaleString()}. Tu saldo actual es Gs ${ambassador.pending_payout.toLocaleString()}`,
        },
        { status: 400 }
      )
    }

    // Check for pending payout requests
    const { data: pendingPayout } = await supabase
      .from('ambassador_payouts')
      .select('id')
      .eq('ambassador_id', ambassador.id)
      .in('status', ['pending', 'approved', 'processing'])
      .single()

    if (pendingPayout) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud de pago pendiente' },
        { status: 409 }
      )
    }

    // Get pending referral IDs
    const { data: pendingReferrals } = await supabase
      .from('ambassador_referrals')
      .select('id')
      .eq('ambassador_id', ambassador.id)
      .eq('status', 'converted')
      .eq('payout_status', 'pending')

    const referralIds = pendingReferrals?.map((r) => r.id) || []

    // Create payout request
    const { data: payout, error: createError } = await supabase
      .from('ambassador_payouts')
      .insert({
        ambassador_id: ambassador.id,
        amount: ambassador.pending_payout,
        referral_ids: referralIds,
        status: 'pending',
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder_name: bankHolderName,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating payout request', { error: createError.message })
      return NextResponse.json(
        { error: 'Error al crear solicitud de pago' },
        { status: 500 }
      )
    }

    // Update ambassador's saved bank details
    await supabase
      .from('ambassadors')
      .update({
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder_name: bankHolderName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ambassador.id)

    // Mark referrals as scheduled for payout
    if (referralIds.length > 0) {
      await supabase
        .from('ambassador_referrals')
        .update({ payout_status: 'scheduled', payout_id: payout.id })
        .in('id', referralIds)
    }

    logger.info('Payout requested', {
      ambassadorId: ambassador.id,
      payoutId: payout.id,
      amount: ambassador.pending_payout,
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitud de pago enviada. Será procesada en 3-5 días hábiles.',
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
      },
    })
  } catch (error) {
    logger.error('Payout request error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
