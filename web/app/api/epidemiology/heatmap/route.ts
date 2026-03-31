import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/epidemiology/heatmap
 * Get disease outbreak heatmap data from materialized view
 * Staff only (vet/admin) - contains sensitive disease outbreak data
 */
export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species')

  try {
    // Query the materialized view - restricted to user's own tenant
    let query = supabase
      .from('mv_disease_heatmap')
      .select('*')
      .eq('tenant_id', profile.tenant_id) // Security: enforce tenant isolation

    if (species && species !== 'all') {
      query = query.eq('species', species)
    }

    const { data, error } = await query.order('week', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (e) {
    logger.error('Error fetching heatmap', {
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { roles: ['vet', 'admin'] })
