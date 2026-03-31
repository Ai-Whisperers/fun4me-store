'use server'

import { withActionAuth, actionError, actionSuccess } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * REF-005: Migrated to withActionAuth
 * Note: This is a simpler version that doesn't enforce state transitions.
 * For full state machine validation, use updateAppointmentStatus from update-appointment.ts
 */
export const updateAppointmentStatus = withActionAuth(
  async ({ supabase, profile }, appointmentId: string, newStatus: string, clinic: string) => {
    // BUG-007: Verify clinic matches user's tenant for defense-in-depth
    if (clinic !== profile.tenant_id) {
      logger.warn('Tenant mismatch in appointment update', {
        userId: profile.id,
        requestedClinic: clinic,
        actualTenant: profile.tenant_id,
      })
      return actionError('Acceso denegado')
    }

    // BUG-007: Add tenant_id filter for defense-in-depth
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      logger.error('Failed to update appointment status', {
        error,
        appointmentId,
        newStatus,
        tenant: clinic,
      })
      return actionError('Error al actualizar el estado de la cita')
    }

    revalidatePath(`/${clinic}/dashboard`)
    return actionSuccess()
  },
  { requireStaff: true }
)
