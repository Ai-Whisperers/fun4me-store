'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { InvoiceFormData, Invoice, InvoiceStatus } from '@/lib/types/invoicing'

/**
 * Update an existing invoice
 * Staff only - can only update draft invoices
 */
export const updateInvoice = withActionAuth(
  async ({ profile, supabase }, invoiceId: string, formData: InvoiceFormData) => {
    // Validate data
    if (!formData.pet_id) {
      return actionError('Debe seleccionar una mascota')
    }

    if (!formData.items || formData.items.length === 0) {
      return actionError('Debe agregar al menos un item')
    }

    try {
      // Get existing invoice
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id, status, tenant_id')
        .eq('id', invoiceId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (fetchError || !existingInvoice) {
        return actionError('Factura no encontrada')
      }

      // Only allow updating draft invoices
      if (existingInvoice.status !== 'draft') {
        return actionError('Solo se pueden modificar facturas en borrador')
      }

      // Verify pet belongs to clinic
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id, tenant_id, owner_id')
        .eq('id', formData.pet_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (petError || !pet) {
        return actionError('Mascota no encontrada')
      }

      // Calculate totals with proper rounding
      const { roundCurrency } = await import('@/lib/types/invoicing')

      let subtotal = 0
      const processedItems = formData.items.map((item) => {
        const lineTotal = roundCurrency(
          item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
        )
        subtotal += lineTotal
        return {
          ...item,
          line_total: lineTotal,
        }
      })

      // Round all currency values to avoid floating point errors
      subtotal = roundCurrency(subtotal)
      const taxRate = formData.tax_rate || 10 // Default 10% IVA
      const taxAmount = roundCurrency(subtotal * (taxRate / 100))
      const total = roundCurrency(subtotal + taxAmount)

      // Update invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .update({
          pet_id: formData.pet_id,
          owner_id: pet.owner_id,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          amount_due: total,
          notes: formData.notes,
          due_date: formData.due_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (invoiceError) {
        logger.error('Update invoice error', {
          tenantId: profile.tenant_id,
          invoiceId,
          error: invoiceError instanceof Error ? invoiceError.message : String(invoiceError),
        })
        return actionError('Error al actualizar la factura')
      }

      // Delete existing items and recreate
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

      const invoiceItems = processedItems.map((item) => ({
        invoice_id: invoiceId,
        service_id: item.service_id || null,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        line_total: item.line_total,
      }))

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems)

      if (itemsError) {
        logger.error('Update invoice items error', {
          tenantId: profile.tenant_id,
          invoiceId,
          error: itemsError instanceof Error ? itemsError.message : String(itemsError),
        })
        return actionError('Error al actualizar los items de la factura')
      }

      // Revalidate paths
      revalidatePath('/[clinic]/dashboard/invoices')
      revalidatePath(`/[clinic]/dashboard/invoices/${invoiceId}`)

      return actionSuccess(invoice as Invoice)
    } catch (e) {
      logger.error('Update invoice exception', {
        tenantId: profile.tenant_id,
        invoiceId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return actionError('Error inesperado al actualizar factura')
    }
  },
  { requireStaff: true }
)

/**
 * Update invoice status
 * Staff only
 */
export const updateInvoiceStatus = withActionAuth(
  async (
    { profile, supabase, user },
    invoiceId: string,
    newStatus: InvoiceStatus,
    notes?: string
  ) => {
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, tenant_id')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !invoice) {
      return actionError('Factura no encontrada')
    }

    // Validate status transitions
    const validTransitions: Record<string, InvoiceStatus[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['paid', 'partial', 'overdue', 'cancelled'],
      partial: ['paid', 'overdue', 'cancelled'],
      overdue: ['paid', 'partial', 'cancelled'],
      paid: [], // Can't change once paid
      cancelled: [], // Can't change once cancelled
      void: [], // Can't change once voided
    }

    if (!validTransitions[invoice.status]?.includes(newStatus)) {
      return actionError(`No se puede cambiar de ${invoice.status} a ${newStatus}`)
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (notes) {
      updateData.notes = notes
    }

    if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = user.id
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)

    if (updateError) {
      logger.error('Update invoice status error', {
        tenantId: profile.tenant_id,
        invoiceId,
        newStatus,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      })
      return actionError('Error al actualizar el estado')
    }

    revalidatePath('/[clinic]/dashboard/invoices')
    revalidatePath(`/[clinic]/dashboard/invoices/${invoiceId}`)

    return actionSuccess()
  },
  { requireStaff: true }
)
