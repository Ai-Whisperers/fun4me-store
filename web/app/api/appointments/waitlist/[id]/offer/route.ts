import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { sendNotification } from '@/lib/notifications'
import { z } from 'zod'

const offerSchema = z.object({
  appointment_id: z.string().uuid(),
  expires_in_hours: z.number().min(1).max(48).optional().default(2),
})

/**
 * POST /api/appointments/waitlist/[id]/offer - Staff offers slot to client
 */
export const POST = withApiAuthParams(
  async ({ request, params, user: _user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const entryId = params.id

    try {
      // Parse body
      const body = await request.json()
      const validation = offerSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { appointment_id, expires_in_hours } = validation.data

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

      if (entry.status !== 'waiting') {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Solo se puede ofrecer a clientes en espera' },
        })
      }

      // Verify appointment exists and is available
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, status, start_time')
        .eq('id', appointment_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!appointment) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'appointment' },
        })
      }

      // Calculate expiry
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

      // Update waitlist entry
      const { error: updateError } = await supabase
        .from('appointment_waitlists')
        .update({
          status: 'offered',
          offered_appointment_id: appointment_id,
          offered_at: new Date().toISOString(),
          offer_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        logger.error('Error offering slot', {
          tenantId: profile.tenant_id,
          entryId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Get pet owner and pet name for notification
      const { data: pet } = await supabase
        .from('pets')
        .select('name, owner_id, owner:profiles!owner_id (id, email, phone, full_name)')
        .eq('id', entry.pet_id)
        .single()

      // Send notification to owner about available slot
      // owner is an array from the join, get first element
      const ownerData = Array.isArray(pet?.owner) ? pet.owner[0] : pet?.owner
      if (pet && ownerData?.id) {
        const owner = ownerData as { id: string; email: string; phone: string; full_name: string }
        await sendNotification({
          type: 'waitlist_slot_available',
          recipientId: owner.id,
          recipientType: 'owner',
          tenantId: profile.tenant_id,
          title: '¡Turno disponible!',
          message: `Se ha liberado un turno para ${pet.name}. Tienes ${expires_in_hours} horas para confirmar.`,
          channels: ['email', 'in_app'],
          data: {
            petName: pet.name,
            appointmentDate: appointment.start_time,
            expiresAt: expiresAt.toISOString(),
          },
          email: {
            subject: `¡Turno disponible para ${pet.name}!`,
          },
        }).catch((err: unknown) => {
          // Don't fail the request if notification fails
          logger.warn('Failed to send waitlist notification', {
            entryId,
            ownerId: owner.id,
            error: err instanceof Error ? err.message : 'Unknown',
          })
        })
      }

      return NextResponse.json({
        message: 'Oferta enviada al cliente',
        entry: {
          id: entryId,
          status: 'offered',
          offered_appointment_id: appointment_id,
          offer_expires_at: expiresAt.toISOString(),
        },
        owner: pet?.owner,
      })
    } catch (error) {
      logger.error('Waitlist offer error', {
        tenantId: profile.tenant_id,
        entryId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
