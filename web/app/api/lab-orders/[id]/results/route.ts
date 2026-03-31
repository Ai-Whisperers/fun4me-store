import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { labResultsSchema } from '@/lib/schemas/lab'

/**
 * POST /api/lab-orders/[id]/results
 * Enter or update lab results for an order
 *
 * Body: {
 *   results: Array<{
 *     test_id: string,      // ID of the lab test from catalog
 *     value: string,        // Text representation of result (required)
 *     numeric_value?: number, // Numeric value if applicable
 *     flag?: 'low' | 'normal' | 'high' | 'critical_low' | 'critical_high'
 *   }>
 * }
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

    const validation = labResultsSchema.safeParse(rawBody)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: validation.error.issues },
      })
    }

    const { results } = validation.data

    // Verify order belongs to staff's clinic
    const { data: order } = await supabase
      .from('lab_orders')
      .select('id, tenant_id, pets!inner(tenant_id)')
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

    // Insert or update results (keyed by lab_order_id + test_id)
    let hasCriticalValues = false
    const resultPromises = results.map(
      async (result: {
        test_id: string
        value: string
        numeric_value?: number | null
        flag?: string
      }) => {
        const isAbnormal =
          result.flag === 'low' ||
          result.flag === 'high' ||
          result.flag === 'critical_low' ||
          result.flag === 'critical_high'

        if (result.flag === 'critical_low' || result.flag === 'critical_high') {
          hasCriticalValues = true
        }

        // Check if result already exists for this order + test
        const { data: existing } = await supabase
          .from('lab_results')
          .select('id')
          .eq('lab_order_id', orderId)
          .eq('test_id', result.test_id)
          .single()

        if (existing) {
          // Update existing result
          return supabase
            .from('lab_results')
            .update({
              value: result.value,
              numeric_value: result.numeric_value ?? null,
              flag: result.flag || 'normal',
              is_abnormal: isAbnormal,
              entered_by: user.id,
            })
            .eq('id', existing.id)
        } else {
          // Insert new result
          return supabase.from('lab_results').insert({
            lab_order_id: orderId,
            tenant_id: order.tenant_id,
            test_id: result.test_id,
            value: result.value,
            numeric_value: result.numeric_value ?? null,
            flag: result.flag || 'normal',
            is_abnormal: isAbnormal,
            entered_by: user.id,
          })
        }
      }
    )

    try {
      await Promise.all(resultPromises)
    } catch (error) {
      logger.error('Error saving lab results', {
        tenantId: profile.tenant_id,
        userId: user.id,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Update order status to processing when results are entered
    const { error: updateError } = await supabase
      .from('lab_orders')
      .update({
        status: 'processing',
      })
      .eq('id', orderId)

    if (updateError) {
      logger.error('Error updating lab order after results', {
        tenantId: profile.tenant_id,
        userId: user.id,
        orderId,
        error: updateError.message,
      })
    }

    return NextResponse.json({ success: true, has_critical_values: hasCriticalValues })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
