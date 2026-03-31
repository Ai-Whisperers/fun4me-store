import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { InvoiceService } from '@/lib/services/invoice-service'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/invoices/[id]/email - Send invoice via email
 */
export const POST = withApiAuthParams(
  async ({ request, params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const invoiceId = params.id
    
    let body = {}
    try {
      if (request.headers.get('content-length') !== '0') {
        body = await request.json()
      }
    } catch (_e) {
      // Ignore empty or invalid body
    }

    const { recipientEmail } = body as { recipientEmail?: string }

    try {
      const service = new InvoiceService(supabase)
      const result = await service.emailInvoice(
        profile.tenant_id,
        invoiceId,
        recipientEmail
      )

      if (!result.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: result.error },
        })
      }

      return NextResponse.json({
        success: true,
        messageId: result.data?.messageId,
      })
    } catch (e) {
      logger.error('Error in invoice email API', {
        tenantId: profile.tenant_id,
        invoiceId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
