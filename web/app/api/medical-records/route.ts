/**
 * Medical Records API
 *
 * GET  /api/medical-records - List medical records (filterable by pet_id, type, date range)
 * POST /api/medical-records - Create new medical record
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
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

// Zod schema for creating medical record
const createMedicalRecordSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  type: z.enum(RECORD_TYPES, {
    message: 'Tipo de registro inválido',
  }),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200, 'El título es muy largo'),
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
 * GET /api/medical-records - List medical records
 * Query params: pet_id, type, from_date, to_date, page, limit
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('pet_id')
    const type = searchParams.get('type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const { page, limit, offset } = parsePagination(searchParams)

    // Build query
    let query = supabase
      .from('medical_records')
      .select(
        `
        *,
        pet:pets!inner(id, name, species, breed)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (petId) {
      query = query.eq('pet_id', petId)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Error fetching medical records', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(paginatedResponse(data || [], count || 0, { page, limit, offset }))
  },
  { roles: ['vet', 'admin', 'owner'] }
)

/**
 * POST /api/medical-records - Create new medical record
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createMedicalRecordSchema.safeParse(body)
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

    const { pet_id, type, title, notes, vitals, attachments } = result.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase.from('pets').select('id, tenant_id, owner_id').eq('id', pet_id).single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Note: diagnosis_code_id field removed as it doesn't exist in the database schema

    // Create medical record
    const { data: record, error } = await supabase
      .from('medical_records')
      .insert({
        pet_id,
        tenant_id: profile.tenant_id,
        type,
        title,
        notes: notes || null,
        vitals: vitals || null,
        attachments: attachments || [],
      })
      .select(
        `
        *,
        pet:pets(id, name, species)
      `
      )
      .single()

    if (error) {
      logger.error('Error creating medical record', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: pet_id,
        recordType: type,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'create',
      resource: 'medical_record',
      resource_id: record.id,
      details: {
        type,
        title,
        pet_id,
      },
    })

    logger.info('Medical record created', {
      tenantId: profile.tenant_id,
      userId: user.id,
      recordId: record.id,
      petId: pet_id,
      type,
    })

    return NextResponse.json(record, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
