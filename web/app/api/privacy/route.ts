/**
 * Privacy Policy API Routes
 *
 * COMP-002: Privacy policy management endpoints
 *
 * GET  - Get all policies (admin) or current policy (users)
 * POST - Create new policy draft (admin only)
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import {
  getCurrentPolicy,
  getAllPolicies,
  createPolicy,
  isValidVersion,
} from '@/lib/privacy'

/**
 * GET /api/privacy
 *
 * For owners: Returns current published policy
 * For staff: Returns all policies with query params
 */
export const GET = withApiAuth(async ({ user, profile, log }: ApiHandlerContext) => {
  log.info('Fetching privacy policies', { action: 'privacy.list' })

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff sees all policies
    const policies = await getAllPolicies(profile.tenant_id)
    return NextResponse.json(policies)
  }

  // Owners see only current policy
  const policy = await getCurrentPolicy(profile.tenant_id)

  if (!policy) {
    return NextResponse.json(null)
  }

  return NextResponse.json(policy)
})

/**
 * POST /api/privacy
 *
 * Create a new privacy policy draft
 * Admin only
 */
export const POST = withApiAuth(
  async ({ request, user, profile, log }: ApiHandlerContext) => {
    log.info('Creating privacy policy', { action: 'privacy.create' })

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const {
      version,
      effectiveDate,
      contentEs,
      contentEn,
      changeSummary,
      requiresReacceptance,
      previousVersionId,
    } = body

    // Validate required fields
    if (!version || !effectiveDate || !contentEs) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['version', 'effectiveDate', 'contentEs'] },
      })
    }

    // Validate version format
    if (!isValidVersion(version)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Formato de versión inválido. Use formato semántico (ej: 1.0, 2.1.3)' },
      })
    }

    // Validate effective date is in the future
    const effectiveDateObj = new Date(effectiveDate)
    if (isNaN(effectiveDateObj.getTime())) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Fecha de vigencia inválida' },
      })
    }

    try {
      const policy = await createPolicy(profile.tenant_id, user.id, {
        version,
        effectiveDate,
        contentEs,
        contentEn: contentEn || undefined,
        changeSummary: changeSummary || [],
        requiresReacceptance: requiresReacceptance ?? false,
        previousVersionId: previousVersionId || undefined,
      })

      log.info('Privacy policy created', {
        action: 'privacy.created',
        resourceId: policy.id,
        version: policy.version,
      })

      return NextResponse.json(policy, { status: 201 })
    } catch (error) {
      log.error('Error creating privacy policy', {
        action: 'privacy.create.error',
        error: error instanceof Error ? error : new Error(String(error)),
      })

      if (error instanceof Error && error.message.includes('unique_tenant_version')) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Ya existe una política con esta versión' },
        })
      }

      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
