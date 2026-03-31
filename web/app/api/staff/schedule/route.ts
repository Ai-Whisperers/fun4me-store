import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/staff/schedule
 * Fetches staff schedules with their entries
 * Query params:
 *   - clinic (required): tenant_id
 *   - staff_id (optional): filter by specific staff member
 *   - active_only (optional): only return active schedules
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const clinicSlug = searchParams.get('clinic')
  const staffId = searchParams.get('staff_id')
  const activeOnly = searchParams.get('active_only') !== 'false'

  if (!clinicSlug) {
    return NextResponse.json({ error: 'Falta el parámetro clinic' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify staff access
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinicSlug })
  if (!isStaff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    // Build query for staff profiles with schedules
    let staffQuery = supabase
      .from('staff_profiles')
      .select(
        `
        id,
        profile_id,
        title,
        profiles!staff_profiles_profile_id_fkey (
          id,
          full_name,
          email
        ),
        staff_schedules (
          id,
          name,
          is_active,
          effective_from,
          effective_until,
          staff_schedule_entries (
            id,
            day_of_week,
            start_time,
            end_time,
            break_start,
            break_end,
            location
          )
        )
      `
      )
      .eq('tenant_id', clinicSlug)
      .eq('is_active', true)

    if (staffId) {
      staffQuery = staffQuery.eq('id', staffId)
    }

    const { data: staffData, error: staffError } = await staffQuery

    if (staffError) {
      logger.error('Error fetching staff schedules', {
        error: staffError.message,
        tenantId: clinicSlug,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al obtener horarios' }, { status: 500 })
    }

    // Transform data for response
    const schedules =
      staffData?.map((staff) => {
        const profile = staff.profiles as unknown as {
          id: string
          full_name: string
          email: string
        } | null
        const activeSchedules = activeOnly
          ? staff.staff_schedules?.filter((s: { is_active: boolean }) => s.is_active)
          : staff.staff_schedules

        return {
          staff_profile_id: staff.id,
          profile_id: staff.profile_id,
          staff_name: profile?.full_name || 'Sin nombre',
          email: profile?.email,
          title: staff.title,
          schedules: activeSchedules || [],
        }
      }) || []

    return NextResponse.json({
      data: schedules,
      clinic: clinicSlug,
    })
  } catch (e) {
    logger.error('Error in schedule API', {
      error: e instanceof Error ? e.message : 'Unknown',
      tenantId: clinicSlug,
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/staff/schedule
 * Creates or updates a staff schedule with entries
 * Body: {
 *   staff_profile_id: string,
 *   clinic: string,
 *   name?: string,
 *   effective_from: string (YYYY-MM-DD),
 *   effective_to?: string (YYYY-MM-DD),
 *   entries: Array<{
 *     day_of_week: number (0-6),
 *     start_time: string (HH:MM),
 *     end_time: string (HH:MM),
 *     break_start?: string,
 *     break_end?: string,
 *     location?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      staff_profile_id,
      clinic,
      name = 'Horario Regular',
      effective_from,
      effective_to,
      entries,
    } = body

    // Validate required fields
    if (!staff_profile_id || !clinic || !effective_from || !entries) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify staff access
    const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
    if (!isStaff) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verify the staff profile exists and belongs to this tenant
    const { data: staffProfile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('id, profile_id, tenant_id')
      .eq('id', staff_profile_id)
      .eq('tenant_id', clinic)
      .single()

    if (profileError || !staffProfile) {
      return NextResponse.json({ error: 'Perfil de empleado no encontrado' }, { status: 404 })
    }

    // Check permissions: admin can edit any, staff can only edit own
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'
    const isOwnProfile = staffProfile.profile_id === user.id

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Solo puedes editar tu propio horario' }, { status: 403 })
    }

    // Validate entries
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una entrada de horario' },
        { status: 400 }
      )
    }

    for (const entry of entries) {
      // ISO week: 1=Monday through 7=Sunday
      if (entry.day_of_week < 1 || entry.day_of_week > 7) {
        return NextResponse.json(
          { error: 'Día de la semana inválido (debe ser 1-7, donde 1=Lunes)' },
          { status: 400 }
        )
      }
      if (!entry.start_time || !entry.end_time) {
        return NextResponse.json({ error: 'Hora de inicio y fin son requeridas' }, { status: 400 })
      }
    }

    // Deactivate previous schedules
    const { error: deactivateError } = await supabase
      .from('staff_schedules')
      .update({ is_active: false })
      .eq('staff_id', staff_profile_id)
      .eq('is_active', true)

    if (deactivateError) {
      logger.warn('Error deactivating old schedules', {
        error: deactivateError.message,
        staffProfileId: staff_profile_id,
        tenantId: clinic,
      })
      // Continue anyway - not critical
    }

    // Create new schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('staff_schedules')
      .insert({
        staff_id: staff_profile_id,
        tenant_id: clinic,
        name,
        is_active: true,
        effective_from,
        effective_until: effective_to || null,
      })
      .select()
      .single()

    if (scheduleError || !schedule) {
      logger.error('Error creating schedule', {
        error: scheduleError?.message,
        staffProfileId: staff_profile_id,
        tenantId: clinic,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al crear horario' }, { status: 500 })
    }

    // Create schedule entries
    const scheduleEntries = entries.map(
      (entry: {
        day_of_week: number
        start_time: string
        end_time: string
        break_start?: string
        break_end?: string
        location?: string
      }) => ({
        schedule_id: schedule.id,
        day_of_week: entry.day_of_week,
        start_time: entry.start_time,
        end_time: entry.end_time,
        break_start: entry.break_start || null,
        break_end: entry.break_end || null,
        location: entry.location || null,
      })
    )

    const { error: entriesError } = await supabase
      .from('staff_schedule_entries')
      .insert(scheduleEntries)

    if (entriesError) {
      logger.error('Error creating schedule entries', {
        error: entriesError.message,
        scheduleId: schedule.id,
        staffProfileId: staff_profile_id,
        tenantId: clinic,
        userId: user.id,
      })
      // Rollback - delete the schedule
      await supabase.from('staff_schedules').delete().eq('id', schedule.id)
      return NextResponse.json({ error: 'Error al crear entradas de horario' }, { status: 500 })
    }

    // Fetch complete schedule with entries
    const { data: completeSchedule } = await supabase
      .from('staff_schedules')
      .select(
        `
        *,
        staff_schedule_entries (*)
      `
      )
      .eq('id', schedule.id)
      .single()

    return NextResponse.json(
      {
        data: completeSchedule,
        message: 'Horario creado exitosamente',
      },
      { status: 201 }
    )
  } catch (e) {
    logger.error('Error in schedule POST', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/schedule
 * Updates a schedule's active status or effective dates
 * Body: {
 *   schedule_id: string,
 *   clinic: string,
 *   is_active?: boolean,
 *   effective_to?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { schedule_id, clinic, is_active, effective_to } = body

    if (!schedule_id || !clinic) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify staff access
    const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
    if (!isStaff) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Get the schedule and check ownership
    const { data: schedule, error: scheduleError } = await supabase
      .from('staff_schedules')
      .select(
        `
        id,
        staff_id,
        staff_profiles!inner (
          profile_id,
          tenant_id
        )
      `
      )
      .eq('id', schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Horario no encontrado' }, { status: 404 })
    }

    const staffProfiles = schedule.staff_profiles as unknown as {
      profile_id: string
      tenant_id: string
    }
    if (staffProfiles.tenant_id !== clinic) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Check permissions
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'
    const isOwnProfile = staffProfiles.profile_id === user.id

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Solo puedes editar tu propio horario' }, { status: 403 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (typeof is_active === 'boolean') updates.is_active = is_active
    if (effective_to !== undefined) updates.effective_until = effective_to || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
    }

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('staff_schedules')
      .update(updates)
      .eq('id', schedule_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating schedule', {
        error: updateError.message,
        scheduleId: schedule_id,
        tenantId: clinic,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al actualizar horario' }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedSchedule,
      message: 'Horario actualizado exitosamente',
    })
  } catch (e) {
    logger.error('Error in schedule PATCH', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/staff/schedule
 * Deletes a schedule (soft delete by setting is_active to false)
 * Query params: schedule_id, clinic
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const scheduleId = searchParams.get('schedule_id')
  const clinic = searchParams.get('clinic')

  if (!scheduleId || !clinic) {
    return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
  }

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verify staff access - only admins can delete
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== clinic) {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar horarios' },
      { status: 403 }
    )
  }

  try {
    // Soft delete - just deactivate
    const { error: deleteError } = await supabase
      .from('staff_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId)

    if (deleteError) {
      logger.error('Error deleting schedule', {
        error: deleteError.message,
        scheduleId,
        tenantId: clinic,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al eliminar horario' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Horario eliminado exitosamente',
    })
  } catch (e) {
    logger.error('Error in schedule DELETE', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
