/**
 * Privacy Policy Stats API
 *
 * COMP-002: Get acceptance statistics for a policy
 *
 * GET - Get policy stats
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { getPolicyById, getPolicyWithStats } from '@/lib/privacy'

type Params = { id: string }

/**
 * GET /api/privacy/[id]/stats
 *
 * Get acceptance statistics for a policy
 * Admin only
 */
export const GET = withApiAuthParams<Params>(
  async ({ params, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    log.info('Fetching privacy policy stats', { action: 'privacy.stats', resourceId: id })

    // Check policy exists and belongs to tenant
    const existing = await getPolicyById(id)

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'privacy_policy' },
      })
    }

    if (existing.tenantId !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    const stats = await getPolicyWithStats(id)

    if (!stats) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'privacy_policy' },
      })
    }

    return NextResponse.json({
      acceptanceCount: stats.acceptanceCount,
      totalUsers: stats.totalUsers,
      acceptanceRate: stats.acceptanceRate,
    })
  },
  { roles: ['admin'] }
)
