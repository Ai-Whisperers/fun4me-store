import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { generateHospitalizationInvoice } from '@/lib/billing/hospitalization'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/hospitalizations/[id]/invoice - Generate invoice from hospitalization
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const hospitalizationId = params.id

    try {
      const result = await generateHospitalizationInvoice(
        supabase,
        hospitalizationId,
        profile.tenant_id,
        user.id
      )

      if (!result.success || !result.invoice) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: result.error || 'No se pudo generar la factura' },
        })
      }

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('CREATE_INVOICE_FROM_HOSPITALIZATION', `invoices/${result.invoice.id}`, {
        invoice_number: result.invoice.invoice_number,
        hospitalization_id: hospitalizationId,
        total: result.invoice.total,
      })

      return NextResponse.json(
        {
          success: true,
          invoice: result.invoice,
          message: 'Factura generada exitosamente',
        },
        { status: 201 }
      )
    } catch (e) {
      logger.error('Error generating hospitalization invoice', {
        tenantId: profile.tenant_id,
        hospitalizationId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'financial' }
)
