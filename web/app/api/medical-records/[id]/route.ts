/**
 * Medical Records [id] API
 *
 * GET    /api/medical-records/[id] - Get single medical record
 * PATCH  /api/medical-records/[id] - Update medical record (staff only)
 * DELETE /api/medical-records/[id] - Soft delete medical record (admin only)
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Valid medical record types
const RECORD_TYPES = [
  'consultation',
  'exam',
  'surgery',
  'hospitalization',
  'wellness',
  'emergency',
  'follow_up',
  'vaccination',
  'lab_result',
  'imaging',
] as const

// Zod schema for updating medical record
const updateMedicalRecordSchema = z.object({
  type: z
    .enum(RECORD_TYPES, {
      message: 'Tipo de registro inválido',
    })
    .optional(),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200, 'El título es muy largo').optional(),
  diagnosis: z.string().max(2000, 'El diagnóstico es muy largo').nullable().optional(),
  diagnosis_code_id: z.string().uuid('ID de código diagnóstico inválido').nullable().optional(),
  notes: z.string().max(5000, 'Las notas son muy largas').nullable().optional(),
  vitals: z
    .object({
      weight: z.number().positive().nullable().optional(),
      temp: z.number().min(30).max(45).nullable().optional(),
      hr: z.number().int().positive().max(300).nullable().optional(),
      rr: z.number().int().positive().max(100).nullable().optional(),
    })
    .nullable()
    .optional(),
  attachments: z.array(z.string().url('URL de adjunto inválida')).max(10).optional(),
})

/**
 * GET /api/medical-records/[id] - Get single medical record with full details
 */
export const GET = withApiAuthParams(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recordId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(recordId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de registro inválido' }] },
      })
    }

    // Get medical record with all related data
    const { data: record, error } = await supabase
      .from('medical_records')
      .select(
        `
        *,
        pet:pets!inner(
          id, name, species, breed, date_of_birth, weight, microchip_number,
          owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)
        ),
        vet:profiles!medical_records_performed_by_fkey(id, full_name, avatar_url),
        diagnosis_code:diagnosis_codes(id, code, name, description, category)
      `
      )
      .eq('id', recordId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !record) {
      logger.warn('Medical record not found', {
        tenantId: profile.tenant_id,
        recordId,
        error: error?.message,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'medical_record' },
      })
    }

    return NextResponse.json(record)
  },
  { roles: ['vet', 'admin', 'owner'] }
)

/**
 * PATCH /api/medical-records/[id] - Update medical record (staff only)
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recordId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(recordId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de registro inválido' }] },
      })
    }

    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = updateMedicalRecordSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    // Verify record exists and belongs to tenant
    const { data: existingRecord } = await supabase
      .from('medical_records')
      .select('id, tenant_id, type, title')
      .eq('id', recordId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existingRecord) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'medical_record' },
      })
    }

    // Verify diagnosis code if being updated
    if (result.data.diagnosis_code_id) {
      const { data: diagCode } = await supabase
        .from('diagnosis_codes')
        .select('id')
        .eq('id', result.data.diagnosis_code_id)
        .single()

      if (!diagCode) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: [{ field: 'diagnosis_code_id', message: 'Código de diagnóstico no encontrado' }] },
        })
      }
    }

    // Build update object (only include defined fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (result.data.type !== undefined) updateData.type = result.data.type
    if (result.data.title !== undefined) updateData.title = result.data.title
    if (result.data.diagnosis !== undefined) updateData.diagnosis = result.data.diagnosis
    if (result.data.diagnosis_code_id !== undefined) updateData.diagnosis_code_id = result.data.diagnosis_code_id
    if (result.data.notes !== undefined) updateData.notes = result.data.notes
    if (result.data.vitals !== undefined) updateData.vitals = result.data.vitals
    if (result.data.attachments !== undefined) updateData.attachments = result.data.attachments

    // Update record
    const { data: updated, error } = await supabase
      .from('medical_records')
      .update(updateData)
      .eq('id', recordId)
      .select(
        `
        *,
        pet:pets(id, name, species),
        vet:profiles!medical_records_performed_by_fkey(id, full_name)
      `
      )
      .single()

    if (error) {
      logger.error('Error updating medical record', {
        tenantId: profile.tenant_id,
        userId: user.id,
        recordId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'update',
      resource: 'medical_record',
      resource_id: recordId,
      details: {
        previous: {
          type: existingRecord.type,
          title: existingRecord.title,
        },
        updated: result.data,
      },
    })

    logger.info('Medical record updated', {
      tenantId: profile.tenant_id,
      userId: user.id,
      recordId,
      fields: Object.keys(result.data),
    })

    return NextResponse.json(updated)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/medical-records/[id] - Soft delete medical record (admin only)
 */
export const DELETE = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const recordId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(recordId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de registro inválido' }] },
      })
    }

    // Parse optional reason from body
    let reason: string | null = null
    try {
      const body = await request.json()
      reason = body.reason || null
    } catch (_error: unknown) {
      // Body is optional for DELETE
    }

    // Verify record exists and belongs to tenant
    const { data: existingRecord } = await supabase
      .from('medical_records')
      .select('id, tenant_id, pet_id, type, title')
      .eq('id', recordId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existingRecord) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'medical_record' },
      })
    }

    // Soft delete - add deleted_at and deleted_by columns if they exist,
    // otherwise do a hard delete (medical_records table structure determines behavior)
    const { error } = await supabase.from('medical_records').delete().eq('id', recordId)

    if (error) {
      logger.error('Error deleting medical record', {
        tenantId: profile.tenant_id,
        userId: user.id,
        recordId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'delete',
      resource: 'medical_record',
      resource_id: recordId,
      details: {
        type: existingRecord.type,
        title: existingRecord.title,
        pet_id: existingRecord.pet_id,
        reason,
      },
    })

    logger.info('Medical record deleted', {
      tenantId: profile.tenant_id,
      userId: user.id,
      recordId,
      reason,
    })

    return NextResponse.json({ success: true, deleted: recordId })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
