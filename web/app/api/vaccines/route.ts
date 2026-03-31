/**
 * Vaccines API
 *
 * GET  /api/vaccines - List vaccines (filterable by pet_id, status, date range)
 * POST /api/vaccines - Create new vaccine record
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Valid vaccine statuses
const VACCINE_STATUSES = ['pending', 'verified', 'expired'] as const

// Zod schema for creating vaccine
const createVaccineSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es muy largo'),
  administered_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .refine(
      (val) => {
        const date = new Date(val)
        const now = new Date()
        now.setHours(23, 59, 59, 999)
        return date <= now
      },
      { message: 'La fecha de aplicación no puede ser en el futuro' }
    ),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .nullable()
    .optional(),
  batch_number: z.string().max(50, 'El número de lote es muy largo').nullable().optional(),
  notes: z.string().max(1000, 'Las notas son muy largas').nullable().optional(),
  certificate_url: z.string().url('URL de certificado inválida').nullable().optional(),
  photos: z.array(z.string().url('URL de foto inválida')).max(5).optional(),
})

/**
 * GET /api/vaccines - List vaccines
 * Query params: pet_id, status, upcoming (bool), overdue (bool), from_date, to_date, page, limit
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('pet_id')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const overdue = searchParams.get('overdue') === 'true'
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const { page, limit, offset } = parsePagination(searchParams)

    // Build query - require pet_id or tenant context
    // NOTE: Simplified joins for test compatibility - FK relationship aliases can cause
    // "Could not find relationship" errors in test environments due to schema cache issues
    let query = supabase
      .from('vaccines')
      .select(
        `
        *,
        pets!inner(id, name, species, breed, tenant_id)
      `,
        { count: 'exact' }
      )
      .eq('pets.tenant_id', profile.tenant_id)
      .order('administered_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (petId) {
      query = query.eq('pet_id', petId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Upcoming: next_due_date within 30 days from today
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      const thirtyDaysStr = thirtyDays.toISOString().split('T')[0]
      query = query.gte('next_due_date', today).lte('next_due_date', thirtyDaysStr)
    }

    // Overdue: next_due_date before today
    if (overdue) {
      const today = new Date().toISOString().split('T')[0]
      query = query.lt('next_due_date', today)
    }

    if (fromDate) {
      query = query.gte('administered_date', fromDate)
    }

    if (toDate) {
      query = query.lte('administered_date', toDate)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Error fetching vaccines', {
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
 * POST /api/vaccines - Create new vaccine record
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

    const result = createVaccineSchema.safeParse(body)
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

    const { pet_id, name, administered_date, next_due_date, batch_number, notes, certificate_url, photos } = result.data

    // Validate next_due_date is after administered_date
    if (next_due_date && new Date(next_due_date) <= new Date(administered_date)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: [
            { field: 'next_due_date', message: 'La fecha de próxima dosis debe ser posterior a la fecha de aplicación' },
          ],
        },
      })
    }

    // Verify pet belongs to tenant
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id, owner_id, name')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Check for duplicate: same pet, same vaccine name, same date
    const { data: existing } = await supabase
      .from('vaccines')
      .select('id')
      .eq('pet_id', pet_id)
      .ilike('name', name)
      .eq('administered_date', administered_date)
      .single()

    if (existing) {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya existe un registro de esta vacuna para esta fecha' },
      })
    }

    // Staff creates verified vaccines, owners create pending
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const status = isStaff ? 'verified' : 'pending'

    // Create vaccine record
    const { data: vaccine, error } = await supabase
      .from('vaccines')
      .insert({
        pet_id,
        name,
        administered_date,
        next_due_date: next_due_date || null,
        batch_number: batch_number || null,
        notes: notes || null,
        certificate_url: certificate_url || null,
        photos: photos || null,
        status,
        administered_by: isStaff ? user.id : null,
        verified_by: isStaff ? user.id : null,
        verified_at: isStaff ? new Date().toISOString() : null,
      })
      .select(
        `
        *,
        pets(id, name, species)
      `
      )
      .single()

    if (error) {
      logger.error('Error creating vaccine', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: pet_id,
        vaccineName: name,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'create',
      resource: 'vaccine',
      resource_id: vaccine.id,
      details: {
        name,
        pet_id,
        pet_name: pet.name,
        administered_date,
        status,
      },
    })

    logger.info('Vaccine created', {
      tenantId: profile.tenant_id,
      userId: user.id,
      vaccineId: vaccine.id,
      petId: pet_id,
      name,
      status,
    })

    return NextResponse.json(vaccine, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['vet', 'admin', 'owner'], rateLimit: 'write' }
)
