/**
 * InvoiceService - Invoice Management Service Layer
 *
 * Handles all invoice-related business logic including:
 * - Invoice CRUD operations
 * - Payment recording and refunds
 * - Invoice status transitions (draft → sent → paid)
 * - Revenue analytics and reporting
 * - Owner/staff access control
 *
 * @example
 * ```typescript
 * const service = new InvoiceService(supabase);
 * const result = await service.create(tenantId, userId, {
 *   pet_id: 'pet-123',
 *   items: [{ description: 'Consulta', quantity: 1, unit_price: 150000 }],
 *   tax_rate: 10
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';
import { sendEmail } from '@/lib/email/client';
import { generateInvoiceEmail } from '@/lib/email/templates/invoice-email';
import type {
  Invoice,
  InvoiceWithDetails,
  InvoiceItemWithDetails,
  InvoiceItemFormData,
  Payment,
  RecordPaymentInput,
  Refund,
} from '@/lib/types/entities/invoice';
import {
  mapInvoiceWithDetails,
  mapInvoicesWithDetails,
  type RawInvoiceWithDetails,
} from './mappers/invoice-mapper';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Filters for listing invoices
 */
export interface InvoiceListFilters {
  /** Filter by invoice status */
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  /** Filter by pet ID */
  petId?: string;
  /** Filter by owner ID (for pet owner portal) */
  ownerId?: string;
  /** Filter by date range (created_at >= fromDate) */
  fromDate?: string;
  /** Filter by date range (created_at <= toDate) */
  toDate?: string;
  /** Pagination: page number (1-based) */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
}

/**
 * Invoice creation input
 */
export interface CreateInvoiceInput {
  pet_id: string;
  items: InvoiceItemFormData[];
  tax_rate?: number;
  notes?: string;
  due_date?: string;
  idempotency_key?: string;
}

/**
 * Invoice update input (for draft invoices)
 */
export interface UpdateInvoiceInput {
  items?: InvoiceItemFormData[];
  tax_rate?: number;
  notes?: string;
  due_date?: string;
  status?: 'draft' | 'sent';
}

/**
 * Revenue summary statistics
 */
export interface RevenueSummary {
  total_revenue: number;
  paid_invoices_count: number;
  outstanding_balance: number;
  overdue_balance: number;
  average_invoice_value: number;
  period_start: string;
  period_end: string;
}

// =============================================================================
// INVOICE SERVICE
// =============================================================================

export class InvoiceService extends BaseService {
  /**
   * List invoices for a tenant with optional filters
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters (status, pet, dates, pagination)
   * @param userId - User ID (for owner access control)
   * @param isStaff - Whether user is staff (vet/admin)
   * @returns List of invoices with pagination metadata
   */
  async list(
    tenantId: string,
    filters: InvoiceListFilters = {},
    userId?: string,
    isStaff: boolean = true
  ): Promise<
    ServiceResult<{
      invoices: InvoiceWithDetails[];
      count: number;
      page: number;
      limit: number;
    }>
  > {
    return this.handleError(
      async () => {
        const {
          status,
          petId,
          ownerId,
          fromDate,
          toDate,
          page = 1,
          limit = 20,
        } = filters;
        const offset = (page - 1) * limit;

        // Build query
        let query = this.supabase
          .from('invoices')
          .select(
            `
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
          `,
            { count: 'exact' }
          )
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // If not staff, filter by owner's pets
        if (!isStaff && userId) {
          const { data: ownerPets } = await this.supabase
            .from('pets')
            .select('id')
            .eq('owner_id', userId);

          const petIds = ownerPets?.map((p) => p.id) || [];
          if (petIds.length === 0) {
            return {
              invoices: [],
              count: 0,
              page,
              limit,
            };
          }
          query = query.in('pet_id', petIds);
        }

        // Apply filters
        if (status) {
          query = query.eq('status', status);
        }

        if (petId) {
          query = query.eq('pet_id', petId);
        }

        if (ownerId) {
          query = query.eq('owner_id', ownerId);
        }

        if (fromDate) {
          query = query.gte('created_at', fromDate);
        }

        if (toDate) {
          query = query.lte('created_at', toDate);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return {
          invoices: mapInvoicesWithDetails((data || []) as RawInvoiceWithDetails[]),
          count: count || 0,
          page,
          limit,
        };
      },
      'Error al cargar facturas',
      { context: { tenantId, filters } }
    );
  }

  /**
   * Get single invoice by ID with full details
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (for access control)
   * @param isStaff - Whether user is staff
   * @returns Invoice with items, payments, and refunds
   */
  async getById(
    id: string,
    tenantId: string,
    userId?: string,
    isStaff: boolean = true
  ): Promise<ServiceResult<InvoiceWithDetails>> {
    return this.handleError(
      async () => {
        const { data: invoice, error } = await this.supabase
          .from('invoices')
          .select(
            `
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
          )
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!invoice) {
          throw new Error('Factura no encontrada');
        }

        // Check access - staff or owner
        if (!isStaff && userId && invoice.owner_id !== userId) {
          throw new Error('No tiene permisos para ver esta factura');
        }

        return mapInvoiceWithDetails(invoice as RawInvoiceWithDetails);
      },
      'Error al cargar factura',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Create new invoice with items
   *
   * @param tenantId - Tenant ID
   * @param userId - User ID (creator)
   * @param input - Invoice data with items
   * @returns Created invoice
   */
  async create(
    tenantId: string,
    userId: string,
    input: CreateInvoiceInput
  ): Promise<ServiceResult<Invoice>> {
    return this.handleError(
      async () => {
        const { pet_id, items, tax_rate = 10, notes, due_date, idempotency_key } = input;

        // Validate required fields
        this.validateRequiredFields(
          { pet_id, items },
          ['pet_id', 'items']
        );

        if (!items || items.length === 0) {
          throw new Error('La factura debe tener al menos un item');
        }

        // Check for idempotent request
        if (idempotency_key) {
          const { data: existing } = await this.supabase
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('idempotency_key', idempotency_key)
            .single();

          if (existing) {
            return existing as Invoice;
          }
        }

        // Verify pet belongs to tenant
        const { data: pet, error: petError } = await this.supabase
          .from('pets')
          .select('id, tenant_id, owner_id')
          .eq('id', pet_id)
          .eq('tenant_id', tenantId)
          .single();

        if (petError || !pet) {
          throw new Error('Mascota no encontrada o no pertenece a esta clínica');
        }

        // Generate invoice number
        const { data: invoiceNumber, error: rpcError } = await this.supabase.rpc(
          'generate_invoice_number',
          { p_tenant_id: tenantId }
        );

        if (rpcError) {
          throw new Error('Error al generar número de factura');
        }

        // Calculate totals
        const { roundCurrency } = await import('@/lib/types/invoicing');

        let subtotal = 0;
        const processedItems = items.map((item) => {
          const discount = item.discount_percent || 0;
          const lineTotal = roundCurrency(
            item.quantity * item.unit_price * (1 - discount / 100)
          );
          subtotal += lineTotal;
          return {
            service_id: item.service_id || null,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: discount,
            line_total: lineTotal,
          };
        });

        subtotal = roundCurrency(subtotal);
        const taxAmount = roundCurrency(subtotal * (tax_rate / 100));
        const total = roundCurrency(subtotal + taxAmount);

        // Create invoice
        const { data: invoice, error: invoiceError } = await this.supabase
          .from('invoices')
          .insert({
            tenant_id: tenantId,
            invoice_number: invoiceNumber || `INV-${Date.now()}`,
            pet_id,
            owner_id: pet.owner_id,
            status: 'draft',
            subtotal,
            tax_rate,
            tax_amount: taxAmount,
            total,
            amount_paid: 0,
            amount_due: total,
            notes,
            due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: userId,
            idempotency_key: idempotency_key || null,
          })
          .select()
          .single();

        if (invoiceError) {
          throw new Error(this.mapDatabaseError(invoiceError));
        }

        // Create invoice items
        const invoiceItems = processedItems.map((item) => ({
          ...item,
          invoice_id: invoice.id,
        }));

        const { error: itemsError } = await this.supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          throw new Error(this.mapDatabaseError(itemsError));
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('CREATE_INVOICE', `invoices/${invoice.id}`, {
          invoice_number: invoice.invoice_number,
          total,
          pet_id,
        });

        return invoice as Invoice;
      },
      'Error al crear factura',
      { context: { tenantId, userId, input } }
    );
  }

  /**
   * Update invoice (full edit for drafts, limited for sent)
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (for audit)
   * @param updates - Update data
   * @returns Updated invoice
   */
  async update(
    id: string,
    tenantId: string,
    userId: string,
    updates: UpdateInvoiceInput
  ): Promise<ServiceResult<Invoice>> {
    return this.handleError(
      async () => {
        // Get current invoice
        const { data: existing, error: fetchError } = await this.supabase
          .from('invoices')
          .select('id, status, tenant_id')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchError || !existing) {
          throw new Error('Factura no encontrada');
        }

        this.validateTenantAccess(existing.tenant_id, tenantId, 'invoice');

        // For non-draft invoices, only allow status and notes changes
        if (existing.status !== 'draft') {
          const limitedUpdates: Partial<Invoice> = {};
          if (updates.status !== undefined) limitedUpdates.status = updates.status;
          if (updates.notes !== undefined) limitedUpdates.notes = updates.notes;

          if (Object.keys(limitedUpdates).length === 0) {
            throw new Error('Las facturas enviadas solo pueden cambiar estado o notas');
          }

          const { data: updated, error } = await this.supabase
            .from('invoices')
            .update(limitedUpdates)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

          if (error) {
            throw new Error(this.mapDatabaseError(error));
          }

          const { logAudit } = await import('@/lib/audit');
          await logAudit('UPDATE_INVOICE', `invoices/${id}`, { updates: limitedUpdates });

          return updated as Invoice;
        }

        // Draft invoice - full edit allowed
        const { items, ...invoiceData } = updates;

        // Update invoice fields
        const { data: updated, error: updateError } = await this.supabase
          .from('invoices')
          .update({
            ...invoiceData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
          const { roundCurrency } = await import('@/lib/types/invoicing');

          // Delete existing items
          await this.supabase.from('invoice_items').delete().eq('invoice_id', id);

          // Insert new items
          let subtotal = 0;
          const newItems = items.map((item) => {
            const lineTotal = roundCurrency(
              item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
            );
            subtotal += lineTotal;
            return {
              invoice_id: id,
              service_id: item.service_id || null,
              product_id: item.product_id || null,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent || 0,
              line_total: lineTotal,
            };
          });

          await this.supabase.from('invoice_items').insert(newItems);

          // Recalculate totals
          subtotal = roundCurrency(subtotal);
          const taxAmount = roundCurrency(subtotal * (updated.tax_rate / 100));
          const total = roundCurrency(subtotal + taxAmount);
          const amountDue = roundCurrency(total - updated.amount_paid);

          await this.supabase
            .from('invoices')
            .update({
              subtotal,
              tax_amount: taxAmount,
              total,
              amount_due: amountDue,
            })
            .eq('id', id)
            .eq('tenant_id', tenantId);
        }

        const { logAudit } = await import('@/lib/audit');
        await logAudit('UPDATE_INVOICE', `invoices/${id}`, { status: updated.status });

        return updated as Invoice;
      },
      'Error al actualizar factura',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Delete invoice (hard delete for drafts, void for sent)
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (for audit)
   * @returns Success indicator
   */
  async delete(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResult<{ deleted: boolean; voided: boolean }>> {
    return this.handleError(
      async () => {
        const { data: invoice, error: fetchError } = await this.supabase
          .from('invoices')
          .select('id, status, invoice_number, tenant_id')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchError || !invoice) {
          throw new Error('Factura no encontrada');
        }

        this.validateTenantAccess(invoice.tenant_id, tenantId, 'invoice');

        // If draft, hard delete
        if (invoice.status === 'draft') {
          await this.supabase.from('invoice_items').delete().eq('invoice_id', id);
          const { error: deleteError } = await this.supabase
            .from('invoices')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

          if (deleteError) {
            throw new Error(this.mapDatabaseError(deleteError));
          }

          const { logAudit } = await import('@/lib/audit');
          await logAudit('DELETE_INVOICE', `invoices/${id}`, {
            invoice_number: invoice.invoice_number,
            action: 'deleted',
          });

          return { deleted: true, voided: false };
        } else {
          // Otherwise, void the invoice
          const { error: voidError } = await this.supabase
            .from('invoices')
            .update({
              status: 'void',
              voided_at: new Date().toISOString(),
              voided_by: userId,
            })
            .eq('id', id)
            .eq('tenant_id', tenantId);

          if (voidError) {
            throw new Error(this.mapDatabaseError(voidError));
          }

          const { logAudit } = await import('@/lib/audit');
          await logAudit('DELETE_INVOICE', `invoices/${id}`, {
            invoice_number: invoice.invoice_number,
            action: 'voided',
          });

          return { deleted: false, voided: true };
        }
      },
      'Error al eliminar factura',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Record payment for an invoice
   *
   * @param tenantId - Tenant ID
   * @param userId - User ID (payment processor)
   * @param input - Payment data
   * @returns Recorded payment
   */
  async recordPayment(
    tenantId: string,
    userId: string,
    input: RecordPaymentInput
  ): Promise<ServiceResult<Payment>> {
    return this.handleError(
      async () => {
        const { invoice_id, amount, payment_method, reference_number, notes, paid_at } = input;

        // Validate required fields
        this.validateRequiredFields(
          { invoice_id, amount, payment_method },
          ['invoice_id', 'amount', 'payment_method']
        );

        // Get invoice
        const { data: invoice, error: invoiceError } = await this.supabase
          .from('invoices')
          .select('id, tenant_id, total, amount_paid, amount_due, status')
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invoiceError || !invoice) {
          throw new Error('Factura no encontrada');
        }

        if (amount <= 0) {
          throw new Error('El monto del pago debe ser mayor a cero');
        }

        if (amount > invoice.amount_due) {
          throw new Error('El monto del pago excede el saldo pendiente');
        }

        // Record payment
        const { data: payment, error: paymentError } = await this.supabase
          .from('payments')
          .insert({
            tenant_id: tenantId,
            invoice_id,
            amount,
            payment_method,
            payment_reference: reference_number || null,
            status: 'completed',
            paid_at: paid_at || new Date().toISOString(),
            processed_by: userId,
            notes,
          })
          .select()
          .single();

        if (paymentError) {
          throw new Error(this.mapDatabaseError(paymentError));
        }

        // Update invoice amounts
        const { roundCurrency } = await import('@/lib/types/invoicing');
        const newAmountPaid = roundCurrency(invoice.amount_paid + amount);
        const newAmountDue = roundCurrency(invoice.total - newAmountPaid);
        const isPaid = newAmountDue === 0;

        await this.supabase
          .from('invoices')
          .update({
            amount_paid: newAmountPaid,
            amount_due: newAmountDue,
            status: isPaid ? 'paid' : invoice.status,
            paid_at: isPaid ? new Date().toISOString() : null,
          })
          .eq('id', invoice_id)
          .eq('tenant_id', tenantId);

        const { logAudit } = await import('@/lib/audit');
        await logAudit('RECORD_PAYMENT', `payments/${payment.id}`, {
          invoice_id,
          amount,
          payment_method,
        });

        return payment as Payment;
      },
      'Error al registrar pago',
      { context: { tenantId, userId, input } }
    );
  }

  /**
   * Get all payments for an invoice
   *
   * @param invoiceId - Invoice ID
   * @param tenantId - Tenant ID
   * @returns List of payments
   */
  async getPayments(
    invoiceId: string,
    tenantId: string
  ): Promise<ServiceResult<Payment[]>> {
    return this.handleError(
      async () => {
        const { data: payments, error } = await this.supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('tenant_id', tenantId)
          .order('paid_at', { ascending: false });

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return (payments || []) as Payment[];
      },
      'Error al cargar pagos',
      { context: { invoiceId, tenantId } }
    );
  }

  /**
   * Process refund for a payment
   *
   * @param tenantId - Tenant ID
   * @param userId - User ID (refund processor)
   * @param paymentId - Payment ID to refund
   * @param amount - Refund amount
   * @param reason - Reason for refund
   * @returns Processed refund
   */
  async refundPayment(
    tenantId: string,
    userId: string,
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<ServiceResult<Refund>> {
    return this.handleError(
      async () => {
        // Get payment
        const { data: payment, error: paymentError } = await this.supabase
          .from('payments')
          .select('id, tenant_id, invoice_id, amount, payment_method')
          .eq('id', paymentId)
          .eq('tenant_id', tenantId)
          .single();

        if (paymentError || !payment) {
          throw new Error('Pago no encontrado');
        }

        if (amount <= 0) {
          throw new Error('El monto del reembolso debe ser mayor a cero');
        }

        if (amount > payment.amount) {
          throw new Error('El monto del reembolso excede el monto del pago');
        }

        // Create refund
        const { data: refund, error: refundError } = await this.supabase
          .from('refunds')
          .insert({
            tenant_id: tenantId,
            payment_id: paymentId,
            invoice_id: payment.invoice_id,
            amount,
            reason,
            refund_method: payment.payment_method,
            status: 'completed',
            refunded_at: new Date().toISOString(),
            processed_by: userId,
          })
          .select()
          .single();

        if (refundError) {
          throw new Error(this.mapDatabaseError(refundError));
        }

        // Update invoice amounts
        const { data: invoice } = await this.supabase
          .from('invoices')
          .select('total, amount_paid')
          .eq('id', payment.invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invoice) {
          const { roundCurrency } = await import('@/lib/types/invoicing');
          const newAmountPaid = roundCurrency(invoice.amount_paid - amount);
          const newAmountDue = roundCurrency(invoice.total - newAmountPaid);

          await this.supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              amount_due: newAmountDue,
              status: newAmountDue > 0 ? 'sent' : 'paid',
            })
            .eq('id', payment.invoice_id)
            .eq('tenant_id', tenantId);
        }

        const { logAudit } = await import('@/lib/audit');
        await logAudit('PROCESS_REFUND', `refunds/${refund.id}`, {
          payment_id: paymentId,
          amount,
          reason,
        });

        return refund as Refund;
      },
      'Error al procesar reembolso',
      { context: { tenantId, paymentId, amount } }
    );
  }

  /**
   * Mark invoice as sent
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (sender)
   * @returns Updated invoice
   */
  async sendInvoice(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResult<Invoice>> {
    return this.handleError(
      async () => {
        const { data: invoice, error } = await this.supabase
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_by: userId,
          })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .eq('status', 'draft')
          .select()
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!invoice) {
          throw new Error('Factura no encontrada o ya fue enviada');
        }

        const { logAudit } = await import('@/lib/audit');
        await logAudit('SEND_INVOICE', `invoices/${id}`, {});

        return invoice as Invoice;
      },
      'Error al enviar factura',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Mark invoice as paid
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (for audit)
   * @returns Updated invoice
   */
  async markAsPaid(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResult<Invoice>> {
    return this.handleError(
      async () => {
        // First get the invoice to know the total
        const { data: existing } = await this.supabase
          .from('invoices')
          .select('total')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (!existing) {
          throw new Error('Factura no encontrada');
        }

        const { data: invoice, error } = await this.supabase
          .from('invoices')
          .update({
            status: 'paid',
            amount_paid: existing.total,
            amount_due: 0,
            paid_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!invoice) {
          throw new Error('Factura no encontrada');
        }

        const { logAudit } = await import('@/lib/audit');
        await logAudit('MARK_INVOICE_PAID', `invoices/${id}`, {});

        return invoice as Invoice;
      },
      'Error al marcar factura como pagada',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Void an invoice
   *
   * @param id - Invoice ID
   * @param tenantId - Tenant ID
   * @param userId - User ID (for audit)
   * @returns Updated invoice
   */
  async voidInvoice(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResult<Invoice>> {
    return this.handleError(
      async () => {
        const { data: invoice, error } = await this.supabase
          .from('invoices')
          .update({
            status: 'void',
            voided_at: new Date().toISOString(),
            voided_by: userId,
          })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!invoice) {
          throw new Error('Factura no encontrada');
        }

        const { logAudit } = await import('@/lib/audit');
        await logAudit('VOID_INVOICE', `invoices/${id}`, {});

        return invoice as Invoice;
      },
      'Error al anular factura',
      { context: { invoiceId: id, tenantId } }
    );
  }

  /**
   * Get overdue invoices for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns List of overdue invoices
   */
  async getOverdueInvoices(
    tenantId: string
  ): Promise<ServiceResult<InvoiceWithDetails[]>> {
    return this.handleError(
      async () => {
        const today = new Date().toISOString().split('T')[0];

        const { data: invoices, error } = await this.supabase
          .from('invoices')
          .select(
            `
            *,
            pets(id, name, species, owner:profiles(id, full_name, email, phone)),
            invoice_items(id, description, quantity, unit_price, line_total)
          `
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'sent')
          .lt('due_date', today)
          .is('deleted_at', null)
          .order('due_date', { ascending: true });

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return mapInvoicesWithDetails((invoices || []) as RawInvoiceWithDetails[]);
      },
      'Error al cargar facturas vencidas',
      { context: { tenantId } }
    );
  }

  /**
   * Get revenue summary for a period
   *
   * @param tenantId - Tenant ID
   * @param periodStart - Period start date (ISO string)
   * @param periodEnd - Period end date (ISO string)
   * @returns Revenue statistics
   */
  async getRevenueSummary(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ServiceResult<RevenueSummary>> {
    return this.handleError(
      async () => {
        // Get all invoices in period
        const { data: invoices, error } = await this.supabase
          .from('invoices')
          .select('total, status, amount_due, due_date, paid_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd)
          .is('deleted_at', null);

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!invoices || invoices.length === 0) {
          return {
            total_revenue: 0,
            paid_invoices_count: 0,
            outstanding_balance: 0,
            overdue_balance: 0,
            average_invoice_value: 0,
            period_start: periodStart,
            period_end: periodEnd,
          };
        }

        const today = new Date().toISOString().split('T')[0];
        let totalRevenue = 0;
        let paidCount = 0;
        let outstandingBalance = 0;
        let overdueBalance = 0;

        invoices.forEach((inv) => {
          const total = Number(inv.total);
          const amountDue = Number(inv.amount_due);

          if (inv.status === 'paid') {
            totalRevenue += total;
            paidCount++;
          } else if (inv.status === 'sent') {
            outstandingBalance += amountDue;
            if (inv.due_date && inv.due_date < today) {
              overdueBalance += amountDue;
            }
          }
        });

        const { roundCurrency } = await import('@/lib/types/invoicing');

        return {
          total_revenue: roundCurrency(totalRevenue),
          paid_invoices_count: paidCount,
          outstanding_balance: roundCurrency(outstandingBalance),
          overdue_balance: roundCurrency(overdueBalance),
          average_invoice_value: roundCurrency(totalRevenue / Math.max(paidCount, 1)),
          period_start: periodStart,
          period_end: periodEnd,
        };
      },
      'Error al calcular resumen de ingresos',
      { context: { tenantId, periodStart, periodEnd } }
    );
  }

  /**
   * Send an invoice to the owner via email
   * @param tenantId Tenant ID
   * @param invoiceId Invoice ID
   * @param recipientEmail Optional override for recipient email
   */
  async emailInvoice(
    tenantId: string,
    invoiceId: string,
    recipientEmail?: string
  ): Promise<ServiceResult<{ messageId?: string }>> {
    return this.handleError(
      async () => {
        // 1. Get invoice with details
        const result = await this.getById(tenantId, invoiceId);
        if (!result.success) {
          throw new Error('Factura no encontrada');
        }
        const invoice = result.data;

        // 2. Get owner email if not provided
        const toEmail = recipientEmail || invoice.pet?.owner?.email;
        if (!toEmail) {
          throw new Error('El propietario no tiene correo electrónico registrado');
        }

        // 3. Get clinic info for the email template
        const { data: clinic, error: clinicError } = await this.supabase
          .from('tenants')
          .select('name, address, phone, email, logo_url')
          .eq('id', tenantId)
          .single();

        if (clinicError) {
          throw new Error('Error al obtener información de la clínica');
        }

        // 4. Generate email content
        const emailData = {
          clinicName: clinic.name,
          clinicLogo: clinic.logo_url,
          clinicAddress: clinic.address,
          clinicPhone: clinic.phone,
          clinicEmail: clinic.email,
          ownerName: invoice.pet?.owner?.full_name || 'Propietario',
          petName: invoice.pet?.name || 'su mascota',
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.created_at,
          dueDate: invoice.due_date || '',
          subtotal: invoice.subtotal,
          taxRate: invoice.tax_rate,
          taxAmount: invoice.tax_amount,
          total: invoice.total_amount,
          amountPaid: invoice.amount_paid,
          amountDue: invoice.balance_due,
          items: invoice.items.map((item: InvoiceItemWithDetails) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discountPercent: item.discount_percent,
            lineTotal: item.total_price,
          })),
          notes: invoice.notes || undefined,
          paymentInstructions: 'Puede realizar su pago en ventanilla o mediante transferencia bancaria.',
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${tenantId}/portal/invoices/${invoiceId}`,
        };

        const html = generateInvoiceEmail(emailData);

        // 5. Send email
        const sendResult = await sendEmail({
          to: toEmail,
          subject: `Factura ${invoice.invoice_number} - ${clinic.name}`,
          html,
          replyTo: clinic.email,
        });

        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Error al enviar el correo');
        }

        // 6. Log activity
        await this.supabase.from('audit_logs').insert({
          tenant_id: tenantId,
          resource_type: 'invoice',
          resource_id: invoiceId,
          action: 'email_sent',
          details: {
            sent_to: toEmail,
            message_id: sendResult.messageId,
          },
        });

        // 7. Update invoice sent status if it was in draft
        if (invoice.status === 'draft') {
          await this.supabase
            .from('invoices')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', invoiceId)
            .eq('tenant_id', tenantId);
        }

        return { messageId: sendResult.messageId };
      },
      'Error al enviar factura por email',
      { context: { tenantId, invoiceId, recipientEmail } }
    );
  }
}
