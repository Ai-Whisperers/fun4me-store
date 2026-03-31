import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/appointments/waitlist/[id] - Get single waitlist entry
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const entryId = params.id

    try {
      // Fetch waitlist entry
      const { data: entry, error } = await supabase
        .from('appointment_waitlists')
        .select(
          `
          *,
          pet:pets!pet_id (id, name, species, breed, photo_url),
          service:services!service_id (id, name, duration_minutes, base_price),
          preferred_vet:profiles!preferred_vet_id (id, full_name),
          offered_appointment:appointments!offered_appointment_id (id, start_time, end_time)
        `
        )
        .eq('id', entryId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !entry) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'waitlist_entry' },
        })
      }

      // Check ownership for owners
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

      return NextResponse.json({ entry })
    } catch (error) {
      logger.error('Waitlist GET error', {
        tenantId: profile.tenant_id,
        entryId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)

/**
 * DELETE /api/appointments/waitlist/[id] - Leave waitlist
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const entryId = params.id

    try {
      // Fetch entry first to verify ownership
      const { data: entry } = await supabase
        .from('appointment_waitlists')
        .select('id, pet_id, status')
        .eq('id', entryId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!entry) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'waitlist_entry' },
        })
      }

      // Check ownership for owners
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

      // Can only cancel if waiting or offered
      if (!['waiting', 'offered'].includes(entry.status)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'No se puede cancelar esta entrada' },
        })
      }

      // Update to cancelled
      const { error: updateError } = await supabase
        .from('appointment_waitlists')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', entryId)

      if (updateError) {
        logger.error('Error cancelling waitlist entry', {
          tenantId: profile.tenant_id,
          entryId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ message: 'Has salido de la lista de espera' })
    } catch (error) {
      logger.error('Waitlist DELETE error', {
        tenantId: profile.tenant_id,
        entryId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)
