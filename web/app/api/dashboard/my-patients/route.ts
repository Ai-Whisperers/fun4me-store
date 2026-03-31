import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface AppointmentRow {
  id: string
  start_time: string
  reason: string | null
  status: string
  pets: { id: string; name: string; species: string } | { id: string; name: string; species: string }[] | null
  profiles: { full_name: string } | { full_name: string }[] | null
}

/**
 * GET /api/dashboard/my-patients
 * Returns today's patients assigned to a specific vet
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const vetId = request.nextUrl.searchParams.get('vetId')

  if (!vetId) {
    return NextResponse.json({ error: 'Se requiere el parámetro vetId' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get user's tenant and verify they are staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'vet' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch today's appointments for this vet
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        reason,
        status,
        pets (
          id,
          name,
          species
        ),
        profiles!appointments_client_id_fkey (
          full_name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('vet_id', vetId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .in('status', ['scheduled', 'confirmed', 'checked_in', 'in_progress'])
      .order('start_time', { ascending: true })

    if (error) {
      logger.error('Failed to fetch vet patients', {
        vetId,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 })
    }

    // Transform to patient format
    const patients = ((appointments || []) as AppointmentRow[]).map((apt) => {
      const pet = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
      const profile = Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles
      return {
        id: apt.id,
        pet_name: pet?.name || 'Sin nombre',
        species: pet?.species || 'dog',
        owner_name: profile?.full_name || 'Cliente',
        appointment_time: apt.start_time,
        reason: apt.reason || 'Consulta general',
        status: apt.status,
      }
    })

    return NextResponse.json({ patients })
  } catch (error) {
    logger.error('Error in my-patients endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 })
  }
}
