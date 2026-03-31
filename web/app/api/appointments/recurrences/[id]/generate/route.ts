import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const generateSchema = z.object({
  days_ahead: z.number().min(1).max(365).optional().default(30),
})

/**
 * POST /api/appointments/recurrences/[id]/generate
 * Generate appointments for a recurrence - staff only
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recurrenceId = params.id

    try {
      // Parse body
      const body = await request.json().catch(() => ({}))
      const validation = generateSchema.safeParse(body)
      const daysAhead = validation.success ? validation.data.days_ahead : 30

      // Verify recurrence exists and belongs to tenant
      const { data: recurrence } = await supabase
        .from('appointment_recurrences')
        .select('id, is_active')
        .eq('id', recurrenceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!recurrence) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'recurrence' },
        })
      }

      if (!recurrence.is_active) {
        return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'La recurrencia está inactiva' },
        })
      }

      // Generate appointments using the DB function
      const { data: generated, error: genError } = await supabase.rpc('generate_recurring_appointments', {
        p_days_ahead: daysAhead,
      })

      if (genError) {
        logger.error('Error generating appointments', {
          tenantId: profile.tenant_id,
          recurrenceId,
          error: genError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Filter results for this recurrence
      const thisRecurrenceResults = (generated || []).filter(
        (g: { recurrence_id: string }) => g.recurrence_id === recurrenceId
      )

      return NextResponse.json({
        message: `Se generaron ${thisRecurrenceResults.length} citas`,
        appointments: thisRecurrenceResults,
      })
    } catch (e) {
      logger.error('Generate error', {
        tenantId: profile.tenant_id,
        recurrenceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
