import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/portal/activity
 * Returns recent activity for a pet owner (completed visits, purchases, vaccines)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const userId = request.nextUrl.searchParams.get('userId')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 5

  if (!userId) {
    return NextResponse.json({ error: 'Se requiere el parámetro userId' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Get user's pets first
    const { data: pets } = await supabase
      .from('pets')
      .select('id, name')
      .eq('owner_id', userId)
      .is('deleted_at', null)

    const petIds = pets?.map((p) => p.id) || []
    const petNameMap = new Map(pets?.map((p) => [p.id, p.name]) || [])

    if (petIds.length === 0) {
      return NextResponse.json({ activities: [] })
    }

    // Fetch recent completed appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, start_time, reason, pet_id')
      .in('pet_id', petIds)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(limit)

    // Transform appointments into activity items
    const activities =
      appointments?.map((apt) => ({
        id: apt.id,
        type: 'visit' as const,
        title: apt.reason || 'Visita',
        date: apt.start_time,
        pet_name: petNameMap.get(apt.pet_id) || undefined,
      })) || []

    return NextResponse.json({ activities })
  } catch (error) {
    logger.error('Error in portal activity endpoint', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 })
  }
}
