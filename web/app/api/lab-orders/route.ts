import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// VALID-003: Zod schema for lab order validation
const createLabOrderSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  test_ids: z.array(z.string().uuid('ID de prueba inválido'))
    .min(1, 'Se requiere al menos una prueba')
    .max(20, 'Máximo 20 pruebas por orden'),
  panel_ids: z.array(z.string().uuid('ID de panel inválido'))
    .max(5, 'Máximo 5 paneles por orden')
    .optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  lab_type: z.enum(['in_house', 'external', 'reference']).default('in_house'),
  fasting_status: z.enum(['fasted', 'not_fasted', 'unknown']).nullable().optional(),
  clinical_notes: z.string().max(2000, 'Las notas son muy largas').transform(s => s.trim() || null).nullable().optional(),
})

export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('pet_id')
    const status = searchParams.get('status')
    const { page, limit, offset } = parsePagination(searchParams)

    // Build query
    let query = supabase
      .from('lab_orders')
      .select(
        `
      *,
      pets!inner(id, name, species)
    `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('ordered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (petId) {
      query = query.eq('pet_id', petId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Error fetching lab orders', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(paginatedResponse(data || [], count || 0, { page, limit, offset }))
  },
  { roles: ['vet', 'admin'] }
)

export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse and validate body with Zod (VALID-003)
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = createLabOrderSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const { pet_id, test_ids, panel_ids, priority, lab_type, fasting_status, clinical_notes } = result.data

    // Verify pet belongs to staff's clinic
    const { data: pet } = await supabase
      .from('pets')
      .select('id, tenant_id')
      .eq('id', pet_id)
      .single()

    if (!pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'pet' } })
    }

    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // VALID-003: Verify all tests exist and belong to tenant
    const { data: validTests, error: testError } = await supabase
      .from('lab_test_catalog')
      .select('id')
      .in('id', test_ids)
      .eq('tenant_id', profile.tenant_id)

    if (testError) {
      logger.error('Error verifying lab tests', {
        tenantId: profile.tenant_id,
        error: testError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Check all requested tests were found
    const validTestIds = new Set(validTests?.map(t => t.id) || [])
    const invalidTests = test_ids.filter(id => !validTestIds.has(id))

    if (invalidTests.length > 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: invalidTests.map(id => ({
            field: 'test_ids',
            message: `Prueba ${id.substring(0, 8)}... no encontrada o no disponible`,
          })),
        },
      })
    }

    // Verify panels if provided
    if (panel_ids && panel_ids.length > 0) {
      const { data: validPanels, error: panelError } = await supabase
        .from('lab_panels')
        .select('id')
        .in('id', panel_ids)
        .eq('tenant_id', profile.tenant_id)

      if (panelError) {
        logger.error('Error verifying lab panels', {
          tenantId: profile.tenant_id,
          error: panelError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const validPanelIds = new Set(validPanels?.map(p => p.id) || [])
      const invalidPanels = panel_ids.filter(id => !validPanelIds.has(id))

      if (invalidPanels.length > 0) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: {
            errors: invalidPanels.map(id => ({
              field: 'panel_ids',
              message: `Panel ${id.substring(0, 8)}... no encontrado`,
            })),
          },
        })
      }
    }

    // SEC-003: Generate order number atomically using database sequence
    // This prevents race conditions where concurrent requests get duplicate numbers
    const { data: orderNumberData, error: seqError } = await supabase.rpc(
      'generate_lab_order_number',
      { p_tenant_id: profile.tenant_id }
    )

    if (seqError || !orderNumberData) {
      logger.error('Error generating lab order number', {
        tenantId: profile.tenant_id,
        error: seqError?.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const orderNumber = orderNumberData as string

    // SEC-005: Create lab order atomically using database function
    // This ensures order, items, and panels are all created in a single transaction
    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      'create_lab_order_atomic',
      {
        p_tenant_id: profile.tenant_id,
        p_pet_id: pet_id,
        p_order_number: orderNumber,
        p_ordered_by: user.id,
        p_priority: priority || 'routine',
        p_lab_type: lab_type || 'in_house',
        p_fasting_status: fasting_status || null,
        p_clinical_notes: clinical_notes || null,
        p_test_ids: test_ids,
        p_panel_ids: panel_ids || [],
      }
    )

    if (atomicError) {
      logger.error('Error in atomic lab order creation', {
        tenantId: profile.tenant_id,
        userId: user.id,
        petId: pet_id,
        error: atomicError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Check result from atomic function
    if (!atomicResult?.success) {
      const errorType = atomicResult?.error || 'UNKNOWN'
      logger.warn('Lab order creation failed', {
        tenantId: profile.tenant_id,
        error: errorType,
        message: atomicResult?.message,
      })

      if (errorType === 'DUPLICATE_ORDER') {
        return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
          details: { message: atomicResult?.message },
        })
      }
      if (errorType === 'INVALID_REFERENCE') {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: atomicResult?.message },
        })
      }
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Fetch the created order for response
    const { data: order, error: fetchError } = await supabase
      .from('lab_orders')
      .select('*')
      .eq('id', atomicResult.order_id)
      .single()

    if (fetchError || !order) {
      // Order was created but fetch failed - still a success
      return NextResponse.json({
        id: atomicResult.order_id,
        order_number: atomicResult.order_number,
        status: 'ordered',
      }, { status: HTTP_STATUS.CREATED })
    }

    return NextResponse.json(order, { status: HTTP_STATUS.CREATED })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
