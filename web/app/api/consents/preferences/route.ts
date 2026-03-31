/**
 * User Privacy Preferences API
 *
 * COMP-003: Manage user consent preferences (GDPR compliance)
 *
 * GET - Get all user preferences
 * POST - Create/update preference
 * PUT - Bulk update preferences
 *
 * Note: This handles USER privacy preferences, not veterinary consent documents.
 * For consent documents, see /api/consents/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import {
  getUserPreferences,
  getConsentStatus,
  setPreference,
  bulkUpdatePreferences,
  isValidConsentType,
  isValidConsentSource,
  type ConsentType,
  type ConsentSource,
  type BulkConsentUpdateInput,
} from '@/lib/consent'

/**
 * GET /api/consents/preferences
 *
 * Get all consent preferences for current user
 * Query params:
 * - format: 'list' | 'status' (default: 'list')
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase, log }: ApiHandlerContext & { request: NextRequest }) => {
    log.info('Getting consent preferences', { action: 'consent.preferences.get' })

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'list'

    if (format === 'status') {
      const status = await getConsentStatus(supabase, user.id, profile.tenant_id)
      return NextResponse.json(status)
    }

    const preferences = await getUserPreferences(supabase, user.id, profile.tenant_id)
    return NextResponse.json(preferences)
  }
)

/**
 * POST /api/consents/preferences
 *
 * Create or update a single consent preference
 * Body: { consentType, granted, source }
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase, log }: ApiHandlerContext & { request: NextRequest }) => {
    log.info('Setting consent preference', { action: 'consent.preferences.set' })

    let body: { consentType: string; granted: boolean; source?: string }
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // Validate consent type
    if (!body.consentType || !isValidConsentType(body.consentType)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { field: 'consentType', message: 'Tipo de consentimiento inválido' },
      })
    }

    // Validate granted is boolean
    if (typeof body.granted !== 'boolean') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { field: 'granted', message: 'El valor granted debe ser booleano' },
      })
    }

    // Validate source if provided
    const source: ConsentSource = body.source && isValidConsentSource(body.source) ? body.source : 'settings'

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    try {
      const preference = await setPreference(
        supabase,
        user.id,
        profile.tenant_id,
        body.consentType as ConsentType,
        body.granted,
        source,
        ip ?? undefined,
        userAgent ?? undefined
      )

      log.info('Consent preference updated', {
        consentType: body.consentType,
        granted: body.granted,
        source,
      })

      return NextResponse.json(preference, { status: HTTP_STATUS.OK })
    } catch (error) {
      log.error('Failed to set consent preference', { error })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Error desconocido' },
      })
    }
  },
  { rateLimit: 'write' }
)

/**
 * PUT /api/consents/preferences
 *
 * Bulk update multiple consent preferences
 * Body: { preferences: [{ consentType, granted }], source }
 */
export const PUT = withApiAuth(
  async ({ request, user, profile, supabase, log }: ApiHandlerContext & { request: NextRequest }) => {
    log.info('Bulk updating consent preferences', { action: 'consent.preferences.bulk' })

    let body: { preferences: Array<{ consentType: string; granted: boolean }>; source?: string }
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // Validate preferences array
    if (!Array.isArray(body.preferences) || body.preferences.length === 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { field: 'preferences', message: 'Se requiere un array de preferencias' },
      })
    }

    // Validate each preference
    for (const pref of body.preferences) {
      if (!pref.consentType || !isValidConsentType(pref.consentType)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { field: 'consentType', message: `Tipo de consentimiento inválido: ${pref.consentType}` },
        })
      }
      if (typeof pref.granted !== 'boolean') {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { field: 'granted', message: 'El valor granted debe ser booleano' },
        })
      }
    }

    // Validate source if provided
    const source: ConsentSource = body.source && isValidConsentSource(body.source) ? body.source : 'settings'

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    try {
      const input: BulkConsentUpdateInput = {
        preferences: body.preferences.map((p) => ({
          consentType: p.consentType as ConsentType,
          granted: p.granted,
        })),
        source,
      }

      const results = await bulkUpdatePreferences(
        supabase,
        user.id,
        profile.tenant_id,
        input,
        ip ?? undefined,
        userAgent ?? undefined
      )

      log.info('Bulk consent preferences updated', { count: results.length })

      return NextResponse.json({
        updated: results.length,
        preferences: results,
      })
    } catch (error) {
      log.error('Failed to bulk update consent preferences', { error })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Error desconocido' },
      })
    }
  },
  { rateLimit: 'write' }
)
