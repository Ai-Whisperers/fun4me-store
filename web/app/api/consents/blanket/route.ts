import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { createBlanketConsentSchema, revokeBlanketConsentSchema } from '@/lib/schemas/consent'

export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const petId = searchParams.get('pet_id')
  const ownerId = searchParams.get('owner_id')

  // Build query
  let query = supabase
    .from('blanket_consents')
    .select(
      `
      *,
      pet:pets!pet_id(id, name, owner_id, tenant_id),
      owner:profiles!owner_id(id, full_name, email),
      granted_by:profiles!granted_by_id(id, full_name)
    `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (['vet', 'admin'].includes(profile.role)) {
    // Staff sees all clinic blanket consents
    query = query.eq('pet.tenant_id', profile.tenant_id)
  } else {
    // Owners see only their own blanket consents
    query = query.eq('owner_id', user.id)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching blanket consents', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createBlanketConsentSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: result.error.flatten().fieldErrors },
      })
    }

    const { pet_id, owner_id, consent_type, scope, conditions, signature_data, expires_at } = result.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id, owner_id')
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

    // Verify owner
    if (pet.owner_id !== owner_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Owner does not match pet' },
      })
    }

    // Insert blanket consent
    const { data, error } = await supabase
      .from('blanket_consents')
      .insert({
        pet_id,
        owner_id,
        consent_type,
        scope,
        conditions: conditions || null,
        signature_data,
        granted_by_id: user.id,
        granted_at: new Date().toISOString(),
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating blanket consent', {
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

export const PATCH = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  // Parse and validate body
  let body
  try {
    body = await request.json()
  } catch (_error: unknown) {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const result = revokeBlanketConsentSchema.safeParse(body)
  if (!result.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { errors: result.error.flatten().fieldErrors },
    })
  }

  const { id, reason } = result.data

  // Get existing blanket consent
  const { data: existing } = await supabase
    .from('blanket_consents')
    .select(
      `
      id,
      owner_id,
      is_active,
      pet:pets!inner(tenant_id)
    `
    )
    .eq('id', id)
    .single()

  if (!existing) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'blanket_consent' },
    })
  }

  // Authorization check
  const petData = Array.isArray(existing.pet) ? existing.pet[0] : existing.pet
  const pet = petData as { tenant_id: string }

  const isStaff = ['vet', 'admin'].includes(profile.role)
  const isOwner = existing.owner_id === user.id

  if (isStaff) {
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }
  } else if (!isOwner) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  // Update blanket consent
  const { data, error } = await supabase
    .from('blanket_consents')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_by_id: user.id,
      revocation_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Error revoking blanket consent', {
      tenantId: profile.tenant_id,
      userId: user.id,
      consentId: id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)
