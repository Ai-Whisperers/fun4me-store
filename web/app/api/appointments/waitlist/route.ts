import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schemas
const joinWaitlistSchema = z.object({
  pet_id: z.string().uuid(),
  service_id: z.string().uuid(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_time_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferred_time_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferred_vet_id: z.string().uuid().optional(),
  is_flexible_date: z.boolean().optional().default(false),
  notify_via: z.array(z.enum(['email', 'whatsapp', 'sms'])).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/appointments/waitlist - List waitlist entries
 */
export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    const searchParams = new URL(request.url).searchParams
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const petId = searchParams.get('pet_id')

    // Build query
    let query = supabase
      .from('appointment_waitlists')
      .select(
        `
        *,
        pet:pets!pet_id (id, name, species, breed, photo_url),
        service:services!service_id (id, name, duration_minutes, base_price),
        preferred_vet:profiles!preferred_vet_id (id, full_name),
        owner:pets!pet_id (owner:profiles!owner_id (id, full_name, email, phone))
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .order('preferred_date', { ascending: true })
      .order('position', { ascending: true })

    // Staff see all, owners see only their pets
    if (profile.role === 'owner') {
      const { data: userPets } = await supabase.from('pets').select('id').eq('owner_id', user.id)

      const petIds = userPets?.map((p) => p.id) || []
      query = query.in('pet_id', petIds.length > 0 ? petIds : ['00000000-0000-0000-0000-000000000000'])
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (date) {
      query = query.eq('preferred_date', date)
    }
    if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching waitlist', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({ waitlist: data })
  } catch (error) {
    logger.error('Waitlist GET error', {
      tenantId: profile.tenant_id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

/**
 * POST /api/appointments/waitlist - Join waitlist
 */
export const POST = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    // Parse and validate body
    const body = await request.json()
    const validation = joinWaitlistSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: validation.error.flatten(),
      })
    }

    const data = validation.data

    // Verify pet ownership (if not staff)
    const { data: pet } = await supabase
      .from('pets')
      .select('id, owner_id, tenant_id')
      .eq('id', data.pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'pet' },
      })
    }

    if (profile.role === 'owner' && pet.owner_id !== user.id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No autorizado para esta mascota' },
      })
    }

    // Check if already on waitlist for same date/service
    const { data: existing } = await supabase
      .from('appointment_waitlists')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('pet_id', data.pet_id)
      .eq('service_id', data.service_id)
      .eq('preferred_date', data.preferred_date)
      .eq('status', 'waiting')
      .single()

    if (existing) {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya estás en la lista de espera para esta fecha y servicio' },
      })
    }

    // Insert waitlist entry (position is auto-assigned by trigger)
    const { data: waitlistEntry, error: insertError } = await supabase
      .from('appointment_waitlists')
      .insert({
        tenant_id: profile.tenant_id,
        pet_id: data.pet_id,
        service_id: data.service_id,
        preferred_date: data.preferred_date,
        preferred_time_start: data.preferred_time_start || null,
        preferred_time_end: data.preferred_time_end || null,
        preferred_vet_id: data.preferred_vet_id || null,
        is_flexible_date: data.is_flexible_date,
        notify_via: data.notify_via || ['email', 'whatsapp'],
        notes: data.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error joining waitlist', {
        tenantId: profile.tenant_id,
        petId: data.pet_id,
        error: insertError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({
      message: 'Te has unido a la lista de espera',
      waitlistEntry,
    })
  } catch (error) {
    logger.error('Waitlist POST error', {
      tenantId: profile.tenant_id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { rateLimit: 'booking' })
