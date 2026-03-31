import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/homepage/owner-preview
 * Returns a preview of owner's dashboard data for the homepage widget
 * - Pets (max 3) with basic info
 * - Upcoming appointments (max 3)
 * - Pending vaccines count
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const clinic = request.nextUrl.searchParams.get('clinic')

  if (!clinic) {
    return NextResponse.json({ error: 'Se requiere el parámetro clinic' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get profile to verify owner role and tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  if (profile.tenant_id !== clinic) {
    return NextResponse.json({ error: 'Acceso denegado a esta clínica' }, { status: 403 })
  }

  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Este endpoint es solo para dueños' }, { status: 403 })
  }

  try {
    // Fetch owner's pets with basic info
    const { data: pets, error: petsError } = await supabase
      .from('pets')
      .select('id, name, species, breed, photo_url')
      .eq('owner_id', user.id)
      .eq('tenant_id', clinic)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3)

    if (petsError) {
      logger.warn('Error fetching pets for owner preview', {
        userId: user.id,
        tenantId: clinic,
        error: petsError.message,
      })
    }

    // Fetch upcoming appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        start_time,
        status,
        reason,
        pets (name)
      `
      )
      .eq('tenant_id', clinic)
      .in(
        'pet_id',
        (pets || []).map((p) => p.id)
      )
      .gte('start_time', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .limit(3)

    if (appointmentsError) {
      logger.warn('Error fetching appointments for owner preview', {
        userId: user.id,
        tenantId: clinic,
        error: appointmentsError.message,
      })
    }

    // Count pending vaccines (due within 30 days or overdue)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { count: pendingVaccines, error: vaccinesError } = await supabase
      .from('vaccines')
      .select('id', { count: 'exact', head: true })
      .in(
        'pet_id',
        (pets || []).map((p) => p.id)
      )
      .or(`next_due_date.lte.${thirtyDaysFromNow.toISOString()},status.eq.pending`)

    if (vaccinesError) {
      logger.warn('Error counting vaccines for owner preview', {
        userId: user.id,
        tenantId: clinic,
        error: vaccinesError.message,
      })
    }

    return NextResponse.json({
      pets: pets || [],
      upcomingAppointments: appointments || [],
      pendingVaccines: pendingVaccines || 0,
    })
  } catch (error) {
    logger.error('Error in owner-preview endpoint', {
      userId: user.id,
      tenantId: clinic,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}
