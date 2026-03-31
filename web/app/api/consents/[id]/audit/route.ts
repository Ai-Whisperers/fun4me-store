import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/consents/[id]/audit - Create audit log entry for a consent
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const consentId = params.id

    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { action, details } = body

    // Validate action
    const validActions = ['viewed', 'downloaded', 'emailed', 'printed']
    if (!action || !validActions.includes(action)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { validActions },
      })
    }

    // Verify consent exists and user has access
    const { data: consent } = await supabase
      .from('consent_documents')
      .select(
        `
        id,
        owner_id,
        pet:pets!inner(tenant_id)
      `
      )
      .eq('id', consentId)
      .single()

    if (!consent) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'consent' },
      })
    }

    // Authorization check
    const petData = Array.isArray(consent.pet) ? consent.pet[0] : consent.pet
    const pet = petData as { tenant_id: string }

    const isStaff = ['vet', 'admin'].includes(profile.role)
    const isOwner = consent.owner_id === user.id

    if (isStaff) {
      if (pet.tenant_id !== profile.tenant_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }
    } else if (!isOwner) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Create audit log entry
    const { data: auditEntry, error: auditError } = await supabase
      .from('consent_audit_log')
      .insert({
        consent_document_id: consentId,
        action,
        performed_by: user.id,
        performed_by_name: profile.full_name,
        details: details || {},
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single()

    if (auditError) {
      logger.error('Error creating consent audit log', {
        tenantId: profile.tenant_id,
        consentId,
        action,
        error: auditError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(auditEntry)
  },
  { rateLimit: 'write' }
)
