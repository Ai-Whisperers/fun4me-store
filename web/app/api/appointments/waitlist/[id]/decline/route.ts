import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { sendNotification } from '@/lib/notifications'

/**
 * POST /api/appointments/waitlist/[id]/decline - Owner declines offered slot
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const entryId = params.id

    try {
      // Fetch waitlist entry
      const { data: entry } = await supabase
        .from('appointment_waitlists')
        .select('*')
        .eq('id', entryId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!entry) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'waitlist_entry' },
        })
      }

      // Verify ownership for owners
      if (profile.role === 'owner') {
        const { data: pet } = await supabase
          .from('pets')
          .select('owner_id')
          .eq('id', entry.pet_id)
          .single()

        if (pet?.owner_id !== user.id) {
          return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
        }
      }

      // Must be in offered status
      if (entry.status !== 'offered') {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'No hay oferta pendiente para rechazar' },
        })
      }

      // Update to expired (declined) and find next person
      const { error: updateError } = await supabase
        .from('appointment_waitlists')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        logger.error('Error declining offer', {
          tenantId: profile.tenant_id,
          entryId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Find next person in queue for same date/service
      const { data: nextEntry } = await supabase
        .from('appointment_waitlists')
        .select(`
          id,
          user_id,
          pet:pets!pet_id (name),
          service:services!service_id (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('preferred_date', entry.preferred_date)
        .eq('service_id', entry.service_id)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (nextEntry) {
        // Offer to next person
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 2)

        await supabase
          .from('appointment_waitlists')
          .update({
            status: 'offered',
            offered_appointment_id: entry.offered_appointment_id,
            offered_at: new Date().toISOString(),
            offer_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', nextEntry.id)

        // Notify next person about available slot
        try {
          const petName = (nextEntry.pet as { name?: string })?.name || 'tu mascota'
          const serviceName = (nextEntry.service as { name?: string })?.name || 'el servicio'

          await sendNotification({
            type: 'waitlist_slot_available',
            recipientId: nextEntry.user_id,
            recipientType: 'owner',
            tenantId: profile.tenant_id,
            title: '¡Turno disponible!',
            message: `Se ha liberado un turno para ${petName}. Tienes 2 horas para confirmarlo.`,
            channels: ['in_app', 'email'],
            data: {
              petName,
              serviceName,
              appointmentDate: entry.preferred_date,
              expiresAt: expiresAt.toISOString(),
            },
            actionUrl: `/${profile.tenant_id}/portal/appointments`,
          })
        } catch (notifError) {
          logger.warn('Failed to send waitlist notification', {
            entryId: nextEntry.id,
            error: notifError instanceof Error ? notifError.message : 'Unknown',
          })
        }
      }

      return NextResponse.json({
        message: 'Oferta rechazada. Se notificará al siguiente en la lista.',
        next_in_queue: !!nextEntry,
      })
    } catch (error) {
      logger.error('Waitlist decline error', {
        tenantId: profile.tenant_id,
        entryId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)
