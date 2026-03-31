/**
 * Platform Admin - Reject Ambassador
 *
 * POST /api/platform/ambassadors/[id]/reject
 * Rejects a pending ambassador application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { sendAmbassadorRejectionEmail } from '@/lib/email/templates/ambassador-rejected'

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
      status: 'inactive',
      notes: `Aplicación rechazada por ${profile.email} el ${new Date().toISOString()}`,
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to reject ambassador', {
      ambassadorId: id,
      error: updateError.message,
    })
    return NextResponse.json({ error: 'Error al rechazar embajador' }, { status: 500 })
  }

  // Send rejection email
  try {
    await sendAmbassadorRejectionEmail({
      to: ambassador.email,
      name: ambassador.full_name,
    })
  } catch (emailError) {
    logger.warn('Failed to send ambassador rejection email', {
      ambassadorId: id,
      error: emailError instanceof Error ? emailError.message : 'Unknown',
    })
  }

  logger.info('Ambassador rejected', {
    ambassadorId: id,
    email: ambassador.email,
    rejectedBy: profile.email,
  })

  return NextResponse.json({ success: true })
}
