/**
 * Platform Admin - Suspend Ambassador
 *
 * POST /api/platform/ambassadors/[id]/suspend
 * Suspends an active ambassador
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

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
    .select('id, email, full_name, status')
    .eq('id', id)
    .single()

  if (fetchError || !ambassador) {
    return NextResponse.json({ error: 'Embajador no encontrado' }, { status: 404 })
  }

  if (ambassador.status !== 'active') {
    return NextResponse.json(
      { error: 'Solo se pueden suspender embajadores activos' },
      { status: 400 }
    )
  }

  // Update ambassador status
  const { error: updateError } = await serviceClient
    .from('ambassadors')
    .update({
      status: 'suspended',
      notes: `Suspendido por ${profile.email} el ${new Date().toISOString()}`,
    })
    .eq('id', id)

  if (updateError) {
    logger.error('Failed to suspend ambassador', {
      ambassadorId: id,
      error: updateError.message,
    })
    return NextResponse.json({ error: 'Error al suspender embajador' }, { status: 500 })
  }

  logger.info('Ambassador suspended', {
    ambassadorId: id,
    email: ambassador.email,
    suspendedBy: profile.email,
  })

  return NextResponse.json({ success: true })
}
