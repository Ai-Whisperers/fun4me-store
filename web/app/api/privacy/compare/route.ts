/**
 * Privacy Policy Compare API
 *
 * COMP-002: Compare two policy versions
 *
 * GET - Compare policies
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { comparePolicies, getPolicyById } from '@/lib/privacy'

/**
 * GET /api/privacy/compare
 *
 * Compare two policy versions
 *
 * Query params:
 * - current: string (current policy ID)
 * - previous: string (previous policy ID)
 */
export const GET = withApiAuth(
  async ({ request, profile, log }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const currentId = searchParams.get('current')
    const previousId = searchParams.get('previous')

    log.info('Comparing privacy policies', {
      action: 'privacy.compare',
      currentId,
      previousId,
    })

    if (!currentId || !previousId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['current', 'previous'] },
      })
    }

    // Verify both policies belong to tenant
    const [current, previous] = await Promise.all([
      getPolicyById(currentId),
      getPolicyById(previousId),
    ])

    if (!current) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'current_policy' },
      })
    }

    if (!previous) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'previous_policy' },
      })
    }

    if (current.tenantId !== profile.tenant_id || previous.tenantId !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    const comparison = await comparePolicies(currentId, previousId)

    if (!comparison) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'comparison' },
      })
    }

    return NextResponse.json(comparison)
  },
  { roles: ['vet', 'admin'] }
)
