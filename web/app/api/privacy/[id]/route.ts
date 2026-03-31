/**
 * Privacy Policy by ID API Routes
 *
 * COMP-002: Individual policy management
 *
 * GET    - Get policy details
 * PATCH  - Update draft policy
 * DELETE - Delete draft policy
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import {
  getPolicyById,
  updatePolicy,
  isValidVersion,
} from '@/lib/privacy'
import { createClient } from '@/lib/supabase/server'

type Params = { id: string }

/**
 * GET /api/privacy/[id]
 *
 * Get policy by ID
 */
export const GET = withApiAuthParams<Params>(
  async ({ params, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    log.info('Fetching privacy policy', { action: 'privacy.get', resourceId: id })

    const policy = await getPolicyById(id)

    if (!policy) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'privacy_policy' },
      })
    }

    // Verify tenant access
    if (policy.tenantId !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Non-staff can only see published policies
    if (!['vet', 'admin'].includes(profile.role) && policy.status !== 'published') {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    return NextResponse.json(policy)
  }
)

/**
 * PATCH /api/privacy/[id]
 *
 * Update a draft policy
 * Admin only
 */
export const PATCH = withApiAuthParams<Params>(
  async ({ request, params, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    log.info('Updating privacy policy', { action: 'privacy.update', resourceId: id })

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
        details: { message: 'Solo se pueden editar políticas en borrador' },
      })
    }

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
    } = body

    // Validate version format if provided
    if (version && !isValidVersion(version)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Formato de versión inválido. Use formato semántico (ej: 1.0, 2.1.3)' },
      })
    }

    // Validate effective date if provided
    if (effectiveDate) {
      const effectiveDateObj = new Date(effectiveDate)
      if (isNaN(effectiveDateObj.getTime())) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Fecha de vigencia inválida' },
        })
      }
    }

    try {
      const policy = await updatePolicy(id, {
        version,
        effectiveDate,
        contentEs,
        contentEn,
        changeSummary,
        requiresReacceptance,
      })

      log.info('Privacy policy updated', {
        action: 'privacy.updated',
        resourceId: id,
      })

      return NextResponse.json(policy)
    } catch (error) {
      log.error('Error updating privacy policy', {
        action: 'privacy.update.error',
        error: error instanceof Error ? error : new Error(String(error)),
        resourceId: id,
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

/**
 * DELETE /api/privacy/[id]
 *
 * Delete a draft policy
 * Admin only
 */
export const DELETE = withApiAuthParams<Params>(
  async ({ params, profile, log }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    log.info('Deleting privacy policy', { action: 'privacy.delete', resourceId: id })

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
        details: { message: 'Solo se pueden eliminar políticas en borrador' },
      })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('privacy_policies')
      .delete()
      .eq('id', id)

    if (error) {
      log.error('Error deleting privacy policy', {
        action: 'privacy.delete.error',
        error: error.message,
        resourceId: id,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    log.info('Privacy policy deleted', {
      action: 'privacy.deleted',
      resourceId: id,
    })

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
