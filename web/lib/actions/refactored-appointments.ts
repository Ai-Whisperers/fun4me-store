/**
 * Refactored appointment actions using domain-driven architecture
 * Demonstrates the new pattern for business logic separation
 */

'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, handleActionError } from '@/lib/errors'
import { getDomainFactory } from '@/lib/domain'
import { revalidatePath } from 'next/cache'

/**
 * Cancel an appointment
 * Uses domain service for business logic and validation
 */
export const cancelAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string, reason?: string) => {
    try {
      // Get domain service
      const domainFactory = getDomainFactory(supabase)
      const appointmentService = domainFactory.createAppointmentService()

      // Cancel appointment using domain service (handles all validation and business logic)
      await appointmentService.cancelAppointment(
        appointmentId,
        user.id,
        reason,
        profile.role === 'vet' || profile.role === 'admin'
      )

      // Revalidate relevant paths
      revalidatePath(`/[clinic]/portal/appointments`)
      revalidatePath(`/[clinic]/dashboard`)
      revalidatePath(`/[clinic]/portal/schedule`)

      return actionSuccess(null, 'Cita cancelada correctamente')
    } catch (error: unknown) {
      return handleActionError(error, {
        userId: user.id,
        tenantId: profile.tenant_id,
        operation: 'cancel_appointment',
      })
    }
  }
)

/**
 * Check in a patient (staff only)
 */
export const checkInAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string) => {
    try {
      const domainFactory = getDomainFactory(supabase)
      const appointmentService = domainFactory.createAppointmentService()

      const appointment = await appointmentService.checkInAppointment(
        appointmentId,
        user.id,
        profile.tenant_id
      )

      revalidatePath(`/[clinic]/dashboard/appointments`)
      revalidatePath(`/[clinic]/portal/appointments`)

      return actionSuccess({ appointment }, 'Paciente registrado correctamente')
    } catch (error: unknown) {
      return handleActionError(error, {
        userId: user.id,
        tenantId: profile.tenant_id,
        operation: 'check_in_appointment',
      })
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Start an appointment (staff only)
 */
export const startAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string) => {
    try {
      const domainFactory = getDomainFactory(supabase)
      const appointmentService = domainFactory.createAppointmentService()

      const appointment = await appointmentService.startAppointment(
        appointmentId,
        user.id,
        profile.tenant_id
      )

      revalidatePath(`/[clinic]/dashboard/appointments`)

      return actionSuccess({ appointment }, 'Consulta iniciada correctamente')
    } catch (error: unknown) {
      return handleActionError(error, {
        userId: user.id,
        tenantId: profile.tenant_id,
        operation: 'start_appointment',
      })
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Complete an appointment (staff only)
 */
export const completeAppointment = withActionAuth(
  async ({ user, profile, supabase }, appointmentId: string, notes?: string) => {
    try {
      const domainFactory = getDomainFactory(supabase)
      const appointmentService = domainFactory.createAppointmentService()

      const appointment = await appointmentService.completeAppointment(
        appointmentId,
        user.id,
        profile.tenant_id,
        notes
      )

      revalidatePath(`/[clinic]/dashboard/appointments`)
      revalidatePath(`/[clinic]/portal/appointments`)

      return actionSuccess({ appointment }, 'Consulta completada correctamente')
    } catch (error: unknown) {
      return handleActionError(error, {
        userId: user.id,
        tenantId: profile.tenant_id,
        operation: 'complete_appointment',
      })
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * Get owner appointments
 */
export const getOwnerAppointments = withActionAuth(
  async ({ user, profile, supabase }, clinicSlug: string) => {
    try {
      const domainFactory = getDomainFactory(supabase)
      const appointmentService = domainFactory.createAppointmentService()

      // Get appointments for this user's pets in this clinic
      const appointments = await appointmentService.getAppointments({
        pet_id: undefined, // We'll filter by owner through the domain
        status: undefined,
      })

      // Filter for owner's pets (domain service should handle this better)
      const ownerAppointments = appointments.filter(
        (apt) => apt.pet?.owner_id === user.id && apt.tenant_id === clinicSlug
      )

      // Split into upcoming and past
      const now = new Date()
      const upcoming = ownerAppointments
        .filter((a) => new Date(a.start_time) >= now && a.status !== 'cancelled')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      const past = ownerAppointments
        .filter((a) => new Date(a.start_time) < now || a.status === 'cancelled')
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

      return actionSuccess({ upcoming, past })
    } catch (error: unknown) {
      return handleActionError(error, {
        userId: user.id,
        tenantId: profile.tenant_id,
        operation: 'get_owner_appointments',
      })
    }
  }
)
