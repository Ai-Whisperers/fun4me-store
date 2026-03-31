/**
 * Invoice Service
 *
 * Business logic for invoice operations.
 * Orchestrates repository calls and applies business rules.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { InvoiceRepository } from './repository'
import type {
  Invoice,
  InvoiceWithDetails,
  InvoiceListFilters,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceListResult,
  RevenueSummary,
  DeleteInvoiceResult,
} from './types'
import { roundCurrency } from '@/lib/types/invoicing'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export class InvoiceService {
  private repository: InvoiceRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new InvoiceRepository(supabase)
  }

  /**
   * List invoices with access control
   *
   * @param tenantId - Tenant ID
   * @param filters - Filters and pagination
   * @param userId - User ID (for owner access)
   * @param isStaff - Whether user is staff
   */
  async list(
    tenantId: string,
    filters: InvoiceListFilters = {},
    userId?: string,
    isStaff: boolean = true
  ): Promise<InvoiceListResult> {
    // Staff can see all invoices
    if (isStaff) {
      return this.repository.findMany(tenantId, filters)
    }

    // Owners can only see their pets' invoices
    if (userId) {
      const { data: ownerPets } = await this.supabase
        .from('pets')
        .select('id')
        .eq('owner_id', userId)

      const petIds = ownerPets?.map((p) => p.id) || []
      return this.repository.findByPetIds(tenantId, petIds, filters)
    }

    return { invoices: [], count: 0, page: 1, limit: 20 }
  }

  /**
   * Get single invoice with access control
   */
  async getById(
    id: string,
    tenantId: string,
    userId?: string,
    isStaff: boolean = true
  ): Promise<InvoiceWithDetails | null> {
    const invoice = await this.repository.findById(id, tenantId)

    if (!invoice) return null

    // Check access - staff or owner
    if (!isStaff && userId && invoice.client_id !== userId) {
      throw new Error('No tiene permisos para ver esta factura')
    }

    return invoice
  }

  /**
   * Create new invoice with items
   */
  async create(
    tenantId: string,
    userId: string,
    input: CreateInvoiceInput
  ): Promise<Invoice> {
    const { pet_id, items, tax_rate = 10, notes, due_date, idempotency_key } = input

    // Validate required fields
    if (!pet_id) {
      throw new Error('Se requiere mascota')
    }
    if (!items || items.length === 0) {
      throw new Error('La factura debe tener al menos un item')
    }

    // Check for idempotent request
    if (idempotency_key) {
      const existing = await this.repository.findByIdempotencyKey(tenantId, idempotency_key)
      if (existing) {
        return existing
      }
    }

    // Verify pet belongs to tenant
    const { data: pet, error: petError } = await this.supabase
      .from('pets')
      .select('id, tenant_id, owner_id')
      .eq('id', pet_id)
      .eq('tenant_id', tenantId)
      .single()

    if (petError || !pet) {
      throw new Error('Mascota no encontrada o no pertenece a esta clínica')
    }

    // Generate invoice number
    const invoiceNumber = await this.repository.generateInvoiceNumber(tenantId)

    // Calculate totals
    let subtotal = 0
    const processedItems = items.map((item) => {
      const discount = item.discount_percent || 0
      const lineTotal = roundCurrency(
        item.quantity * item.unit_price * (1 - discount / 100)
      )
      subtotal += lineTotal
      return {
        service_id: item.service_id || null,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: discount,
        line_total: lineTotal,
      }
    })

    subtotal = roundCurrency(subtotal)
    const taxAmount = roundCurrency(subtotal * (tax_rate / 100))
    const total = roundCurrency(subtotal + taxAmount)

    // Create invoice
    const invoice = await this.repository.create(tenantId, {
      invoice_number: invoiceNumber,
      pet_id,
      owner_id: pet.owner_id,
      subtotal,
      tax_rate,
      tax_amount: taxAmount,
      total,
      notes,
      due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: userId,
      idempotency_key,
    })

    // Create invoice items
    await this.repository.createItems(invoice.id, processedItems)

    // Audit log
    await logAudit('CREATE_INVOICE', `invoices/${invoice.id}`, {
      invoice_number: invoice.invoice_number,
      total,
      pet_id,
    })

    logger.info('[InvoiceService] Invoice created', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      total,
    })

    return invoice
  }

  /**
   * Update invoice (full edit for drafts, limited for sent)
   */
  async update(
    id: string,
    tenantId: string,
    userId: string,
    updates: UpdateInvoiceInput
  ): Promise<Invoice> {
    // Get current invoice
    const invoice = await this.repository.findById(id, tenantId)

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    // For non-draft invoices, only allow status and notes changes
    if (invoice.status !== 'draft') {
      const limitedUpdates: Partial<Invoice> = {}
      if (updates.status !== undefined) limitedUpdates.status = updates.status
      if (updates.notes !== undefined) limitedUpdates.notes = updates.notes

      if (Object.keys(limitedUpdates).length === 0) {
        throw new Error('Las facturas enviadas solo pueden cambiar estado o notas')
      }

      const updated = await this.repository.update(id, tenantId, limitedUpdates)
      await logAudit('UPDATE_INVOICE', `invoices/${id}`, { updates: limitedUpdates })
      return updated
    }

    // Draft invoice - full edit allowed
    const { items, ...invoiceData } = updates

    // Update invoice fields
    let updated = await this.repository.update(id, tenantId, invoiceData)

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await this.repository.deleteItems(id)

      // Insert new items
      let subtotal = 0
      const newItems = items.map((item) => {
        const lineTotal = roundCurrency(
          item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
        )
        subtotal += lineTotal
        return {
          service_id: item.service_id || null,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          line_total: lineTotal,
        }
      })

      await this.repository.createItems(id, newItems)

      // Recalculate totals
      subtotal = roundCurrency(subtotal)
      const taxAmount = roundCurrency(subtotal * (updated.tax_rate / 100))
      const total = roundCurrency(subtotal + taxAmount)
      const amountDue = roundCurrency(total - updated.amount_paid)

      updated = await this.repository.update(id, tenantId, {
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        balance_due: amountDue,
      })
    }

    await logAudit('UPDATE_INVOICE', `invoices/${id}`, { status: updated.status })
    return updated
  }

  /**
   * Delete invoice (hard delete for drafts, void for sent)
   */
  async delete(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<DeleteInvoiceResult> {
    const invoice = await this.repository.findById(id, tenantId)

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    // If draft, hard delete
    if (invoice.status === 'draft') {
      await this.repository.delete(id, tenantId)
      await logAudit('DELETE_INVOICE', `invoices/${id}`, {
        invoice_number: invoice.invoice_number,
        action: 'deleted',
      })
      return { deleted: true, voided: false }
    }

    // Otherwise, void the invoice
    await this.repository.update(id, tenantId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    await logAudit('DELETE_INVOICE', `invoices/${id}`, {
      invoice_number: invoice.invoice_number,
      action: 'voided',
    })

    return { deleted: false, voided: true }
  }

  /**
   * Mark invoice as sent
   */
  async sendInvoice(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<Invoice> {
    const invoice = await this.repository.findById(id, tenantId)

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    if (invoice.status !== 'draft') {
      throw new Error('Solo se pueden enviar facturas en borrador')
    }

    const updated = await this.repository.update(id, tenantId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    await logAudit('SEND_INVOICE', `invoices/${id}`, {})
    return updated
  }

  /**
   * Mark invoice as paid (without recording payment details)
   */
  async markAsPaid(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<Invoice> {
    const invoice = await this.repository.findById(id, tenantId)

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    const updated = await this.repository.update(id, tenantId, {
      status: 'paid',
      amount_paid: invoice.total_amount,
      balance_due: 0,
      paid_at: new Date().toISOString(),
    })

    await logAudit('MARK_INVOICE_PAID', `invoices/${id}`, {})
    return updated
  }

  /**
   * Void an invoice
   */
  async voidInvoice(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<Invoice> {
    const updated = await this.repository.update(id, tenantId, {
      status: 'void',
      voided_at: new Date().toISOString(),
      voided_by: userId,
    })

    await logAudit('VOID_INVOICE', `invoices/${id}`, {})
    return updated
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantId: string): Promise<InvoiceWithDetails[]> {
    return this.repository.findOverdue(tenantId)
  }

  /**
   * Get revenue summary for a period
   */
  async getRevenueSummary(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<RevenueSummary> {
    const invoices = await this.repository.findForRevenue(tenantId, periodStart, periodEnd)

    if (!invoices || invoices.length === 0) {
      return {
        total_revenue: 0,
        paid_invoices_count: 0,
        outstanding_balance: 0,
        overdue_balance: 0,
        average_invoice_value: 0,
        period_start: periodStart,
        period_end: periodEnd,
      }
    }

    const today = new Date().toISOString().split('T')[0]
    let totalRevenue = 0
    let paidCount = 0
    let outstandingBalance = 0
    let overdueBalance = 0

    invoices.forEach((inv) => {
      const total = Number(inv.total)
      const amountDue = Number(inv.amount_due)

      if (inv.status === 'paid') {
        totalRevenue += total
        paidCount++
      } else if (inv.status === 'sent') {
        outstandingBalance += amountDue
        if (inv.due_date && inv.due_date < today) {
          overdueBalance += amountDue
        }
      }
    })

    return {
      total_revenue: roundCurrency(totalRevenue),
      paid_invoices_count: paidCount,
      outstanding_balance: roundCurrency(outstandingBalance),
      overdue_balance: roundCurrency(overdueBalance),
      average_invoice_value: roundCurrency(totalRevenue / Math.max(paidCount, 1)),
      period_start: periodStart,
      period_end: periodEnd,
    }
  }
}
