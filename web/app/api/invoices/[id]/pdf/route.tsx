import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { renderToStream } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/components/invoices/invoice-pdf'
import { Invoice } from '@/lib/types/invoicing'

/**
 * GET /api/invoices/[id]/pdf
 * Generate and download invoice PDF
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const invoiceId = params.id

    try {
      // Fetch Invoice with all related data
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items (
            *,
            services (name)
          ),
          payments (
            *,
            receiver:profiles!payments_received_by_fkey(full_name)
          ),
          pets (
            *,
            owner:profiles!pets_owner_id_fkey (*)
          ),
          created_by_user:profiles!invoices_created_by_fkey (full_name)
        `
        )
        .eq('id', invoiceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !invoice) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'invoice' },
        })
      }

      // Get Clinic Info
      const { data: clinic } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', invoice.tenant_id)
        .single()

      const clinicName = clinic?.name || 'Veterinaria'

      // Render PDF
      const stream = await renderToStream(
        <InvoicePDFDocument invoice={invoice as unknown as Invoice} clinicName={clinicName} />
      )

      // Return PDF response
      return new NextResponse(stream as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        },
      })
    } catch (e) {
      logger.error('PDF Generation Error', {
        tenantId: profile.tenant_id,
        invoiceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }
)
