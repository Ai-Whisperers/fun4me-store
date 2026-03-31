'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { InvoiceFormData, Invoice } from '@/lib/types/invoicing'

/**
 * Create a new invoice
 * Staff only
 */
export const createInvoice = withActionAuth(
  async ({ profile, supabase, user }, formData: InvoiceFormData) => {
    // Validate data
    if (!formData.pet_id) {
      return actionError('Debe seleccionar una mascota')
    }

    if (!formData.items || formData.items.length === 0) {
      return actionError('Debe agregar al menos un item')
    }

    try {
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

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
        p_tenant_id: profile.tenant_id,
      })

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

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: profile.tenant_id,
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          pet_id: formData.pet_id,
          owner_id: pet.owner_id,
          status: 'draft',
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          amount_paid: 0,
          amount_due: total,
          notes: formData.notes,
          due_date:
            formData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
          created_by: user.id,
        })
        .select()
        .single()

      if (invoiceError) {
        logger.error('Create invoice error', {
          tenantId: profile.tenant_id,
          error: invoiceError instanceof Error ? invoiceError.message : String(invoiceError),
        })
        return actionError('Error al crear la factura')
      }

      // Create invoice items
      const invoiceItems = processedItems.map((item) => ({
        invoice_id: invoice.id,
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
        logger.error('Create invoice items error', {
          tenantId: profile.tenant_id,
          invoiceId: invoice.id,
          error: itemsError instanceof Error ? itemsError.message : String(itemsError),
        })
        // Rollback invoice
        await supabase.from('invoices').delete().eq('id', invoice.id)
        return actionError('Error al crear los items de la factura')
      }

      // Revalidate paths
      revalidatePath('/[clinic]/dashboard/invoices')

      return actionSuccess(invoice as Invoice)
    } catch (e) {
      logger.error('Create invoice exception', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return actionError('Error inesperado al crear factura')
    }
  },
  { requireStaff: true }
)
