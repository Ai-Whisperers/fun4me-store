'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type {
  CalendarActionResult,
  TimeOffRequestWithDetails,
  TimeOffType,
  TimeOffBalance,
  TimeOffRequestFormData,
} from '@/lib/types/calendar'

// =============================================================================
// TIME OFF TYPES
// =============================================================================

/**
 * Get all time off types for a clinic
 */
export async function getTimeOffTypes(clinicSlug: string): Promise<{
  types: TimeOffType[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { types: [], error: 'No autorizado' }
  }

  // Check if user belongs to this tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tenant_id !== clinicSlug) {
    return { types: [], error: 'No tienes acceso a esta información' }
  }

  const { data: types, error } = await supabase
    .from('time_off_types')
    .select('*')
    .eq('tenant_id', clinicSlug)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    logger.error('Failed to get time off types', {
      error,
      tenant: clinicSlug,
      userId: user.id,
    })
    return { types: [], error: 'Error al obtener tipos de ausencia' }
  }

  return { types: types || [] }
}

// =============================================================================
// TIME OFF REQUESTS
// =============================================================================

/**
 * Get time off requests for a clinic
 * Staff can see all, owners can see their own
 */
export async function getTimeOffRequests(
  clinicSlug: string,
  filters?: {
    staffProfileId?: string
    status?: string
    startDate?: string
    endDate?: string
  }
): Promise<{
  requests: TimeOffRequestWithDetails[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { requests: [], error: 'No autorizado' }
  }

  // Check user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tenant_id !== clinicSlug) {
    return { requests: [], error: 'No tienes acceso a esta información' }
  }

  const isStaff = ['vet', 'admin'].includes(profile.role)

  // Build query
  let query = supabase
    .from('time_off_requests')
    .select(
      `
      *,
      time_off_type:time_off_types(
        id,
        code,
        name,
        description,
        is_paid,
        requires_approval,
        max_days_per_year,
        min_notice_days,
        color_code,
        is_active
      )
    `
    )
    .eq('tenant_id', clinicSlug)
    .order('start_date', { ascending: false })

  // If not staff, only show own requests
  if (!isStaff) {
    // Get user's staff profile
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', clinicSlug)
      .single()

    if (!staffProfile) {
      return { requests: [] }
    }

    query = query.eq('staff_profile_id', staffProfile.id)
  }

  // Apply filters
  if (filters?.staffProfileId) {
    query = query.eq('staff_profile_id', filters.staffProfileId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.startDate) {
    query = query.gte('start_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('end_date', filters.endDate)
  }

  const { data: requests, error } = await query

  if (error) {
    logger.error('Failed to get time off requests', {
      error,
      tenant: clinicSlug,
      userId: user.id,
    })
    return { requests: [], error: 'Error al obtener solicitudes' }
  }

  if (!requests || requests.length === 0) {
    return { requests: [] }
  }

  // Get staff profile info for each request
  const staffProfileIds = [...new Set(requests.map((r) => r.staff_profile_id))]
  // Non-null assertions safe: filter ensures these values exist
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const reviewerIds = [...new Set(requests.filter((r) => r.reviewed_by).map((r) => r.reviewed_by!))]
  const coveringIds = [
    ...new Set(requests.filter((r) => r.covering_staff_id).map((r) => r.covering_staff_id!)),
  ]
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  // Get staff profiles
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('id, user_id, job_title, color_code')
    .in('id', staffProfileIds)

  // Get user profiles for staff
  const userIds = staffProfiles?.map((sp) => sp.user_id) || []
  const allUserIds = [...new Set([...userIds, ...reviewerIds, ...coveringIds])]

  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', allUserIds)

  // Merge data
  const requestsWithDetails = requests.map((request) => {
    const staffProfile = staffProfiles?.find((sp) => sp.id === request.staff_profile_id)
    const userProfile = staffProfile
      ? userProfiles?.find((up) => up.id === staffProfile.user_id)
      : undefined
    const reviewer = request.reviewed_by
      ? userProfiles?.find((up) => up.id === request.reviewed_by)
      : undefined
    const coveringStaff = request.covering_staff_id
      ? userProfiles?.find((up) => up.id === request.covering_staff_id)
      : undefined

    return {
      ...request,
      time_off_type: request.time_off_type as TimeOffType,
      staff: {
        id: staffProfile?.id || '',
        full_name: userProfile?.full_name || 'Sin nombre',
        job_title: staffProfile?.job_title,
        color_code: staffProfile?.color_code,
        avatar_url: userProfile?.avatar_url,
      },
      reviewer: reviewer ? { full_name: reviewer.full_name } : null,
      covering_staff: coveringStaff ? { full_name: coveringStaff.full_name } : null,
    }
  })

  return { requests: requestsWithDetails as TimeOffRequestWithDetails[] }
}

/**
 * Create a time off request
 */
export async function createTimeOffRequest(
  clinicSlug: string,
  data: TimeOffRequestFormData
): Promise<CalendarActionResult & { requestId?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Get user's staff profile
  const { data: staffProfile } = await supabase
    .from('staff_profiles')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .eq('tenant_id', clinicSlug)
    .single()

  if (!staffProfile) {
    return { error: 'No tienes un perfil de personal en esta clínica' }
  }

  // Validate time off type exists
  const { data: timeOffType } = await supabase
    .from('time_off_types')
    .select('id, requires_approval, min_notice_days, max_days_per_year')
    .eq('id', data.time_off_type_id)
    .eq('tenant_id', clinicSlug)
    .single()

  if (!timeOffType) {
    return { error: 'Tipo de ausencia no válido' }
  }

  // Validate dates
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (startDate > endDate) {
    return { error: 'La fecha de inicio debe ser anterior a la fecha de fin' }
  }

  // Check minimum notice
  if (timeOffType.min_notice_days) {
    const minNoticeDate = new Date(today)
    minNoticeDate.setDate(minNoticeDate.getDate() + timeOffType.min_notice_days)

    if (startDate < minNoticeDate) {
      return {
        error: `Se requieren al menos ${timeOffType.min_notice_days} días de anticipación`,
      }
    }
  }

  // Calculate total days
  const msPerDay = 1000 * 60 * 60 * 24
  let totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay) + 1

  // Adjust for half days
  if (data.start_half_day) totalDays -= 0.5
  if (data.end_half_day) totalDays -= 0.5

  // Check max days per year
  if (timeOffType.max_days_per_year) {
    // Get current year's usage
    const currentYear = new Date().getFullYear()
    const { data: yearRequests } = await supabase
      .from('time_off_requests')
      .select('total_days')
      .eq('staff_profile_id', staffProfile.id)
      .eq('time_off_type_id', data.time_off_type_id)
      .in('status', ['approved', 'pending'])
      .gte('start_date', `${currentYear}-01-01`)
      .lte('start_date', `${currentYear}-12-31`)

    const usedDays = yearRequests?.reduce((sum, r) => sum + (r.total_days || 0), 0) || 0

    if (usedDays + totalDays > timeOffType.max_days_per_year) {
      return {
        error: `Excede el límite anual de ${timeOffType.max_days_per_year} días. Ya tienes ${usedDays} días solicitados.`,
      }
    }
  }

  // Check for overlapping requests
  const { data: overlapping } = await supabase
    .from('time_off_requests')
    .select('id')
    .eq('staff_profile_id', staffProfile.id)
    .in('status', ['approved', 'pending'])
    .or(`and(start_date.lte.${data.end_date},end_date.gte.${data.start_date})`)

  if (overlapping && overlapping.length > 0) {
    return { error: 'Ya tienes una solicitud para estas fechas' }
  }

  // Create request
  const status = timeOffType.requires_approval ? 'pending' : 'approved'

  const { data: request, error } = await supabase
    .from('time_off_requests')
    .insert({
      staff_profile_id: staffProfile.id,
      tenant_id: clinicSlug,
      time_off_type_id: data.time_off_type_id,
      start_date: data.start_date,
      end_date: data.end_date,
      start_half_day: data.start_half_day || false,
      end_half_day: data.end_half_day || false,
      total_days: totalDays,
      reason: data.reason || null,
      status,
      requested_at: new Date().toISOString(),
      reviewed_at: !timeOffType.requires_approval ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !request) {
    logger.error('Failed to create time off request', {
      error,
      tenant: clinicSlug,
      userId: user.id,
      staffProfileId: staffProfile.id,
    })
    return { error: 'Error al crear solicitud' }
  }

  revalidatePath('/[clinic]/dashboard/calendar')
  revalidatePath('/[clinic]/dashboard/time-off')

  return { success: true, requestId: request.id }
}

/**
 * Update time off request status (approve/deny)
 * Admin only
 */
export async function updateTimeOffRequestStatus(
  requestId: string,
  status: 'approved' | 'denied',
  reviewNotes?: string
): Promise<CalendarActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Get request
  const { data: request } = await supabase
    .from('time_off_requests')
    .select('id, tenant_id, status')
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: 'Solicitud no encontrada' }
  }

  // Check admin permission
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== request.tenant_id) {
    return { error: 'Solo administradores pueden aprobar/rechazar solicitudes' }
  }

  // Check request is pending
  if (request.status !== 'pending') {
    return { error: 'Esta solicitud ya fue procesada' }
  }

  // Update request
  const { error: updateError } = await supabase
    .from('time_off_requests')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', requestId)

  if (updateError) {
    logger.error('Failed to update time off request status', {
      error: updateError,
      requestId,
      status,
      reviewerId: user.id,
    })
    return { error: 'Error al actualizar solicitud' }
  }

  revalidatePath('/[clinic]/dashboard/calendar')
  revalidatePath('/[clinic]/dashboard/time-off')

  return { success: true }
}

/**
 * Cancel a time off request
 * Only the requesting staff or admin can cancel
 */
export async function cancelTimeOffRequest(requestId: string): Promise<CalendarActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Get request with staff profile
  const { data: request } = await supabase
    .from('time_off_requests')
    .select(
      `
      id,
      tenant_id,
      status,
      staff_profile:staff_profiles!inner(user_id)
    `
    )
    .eq('id', requestId)
    .single()

  if (!request) {
    return { error: 'Solicitud no encontrada' }
  }

  const staffProfile = request.staff_profile as unknown as { user_id: string }

  // Check permission - must be the requester or admin
  const isRequester = staffProfile.user_id === user.id

  if (!isRequester) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin' || profile.tenant_id !== request.tenant_id) {
      return { error: 'No tienes permiso para cancelar esta solicitud' }
    }
  }

  // Check if can be cancelled
  if (!['pending', 'approved'].includes(request.status)) {
    return { error: 'Esta solicitud no puede ser cancelada' }
  }

  // Update status
  const newStatus = isRequester ? 'withdrawn' : 'cancelled'

  const { error: updateError } = await supabase
    .from('time_off_requests')
    .update({ status: newStatus })
    .eq('id', requestId)

  if (updateError) {
    logger.error('Failed to cancel time off request', {
      error: updateError,
      requestId,
      userId: user.id,
    })
    return { error: 'Error al cancelar solicitud' }
  }

  revalidatePath('/[clinic]/dashboard/calendar')
  revalidatePath('/[clinic]/dashboard/time-off')

  return { success: true }
}

// =============================================================================
// TIME OFF BALANCES
// =============================================================================

/**
 * Get time off balances for a staff member
 */
export async function getTimeOffBalances(
  clinicSlug: string,
  staffProfileId?: string
): Promise<{
  balances: TimeOffBalance[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { balances: [], error: 'No autorizado' }
  }

  // Check user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tenant_id !== clinicSlug) {
    return { balances: [], error: 'No tienes acceso a esta información' }
  }

  // Determine which staff profile to query
  let targetStaffProfileId = staffProfileId

  if (!targetStaffProfileId) {
    // Get user's own staff profile
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', clinicSlug)
      .single()

    if (!staffProfile) {
      return { balances: [] }
    }

    targetStaffProfileId = staffProfile.id
  } else {
    // Only staff can view other's balances
    const isStaff = ['vet', 'admin'].includes(profile.role)
    if (!isStaff) {
      return { balances: [], error: 'No tienes permiso para ver esta información' }
    }
  }

  // Get balances with type info
  const currentYear = new Date().getFullYear()

  const { data: balances, error } = await supabase
    .from('time_off_balances')
    .select(
      `
      *,
      time_off_type:time_off_types(
        id,
        code,
        name,
        description,
        is_paid,
        requires_approval,
        max_days_per_year,
        min_notice_days,
        color_code,
        is_active
      )
    `
    )
    .eq('staff_profile_id', targetStaffProfileId)
    .eq('year', currentYear)

  if (error) {
    logger.error('Failed to get time off balances', {
      error,
      tenant: clinicSlug,
      userId: user.id,
      staffProfileId: targetStaffProfileId,
    })
    return { balances: [], error: 'Error al obtener saldos' }
  }

  return { balances: balances || [] }
}

// =============================================================================
// PENDING REQUESTS COUNT
// =============================================================================

/**
 * Get count of pending time off requests
 * For admin dashboard
 */
export async function getPendingTimeOffCount(clinicSlug: string): Promise<{
  count: number
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { count: 0, error: 'No autorizado' }
  }

  // Check admin permission
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinicSlug) {
    return { count: 0 }
  }

  const { count, error } = await supabase
    .from('time_off_requests')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', clinicSlug)
    .eq('status', 'pending')

  if (error) {
    logger.error('Failed to get pending time off count', {
      error,
      tenant: clinicSlug,
      userId: user.id,
    })
    return { count: 0, error: 'Error al obtener conteo' }
  }

  return { count: count || 0 }
}
