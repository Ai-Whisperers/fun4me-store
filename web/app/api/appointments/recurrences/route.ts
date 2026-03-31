import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schemas
const createRecurrenceSchema = z.object({
  pet_id: z.string().uuid(),
  service_id: z.string().uuid(),
  vet_id: z.string().uuid().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']),
  interval_value: z.number().min(1).max(12).optional().default(1),
  day_of_week: z.array(z.number().min(0).max(6)).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  preferred_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().min(15).max(480),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max_occurrences: z.number().min(1).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/appointments/recurrences
 * List recurrences - owners see their pets only, staff see all
 */
export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    const searchParams = new URL(request.url).searchParams
    const petId = searchParams.get('pet_id')
    const activeOnly = searchParams.get('active') !== 'false'

    // Build query
    let query = supabase
      .from('appointment_recurrences')
      .select(
        `
        *,
        pet:pets!pet_id (id, name, species, breed, photo_url),
        service:services!service_id (id, name, duration_minutes, base_price),
        vet:profiles!vet_id (id, full_name)
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Filter by pet for owners
    if (profile.role === 'owner') {
      const { data: userPets } = await supabase.from('pets').select('id').eq('owner_id', user.id)

      const petIds = userPets?.map((p) => p.id) || []
      query = query.in('pet_id', petIds.length > 0 ? petIds : ['00000000-0000-0000-0000-000000000000'])
    }

    if (petId) {
      query = query.eq('pet_id', petId)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching recurrences', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json({ recurrences: data })
  } catch (e) {
    logger.error('Recurrences GET error', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

/**
 * POST /api/appointments/recurrences
 * Create recurrence - owners can create for their pets, staff for any
 */
export const POST = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    // Parse and validate body
    const body = await request.json()
    const validation = createRecurrenceSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: validation.error.flatten() },
      })
    }

    const data = validation.data

    // Verify pet ownership for owners
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
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Get service duration if not provided
    let durationMinutes = data.duration_minutes
    if (!durationMinutes) {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', data.service_id)
        .single()

      durationMinutes = service?.duration_minutes || 30
    }

    // Insert recurrence
    const { data: recurrence, error: insertError } = await supabase
      .from('appointment_recurrences')
      .insert({
        tenant_id: profile.tenant_id,
        pet_id: data.pet_id,
        service_id: data.service_id,
        vet_id: data.vet_id || null,
        frequency: data.frequency,
        interval_value: data.interval_value,
        day_of_week: data.day_of_week || null,
        day_of_month: data.day_of_month || null,
        preferred_time: data.preferred_time,
        duration_minutes: durationMinutes,
        start_date: data.start_date,
        end_date: data.end_date || null,
        max_occurrences: data.max_occurrences || null,
        notes: data.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error creating recurrence', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: data.pet_id,
        error: insertError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Generate first appointments
    const { data: generated } = await supabase.rpc('generate_recurring_appointments', {
      p_days_ahead: 30,
    })

    return NextResponse.json({
      message: 'Recurrencia creada exitosamente',
      recurrence,
      appointments_generated:
        generated?.filter((g: { recurrence_id: string }) => g.recurrence_id === recurrence.id).length || 0,
    })
  } catch (e) {
    logger.error('Recurrences POST error', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { rateLimit: 'booking' })
