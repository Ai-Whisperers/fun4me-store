/**
 * Privacy Policy Acceptance Report API
 *
 * COMP-002: Get detailed acceptance report for a policy
 *
 * GET - Get acceptance report
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { getPolicyById, getAcceptanceReport } from '@/lib/privacy'

type Params = { id: string }

/**
 * GET /api/privacy/[id]/report
 *
 * Get detailed acceptance report
 * Admin only
 *
 * Query params:
 * - limit: number (default 100)
 * - offset: number (default 0)
 */
export const GET = withApiAuthParams<Params>(
  async ({ request, params, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params
    const { searchParams } = new URL(request.url)

    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    log.info('Fetching privacy policy report', {
      action: 'privacy.report',
      resourceId: id,
      limit,
      offset,
    })

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

    const report = await getAcceptanceReport(id, limit, offset)

    return NextResponse.json({
      data: report,
      pagination: {
        limit,
        offset,
        hasMore: report.length === limit,
      },
    })
  },
  { roles: ['admin'] }
)
