/**
 * Platform Admin - Process Ambassador Payout
 *
 * POST /api/platform/payouts/[id]/process
 * Marks a payout as completed and sends notification to ambassador
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { sendAmbassadorPayoutNotification } from '@/lib/ambassador/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const { id } = await params

  // Verify platform admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Use service client for admin operations
  const serviceClient = createServiceClient()

  // Get payout with ambassador info
  const { data: payout, error: fetchError } = await serviceClient
    .from('ambassador_payouts')
    .select(`
      id,
      ambassador_id,
      amount,
      status,
      bank_name,
      referral_ids,
      ambassadors (
        id,
        email,
        full_name,
        phone,
        pending_payout,
        total_paid
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError || !payout) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  if (payout.status === 'completed') {
    return NextResponse.json({ error: 'Este pago ya fue procesado' }, { status: 400 })
  }

  if (payout.status === 'rejected') {
    return NextResponse.json({ error: 'Este pago fue rechazado' }, { status: 400 })
  }

  // Supabase returns relations as arrays, get the first (and only) ambassador
  const ambassadorData = payout.ambassadors as Array<{
    id: string
    email: string
    full_name: string
    phone: string
    pending_payout: number
    total_paid: number
  }>
  const ambassador = ambassadorData[0]

  if (!ambassador) {
    return NextResponse.json({ error: 'Embajador no encontrado' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // Update payout status
  const { error: updateError } = await serviceClient
    .from('ambassador_payouts')
    .update({
      status: 'completed',
      processed_at: now,
      processed_by: profile.email,
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to process payout', {
      payoutId: id,
      error: updateError.message,
    })
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 })
  }

  // Update ambassador's balance
  const { error: balanceError } = await serviceClient
    .from('ambassadors')
    .update({
      pending_payout: ambassador.pending_payout - payout.amount,
      total_paid: ambassador.total_paid + payout.amount,
      updated_at: now,
    })
    .eq('id', payout.ambassador_id)

  if (balanceError) {
    logger.error('Failed to update ambassador balance', {
      ambassadorId: payout.ambassador_id,
      error: balanceError.message,
    })
    // Continue - payout was marked as completed
  }

  // Update referrals payout status
  if (payout.referral_ids && payout.referral_ids.length > 0) {
    await serviceClient
      .from('ambassador_referrals')
      .update({ payout_status: 'paid' })
      .in('id', payout.referral_ids)
  }

  // Send WhatsApp notification
  try {
    await sendAmbassadorPayoutNotification(
      {
        full_name: ambassador.full_name,
        phone: ambassador.phone,
        email: ambassador.email,
      },
      payout.amount,
      payout.bank_name
    )
  } catch (notifyError) {
    logger.warn('Failed to send payout notification', {
      payoutId: id,
      error: notifyError instanceof Error ? notifyError.message : 'Unknown',
    })
  }

  logger.info('Payout processed', {
    payoutId: id,
    ambassadorId: payout.ambassador_id,
    amount: payout.amount,
    processedBy: profile.email,
  })

  return NextResponse.json({ success: true })
}
