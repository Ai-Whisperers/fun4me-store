'use server'

import { withActionAuth } from '@/lib/auth'
import type { AuthContext } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * Cancel an appointment
 * Can be used by pet owners (for their pets) or staff (for any appointment in their tenant)
 */
export const cancelAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string, reason?: string) => {
    // Get appointment with pet to verify ownership
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        tenant_id,
        start_time,
        status,
        pets!inner(owner_id)
      `
      )
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return actionError('Cita no encontrada')
    }

    // Transform pets array to single object (Supabase returns array from join)
    const pet = Array.isArray(appointment.pets) ? appointment.pets[0] : appointment.pets

    // Authorization: Check if user is pet owner or staff
    const isOwner = pet.owner_id === user.id
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const sameTenant = profile.tenant_id === appointment.tenant_id

    if (!isOwner && !(isStaff && sameTenant)) {
      return actionError('No tienes permiso para cancelar esta cita')
    }

    // Check if appointment is in the future
    const appointmentDateTime = new Date(appointment.start_time)
    if (appointmentDateTime < new Date()) {
      return actionError('No se puede cancelar una cita pasada')
    }

    // Check if already cancelled or completed
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return actionError('Esta cita ya no puede ser cancelada')
    }

    // Update appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: reason
          ? `[Cancelado] ${reason}`
          : appointment.status === 'scheduled'
            ? '[Cancelado por el cliente]'
            : '[Cancelado]',
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('Cancel appointment error', {
        appointmentId,
        tenantId: appointment.tenant_id,
        userId: user.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al cancelar la cita')
    }

    // Revalidate paths
    revalidatePath(`/[clinic]/portal/appointments`)
    revalidatePath(`/[clinic]/portal/dashboard`)
    revalidatePath(`/[clinic]/portal/schedule`)

    return actionSuccess()
  }
)

/**
 * Reschedule an appointment to a new date/time
 * Pet owners and staff can reschedule appointments
 * 
 * Uses atomic database function to prevent race condition double-booking.
 * The function uses row-level locks to serialize concurrent reschedule attempts.
 */
export const rescheduleAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string, newDate: string, newTime: string) => {
    // Parse and validate new date/time early
    const newDateTime = new Date(`${newDate}T${newTime}`)
    if (isNaN(newDateTime.getTime())) {
      return actionError('Fecha u hora inválida')
    }

    if (newDateTime < new Date()) {
      return actionError('La nueva fecha debe ser en el futuro')
    }

    // Determine if user is staff
    const isStaff = ['vet', 'admin'].includes(profile.role)

    // Use atomic reschedule function to prevent race conditions
    // This function acquires row locks, validates authorization, checks for conflicts,
    // and updates the appointment in a single atomic operation
    const { data: result, error: rpcError } = await supabase.rpc(
      'reschedule_appointment_atomic',
      {
        p_appointment_id: appointmentId,
        p_new_start_time: newDateTime.toISOString(),
        p_user_id: user.id,
        p_is_staff: isStaff,
      }
    )

    if (rpcError) {
      logger.error('Reschedule appointment RPC error', {
        appointmentId,
        tenantId: profile.tenant_id,
        userId: user.id,
        newDate,
        newTime,
        error: rpcError.message,
        code: rpcError.code,
      })

      // Provide specific error messages based on error code
      if (rpcError.code === '42883') {
        // Function doesn't exist - database not migrated
        return actionError('Sistema no actualizado. Contacte al administrador.')
      }

      return actionError('Error al reprogramar la cita')
    }

    // Handle atomic function response
    if (!result?.success) {
      const errorMessage = result?.message || 'Error al reprogramar la cita'
      
      logger.warn('Reschedule appointment rejected', {
        appointmentId,
        errorCode: result?.error,
        message: errorMessage,
      })

      return actionError(errorMessage)
    }

    // Revalidate paths
    revalidatePath(`/[clinic]/portal/appointments`)
    revalidatePath(`/[clinic]/portal/dashboard`)
    revalidatePath(`/[clinic]/portal/schedule`)

    logger.info('Appointment rescheduled successfully', {
      appointmentId,
      tenantId: profile.tenant_id,
      userId: user.id,
      newStartTime: result.new_start_time,
      newEndTime: result.new_end_time,
    })

    return actionSuccess({ newDate, newTime })
  }
)

/**
 * Book a new appointment
 * Pet owners and staff can book appointments
 * 
 * Uses atomic database function to prevent race condition double-booking.
 * The function uses row-level locks to serialize concurrent booking attempts.
 */
export const bookAppointment = withActionAuth(
  async (
    { user, profile, supabase },
    params: {
      tenantId: string
      petId: string
      serviceId: string
      vetId: string
      startTime: string // ISO 8601 format
      durationMinutes?: number
      reason?: string
      notes?: string
    }
  ) => {
    const {
      tenantId,
      petId,
      serviceId,
      vetId,
      startTime,
      durationMinutes = 30,
      reason,
      notes,
    } = params

    // Validate tenant access
    if (profile.tenant_id !== tenantId) {
      return actionError('No tienes acceso a esta clínica')
    }

    // Parse and validate start time
    const startDateTime = new Date(startTime)
    if (isNaN(startDateTime.getTime())) {
      return actionError('Fecha u hora inválida')
    }

    if (startDateTime < new Date()) {
      return actionError('La fecha de la cita debe ser en el futuro')
    }

    // Use atomic booking function to prevent race conditions
    // This function acquires row locks, validates entities, checks for conflicts,
    // and creates the appointment in a single atomic operation
    const { data: result, error: rpcError } = await supabase.rpc('book_appointment_atomic', {
      p_tenant_id: tenantId,
      p_pet_id: petId,
      p_service_id: serviceId,
      p_vet_id: vetId,
      p_start_time: startTime,
      p_duration_minutes: durationMinutes,
      p_reason: reason || null,
      p_notes: notes || null,
      p_booked_by: user.id,
    })

    if (rpcError) {
      logger.error('Book appointment RPC error', {
        tenantId,
        petId,
        serviceId,
        vetId,
        userId: user.id,
        error: rpcError.message,
        code: rpcError.code,
      })

      // Provide specific error messages based on error code
      if (rpcError.code === '42883') {
        // Function doesn't exist - database not migrated
        return actionError('Sistema no actualizado. Contacte al administrador.')
      }

      return actionError('Error al crear la cita')
    }

    // Handle atomic function response
    if (!result?.success) {
      const errorMessage = result?.message || 'Error al crear la cita'

      logger.warn('Book appointment rejected', {
        tenantId,
        petId,
        errorCode: result?.error,
        message: errorMessage,
      })

      return actionError(errorMessage)
    }

    // Revalidate paths
    revalidatePath(`/[clinic]/portal/appointments`)
    revalidatePath(`/[clinic]/portal/dashboard`)
    revalidatePath(`/[clinic]/portal/schedule`)
    revalidatePath(`/[clinic]/dashboard/appointments`)
    revalidatePath(`/[clinic]/dashboard/calendar`)

    logger.info('Appointment booked successfully', {
      appointmentId: result.appointment_id,
      tenantId,
      petId,
      serviceId,
      vetId,
      userId: user.id,
      startTime: result.start_time,
      endTime: result.end_time,
    })

    return actionSuccess({
      appointmentId: result.appointment_id,
      startTime: result.start_time,
      endTime: result.end_time,
      status: result.status,
    })
  }
)

/**
 * Get appointments for the current user (pet owner)
 * Returns both upcoming and past appointments
 */
export const getOwnerAppointments = withActionAuth(
  async ({ user, supabase }, clinicSlug: string) => {
    // Get all appointments for pets owned by this user in this clinic
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        tenant_id,
        start_time,
        end_time,
        status,
        reason,
        notes,
        pets!inner(
          id,
          name,
          species,
          photo_url,
          owner_id
        )
      `
      )
      .eq('tenant_id', clinicSlug)
      .eq('pets.owner_id', user.id)
      .order('start_time', { ascending: false })

    if (error) {
      logger.error('Get appointments error', {
        clinicSlug,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Error al obtener las citas')
    }

    // Transform pets array to single pet object (Supabase returns array from join)
    const transformedAppointments =
      appointments?.map((a) => ({
        ...a,
        pets: Array.isArray(a.pets) ? a.pets[0] : a.pets,
      })) || []

    // Split into upcoming and past
    const now = new Date()
    const upcoming = transformedAppointments
      .filter((a) => new Date(a.start_time) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    const past = transformedAppointments
      .filter((a) => new Date(a.start_time) < now || a.status === 'cancelled')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

    return actionSuccess({ upcoming, past })
  }
)

// =============================================================================
// STAFF ACTIONS - Appointment Workflow Management
// =============================================================================

/**
 * Check in a patient (mark as arrived)
 * Staff only
 */
export const checkInAppointment = withActionAuth(
  async ({ user, profile, supabase }: AuthContext, appointmentId: string) => {
    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, tenant_id, status')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return actionError('Cita no encontrada')
    }

    // Verify staff permission
    if (profile.tenant_id !== appointment.tenant_id) {
      return actionError('Solo el personal puede registrar llegadas')
    }

    // Validate status
    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return actionError(`No se puede registrar llegada para estado: ${appointment.status}`)
    }

    // Update
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('Check-in error', {
        appointmentId,
        tenantId: profile.tenant_id,
        userId: user.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al registrar llegada')
    }

    revalidatePath('/[clinic]/dashboard/appointments')
    revalidatePath('/[clinic]/portal/appointments')
    return actionSuccess()
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Start an appointment (mark as in progress)
 * Staff only
 */
export const startAppointment = withActionAuth(
  async ({ user, profile, supabase }: AuthContext, appointmentId: string) => {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, tenant_id, status')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return actionError('Cita no encontrada')
    }

    if (profile.tenant_id !== appointment.tenant_id) {
      return actionError('Solo el personal puede iniciar consultas')
    }

    if (appointment.status !== 'checked_in') {
      return actionError('El paciente debe estar registrado para iniciar la consulta')
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('Start appointment error', {
        appointmentId,
        tenantId: profile.tenant_id,
        userId: user.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al iniciar consulta')
    }

    revalidatePath('/[clinic]/dashboard/appointments')
    return actionSuccess()
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Complete an appointment
 * Staff only
 */
export const completeAppointment = withActionAuth(
  async ({ user, profile, supabase }: AuthContext, appointmentId: string, notes?: string) => {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, tenant_id, status, notes')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return actionError('Cita no encontrada')
    }

    if (profile.tenant_id !== appointment.tenant_id) {
      return actionError('Solo el personal puede completar citas')
    }

    if (!['checked_in', 'in_progress'].includes(appointment.status)) {
      return actionError(`No se puede completar una cita con estado: ${appointment.status}`)
    }

    const updateData: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    }

    if (notes) {
      updateData.notes = appointment.notes
        ? `${appointment.notes}\n[Notas de cierre] ${notes}`
        : `[Notas de cierre] ${notes}`
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('Complete appointment error', {
        appointmentId,
        tenantId: profile.tenant_id,
        userId: user.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al completar la cita')
    }

    revalidatePath('/[clinic]/dashboard/appointments')
    revalidatePath('/[clinic]/portal/appointments')
    return actionSuccess()
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Mark a patient as no-show
 * Staff only
 */
export const markNoShow = withActionAuth(
  async ({ profile, supabase }: AuthContext, appointmentId: string) => {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, tenant_id, status')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return actionError('Cita no encontrada')
    }

    if (profile.tenant_id !== appointment.tenant_id) {
      return actionError('Solo el personal puede marcar no presentados')
    }

    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return actionError('Solo se puede marcar como no presentado a citas programadas o confirmadas')
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'no_show',
        notes: '[No se presentó]',
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('Mark no-show error', {
        appointmentId,
        tenantId: profile.tenant_id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al marcar no presentado')
    }

    revalidatePath('/[clinic]/dashboard/appointments')
    revalidatePath('/[clinic]/portal/appointments')
    return actionSuccess()
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Get today's appointments for staff dashboard
 * Staff only
 */
export const getStaffAppointments = withActionAuth(
  async (
    { profile, supabase }: AuthContext,
    clinicSlug: string,
    date?: string,
    statusFilter?: string
  ) => {
    if (profile.tenant_id !== clinicSlug) {
      return actionError('Solo el personal puede ver esta información')
    }

    const targetDate = date || new Date().toISOString().split('T')[0]

    let query = supabase
      .from('appointments')
      .select(
        `
        id,
        tenant_id,
        start_time,
        end_time,
        status,
        reason,
        notes,
        checked_in_at,
        started_at,
        pets (
          id,
          name,
          species,
          photo_url,
          owner:profiles!pets_owner_id_fkey (
            id,
            full_name,
            phone
          )
        )
      `
      )
      .eq('tenant_id', clinicSlug)
      .gte('start_time', `${targetDate}T00:00:00`)
      .lt('start_time', `${targetDate}T23:59:59`)
      .order('start_time', { ascending: true })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: appointments, error } = await query

    if (error) {
      logger.error('Get staff appointments error', {
        clinicSlug,
        tenantId: profile.tenant_id,
        date: targetDate,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Error al obtener citas')
    }

    // Transform the nested data
    const transformedAppointments =
      appointments?.map((apt) => ({
        ...apt,
        pets: Array.isArray(apt.pets) ? apt.pets[0] : apt.pets,
      })) || []

    return actionSuccess(transformedAppointments)
  },
  { roles: ['vet', 'admin'] }
)

// =============================================================================
// APPOINTMENT SLOT AVAILABILITY
// =============================================================================

interface AvailabilitySlot {
  time: string
  available: boolean
}

interface CheckSlotsParams {
  clinicSlug: string
  date: string
  slotDurationMinutes?: number
  workStart?: string
  workEnd?: string
  breakStart?: string
  breakEnd?: string
  vetId?: string
}

/**
 * Check available appointment slots for a given date
 * Uses the database function to properly check overlaps and respect working hours
 */
export async function checkAvailableSlots(
  params: CheckSlotsParams
): Promise<{ data: AvailabilitySlot[] | null; error: string | null }> {
  const supabase = await createClient()

  const {
    clinicSlug,
    date,
    slotDurationMinutes = 30,
    workStart = '08:00',
    workEnd = '18:00',
    breakStart = '12:00',
    breakEnd = '14:00',
    vetId,
  } = params

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return { data: null, error: 'Formato de fecha inválido' }
  }

  // Validate time formats
  const timeRegex = /^\d{2}:\d{2}$/
  if (
    !timeRegex.test(workStart) ||
    !timeRegex.test(workEnd) ||
    !timeRegex.test(breakStart) ||
    !timeRegex.test(breakEnd)
  ) {
    return { data: null, error: 'Formato de hora inválido' }
  }

  try {
    // Call the database function to get available slots
    const { data: slots, error } = await supabase.rpc('get_available_slots', {
      p_tenant_id: clinicSlug,
      p_date: date,
      p_slot_duration_minutes: slotDurationMinutes,
      p_work_start: workStart,
      p_work_end: workEnd,
      p_break_start: breakStart,
      p_break_end: breakEnd,
      p_vet_id: vetId || null,
    })

    if (error) {
      logger.error('Error fetching available slots', {
        clinicSlug,
        date,
        error: error instanceof Error ? error.message : String(error),
      })
      return { data: null, error: 'Error al obtener horarios disponibles' }
    }

    // Transform the response to match the expected format
    const availableSlots: AvailabilitySlot[] =
      slots?.map((slot: { slot_time: string; is_available: boolean }) => ({
        time: slot.slot_time,
        available: slot.is_available,
      })) || []

    return { data: availableSlots, error: null }
  } catch (e: unknown) {
    logger.error('Unexpected error checking slots', {
      clinicSlug,
      date,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return { data: null, error: 'Error inesperado al verificar disponibilidad' }
  }
}

/**
 * Reschedule an appointment via drag-and-drop in the calendar
 * Staff only - accepts Date objects directly for easier integration
 *
 * Uses atomic database function to prevent race condition double-booking.
 * The function uses advisory locks to serialize concurrent reschedule attempts.
 */
export const rescheduleAppointmentByDrag = withActionAuth(
  async (
    { user, profile, supabase }: AuthContext,
    appointmentId: string,
    newStartTime: Date,
    newEndTime: Date
  ) => {
    // Verify staff has access to this appointment's tenant
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('tenant_id')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return actionError('Cita no encontrada')
    }

    if (profile.tenant_id !== appointment.tenant_id) {
      return actionError('Solo el personal puede reprogramar citas')
    }

    // Use atomic reschedule function to prevent race conditions
    // This function acquires an advisory lock, checks for conflicts,
    // and updates the appointment in a single atomic operation
    const { data: result, error: rpcError } = await supabase.rpc(
      'reschedule_appointment_atomic',
      {
        p_appointment_id: appointmentId,
        p_new_start_time: newStartTime.toISOString(),
        p_new_end_time: newEndTime.toISOString(),
        p_performed_by: user.id,
      }
    )

    if (rpcError) {
      logger.error('Reschedule by drag RPC error', {
        appointmentId,
        tenantId: profile.tenant_id,
        userId: user.id,
        error: rpcError.message,
      })
      return actionError('Error al reprogramar la cita')
    }

    // Handle atomic function response
    if (!result?.success) {
      const errorMessage = result?.error || 'Error al reprogramar la cita'
      logger.warn('Reschedule by drag conflict', {
        appointmentId,
        errorCode: result?.error_code,
        conflict: result?.conflict,
      })
      return actionError(errorMessage)
    }

    // Revalidate paths
    revalidatePath('/[clinic]/dashboard/calendar')
    revalidatePath('/[clinic]/dashboard/appointments')
    revalidatePath('/[clinic]/portal/appointments')

    return actionSuccess({
      newStartTime: newStartTime.toISOString(),
      newEndTime: newEndTime.toISOString(),
    })
  },
  { roles: ['vet', 'admin'] }
)

// Keep the import at the top as it's needed for checkAvailableSlots
import { createClient } from '@/lib/supabase/server'
