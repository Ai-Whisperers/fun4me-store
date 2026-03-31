import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { apiCreatePrescriptionSchema, apiUpdatePrescriptionSchema } from '@/lib/schemas/medical'

export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const petId = searchParams.get('pet_id')

  // Build query based on role
  let query = supabase
    .from('prescriptions')
    .select(
      `
      *,
      pet:pets!inner(id, name, owner_id, tenant_id),
      vet:profiles!vet_id(id, full_name)
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff sees all clinic prescriptions
    query = query.eq('pet.tenant_id', profile.tenant_id)
  } else {
    // Owners see only their pets' prescriptions
    query = query.eq('pet.owner_id', user.id)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching prescriptions', {
      userId: user.id,
      tenantId: profile.tenant_id,
      petId,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // VALID-004: Validate with Zod schema
    const validation = apiCreatePrescriptionSchema.safeParse(body)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const { pet_id, drugs, notes, signature_hash, qr_code_url } = validation.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Insert prescription with authenticated vet
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        pet_id,
        vet_id: user.id,
        drugs,
        notes: notes || null,
        digital_signature_hash: signature_hash || null,
        qr_code_url: qr_code_url || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating prescription', {
        userId: user.id,
        tenantId: profile.tenant_id,
        petId: pet_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

export const PUT = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // VALID-004: Validate with Zod schema
    const validation = apiUpdatePrescriptionSchema.safeParse(body)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const { id, drugs, notes, status } = validation.data

    // Verify prescription belongs to staff's clinic
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id, pet:pets!inner(tenant_id)')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
    const pet = petData as { tenant_id: string }
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (drugs) updates.drugs = drugs
    if (notes !== undefined) updates.notes = notes
    if (status) updates.status = status

    const { data, error } = await supabase
      .from('prescriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating prescription', {
        userId: user.id,
        tenantId: profile.tenant_id,
        prescriptionId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

export const DELETE = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, { details: { required: ['id'] } })
    }

    // Verify prescription belongs to admin's clinic
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id, pet:pets!inner(tenant_id)')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
    const pet = petData as { tenant_id: string }
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    const { error } = await supabase.from('prescriptions').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting prescription', {
        userId: user.id,
        tenantId: profile.tenant_id,
        prescriptionId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['admin'] }
)
