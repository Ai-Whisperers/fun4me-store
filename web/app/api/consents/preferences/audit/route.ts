/**
 * User Privacy Preferences Audit History API
 *
 * COMP-003: View consent change history
 *
 * GET - Get audit history for user's privacy preference changes
 *
 * Note: This handles audit history for USER privacy preferences, not veterinary consent documents.
 * For consent document audit trails, see /api/consents/[id]/audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import {
  getAuditHistory,
  isValidConsentType,
  type ConsentType,
} from '@/lib/consent'

/**
 * GET /api/consents/preferences/audit
 *
 * Get consent audit history for current user
 * Query params:
 * - consentType: filter by type
 * - limit: max records (default 50)
 * - offset: pagination offset
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase, log }: ApiHandlerContext & { request: NextRequest }) => {
    log.info('Getting consent audit history', { action: 'consent.audit.get' })

    const { searchParams } = new URL(request.url)
    const consentType = searchParams.get('consentType')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate consent type if provided
    if (consentType && !isValidConsentType(consentType)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { field: 'consentType', message: 'Tipo de consentimiento inválido' },
      })
    }

    try {
      const history = await getAuditHistory(supabase, user.id, profile.tenant_id, {
        consentType: consentType as ConsentType | undefined,
        limit,
        offset,
      })

      return NextResponse.json({
        history,
        pagination: {
          limit,
          offset,
          hasMore: history.length === limit,
        },
      })
    } catch (error) {
      log.error('Failed to get consent audit history', { error })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Error desconocido' },
      })
    }
  }
)
