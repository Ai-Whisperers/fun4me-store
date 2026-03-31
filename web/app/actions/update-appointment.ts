'use server'

import { withActionAuth, actionError, actionSuccess } from '@/lib/actions'
import { revalidatePath } from 'next/cache'

/**
 * REF-005: Migrated to withActionAuth
 */

// TICKET-BIZ-010: Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'no_show'],
  in_progress: ['completed', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

export const updateAppointmentStatus = withActionAuth(
  async ({ profile, supabase }, appointmentId: string, newStatus: string, clinic: string) => {
    // Strict check: Must be staff of the clinic
    if (profile.tenant_id !== clinic) {
      return actionError('No tienes permisos para gestionar citas.')
    }

    // Get current appointment status
    const { data: appointment } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return actionError('Cita no encontrada.')
    }

    // TICKET-BIZ-010: Validate status transition
    const currentStatus = appointment.status
    const allowed = VALID_TRANSITIONS[currentStatus] || []

    if (!allowed.includes(newStatus)) {
      return actionError(`No se puede cambiar de "${currentStatus}" a "${newStatus}"`)
    }

    // Update
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)

    if (error) {
      return actionError('Error al actualizar.')
    }

    revalidatePath(`/${clinic}/portal/schedule`)
    revalidatePath(`/${clinic}/portal/dashboard`)
    return actionSuccess()
  },
  { requireStaff: true }
)
