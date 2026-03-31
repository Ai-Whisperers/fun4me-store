'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult, FieldErrors } from '@/lib/types/action-result'
import { sendConfirmationEmail } from '@/lib/notifications/service'
import { generateSchedulingConfirmationEmail } from '@/lib/email/templates'
import { ERROR_MESSAGES } from '@/lib/constants'
import { logger } from '@/lib/logger'

/**
 * REF-005: Migrated to withActionAuth
 */

/**
 * Schema for scheduling a pending appointment
 */
const scheduleAppointmentSchema = z.object({
  appointment_id: z
    .string()
    .min(1, 'ID de cita requerido')
    .uuid('ID de cita inválido'),
  start_time: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_DATETIME)
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: ERROR_MESSAGES.INVALID_DATETIME }
    )
    .refine(
      (val) => {
        const date = new Date(val)
        const now = new Date()
        now.setMinutes(now.getMinutes() + 15) // At least 15 minutes in the future
        return date >= now
      },
      { message: ERROR_MESSAGES.APPOINTMENT_TOO_SOON }
    ),
  end_time: z
    .string()
    .min(1, 'Hora de fin requerida')
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Hora de fin inválida' }
    ),
  vet_id: z
    .string()
    .uuid('ID de veterinario inválido')
    .optional()
    .nullable(),
})

export type ScheduleAppointmentInput = z.infer<typeof scheduleAppointmentSchema>

/**
 * Schedule a pending appointment (staff only)
 * Updates the appointment with actual date/time and sends confirmation to customer
 */
export const scheduleAppointment = withActionAuth(
  async ({ user, profile, supabase }, input: ScheduleAppointmentInput): Promise<ActionResult> => {
    // Validate
    const validation = scheduleAppointmentSchema.safeParse(input)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }

      return {
        success: false,
        error: ERROR_MESSAGES.REVIEW_FIELDS,
        fieldErrors,
      }
    }

    const { appointment_id, start_time, end_time, vet_id } = validation.data

    // Verify appointment exists and is pending
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        pet_id,
        tenant_id,
        scheduling_status,
        reason,
        pets!inner (
          id,
          name,
          owner_id,
          profiles!inner (
            id,
            full_name,
            auth_user_id,
            users:auth_user_id (
              email
            )
          )
        )
      `)
      .eq('id', appointment_id)
      .single()

    if (!appointment) {
      return {
        success: false,
        error: 'Cita no encontrada',
        fieldErrors: {
          appointment_id: 'Cita no encontrada',
        },
      }
    }

    if (appointment.tenant_id !== profile.tenant_id) {
      return actionError('No tienes acceso a esta cita')
    }

    if (appointment.scheduling_status !== 'pending_scheduling') {
      return actionError('Esta cita ya ha sido programada')
    }

    // Validate time range
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    if (endDate <= startDate) {
      return {
        success: false,
        error: 'La hora de fin debe ser posterior a la hora de inicio',
        fieldErrors: {
          end_time: 'Hora de fin inválida',
        },
      }
    }

    // Call atomic scheduling RPC
    const { data: result, error: rpcError } = await supabase.rpc('schedule_pending_appointment', {
      p_appointment_id: appointment_id,
      p_start_time: startDate.toISOString(),
      p_end_time: endDate.toISOString(),
      p_vet_id: vet_id || null,
      p_scheduled_by: user.id,
    })

    if (rpcError) {
      logger.error('Failed to schedule appointment (RPC error)', {
        error: rpcError,
        userId: user.id,
        tenantId: profile.tenant_id,
        appointmentId: appointment_id,
        errorCode: rpcError.code,
      })

      return actionError(ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR)
    }

    // Handle atomic function result
    if (!result?.success) {
      const errorCode = result?.error_code

      if (errorCode === 'slot_taken' || errorCode === 'vet_busy') {
        return {
          success: false,
          error: result?.error || ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
          fieldErrors: {
            start_time: ERROR_MESSAGES.SLOT_ALREADY_TAKEN,
          },
        }
      }

      if (errorCode === 'already_scheduled') {
        return actionError('Esta cita ya fue programada por otro usuario')
      }

      if (errorCode === 'not_found') {
        return actionError('Cita no encontrada o ya fue cancelada')
      }

      logger.error('Failed to schedule appointment (atomic)', {
        result,
        userId: user.id,
        tenantId: profile.tenant_id,
        appointmentId: appointment_id,
      })

      return actionError(result?.error || ERROR_MESSAGES.GENERIC_APPOINTMENT_ERROR)
    }

    // Get clinic info for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, address, phone')
      .eq('id', profile.tenant_id)
      .single()

    // Get vet name if assigned
    let vetName: string | null = null
    if (vet_id) {
      const { data: vet } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', vet_id)
        .single()
      vetName = vet?.full_name || null
    }

    // Send scheduling confirmation email to customer
    try {
      const pet = appointment.pets as unknown as {
        id: string
        name: string
        profiles: {
          full_name: string
          users: { email: string }
        }
      }
      const owner = pet?.profiles
      const ownerEmail = owner?.users?.email

      if (ownerEmail) {
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
        const dateTimeStr = startDate.toLocaleString('es-PY', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendConfirmationEmail({
          to: ownerEmail,
          subject: `Cita Confirmada - ${pet.name} en ${tenant?.name || 'la clínica'}`,
          body: generateSchedulingConfirmationEmail({
            userName: owner?.full_name || 'Cliente',
            petName: pet.name,
            services: appointment.reason || 'Consulta',
            dateTime: dateTimeStr,
            duration: duration,
            vetName: vetName,
            clinicName: tenant?.name || 'Clínica Veterinaria',
            clinicAddress: tenant?.address || null,
            clinicPhone: tenant?.phone || null,
          }),
        })
      }
    } catch (emailError: unknown) {
      logger.error('Failed to send scheduling confirmation email', {
        error: emailError instanceof Error ? emailError : undefined,
        userId: user.id,
        tenantId: profile.tenant_id,
        appointmentId: appointment_id,
      })
      // Continue even if email fails
    }

    // Revalidate dashboard pages
    revalidatePath(`/${profile.tenant_id}/dashboard/appointments`)
    revalidatePath(`/${profile.tenant_id}/dashboard/calendar`)

    return { success: true, message: 'Cita programada exitosamente' }
  },
  { requireStaff: true }
)

/**
 * Get pending booking requests for staff dashboard
 */
export const getPendingBookingRequests = withActionAuth(
  async ({ user, profile, supabase }): Promise<
    ActionResult<{
      requests: Array<{
        id: string
        pet_name: string
        pet_id: string
        owner_name: string
        owner_phone: string | null
        services: string
        preferred_date_start: string | null
        preferred_date_end: string | null
        preferred_time_of_day: string | null
        notes: string | null
        requested_at: string
      }>
    }>
  > => {
    // Call RPC to get pending requests
    const { data: requests, error: rpcError } = await supabase.rpc(
      'get_pending_booking_requests',
      {
        p_tenant_id: profile.tenant_id,
      }
    )

    if (rpcError) {
      logger.error('Failed to get pending booking requests', {
        error: rpcError,
        userId: user.id,
        tenantId: profile.tenant_id,
      })

      return actionError('Error al cargar solicitudes pendientes')
    }

    return {
      success: true,
      data: {
        requests: requests || [],
      },
    }
  },
  { requireStaff: true }
)
