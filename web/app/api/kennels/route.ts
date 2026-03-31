import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/kennels
 * Get all kennels with their current occupant (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const kennelType = searchParams.get('kennel_type')
    const location = searchParams.get('location')

    // Build query
    let query = supabase
      .from('kennels')
      .select(
        `
        *,
        current_occupant:hospitalizations!hospitalizations_kennel_id_fkey(
          id,
          hospitalization_number,
          pet:pets(id, name, species, breed)
        )
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('location')
      .order('kennel_number')

    // Apply filters
    if (status) {
      query = query.eq('kennel_status', status)
    }
    if (kennelType) {
      query = query.eq('kennel_type', kennelType)
    }
    if (location) {
      query = query.eq('location', location)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching kennels', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
