import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const pauseSchema = z.object({
  paused_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/appointments/recurrences/[id]/pause
 * Pause recurrence until a date - owners can pause their pets only
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Parse body
      const body = await request.json()
      const validation = pauseSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten() },
        })
      }

      // Verify recurrence exists
      const { data: recurrence } = await supabase
        .from('appointment_recurrences')
        .select('*, pet:pets!pet_id (owner_id)')
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!recurrence) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      // Check ownership for owners
      if (profile.role === 'owner' && recurrence.pet.owner_id !== user.id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Update paused_until
      const { data: updated, error: updateError } = await supabase
        .from('appointment_recurrences')
        .update({
          paused_until: validation.data.paused_until,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recurrenceId)
        .select()
        .single()

      if (updateError) {
        logger.error('Error pausing recurrence', {
          tenantId: profile.tenant_id,
          recurrenceId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Cancel scheduled appointments until pause date
      const { data: cancelled } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('recurrence_id', recurrenceId)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .lt('start_time', validation.data.paused_until + 'T23:59:59')
        .select('id')

      return NextResponse.json({
        message: `Recurrencia pausada hasta ${validation.data.paused_until}`,
        recurrence: updated,
        appointments_cancelled: cancelled?.length || 0,
      })
    } catch (e) {
      logger.error('Pause error', {
        tenantId: profile.tenant_id,
        recurrenceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)

/**
 * DELETE /api/appointments/recurrences/[id]/pause
 * Resume (unpause) recurrence - owners can resume their pets only
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Verify recurrence exists
      const { data: recurrence } = await supabase
        .from('appointment_recurrences')
        .select('*, pet:pets!pet_id (owner_id)')
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!recurrence) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      // Check ownership for owners
      if (profile.role === 'owner' && recurrence.pet.owner_id !== user.id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Clear paused_until
      const { data: updated, error: updateError } = await supabase
        .from('appointment_recurrences')
        .update({
          paused_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recurrenceId)
        .select()
        .single()

      if (updateError) {
        logger.error('Error resuming recurrence', {
          tenantId: profile.tenant_id,
          recurrenceId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Generate upcoming appointments
      await supabase.rpc('generate_recurring_appointments', { p_days_ahead: 30 })

      return NextResponse.json({
        message: 'Recurrencia reanudada',
        recurrence: updated,
      })
    } catch (e) {
      logger.error('Resume error', {
        tenantId: profile.tenant_id,
        recurrenceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { rateLimit: 'write' }
)
