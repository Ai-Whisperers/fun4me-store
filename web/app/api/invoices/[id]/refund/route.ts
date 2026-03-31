import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { processRefundSchema } from '@/lib/schemas/invoice'

/**
 * POST /api/invoices/[id]/refund
 * Process a refund (atomic using RPC)
 * Rate limited: 5 requests per hour (refund operations - strict for fraud prevention)
 */
export const POST = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const invoiceId = params.id

    try {
      const body = await request.json()

      // SEC-019: Validate input with Zod schema
      const validation = processRefundSchema.safeParse(body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { issues: validation.error.issues },
        })
      }

      const { amount, reason, payment_id } = validation.data

      // Use atomic RPC function to prevent race conditions
      // The function handles row locking, validation, and atomic updates
      const { data: result, error: rpcError } = await supabase.rpc('process_invoice_refund', {
        p_invoice_id: invoiceId,
        p_tenant_id: profile.tenant_id,
        p_amount: amount,
        p_reason: reason,
        p_payment_id: payment_id || null,
        p_processed_by: user.id,
      })

      if (rpcError) {
        logger.error('Error processing refund RPC', {
          tenantId: profile.tenant_id,
          userId: user.id,
          invoiceId,
          error: rpcError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // RPC returns JSONB with success flag
      if (!result.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { reason: result.error },
        })
      }

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('PROCESS_REFUND', `invoices/${invoiceId}/refunds/${result.refund_id}`, {
        amount,
        reason,
        new_status: result.status,
      })

      return NextResponse.json(
        {
          refund: { id: result.refund_id },
          invoice: {
            amount_paid: result.amount_paid,
            amount_due: result.amount_due,
            status: result.status,
          },
        },
        { status: 201 }
      )
    } catch (e) {
      logger.error('Error processing refund', {
        tenantId: profile.tenant_id,
        userId: user.id,
        invoiceId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  // Only admins can process refunds, with very strict rate limiting
  { roles: ['admin'], rateLimit: 'refund' }
)
