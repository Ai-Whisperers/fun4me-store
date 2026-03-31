/**
 * User Privacy Preferences Analytics API
 *
 * COMP-003: View consent analytics for tenant
 *
 * GET - Get analytics (admin only)
 *
 * Note: This handles analytics for USER privacy preferences, not veterinary consent documents.
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { getConsentAnalytics } from '@/lib/consent'

/**
 * GET /api/consents/preferences/analytics
 *
 * Get consent analytics for tenant
 * Admin only
 */
export const GET = withApiAuth(
  async ({ profile, supabase, log }: ApiHandlerContext) => {
    log.info('Getting consent analytics', { action: 'consent.analytics.get' })

    try {
      const analytics = await getConsentAnalytics(supabase, profile.tenant_id)

      return NextResponse.json({
        tenantId: profile.tenant_id,
        analytics,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      log.error('Failed to get consent analytics', { error })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Error desconocido' },
      })
    }
  },
  { roles: ['admin'] }
)
