import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { labCommentSchema } from '@/lib/schemas/lab'

/**
 * POST /api/lab-orders/[id]/comments - Add comment to lab order
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const orderId = params.id

    // Parse and validate body
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const validation = labCommentSchema.safeParse(rawBody)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: validation.error.issues },
      })
    }

    const { comment_text, interpretation } = validation.data

    // Verify order belongs to staff's clinic
    const { data: order } = await supabase
      .from('lab_orders')
      .select('id, pets!inner(tenant_id)')
      .eq('id', orderId)
      .single()

    if (!order) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'lab_order' },
      })
    }

    const pet = Array.isArray(order.pets) ? order.pets[0] : order.pets
    if (pet.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Insert comment
    const { data, error } = await supabase
      .from('lab_result_comments')
      .insert({
        order_id: orderId,
        comment_text,
        interpretation: interpretation || null,
        commented_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error adding lab comment', {
        tenantId: profile.tenant_id,
        orderId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
