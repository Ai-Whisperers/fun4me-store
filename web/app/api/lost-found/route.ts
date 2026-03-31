/**
 * Lost & Found API
 *
 * GET /api/lost-found - List lost pet reports (public for lost status, filtered by tenant for staff)
 * POST /api/lost-found - Create a new lost pet report
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/lost-found - List lost pet reports
export const GET = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'lost'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeAll = searchParams.get('include_all') === 'true' // For staff to see all statuses

    let query = supabase
      .from('lost_pets')
      .select(
        `
        *,
        pet:pets!inner (
          id,
          name,
          species,
          breed,
          color,
          photo_url,
          microchip_number,
          owner:profiles!pets_owner_id_fkey (
            id,
            full_name,
            phone,
            email
          )
        ),
        reported_by_profile:profiles!lost_pets_reported_by_fkey (
          id,
          full_name
        ),
        sightings:pet_sightings (
          id,
          sighting_date,
          sighting_location,
          is_verified
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status unless requesting all
    if (!includeAll && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Lost pets GET error', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({
      reports: data || [],
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  }
)

// POST /api/lost-found - Create a new lost pet report
export const POST = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const {
      pet_id,
      status = 'lost',
      last_seen_location,
      last_seen_lat,
      last_seen_lng,
      last_seen_at,
      contact_phone,
      contact_email,
      notes,
    } = body

    // Validate required fields
    if (!pet_id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['pet_id'] },
      })
    }

    // Verify pet exists and user has access (either owner or staff)
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, owner_id, tenant_id')
      .eq('id', pet_id)
      .single()

    if (petError || !pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isOwner = pet.owner_id === user.id
    const isStaff = ['vet', 'admin'].includes(profile.role) && pet.tenant_id === profile.tenant_id

    if (!isOwner && !isStaff) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Create lost pet report
    const { data, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_id,
        tenant_id: pet.tenant_id,
        status,
        last_seen_location,
        last_seen_lat: last_seen_lat ? Number(last_seen_lat) : null,
        last_seen_lng: last_seen_lng ? Number(last_seen_lng) : null,
        last_seen_at: last_seen_at || new Date().toISOString(),
        reported_by: user.id,
        contact_phone: contact_phone || profile.phone,
        contact_email: contact_email || profile.email,
        notes,
      })
      .select(
        `
        *,
        pet:pets (
          id,
          name,
          species,
          breed,
          photo_url
        )
      `
      )
      .single()

    if (error) {
      logger.error('Lost pets POST error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        petId: pet_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { rateLimit: 'write' }
)
