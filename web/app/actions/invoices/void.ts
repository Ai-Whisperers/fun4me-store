'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * Void/cancel an invoice
 * Admin only for non-draft, staff for draft
 */
export const voidInvoice = withActionAuth(
  async ({ profile, isAdmin, supabase, user }, invoiceId: string, reason?: string) => {
    // Get invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, tenant_id, amount_paid')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !invoice) {
      return actionError('Factura no encontrada')
    }

    // Check status
    if (['void', 'cancelled'].includes(invoice.status)) {
      return actionError('Esta factura ya está anulada')
    }

    // If invoice has payments, only admin can void
    if (invoice.amount_paid > 0 && !isAdmin) {
      return actionError('Solo un administrador puede anular facturas con pagos registrados')
    }

    // Draft invoices can be deleted
    if (invoice.status === 'draft') {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      await supabase.from('invoices').delete().eq('id', invoiceId)
    } else {
      // Non-draft invoices are voided (soft delete)
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'void',
          voided_at: new Date().toISOString(),
          voided_by: user.id,
          notes: reason ? `[Anulada] ${reason}` : '[Factura anulada]',
        })
        .eq('id', invoiceId)

      if (updateError) {
        logger.error('Void invoice error', {
          tenantId: profile.tenant_id,
          invoiceId,
          userId: user.id,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        })
        return actionError('Error al anular la factura')
      }
    }

    revalidatePath('/[clinic]/dashboard/invoices')

    return actionSuccess()
  },
  { requireStaff: true }
)
