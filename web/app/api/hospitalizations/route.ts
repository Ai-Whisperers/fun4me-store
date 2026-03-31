import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// VALID-002: Zod schemas with trimming to reject whitespace-only strings
const createHospitalizationSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  kennel_id: z.string().uuid('ID de canil inválido'),
  hospitalization_type: z.string().min(1, 'Tipo de hospitalización requerido').transform(s => s.trim()),
  admission_diagnosis: z.string().min(3, 'El diagnóstico debe tener al menos 3 caracteres').max(1000).transform(s => s.trim()),
  treatment_plan: z.string().max(2000).transform(s => s.trim() || null).nullable().optional(),
  diet_instructions: z.string().max(1000).transform(s => s.trim() || null).nullable().optional(),
  acuity_level: z.enum(['routine', 'low', 'medium', 'high', 'critical']).default('routine'),
  estimated_discharge_date: z.string().datetime().nullable().optional(),
  emergency_contact_name: z.string().max(200).transform(s => s.trim() || null).nullable().optional(),
  emergency_contact_phone: z.string().max(50).transform(s => s.trim() || null).nullable().optional(),
})

const updateHospitalizationSchema = z.object({
  id: z.string().uuid('ID de hospitalización inválido'),
  status: z.enum(['active', 'discharged', 'transferred', 'deceased']).optional(),
  treatment_plan: z.string().max(2000).transform(s => s.trim() || null).nullable().optional(),
  diet_instructions: z.string().max(1000).transform(s => s.trim() || null).nullable().optional(),
  discharge_notes: z.string().max(2000).transform(s => s.trim() || null).nullable().optional(),
  discharge_instructions: z.string().max(2000).transform(s => s.trim() || null).nullable().optional(),
  acuity_level: z.enum(['routine', 'low', 'medium', 'high', 'critical']).optional(),
})

export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const kennelId = searchParams.get('kennel_id')
    const petId = searchParams.get('pet_id')

    // Build query
    let query = supabase
      .from('hospitalizations')
      .select(
        `
      *,
      pet:pets!inner(id, name, species, breed, owner_id, profiles!pets_owner_id_fkey(full_name, phone)),
      kennel:kennels(id, kennel_number, kennel_type, location),
      admitted_by:profiles!hospitalizations_admitted_by_fkey(full_name),
      discharged_by:profiles!hospitalizations_discharged_by_fkey(full_name)
    `
      )
      .eq('pet.tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('admission_date', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (kennelId) {
      query = query.eq('kennel_id', kennelId)
    }
    if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching hospitalizations', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)

export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body with Zod (VALID-002)
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createHospitalizationSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const {
      pet_id,
      kennel_id,
      hospitalization_type,
      admission_diagnosis,
      treatment_plan,
      diet_instructions,
      acuity_level,
      estimated_discharge_date,
      emergency_contact_name,
      emergency_contact_phone,
    } = result.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id, name')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Verify kennel is available
    const { data: kennel } = await supabase
      .from('kennels')
      .select('id, kennel_status, tenant_id')
      .eq('id', kennel_id)
      .single()

    if (!kennel) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'kennel' } })
    }

    if (kennel.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    if (kennel.kennel_status !== 'available') {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { reason: 'kennel_not_available' },
      })
    }

    // SEC-004: Generate hospitalization number atomically using database sequence
    // This prevents race conditions where concurrent requests get duplicate numbers
    const { data: hospNumberData, error: seqError } = await supabase.rpc(
      'generate_hospitalization_number',
      { p_tenant_id: profile.tenant_id }
    )

    if (seqError || !hospNumberData) {
      logger.error('Error generating hospitalization number', {
        tenantId: profile.tenant_id,
        error: seqError?.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const hospitalizationNumber = hospNumberData as string

    // Insert hospitalization
    const { data: hospitalization, error: hospError } = await supabase
      .from('hospitalizations')
      .insert({
        hospitalization_number: hospitalizationNumber,
        pet_id,
        kennel_id,
        hospitalization_type,
        admission_date: new Date().toISOString(),
        admission_diagnosis,
        treatment_plan: treatment_plan || null,
        diet_instructions: diet_instructions || null,
        acuity_level: acuity_level || 'routine',
        status: 'active',
        estimated_discharge_date: estimated_discharge_date || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        admitted_by: user.id,
      })
      .select(
        `
      *,
      pet:pets(id, name, species, breed),
      kennel:kennels(id, kennel_number, kennel_type, location)
    `
      )
      .single()

    if (hospError) {
      // RACE-002: Handle kennel conflict errors gracefully
      // Unique index violation (23505) or trigger exception (P0001)
      if (hospError.code === '23505' || hospError.code === 'P0001') {
        logger.warn('Kennel booking conflict', {
          tenantId: profile.tenant_id,
          kennelId: kennel_id,
          error: hospError.message,
        })
        return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
          details: { message: 'El canil no está disponible o ya está ocupado' },
        })
      }

      logger.error('Error creating hospitalization', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: pet_id,
        error: hospError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // RACE-002: Kennel status is now updated automatically by database trigger
    // No manual update needed - trigger ensures atomicity

    return NextResponse.json(hospitalization, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

export const PATCH = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body with Zod (VALID-002)
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = updateHospitalizationSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const {
      id,
      status,
      treatment_plan,
      diet_instructions,
      discharge_notes,
      discharge_instructions,
      acuity_level,
    } = result.data

    // Verify hospitalization belongs to staff's clinic
    const { data: existing } = await supabase
      .from('hospitalizations')
      .select(
        `
      id,
      kennel_id,
      pet:pets!inner(tenant_id)
    `
      )
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'hospitalization' },
      })
    }

    const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
    const pet = petData as { tenant_id: string }
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (treatment_plan !== undefined) updates.treatment_plan = treatment_plan
    if (diet_instructions !== undefined) updates.diet_instructions = diet_instructions
    if (acuity_level !== undefined) updates.acuity_level = acuity_level

    if (status) {
      updates.status = status
      if (status === 'discharged') {
        updates.discharge_date = new Date().toISOString()
        updates.discharged_by = user.id
        if (discharge_notes) updates.discharge_notes = discharge_notes
        if (discharge_instructions) updates.discharge_instructions = discharge_instructions
        // RACE-002: Kennel status is now updated automatically by database trigger
        // Trigger sets kennel to 'cleaning' status on discharge
      }
    }

    const { data, error } = await supabase
      .from('hospitalizations')
      .update(updates)
      .eq('id', id)
      .select(
        `
      *,
      pet:pets(id, name, species, breed),
      kennel:kennels(id, kennel_number, kennel_type, location)
    `
      )
      .single()

    if (error) {
      logger.error('Error updating hospitalization', {
        tenantId: profile.tenant_id,
        userId: user.id,
        hospitalizationId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
