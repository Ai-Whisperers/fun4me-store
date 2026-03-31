import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateRecurrenceSchema = z.object({
  vet_id: z.string().uuid().nullable().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
  interval_value: z.number().min(1).max(12).optional(),
  day_of_week: z.array(z.number().min(0).max(6)).nullable().optional(),
  day_of_month: z.number().min(1).max(31).nullable().optional(),
  preferred_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  max_occurrences: z.number().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

/**
 * GET /api/appointments/recurrences/[id]
 * Get recurrence details - owners see their pets only
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Fetch recurrence with related data
      const { data: recurrence, error } = await supabase
        .from('appointment_recurrences')
        .select(
          `
          *,
          pet:pets!pet_id (id, name, species, breed, photo_url, owner_id),
          service:services!service_id (id, name, duration_minutes, base_price),
          vet:profiles!vet_id (id, full_name)
        `
        )
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !recurrence) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      // Check ownership for owners
      if (profile.role === 'owner' && recurrence.pet.owner_id !== user.id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Get generated appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, recurrence_index')
        .eq('recurrence_id', recurrenceId)
        .order('start_time', { ascending: true })

      return NextResponse.json({
        recurrence,
        appointments: appointments || [],
      })
    } catch (e) {
      logger.error('Recurrence GET error', {
        tenantId: profile.tenant_id,
        recurrenceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)

/**
 * PUT /api/appointments/recurrences/[id]
 * Update recurrence - owners can update their pets only
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Fetch recurrence
      const { data: existing } = await supabase
        .from('appointment_recurrences')
        .select('*, pet:pets!pet_id (owner_id)')
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      // Check ownership for owners
      if (profile.role === 'owner' && existing.pet.owner_id !== user.id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Parse and validate body
      const body = await request.json()
      const validation = updateRecurrenceSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten() },
        })
      }

      // Update recurrence
      const { data: updated, error: updateError } = await supabase
        .from('appointment_recurrences')
        .update({
          ...validation.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recurrenceId)
        .select()
        .single()

      if (updateError) {
        logger.error('Error updating recurrence', {
          tenantId: profile.tenant_id,
          recurrenceId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        message: 'Recurrencia actualizada',
        recurrence: updated,
      })
    } catch (e) {
      logger.error('Recurrence PUT error', {
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
 * DELETE /api/appointments/recurrences/[id]
 * Soft delete recurrence - owners can delete their pets only
 */
export const DELETE = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Fetch recurrence
      const { data: existing } = await supabase
        .from('appointment_recurrences')
        .select('*, pet:pets!pet_id (owner_id)')
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      // Check ownership for owners
      if (profile.role === 'owner' && existing.pet.owner_id !== user.id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      const searchParams = new URL(request.url).searchParams
      const cancelFuture = searchParams.get('cancel_future') === 'true'

      // Soft delete by setting is_active to false
      await supabase
        .from('appointment_recurrences')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', recurrenceId)

      // Optionally cancel future appointments
      if (cancelFuture) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('recurrence_id', recurrenceId)
          .gte('start_time', new Date().toISOString())
          .eq('status', 'scheduled')
      }

      return NextResponse.json({
        message: 'Recurrencia cancelada',
        future_appointments_cancelled: cancelFuture,
      })
    } catch (e) {
      logger.error('Recurrence DELETE error', {
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
