/**
 * Privacy Acceptance Status API
 *
 * COMP-002: Check user's acceptance status
 *
 * GET - Get current acceptance status
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { getAcceptanceStatus } from '@/lib/privacy'

/**
 * GET /api/privacy/status
 *
 * Get current user's acceptance status for the tenant's policy
 * Returns whether they need to accept/re-accept the current policy
 */
export const GET = withApiAuth(async ({ user, profile, log }: ApiHandlerContext) => {
  log.info('Checking privacy acceptance status', { action: 'privacy.status' })

  const status = await getAcceptanceStatus(user.id, profile.tenant_id)

  return NextResponse.json(status)
})
