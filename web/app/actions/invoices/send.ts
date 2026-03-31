'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { sendEmail as sendEmailClient } from '@/lib/email/client'
import { logger } from '@/lib/logger'
import { generateInvoiceEmail, generateInvoiceEmailText } from '@/lib/email/templates/invoice-email'

/**
 * Send an invoice (change status to 'sent')
 * Staff only
 */
export const sendInvoice = withActionAuth(
  async (
    { profile, supabase, user },
    invoiceId: string,
    sendEmail: boolean = false,
    emailMessage?: string
  ) => {
    // Get invoice with complete details for email
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(
        `
        *,
        pets(
          id,
          name,
          species,
          owner:profiles!pets_owner_id_fkey(id, email, full_name)
        ),
        invoice_items(
          id,
          description,
          quantity,
          unit_price,
          discount_percent,
          line_total
        )
      `
      )
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !invoice) {
      return actionError('Factura no encontrada')
    }

    if (!['draft', 'sent', 'partial', 'overdue'].includes(invoice.status)) {
      return actionError('Esta factura no puede ser enviada')
    }

    // Get clinic/tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', profile.tenant_id)
      .single()

    // Update status to sent
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
        sent_at: new Date().toISOString(),
        sent_by: user.id,
      })
      .eq('id', invoiceId)

    if (updateError) {
      logger.error('Send invoice error', {
        tenantId: profile.tenant_id,
        invoiceId,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al enviar la factura')
    }

    // Send email to owner if requested
    if (sendEmail && invoice.pets) {
      const pet = Array.isArray(invoice.pets) ? invoice.pets[0] : invoice.pets
      const owner = pet?.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : null

      if (owner && owner.email) {
        try {
          // Generate invoice view URL (if applicable)
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const viewUrl = `${baseUrl}/${profile.tenant_id}/portal/invoices/${invoiceId}`

          // Prepare email data
          const emailData = {
            clinicName: tenant?.name || profile.tenant_id,
            ownerName: owner.full_name || 'Cliente',
            petName: pet.name,
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.created_at,
            dueDate: invoice.due_date,
            subtotal: invoice.subtotal,
            taxRate: invoice.tax_rate,
            taxAmount: invoice.tax_amount,
            total: invoice.total,
            amountPaid: invoice.amount_paid,
            amountDue: invoice.amount_due,
            items: invoice.invoice_items || [],
            notes: emailMessage || invoice.notes,
            paymentInstructions:
              'Efectivo, transferencia bancaria o tarjeta de crédito/débito.\nContacta con nosotros para coordinar el pago.',
            viewUrl,
          }

          // Generate email HTML and text
          const html = generateInvoiceEmail(emailData)
          const text = generateInvoiceEmailText(emailData)

          // Send email
          const result = await sendEmailClient({
            to: owner.email,
            subject: `Factura ${invoice.invoice_number} - ${tenant?.name || profile.tenant_id}`,
            html,
            text,
          })

          if (!result.success) {
            logger.error('Failed to send invoice email', {
              tenantId: profile.tenant_id,
              invoiceId,
              ownerEmail: owner.email,
              error: result.error ?? 'Unknown',
            })
            // Don't fail the whole operation if email fails
          }
        } catch (emailError) {
          logger.error('Exception sending invoice email', {
            tenantId: profile.tenant_id,
            invoiceId,
            error: emailError instanceof Error ? emailError.message : 'Unknown',
          })
          // Don't fail the whole operation if email fails
        }
      } else {
        logger.warn('Cannot send email: owner email not found', {
          tenantId: profile.tenant_id,
          invoiceId,
        })
      }
    }

    revalidatePath('/[clinic]/dashboard/invoices')
    revalidatePath(`/[clinic]/dashboard/invoices/${invoiceId}`)

    return actionSuccess()
  },
  { requireStaff: true }
)
