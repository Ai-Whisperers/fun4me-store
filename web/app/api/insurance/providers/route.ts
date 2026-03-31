import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/insurance/providers
 * List all insurance providers (authenticated users)
 */
export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active_only') === 'true'

  try {
    let query = supabase.from('insurance_providers').select('*').order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: providers, error } = await query

    if (error) {
      logger.error('Error fetching insurance providers', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({ data: providers })
  } catch (e) {
    logger.error('Unexpected error fetching insurance providers', {
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})
