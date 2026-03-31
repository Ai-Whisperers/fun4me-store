import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/lost-pets
 * List lost pet reports (public board)
 */
export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('lost_pets')
    .select(`
      id,
      status,
      last_seen_location,
      last_seen_at,
      contact_phone,
      contact_email,
      notes,
      created_at,
      found_at,
      found_location,
      pet:pets (
        id,
        name,
        species,
        breed,
        photo_url,
        owner:profiles (
          id,
          full_name,
          phone,
          email
        )
      ),
      reported_by_user:profiles!reported_by (
        full_name
      ),
      found_by_user:profiles!found_by (
        full_name
      )
    `)
    .eq('tenant_id', profile.tenant_id)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching lost pets', {
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return apiSuccess(data)
})

/**
 * PATCH /api/lost-pets
 * Update lost pet report status
 * Requires staff role AND report must belong to staff's tenant
 */
export const PATCH = withApiAuth(
  async ({ request, profile, supabase, user }: ApiHandlerContext) => {
    const { id, status } = await request.json()

    if (!id || !status) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['id', 'status'] },
      })
    }

    // Verify report exists and belongs to staff's tenant
    const { data: existing, error: fetchError } = await supabase
      .from('lost_pets')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const updateData: {
      status: string
      found_at?: string | null
      found_by?: string | null
    } = {
      status,
    }

    if (status === 'reunited' || status === 'found') {
      updateData.found_at = new Date().toISOString()
      updateData.found_by = user.id
    }

    const { error } = await supabase
      .from('lost_pets')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      logger.error('Error updating lost pet', {
        tenantId: profile.tenant_id,
        petId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return apiSuccess({ id }, 'Estado actualizado')
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
