import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'

// GET /api/growth_charts - Get growth chart reference data
export const GET = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const species = searchParams.get('species')
    const breed = searchParams.get('breed')

    // Build query
    let query = supabase
      .from('growth_charts')
      .select('*')
      .order('breed', { ascending: true })
      .order('age_months', { ascending: true })

    // Apply optional filters
    if (species) {
      query = query.eq('species', species)
    }
    if (breed) {
      query = query.ilike('breed', `%${breed}%`)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Growth charts GET error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  }
  // No roles restriction - any authenticated user can view
)

// POST /api/growth_charts - Create a new growth chart entry
export const POST = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { breed, species, age_months, weight_kg, percentile, notes } = body

    // Validate required fields
    if (!breed || age_months === undefined || weight_kg === undefined) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['breed', 'age_months', 'weight_kg'] },
      })
    }

    // Insert new growth chart entry
    const { data, error } = await supabase
      .from('growth_charts')
      .insert({
        breed,
        species: species || 'perro',
        age_months: Number(age_months),
        weight_kg: Number(weight_kg),
        percentile: percentile ? Number(percentile) : null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Growth charts POST error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// PUT /api/growth_charts - Update a growth chart entry
export const PUT = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { id, breed, species, age_months, weight_kg, percentile, notes } = body

    if (!id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['id'] },
      })
    }

    // Verify record exists
    const { data: existing } = await supabase.from('growth_charts').select('id').eq('id', id).single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (breed !== undefined) updates.breed = breed
    if (species !== undefined) updates.species = species
    if (age_months !== undefined) updates.age_months = Number(age_months)
    if (weight_kg !== undefined) updates.weight_kg = Number(weight_kg)
    if (percentile !== undefined) updates.percentile = percentile ? Number(percentile) : null
    if (notes !== undefined) updates.notes = notes || null

    const { data, error } = await supabase
      .from('growth_charts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Growth charts PUT error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        chartId: id,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// DELETE /api/growth_charts - Delete a growth chart entry (admin only)
export const DELETE = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
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

    // Verify record exists
    const { data: existing } = await supabase.from('growth_charts').select('id').eq('id', id).single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const { error } = await supabase.from('growth_charts').delete().eq('id', id)

    if (error) {
      logger.error('Growth charts DELETE error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        chartId: id,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['admin'] } // Only admins can delete
)
