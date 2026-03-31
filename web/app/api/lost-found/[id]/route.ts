/**
 * Lost & Found API - Single Report
 *
 * GET /api/lost-found/[id] - Get a single lost pet report
 * PUT /api/lost-found/[id] - Update a lost pet report
 * DELETE /api/lost-found/[id] - Delete a lost pet report (soft delete)
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type Params = { id: string }

// GET /api/lost-found/[id] - Get a single lost pet report with full details
export const GET = withApiAuthParams<Params>(async ({ profile, supabase, params }: ApiHandlerContextWithParams<Params>) => {
  const { id } = params

  const { data, error } = await supabase
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
        sex,
        photo_url,
        photos,
        microchip_number,
        birth_date,
        weight_kg,
        owner:profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone,
          email
        )
      ),
      reported_by_profile:profiles!lost_pets_reported_by_fkey (
        id,
        full_name,
        phone,
        email
      ),
      found_by_profile:profiles!lost_pets_found_by_fkey (
        id,
        full_name
      ),
      sightings:pet_sightings (
        id,
        reporter_name,
        reporter_email,
        sighting_date,
        sighting_location,
        sighting_lat,
        sighting_lng,
        description,
        photo_url,
        is_verified,
        verified_at,
        created_at
      ),
      match_suggestions:pet_match_suggestions!pet_match_suggestions_lost_report_id_fkey (
        id,
        confidence_score,
        match_reasons,
        status,
        found_report:lost_pets!pet_match_suggestions_found_report_id_fkey (
          id,
          pet:pets (
            name,
            species,
            breed,
            photo_url
          )
        )
      )
    `
    )
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }
    logger.error('Lost pet GET error', {
      reportId: id,
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

// PUT /api/lost-found/[id] - Update a lost pet report
export const PUT = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // Verify report exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('lost_pets')
      .select('id, reported_by, tenant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isReporter = existing.reported_by === user.id
    const isStaff = ['vet', 'admin'].includes(profile.role) && existing.tenant_id === profile.tenant_id

    if (!isReporter && !isStaff) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update object
    const allowedFields = [
      'status',
      'last_seen_location',
      'last_seen_lat',
      'last_seen_lng',
      'last_seen_at',
      'contact_phone',
      'contact_email',
      'notes',
      'found_at',
      'found_location',
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Special handling for status transitions
    if (body.status === 'found' && !updates.found_at) {
      updates.found_at = new Date().toISOString()
    }

    if (body.status === 'reunited') {
      updates.found_by = user.id
      if (!updates.found_at) {
        updates.found_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('lost_pets')
      .update(updates)
      .eq('id', id)
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
      logger.error('Lost pet PUT error', {
        reportId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)

// DELETE /api/lost-found/[id] - Delete a lost pet report
export const DELETE = withApiAuthParams<Params>(
  async ({ profile, supabase, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    // Verify report exists and user is staff
    const { data: existing, error: fetchError } = await supabase
      .from('lost_pets')
      .select('id, tenant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Hard delete - lost pet reports don't need soft delete
    const { error } = await supabase.from('lost_pets').delete().eq('id', id)

    if (error) {
      logger.error('Lost pet DELETE error', {
        reportId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['vet', 'admin'] }
)
