import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/staff/time-off
 * Fetches time off requests
 * Query params:
 *   - clinic (required): tenant_id
 *   - staff_id (optional): filter by staff member
 *   - status (optional): filter by status (pending, approved, denied, cancelled, withdrawn)
 *   - start_date (optional): filter requests starting from this date
 *   - end_date (optional): filter requests ending before this date
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const clinicSlug = searchParams.get('clinic')
  const staffId = searchParams.get('staff_id')
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

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
    // Get user profile to check role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'

    // Build query
    let query = supabase
      .from('time_off_requests')
      .select(
        `
        *,
        staff_profiles!inner (
          id,
          user_id,
          job_title,
          profiles!staff_profiles_user_id_fkey (
            full_name,
            email
          )
        ),
        time_off_types (
          code,
          name,
          color_code,
          is_paid
        ),
        reviewer:profiles!time_off_requests_reviewed_by_fkey (
          full_name
        ),
        covering_staff:staff_profiles!time_off_requests_covering_staff_id_fkey (
          profiles!staff_profiles_user_id_fkey (
            full_name
          )
        )
      `
      )
      .eq('tenant_id', clinicSlug)
      .order('start_date', { ascending: true })

    // Non-admins can only see their own requests
    if (!isAdmin) {
      // Get user's staff profile ID
      const { data: staffProfile } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', clinicSlug)
        .single()

      if (!staffProfile) {
        return NextResponse.json({ data: [] })
      }
      query = query.eq('staff_profile_id', staffProfile.id)
    } else if (staffId) {
      query = query.eq('staff_profile_id', staffId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('start_date', startDate)
    }

    if (endDate) {
      query = query.lte('end_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching time off requests', {
        error: error.message,
        tenantId: clinicSlug,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 })
    }

    // Transform data
    const requests =
      data?.map((req) => {
        const staffProfiles = req.staff_profiles as {
          id: string
          user_id: string
          job_title: string
          profiles: { full_name: string; email: string } | null
        }
        const timeOffType = req.time_off_types as {
          code: string
          name: string
          color_code: string
          is_paid: boolean
        } | null
        const reviewer = req.reviewer as { full_name: string } | null
        const coveringStaff = req.covering_staff as {
          profiles: { full_name: string } | null
        } | null

        return {
          id: req.id,
          staff_profile_id: req.staff_profile_id,
          staff_name: staffProfiles?.profiles?.full_name || 'Sin nombre',
          staff_email: staffProfiles?.profiles?.email,
          job_title: staffProfiles?.job_title,
          type: {
            code: timeOffType?.code || 'UNKNOWN',
            name: timeOffType?.name || 'Desconocido',
            color: timeOffType?.color_code || '#6B7280',
            is_paid: timeOffType?.is_paid ?? true,
          },
          start_date: req.start_date,
          end_date: req.end_date,
          start_half_day: req.start_half_day,
          end_half_day: req.end_half_day,
          total_days: req.total_days,
          reason: req.reason,
          status: req.status,
          requested_at: req.requested_at,
          reviewed_by: reviewer?.full_name,
          reviewed_at: req.reviewed_at,
          review_notes: req.review_notes,
          coverage_notes: req.coverage_notes,
          covering_staff_name: coveringStaff?.profiles?.full_name,
        }
      }) || []

    return NextResponse.json({
      data: requests,
      clinic: clinicSlug,
    })
  } catch (e) {
    logger.error('Error in time-off GET', {
      error: e instanceof Error ? e.message : 'Unknown',
      tenantId: clinicSlug,
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/staff/time-off
 * Creates a new time off request
 * Body: {
 *   clinic: string,
 *   time_off_type_id: string,
 *   start_date: string (YYYY-MM-DD),
 *   end_date: string (YYYY-MM-DD),
 *   start_half_day?: boolean,
 *   end_half_day?: boolean,
 *   reason?: string,
 *   coverage_notes?: string,
 *   covering_staff_id?: string
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
      clinic,
      time_off_type_id,
      start_date,
      end_date,
      start_half_day = false,
      end_half_day = false,
      reason,
      coverage_notes,
      covering_staff_id,
    } = body

    // Validate required fields
    if (!clinic || !time_off_type_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify staff access
    const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
    if (!isStaff) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Get user's staff profile
    const { data: staffProfile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', clinic)
      .single()

    if (profileError || !staffProfile) {
      return NextResponse.json({ error: 'No se encontró perfil de empleado' }, { status: 404 })
    }

    // Validate dates
    const startDateObj = new Date(start_date)
    const endDateObj = new Date(end_date)

    if (endDateObj < startDateObj) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      )
    }

    // Calculate total days
    const daysDiff =
      Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
    let totalDays = daysDiff
    if (start_half_day) totalDays -= 0.5
    if (end_half_day) totalDays -= 0.5

    // Validate time off type exists
    const { data: timeOffType, error: typeError } = await supabase
      .from('time_off_types')
      .select('id, requires_approval, min_notice_days')
      .eq('id', time_off_type_id)
      .single()

    if (typeError || !timeOffType) {
      return NextResponse.json({ error: 'Tipo de ausencia no válido' }, { status: 400 })
    }

    // Check minimum notice
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const noticeDays = Math.ceil((startDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (timeOffType.min_notice_days && noticeDays < timeOffType.min_notice_days) {
      return NextResponse.json(
        { error: `Se requiere un aviso mínimo de ${timeOffType.min_notice_days} días` },
        { status: 400 }
      )
    }

    // Check for overlapping requests
    const { data: overlapping } = await supabase
      .from('time_off_requests')
      .select('id')
      .eq('staff_profile_id', staffProfile.id)
      .in('status', ['pending', 'approved'])
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .limit(1)

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud para este período' },
        { status: 400 }
      )
    }

    // Create request
    const { data: newRequest, error: createError } = await supabase
      .from('time_off_requests')
      .insert({
        staff_profile_id: staffProfile.id,
        tenant_id: clinic,
        time_off_type_id,
        start_date,
        end_date,
        start_half_day,
        end_half_day,
        total_days: totalDays,
        reason: reason || null,
        status: timeOffType.requires_approval ? 'pending' : 'approved',
        coverage_notes: coverage_notes || null,
        covering_staff_id: covering_staff_id || null,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating time off request', {
        error: createError.message,
        tenantId: clinic,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: newRequest,
        message: timeOffType.requires_approval
          ? 'Solicitud enviada para aprobación'
          : 'Ausencia registrada exitosamente',
      },
      { status: 201 }
    )
  } catch (e) {
    logger.error('Error in time-off POST', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/time-off
 * Approves, denies, or withdraws a time off request
 * Body: {
 *   request_id: string,
 *   clinic: string,
 *   action: 'approve' | 'deny' | 'withdraw' | 'cancel',
 *   review_notes?: string
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
    const { request_id, clinic, action, review_notes } = body

    if (!request_id || !clinic || !action) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const validActions = ['approve', 'deny', 'withdraw', 'cancel']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    // Verify staff access
    const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
    if (!isStaff) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userProfile?.role === 'admin'

    // Get the request
    const { data: timeOffRequest, error: requestError } = await supabase
      .from('time_off_requests')
      .select(
        `
        *,
        staff_profiles!inner (
          user_id
        )
      `
      )
      .eq('id', request_id)
      .eq('tenant_id', clinic)
      .single()

    if (requestError || !timeOffRequest) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const staffProfiles = timeOffRequest.staff_profiles as { user_id: string }
    const isOwner = staffProfiles.user_id === user.id

    // Validate permissions based on action
    if (action === 'approve' || action === 'deny') {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Solo administradores pueden aprobar o denegar solicitudes' },
          { status: 403 }
        )
      }
      if (timeOffRequest.status !== 'pending') {
        return NextResponse.json(
          { error: 'Solo se pueden aprobar/denegar solicitudes pendientes' },
          { status: 400 }
        )
      }
    }

    if (action === 'withdraw') {
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Solo puedes retirar tus propias solicitudes' },
          { status: 403 }
        )
      }
      if (timeOffRequest.status !== 'pending') {
        return NextResponse.json(
          { error: 'Solo se pueden retirar solicitudes pendientes' },
          { status: 400 }
        )
      }
    }

    if (action === 'cancel') {
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: 'No tienes permiso para cancelar esta solicitud' },
          { status: 403 }
        )
      }
      if (timeOffRequest.status !== 'approved') {
        return NextResponse.json(
          { error: 'Solo se pueden cancelar solicitudes aprobadas' },
          { status: 400 }
        )
      }
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      approve: 'approved',
      deny: 'denied',
      withdraw: 'withdrawn',
      cancel: 'cancelled',
    }

    // Update request
    const updates: Record<string, unknown> = {
      status: statusMap[action],
    }

    if (action === 'approve' || action === 'deny') {
      updates.reviewed_by = user.id
      updates.reviewed_at = new Date().toISOString()
      if (review_notes) {
        updates.review_notes = review_notes
      }
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('time_off_requests')
      .update(updates)
      .eq('id', request_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating time off request', {
        error: updateError.message,
        requestId: request_id,
        action,
        tenantId: clinic,
        userId: user.id,
      })
      return NextResponse.json({ error: 'Error al actualizar solicitud' }, { status: 500 })
    }

    const actionMessages: Record<string, string> = {
      approve: 'Solicitud aprobada',
      deny: 'Solicitud denegada',
      withdraw: 'Solicitud retirada',
      cancel: 'Ausencia cancelada',
    }

    return NextResponse.json({
      data: updatedRequest,
      message: actionMessages[action],
    })
  } catch (e) {
    logger.error('Error in time-off PATCH', {
      error: e instanceof Error ? e.message : 'Unknown',
      userId: user?.id,
    })
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * GET /api/staff/time-off/types
 * Fetches time off types
 */
export async function OPTIONS(request: NextRequest) {
  // Not implementing OPTIONS - use separate route for types
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
