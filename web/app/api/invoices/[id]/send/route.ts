import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/invoices/[id]/send
 * Send invoice to client via email
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const invoiceId = params.id

    try {
      // Get invoice with owner info
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(
          `
          id, status, invoice_number, total, tenant_id,
          owner:profiles!invoices_owner_id_fkey(id, email, full_name, phone)
        `
        )
        .eq('id', invoiceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (invoiceError || !invoice) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'invoice' },
        })
      }

      if (invoice.status === 'void') {
        return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
          details: { reason: 'No se puede enviar una factura anulada' },
        })
      }

      // Update status to sent if draft
      if (invoice.status === 'draft') {
        await supabase
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', invoiceId)
      }

      // Queue notification
      type OwnerType = {
        id: string
        email: string | null
        full_name: string
        phone: string | null
      }
      const ownerData = invoice.owner as OwnerType | OwnerType[] | null
      const owner = Array.isArray(ownerData) ? ownerData[0] : ownerData

      if (owner?.email) {
        await supabase.from('notification_queue').insert({
          tenant_id: profile.tenant_id,
          channel: 'email',
          recipient_id: owner.id,
          recipient_address: owner.email,
          template_id: null, // Will be looked up by type
          subject: `Factura ${invoice.invoice_number}`,
          body: `Hola ${owner.full_name}, tienes una nueva factura por Gs. ${invoice.total.toLocaleString()}. Por favor revísala en tu portal de cliente.`,
          priority: 'normal',
          metadata: {
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
            total: invoice.total,
          },
        })
      }

      // Audit log
      const { logAudit } = await import('@/lib/audit')
      await logAudit('SEND_INVOICE', `invoices/${invoiceId}`, {
        invoice_number: invoice.invoice_number,
        sent_to: owner?.email,
      })

      return NextResponse.json({
        success: true,
        message: 'Factura enviada correctamente',
      })
    } catch (e) {
      logger.error('Error sending invoice', {
        tenantId: profile.tenant_id,
        invoiceId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'financial' }
)
