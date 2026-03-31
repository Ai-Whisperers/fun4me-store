/**
 * Privacy Policy Publish API
 *
 * COMP-002: Publish a draft policy
 *
 * POST - Publish policy
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { getPolicyById, publishPolicy } from '@/lib/privacy'

type Params = { id: string }

/**
 * POST /api/privacy/[id]/publish
 *
 * Publish a draft policy
 * Admin only
 */
export const POST = withApiAuthParams<Params>(
  async ({ params, user, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    log.info('Publishing privacy policy', { action: 'privacy.publish', resourceId: id })

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

    if (existing.status !== 'draft') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Solo se pueden publicar políticas en borrador' },
      })
    }

    // Validate content is not empty
    if (!existing.contentEs || existing.contentEs.trim().length === 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'La política debe tener contenido en español' },
      })
    }

    try {
      const policy = await publishPolicy(id, user.id)

      log.info('Privacy policy published', {
        action: 'privacy.published',
        resourceId: id,
        version: policy.version,
      })

      return NextResponse.json(policy)
    } catch (error) {
      log.error('Error publishing privacy policy', {
        action: 'privacy.publish.error',
        error: error instanceof Error ? error : new Error(String(error)),
        resourceId: id,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
