/**
 * Pet Sightings API
 *
 * GET /api/lost-found/[id]/sightings - Get all sightings for a lost pet report
 * POST /api/lost-found/[id]/sightings - Report a new sighting (public)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/lost-found/[id]/sightings - Get all sightings for a lost pet report
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: lostPetId } = await params
  const supabase = await createClient()

  // Verify report exists and is visible (lost or found status)
  const { data: report, error: reportError } = await supabase
    .from('lost_pets')
    .select('id, status')
    .eq('id', lostPetId)
    .single()

  if (reportError || !report) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
  }

  // Get sightings
  const { data, error } = await supabase
    .from('pet_sightings')
    .select('*')
    .eq('lost_pet_id', lostPetId)
    .order('sighting_date', { ascending: false })

  if (error) {
    logger.error('Pet sightings GET error', {
      lostPetId,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data || [])
}

// POST /api/lost-found/[id]/sightings - Report a new sighting (public action)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: lostPetId } = await params
  const supabase = await createClient()

  let body
  try {
    body = await request.json()
  } catch (_error: unknown) {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const {
    reporter_name,
    reporter_email,
    reporter_phone,
    sighting_location,
    sighting_lat,
    sighting_lng,
    sighting_date,
    description,
    photo_url,
  } = body

  // Validate required fields
  if (!sighting_location) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['sighting_location'] },
    })
  }

  // Verify report exists and is still active (lost status)
  const { data: report, error: reportError } = await supabase
    .from('lost_pets')
    .select('id, status, tenant_id')
    .eq('id', lostPetId)
    .single()

  if (reportError || !report) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
  }

  if (report.status === 'reunited') {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Esta mascota ya fue reunida con su dueño' },
    })
  }

  // Create sighting
  const { data, error } = await supabase
    .from('pet_sightings')
    .insert({
      lost_pet_id: lostPetId,
      reporter_name,
      reporter_email,
      reporter_phone,
      sighting_location,
      sighting_lat: sighting_lat ? Number(sighting_lat) : null,
      sighting_lng: sighting_lng ? Number(sighting_lng) : null,
      sighting_date: sighting_date || new Date().toISOString(),
      description,
      photo_url,
    })
    .select()
    .single()

  if (error) {
    logger.error('Pet sighting POST error', {
      lostPetId,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data, { status: 201 })
}
