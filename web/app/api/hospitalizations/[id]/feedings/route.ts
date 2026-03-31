import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/hospitalizations/[id]/feedings - Record feeding
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const hospitalizationId = params.id

    // Verify hospitalization exists and belongs to clinic
    const { data: hospitalization } = await supabase
      .from('hospitalizations')
      .select('id, pet:pets!inner(tenant_id)')
      .eq('id', hospitalizationId)
      .single()

    if (!hospitalization) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'hospitalization' },
      })
    }

    const petData = Array.isArray(hospitalization.pet) ? hospitalization.pet[0] : hospitalization.pet
    const pet = petData as { tenant_id: string }
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { food_type, amount_offered, amount_consumed, appetite_level, notes } = body

    // Validate required fields
    if (!food_type || amount_offered === undefined) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['food_type', 'amount_offered'] },
      })
    }

    // Insert feeding
    const { data, error } = await supabase
      .from('hospitalization_feedings')
      .insert({
        hospitalization_id: hospitalizationId,
        feeding_time: new Date().toISOString(),
        food_type,
        amount_offered,
        amount_consumed: amount_consumed || 0,
        appetite_level: appetite_level || 'normal',
        notes: notes || null,
        fed_by: user.id,
      })
      .select(
        `
        *,
        fed_by:profiles!hospitalization_feedings_fed_by_fkey(full_name)
      `
      )
      .single()

    if (error) {
      logger.error('Error recording feeding', {
        tenantId: profile.tenant_id,
        hospitalizationId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
