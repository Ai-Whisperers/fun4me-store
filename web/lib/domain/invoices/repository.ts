/**
 * Invoice Repository
 *
 * Data access layer for invoice operations.
 * Handles CRUD operations without business logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Invoice,
  InvoiceWithDetails,
  InvoiceListFilters,
  InvoiceListResult,
} from './types'
import {
  mapInvoiceWithDetails,
  mapInvoicesWithDetails,
  type RawInvoiceWithDetails,
} from '@/lib/services/mappers/invoice-mapper'

/**
 * Standard invoice select query with relations
 */
const INVOICE_SELECT = `
  *,
  pets(id, name, species, breed, photo_url, owner:profiles(id, full_name, email, phone)),
  invoice_items(
    id, service_id, product_id, description, quantity, unit_price, discount_percent, line_total,
    services(id, name, category),
    products(id, name, sku)
  ),
  payments(id, amount, payment_method, reference_number, paid_at),
  refunds(id, amount, reason, refunded_at),
  created_by_user:profiles!invoices_created_by_fkey(full_name)
`

export class InvoiceRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get the Supabase client for complex queries
   */
  getClient(): SupabaseClient {
    return this.supabase
  }

  /**
   * Find invoice by ID with full details
   */
  async findById(
    id: string,
    tenantId: string
  ): Promise<InvoiceWithDetails | null> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) return null

    return mapInvoiceWithDetails(data as RawInvoiceWithDetails)
  }

  /**
   * List invoices with filters and pagination
   */
  async findMany(
    tenantId: string,
    filters: InvoiceListFilters = {}
  ): Promise<InvoiceListResult> {
    const {
      status,
      petId,
      ownerId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (petId) {
      query = query.eq('pet_id', petId)
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId)
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Error al cargar facturas: ${error.message}`)
    }

    return {
      invoices: mapInvoicesWithDetails((data || []) as RawInvoiceWithDetails[]),
      count: count || 0,
      page,
      limit,
    }
  }

  /**
   * Find invoices by pet IDs (for owner access)
   */
  async findByPetIds(
    tenantId: string,
    petIds: string[],
    filters: InvoiceListFilters = {}
  ): Promise<InvoiceListResult> {
    if (petIds.length === 0) {
      return { invoices: [], count: 0, page: filters.page || 1, limit: filters.limit || 20 }
    }

    const { page = 1, limit = 20, status, fromDate, toDate } = filters
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('pet_id', petIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Error al cargar facturas: ${error.message}`)
    }

    return {
      invoices: mapInvoicesWithDetails((data || []) as RawInvoiceWithDetails[]),
      count: count || 0,
      page,
      limit,
    }
  }

  /**
   * Find overdue invoices
   */
  async findOverdue(tenantId: string): Promise<InvoiceWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('invoices')
      .select(`
        *,
        pets(id, name, species, owner:profiles(id, full_name, email, phone)),
        invoice_items(id, description, quantity, unit_price, line_total)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      throw new Error(`Error al cargar facturas vencidas: ${error.message}`)
    }

    return mapInvoicesWithDetails((data || []) as RawInvoiceWithDetails[])
  }

  /**
   * Create invoice (without items - items are created separately)
   */
  async create(
    tenantId: string,
    data: {
      invoice_number: string
      pet_id: string
      owner_id: string
      subtotal: number
      tax_rate: number
      tax_amount: number
      total: number
      notes?: string
      due_date: string
      created_by: string
      idempotency_key?: string
    }
  ): Promise<Invoice> {
    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        ...data,
        status: 'draft',
        amount_paid: 0,
        amount_due: data.total,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Error al crear factura: ${error.message}`)
    }

    return invoice as Invoice
  }

  /**
   * Create invoice items
   */
  async createItems(
    invoiceId: string,
    items: Array<{
      service_id?: string | null
      product_id?: string | null
      description: string
      quantity: number
      unit_price: number
      discount_percent: number
      line_total: number
    }>
  ): Promise<void> {
    const invoiceItems = items.map((item) => ({
      ...item,
      invoice_id: invoiceId,
    }))

    const { error } = await this.supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (error) {
      throw new Error(`Error al crear items: ${error.message}`)
    }
  }

  /**
   * Update invoice
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<Invoice>
  ): Promise<Invoice> {
    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al actualizar factura: ${error.message}`)
    }

    return invoice as Invoice
  }

  /**
   * Delete invoice items (for replacement)
   */
  async deleteItems(invoiceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId)

    if (error) {
      throw new Error(`Error al eliminar items: ${error.message}`)
    }
  }

  /**
   * Hard delete invoice (for drafts only)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    // Delete items first
    await this.deleteItems(id)

    const { error } = await this.supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Error al eliminar factura: ${error.message}`)
    }
  }

  /**
   * Check if invoice exists with idempotency key
   */
  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<Invoice | null> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (error || !data) return null
    return data as Invoice
  }

  /**
   * Generate invoice number via RPC
   */
  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('generate_invoice_number', {
      p_tenant_id: tenantId,
    })

    if (error) {
      throw new Error(`Error al generar número de factura: ${error.message}`)
    }

    return data || `INV-${Date.now()}`
  }

  /**
   * Get invoices for revenue calculation
   */
  async findForRevenue(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Array<{ total: number; status: string; amount_due: number; due_date: string | null }>> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('total, status, amount_due, due_date')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Error al cargar datos de ingresos: ${error.message}`)
    }

    return data || []
  }
}
