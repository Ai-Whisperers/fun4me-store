import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const petId = searchParams.get('pet_id')

  // Build query - staff sees all clinic reactions, owners see their pets only
  let query = supabase.from('vaccine_reactions').select(`
      *,
      pet:pets!inner(id, name, owner_id, tenant_id),
      vaccine:vaccines(id, vaccine_name)
    `)

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff: filter by clinic
    query = query.eq('pet.tenant_id', profile.tenant_id)
  } else {
    // Owner: filter by ownership
    query = query.eq('pet.owner_id', user.id)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching vaccine reactions', {
      userId: user.id,
      tenantId: profile.tenant_id,
      petId,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al obtener reacciones' },
    })
  }

  return NextResponse.json(data)
})

export const POST = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  // Parse body
  let body
  try {
    body = await request.json()
  } catch (_error: unknown) {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const { pet_id, vaccine_id, reaction_type, severity, description, occurred_at } = body

  // Validate required fields
  if (!pet_id || !reaction_type) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['pet_id', 'reaction_type'] },
    })
  }

  // Verify pet access (owner or staff)
  const { data: pet } = await supabase
    .from('pets')
    .select('id, owner_id, tenant_id')
    .eq('id', pet_id)
    .single()

  if (!pet) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'pet' },
    })
  }

  const isOwner = pet.owner_id === user.id
  const isStaff = ['vet', 'admin'].includes(profile.role) && pet.tenant_id === profile.tenant_id

  if (!isOwner && !isStaff) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // Insert reaction
  const { data, error } = await supabase
    .from('vaccine_reactions')
    .insert({
      pet_id,
      vaccine_id: vaccine_id || null,
      reaction_type,
      severity: severity || 'mild',
      description: description || null,
      occurred_at: occurred_at || new Date().toISOString(),
      reported_by: user.id,
    })
    .select()
    .single()

  if (error) {
    logger.error('Error creating vaccine reaction', {
      userId: user.id,
      tenantId: profile.tenant_id,
      petId: pet_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al registrar reacción' },
    })
  }

  return NextResponse.json(data, { status: 201 })
}, { rateLimit: 'write' })

export const PUT = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  // Parse body
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

  // Get existing reaction with pet info
  const { data: existing } = await supabase
    .from('vaccine_reactions')
    .select('id, pet:pets!inner(owner_id, tenant_id)')
    .eq('id', id)
    .single()

  if (!existing) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'vaccine_reaction' },
    })
  }

  // Verify access
  const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
  const pet = petData as { owner_id: string; tenant_id: string }
  const isOwner = pet.owner_id === user.id
  const isStaff = ['vet', 'admin'].includes(profile.role) && pet.tenant_id === profile.tenant_id

  if (!isOwner && !isStaff) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // Update
  const { data, error } = await supabase
    .from('vaccine_reactions')
    .update({
      reaction_type: updates.reaction_type,
      severity: updates.severity,
      description: updates.description,
      occurred_at: updates.occurred_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Error updating vaccine reaction', {
      userId: user.id,
      tenantId: profile.tenant_id,
      reactionId: id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al actualizar' },
    })
  }

  return NextResponse.json(data)
}, { rateLimit: 'write' })

export const DELETE = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse body
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

    // Verify reaction belongs to staff's clinic
    const { data: existing } = await supabase
      .from('vaccine_reactions')
      .select('id, pet:pets!inner(tenant_id)')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'vaccine_reaction' },
      })
    }

    const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
    const pet = petData as { tenant_id: string }
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Delete
    const { error } = await supabase.from('vaccine_reactions').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting vaccine reaction', {
        userId: user.id,
        tenantId: profile.tenant_id,
        reactionId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al eliminar' },
      })
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
