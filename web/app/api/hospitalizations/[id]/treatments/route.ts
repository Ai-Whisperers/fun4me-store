import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/hospitalizations/[id]/treatments - Add treatment
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

    const { treatment_type, medication_name, dosage, route, frequency, scheduled_time, notes } = body

    // Validate required fields
    if (!treatment_type || !scheduled_time) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['treatment_type', 'scheduled_time'] },
      })
    }

    // Insert treatment
    const { data, error } = await supabase
      .from('hospitalization_treatments')
      .insert({
        hospitalization_id: hospitalizationId,
        treatment_type,
        medication_name: medication_name || null,
        dosage: dosage || null,
        route: route || null,
        frequency: frequency || null,
        scheduled_time,
        status: 'scheduled',
        notes: notes || null,
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Error adding treatment', {
        tenantId: profile.tenant_id,
        hospitalizationId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * PATCH /api/hospitalizations/[id]/treatments - Update treatment status
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { treatment_id, status, notes } = body

    if (!treatment_id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['treatment_id'] },
      })
    }

    // Verify treatment belongs to staff's clinic
    const { data: treatment } = await supabase
      .from('hospitalization_treatments')
      .select(
        `
        id,
        hospitalization:hospitalizations!inner(
          pet:pets!inner(tenant_id)
        )
      `
      )
      .eq('id', treatment_id)
      .single()

    if (!treatment) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'treatment' } })
    }

    // Build update
    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      if (status === 'administered') {
        updates.administered_at = new Date().toISOString()
        updates.administered_by_id = user.id
      }
    }
    if (notes !== undefined) {
      updates.notes = notes
    }

    const { data, error } = await supabase
      .from('hospitalization_treatments')
      .update(updates)
      .eq('id', treatment_id)
      .select(
        `
        *,
        administered_by:profiles!hospitalization_treatments_administered_by_id_fkey(full_name)
      `
      )
      .single()

    if (error) {
      logger.error('Error updating treatment', {
        tenantId: profile.tenant_id,
        treatmentId: treatment_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
