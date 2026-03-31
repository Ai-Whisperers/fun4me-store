/**
 * Platform Admin - Approve Ambassador
 *
 * POST /api/platform/ambassadors/[id]/approve
 * Approves a pending ambassador application and sends welcome email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { sendAmbassadorApprovalEmail } from '@/lib/email/templates/ambassador-approved'
import { sendAmbassadorWelcomeNotification } from '@/lib/ambassador/notifications'

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

  // Get ambassador
  const { data: ambassador, error: fetchError } = await serviceClient
    .from('ambassadors')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !ambassador) {
    return NextResponse.json({ error: 'Embajador no encontrado' }, { status: 404 })
  }

  // Update ambassador status
  const { error: updateError } = await serviceClient
    .from('ambassadors')
    .update({
      status: 'active',
      approved_by: profile.email,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to approve ambassador', {
      ambassadorId: id,
      error: updateError.message,
    })
    return NextResponse.json({ error: 'Error al aprobar embajador' }, { status: 500 })
  }

  // Send approval email
  try {
    await sendAmbassadorApprovalEmail({
      to: ambassador.email,
      name: ambassador.full_name,
      referralCode: ambassador.referral_code,
      tier: ambassador.tier,
      commissionRate: ambassador.commission_rate,
    })
  } catch (emailError) {
    // Log but don't fail the request
    logger.warn('Failed to send ambassador approval email', {
      ambassadorId: id,
      email: ambassador.email,
      error: emailError instanceof Error ? emailError.message : 'Unknown',
    })
  }

  // Send WhatsApp welcome notification
  try {
    await sendAmbassadorWelcomeNotification({
      full_name: ambassador.full_name,
      phone: ambassador.phone,
      email: ambassador.email,
      referral_code: ambassador.referral_code,
    })
  } catch (whatsappError) {
    // Log but don't fail the request
    logger.warn('Failed to send ambassador WhatsApp notification', {
      ambassadorId: id,
      error: whatsappError instanceof Error ? whatsappError.message : 'Unknown',
    })
  }

  logger.info('Ambassador approved', {
    ambassadorId: id,
    email: ambassador.email,
    approvedBy: profile.email,
  })

  return NextResponse.json({ success: true })
}
