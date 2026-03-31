/**
 * User Privacy Preferences Data Export API
 *
 * COMP-003: Export consent data for GDPR compliance
 *
 * GET - Export all consent data for user
 *
 * Note: This handles GDPR export for USER privacy preferences, not veterinary consent documents.
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { exportUserConsentData } from '@/lib/consent'

/**
 * GET /api/consents/preferences/export
 *
 * Export all consent data for current user (GDPR compliance)
 * Returns preferences and full audit history
 */
export const GET = withApiAuth(
  async ({ user, profile, supabase, log }: ApiHandlerContext) => {
    log.info('Exporting consent data', { action: 'consent.export' })

    try {
      const exportData = await exportUserConsentData(supabase, user.id, profile.tenant_id)

      // Set headers for file download
      const headers = new Headers()
      headers.set('Content-Type', 'application/json')
      headers.set(
        'Content-Disposition',
        `attachment; filename="consent-data-${user.id}-${new Date().toISOString().split('T')[0]}.json"`
      )

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: HTTP_STATUS.OK,
        headers,
      })
    } catch (error) {
      log.error('Failed to export consent data', { error })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Error desconocido' },
      })
    }
  }
)
