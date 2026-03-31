import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/reproductive_cycles
 * Get reproductive cycles for pets (staff sees all, owners see own pets)
 */
export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const petId = searchParams.get('pet_id')

  // Build query based on role
  let query = supabase
    .from('reproductive_cycles')
    .select(
      `
      *,
      pet:pets!inner(id, name, owner_id, tenant_id)
    `
    )
    .order('created_at', { ascending: false })

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff sees all clinic data
    query = query.eq('pet.tenant_id', profile.tenant_id)
  } else {
    // Owners see only their pets
    query = query.eq('pet.owner_id', user.id)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching reproductive cycles', {
      tenantId: profile.tenant_id,
      userId: user.id,
      petId,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

/**
 * POST /api/reproductive_cycles
 * Create a reproductive cycle record (staff only)
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { pet_id, ...cycleData } = body

    if (!pet_id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['pet_id'] },
      })
    }

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'pet' },
      })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    const { data, error } = await supabase
      .from('reproductive_cycles')
      .insert({
        pet_id,
        ...cycleData,
        recorded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating reproductive cycle', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: pet_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * PUT /api/reproductive_cycles
 * Update a reproductive cycle record (staff only)
 */
export const PUT = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { id, ...updates } = body

    if (!id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['id'] },
      })
    }

    // Verify cycle belongs to staff's clinic
    const { data: existing } = await supabase
      .from('reproductive_cycles')
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

    const { data, error } = await supabase
      .from('reproductive_cycles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating reproductive cycle', {
        tenantId: profile.tenant_id,
        userId: user.id,
        cycleId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/reproductive_cycles
 * Delete a reproductive cycle record (admin only)
 */
export const DELETE = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { id } = body

    if (!id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['id'] },
      })
    }

    // Verify belongs to admin's clinic
    const { data: existing } = await supabase
      .from('reproductive_cycles')
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

    const { error } = await supabase.from('reproductive_cycles').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting reproductive cycle', {
        tenantId: profile.tenant_id,
        userId: user.id,
        cycleId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
