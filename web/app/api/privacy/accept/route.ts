/**
 * Privacy Policy Accept API
 *
 * COMP-002: Record user's acceptance of privacy policy
 *
 * POST - Accept a policy
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { acceptPolicy, getPolicyById } from '@/lib/privacy'
import type { AcceptanceMethod } from '@/lib/privacy'

const VALID_METHODS: AcceptanceMethod[] = ['checkbox', 'button', 'implicit', 'api']

/**
 * POST /api/privacy/accept
 *
 * Record user's acceptance of a privacy policy
 *
 * Body:
 * - policyId: string (required)
 * - acceptanceMethod: 'checkbox' | 'button' | 'implicit' | 'api' (default: 'button')
 * - locationContext: string (optional, e.g., 'registration', 'policy_update')
 */
export const POST = withApiAuth(
  async ({ request, user, profile, log }: ApiHandlerContext) => {
    log.info('Accepting privacy policy', { action: 'privacy.accept' })

  let body
  try {
    body = await request.json()
  } catch (_error: unknown) {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const { policyId, acceptanceMethod = 'button', locationContext } = body

  // Validate required fields
  if (!policyId) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['policyId'] },
    })
  }

  // Validate acceptance method
  if (!VALID_METHODS.includes(acceptanceMethod)) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: `Método de aceptación inválido. Válidos: ${VALID_METHODS.join(', ')}` },
    })
  }

  // Check policy exists and belongs to tenant
  const policy = await getPolicyById(policyId)

  if (!policy) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'privacy_policy' },
    })
  }

  if (policy.tenantId !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // Extract IP and User-Agent for audit
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined

  const userAgent = request.headers.get('user-agent') || undefined

  try {
    const acceptance = await acceptPolicy(
      user.id,
      profile.tenant_id,
      {
        policyId,
        acceptanceMethod,
        locationContext,
      },
      ipAddress,
      userAgent
    )

    log.info('Privacy policy accepted', {
      action: 'privacy.accepted',
      resourceId: acceptance.id,
      policyId,
      version: policy.version,
    })

    return NextResponse.json(acceptance, { status: 201 })
  } catch (error) {
    log.error('Error accepting privacy policy', {
      action: 'privacy.accept.error',
      error: error instanceof Error ? error : new Error(String(error)),
      policyId,
    })

    // Handle already accepted error
    if (error instanceof Error && error.message.includes('Ya aceptaste')) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: error.message },
      })
    }

    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
  },
  { rateLimit: 'write' }
)
