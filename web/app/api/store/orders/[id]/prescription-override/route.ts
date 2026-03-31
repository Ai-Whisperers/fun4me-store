import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { z } from 'zod'

/**
 * FEAT-013: Staff Prescription Override API
 *
 * Allows vet/admin staff to approve orders pending prescription review.
 * Requires a reason for audit trail compliance.
 */

const overrideSchema = z.object({
  reason: z
    .string()
    .min(10, 'La razón debe tener al menos 10 caracteres')
    .max(500, 'La razón no puede exceder 500 caracteres'),
})

// POST /api/store/orders/[id]/prescription-override
export const POST = withApiAuthParams<{ id: string }>(
  async ({ user, profile, supabase, request, log, params }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = (await params) as { id: string }

    // Validate id is UUID
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'ID de pedido inválido' },
      })
    }

    // Only vets and admins can override prescriptions
    if (!['vet', 'admin'].includes(profile.role)) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Solo veterinarios y administradores pueden aprobar recetas' },
      })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'JSON inválido' },
      })
    }

    const validationResult = overrideSchema.safeParse(body)
    if (!validationResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          message: 'Datos inválidos',
          errors: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      })
    }

    const { reason } = validationResult.data

    log.info('Processing prescription override', {
      action: 'prescription_override.start',
      id,
      staffId: user.id,
    })

    try {
      // Call the database function for atomic override with audit
      const { data: result, error } = await supabase.rpc('override_prescription_requirement', {
        p_order_id: id,
        p_staff_id: user.id,
        p_reason: reason,
      })

      if (error) {
        log.error('Prescription override failed', {
          action: 'prescription_override.error',
          id,
          error: error instanceof Error ? error : new Error(String(error)),
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      const overrideResult = result as {
        success: boolean
        error?: string
        order_id?: string
        message?: string
      }

      if (!overrideResult.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: overrideResult.error || 'Error al aprobar la receta' },
        })
      }

      log.info('Prescription override successful', {
        action: 'prescription_override.success',
        id,
        staffId: user.id,
      })

      return NextResponse.json({
        success: true,
        message: overrideResult.message || 'Receta aprobada exitosamente',
        id: overrideResult.order_id,
      })
    } catch (e) {
      log.error('Prescription override error', {
        action: 'prescription_override.error',
        id,
        error: e instanceof Error ? e : new Error(String(e)),
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: e instanceof Error ? e.message : 'Error al aprobar la receta' },
      })
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// GET /api/store/orders/[id]/prescription-override
// Get prescription override status for an order
export const GET = withApiAuthParams<{ id: string }>(
  async ({ profile, supabase, params }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = (await params) as { id: string }

    // Validate id
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'ID de pedido inválido' },
      })
    }

    // Only staff can view prescription status
    if (!['vet', 'admin'].includes(profile.role)) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No autorizado' },
      })
    }

    const { data: order, error } = await supabase
      .from('store_orders')
      .select(`
        id,
        order_number,
        status,
        requires_prescription_review,
        prescription_file_url,
        prescription_reviewed_by,
        prescription_reviewed_at,
        prescription_notes,
        prescription_rejection_reason,
        pet_id,
        pets (
          id,
          name,
          species
        ),
        reviewer:prescription_reviewed_by (
          id,
          full_name
        )
      `)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !order) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Pedido no encontrado' },
      })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      requiresPrescriptionReview: order.requires_prescription_review,
      prescriptionFileUrl: order.prescription_file_url,
      pet: order.pets,
      review: order.prescription_reviewed_by
        ? {
            reviewedBy: order.reviewer,
            reviewedAt: order.prescription_reviewed_at,
            notes: order.prescription_notes,
            rejectionReason: order.prescription_rejection_reason,
          }
        : null,
    })
  },
  { roles: ['vet', 'admin'] }
)
