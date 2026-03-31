import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/dashboard/time-off/[id]
 * Update time-off request status (approve/reject)
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const timeOffId = params.id

    // Parse request body
    const body = await request.json()
    const { status } = body

    if (!['approved', 'rejected'].includes(status)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { field: 'status', message: 'Estado inválido' },
      })
    }

    try {
      // Get the time-off request to verify it belongs to the same tenant
      const { data: timeOffRequest } = await supabase
        .from('staff_time_off')
        .select(
          `
          id,
          staff_profiles!inner (
            tenant_id
          )
        `
        )
        .eq('id', timeOffId)
        .single()

      if (!timeOffRequest) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'time_off_request' },
        })
      }

      // Verify tenant match (staff_profiles is an object, not array in single query)
      const staffProfile = timeOffRequest.staff_profiles as unknown as { tenant_id: string }
      if (staffProfile.tenant_id !== profile.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Update the request
      const { error: updateError } = await supabase
        .from('staff_time_off')
        .update({
          status,
          updated_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', timeOffId)

      if (updateError) {
        logger.error('Error updating time-off request', {
          tenantId: profile.tenant_id,
          timeOffId,
          userId: user.id,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: updateError.message },
        })
      }

      return NextResponse.json({ success: true, status })
    } catch (e) {
      logger.error('Time-off PATCH error', {
        tenantId: profile.tenant_id,
        timeOffId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
