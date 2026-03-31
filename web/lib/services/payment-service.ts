/**
 * @deprecated Use the new domain-driven unified payment system in @/lib/payments/ instead.
 * This service is kept for backward compatibility during the migration phase.
 * 
 * PaymentService - Payment Processing Service Layer (CORE MVP)
 *
 * Handles CORE payment operations only:
 * - Payment processing (Stripe, cash, bank transfer)
 * - Payment status tracking
 * - Payment history
 *
 * DEFERRED TO PHASE 2+:
 * - Refunds
 * - Payment plans
 * - Subscription billing
 * - Complex reconciliation
 *
 * @example
 * ```typescript
 * const service = new PaymentService(supabase);
 * const result = await service.processPayment({
 *   invoice_id: 'inv-123',
 *   amount: 150000,
 *   method: 'stripe',
 *   stripe_payment_intent_id: 'pi_123'
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'stripe';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

/**
 * Payment entity from database
 * Column names match actual DB schema (see migrations/075_atomic_payment_recording.sql)
 */
export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  payment_method: string; // 'cash', 'card', 'bank_transfer', 'stripe' (DB column)
  status: PaymentStatus;
  reference_number: string | null; // DB column name
  notes: string | null;
  paid_at: string; // DB column name (not payment_date)
  received_by: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Payment with related invoice data
 */
export interface PaymentWithInvoice extends Payment {
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    client_id: string;
  } | null;
}

/**
 * Input for processing a payment
 * Uses friendly names that map to DB columns internally
 */
export interface ProcessPaymentInput {
  invoice_id: string;
  amount: number;
  method: PaymentMethod; // Maps to payment_method in DB
  reference_number?: string | null; // Legacy DB column
  transaction_reference?: string | null; // External transaction reference
  notes?: string | null;
  stripe_payment_intent_id?: string | null; // For Stripe payments
}

/**
 * Filters for listing payments
 */
export interface PaymentListFilters {
  invoice_id?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
}

// =============================================================================
// PAYMENT SERVICE
// =============================================================================

export class PaymentService extends BaseService {
  /**
   * Process a payment for an invoice
   *
   * @param tenantId - Tenant ID
   * @param input - Payment details
   * @returns Created payment record
   */
  async processPayment(
    tenantId: string,
    input: ProcessPaymentInput
  ): Promise<ServiceResult<Payment>> {
    return this.handleError(
      async () => {
        // Validate required fields
        this.validateRequiredFields(
          { invoice_id: input.invoice_id, amount: input.amount, method: input.method },
          ['invoice_id', 'amount', 'method']
        );

        // Validate amount is positive
        if (input.amount <= 0) {
          throw new Error('El monto del pago debe ser mayor a cero');
        }

        // Verify invoice exists and belongs to tenant
        const { data: invoice, error: invoiceError } = await this.supabase
          .from('invoices')
          .select('id, tenant_id, total, status')
          .eq('id', input.invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invoiceError || !invoice) {
          throw new Error('Factura no encontrada');
        }

        // Validate invoice is not already paid
        if (invoice.status === 'paid') {
          throw new Error('Esta factura ya está pagada');
        }

        // Determine payment status based on method
        let status: PaymentStatus = 'completed';
        if (input.method === 'stripe' && !input.stripe_payment_intent_id) {
          status = 'pending';
        }

        // Create payment record
        const { data: payment, error: insertError } = await this.supabase
          .from('payments')
          .insert({
            tenant_id: tenantId,
            invoice_id: input.invoice_id,
            amount: input.amount,
            method: input.method,
            status,
            transaction_reference: input.transaction_reference || null,
            stripe_payment_intent_id: input.stripe_payment_intent_id || null,
            notes: input.notes || null,
            payment_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(this.mapDatabaseError(insertError));
        }

        // Update invoice status if fully paid
        const { data: existingPayments } = await this.supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', input.invoice_id)
          .eq('status', 'completed');

        const totalPaid = (existingPayments || []).reduce((sum, p) => sum + p.amount, 0);

        let newInvoiceStatus = invoice.status;
        if (totalPaid >= invoice.total) {
          newInvoiceStatus = 'paid';
        } else if (totalPaid > 0 && totalPaid < invoice.total) {
          newInvoiceStatus = 'partial';
        }

        if (newInvoiceStatus !== invoice.status) {
          await this.supabase
            .from('invoices')
            .update({ status: newInvoiceStatus })
            .eq('id', input.invoice_id);
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('PROCESS_PAYMENT', `payments/${payment.id}`, {
          invoice_id: input.invoice_id,
          amount: input.amount,
          method: input.method,
          status,
        });

        return payment as Payment;
      },
      'Error al procesar el pago',
      { context: { tenantId, input } }
    );
  }

  /**
   * Get payment status by ID
   *
   * @param id - Payment ID
   * @param tenantId - Tenant ID
   * @returns Payment details
   */
  async getPaymentStatus(id: string, tenantId: string): Promise<ServiceResult<Payment>> {
    return this.handleError(
      async () => {
        const { data: payment, error } = await this.supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!payment) {
          throw new Error('Pago no encontrado');
        }

        return payment as Payment;
      },
      'Error al obtener el estado del pago',
      { context: { paymentId: id, tenantId } }
    );
  }

  /**
   * List payment history for tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of payments with invoice data
   */
  async listPayments(
    tenantId: string,
    filters: PaymentListFilters = {}
  ): Promise<ServiceResult<PaymentWithInvoice[]>> {
    return this.handleError(
      async () => {
        const { invoice_id, method, status, start_date, end_date } = filters;

        let query = this.supabase
          .from('payments')
          .select(
            `
            *,
            invoice:invoices(id, invoice_number, total, client_id)
          `
          )
          .eq('tenant_id', tenantId)
          .order('payment_date', { ascending: false });

        // Apply filters
        if (invoice_id) {
          query = query.eq('invoice_id', invoice_id);
        }

        if (method) {
          query = query.eq('method', method);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (start_date) {
          query = query.gte('payment_date', start_date);
        }

        if (end_date) {
          query = query.lte('payment_date', end_date);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return (data || []) as PaymentWithInvoice[];
      },
      'Error al cargar el historial de pagos',
      { context: { tenantId, filters } }
    );
  }

  /**
   * Get payment history for a specific user (client)
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns List of user's payments
   */
  async getUserPaymentHistory(
    userId: string,
    tenantId: string
  ): Promise<ServiceResult<PaymentWithInvoice[]>> {
    return this.handleError(
      async () => {
        // Get user's invoices first
        const { data: invoices } = await this.supabase
          .from('invoices')
          .select('id')
          .eq('client_id', userId)
          .eq('tenant_id', tenantId);

        if (!invoices || invoices.length === 0) {
          return [];
        }

        const invoiceIds = invoices.map((inv) => inv.id);

        // Get payments for those invoices
        const { data: payments, error } = await this.supabase
          .from('payments')
          .select(
            `
            *,
            invoice:invoices(id, invoice_number, total, client_id)
          `
          )
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return (payments || []) as PaymentWithInvoice[];
      },
      'Error al cargar el historial de pagos del usuario',
      { context: { userId, tenantId } }
    );
  }

  /**
   * Update payment status (for async payment confirmations like Stripe webhooks)
   *
   * @param id - Payment ID
   * @param tenantId - Tenant ID
   * @param status - New status
   * @param transactionReference - Optional transaction reference
   * @returns Updated payment
   */
  async updatePaymentStatus(
    id: string,
    tenantId: string,
    status: PaymentStatus,
    transactionReference?: string
  ): Promise<ServiceResult<Payment>> {
    return this.handleError(
      async () => {
        // Get existing payment
        const { data: existing, error: fetchError } = await this.supabase
          .from('payments')
          .select('*, invoice:invoices(id, total, status)')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchError || !existing) {
          throw new Error('Pago no encontrado');
        }

        // Update payment
        const updates: {
          status: string
          updated_at: string
          transaction_reference?: string
        } = {
          status,
          updated_at: new Date().toISOString(),
        }

        if (transactionReference) {
          updates.transaction_reference = transactionReference
        }

        const { data: payment, error: updateError } = await this.supabase
          .from('payments')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // If payment completed, update invoice status
        if (status === 'completed' && existing.invoice) {
          const { data: allPayments } = await this.supabase
            .from('payments')
            .select('amount')
            .eq('invoice_id', existing.invoice_id)
            .eq('status', 'completed');

          const totalPaid = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);

          let newStatus = existing.invoice.status;
          if (totalPaid >= existing.invoice.total) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          if (newStatus !== existing.invoice.status) {
            await this.supabase
              .from('invoices')
              .update({ status: newStatus })
              .eq('id', existing.invoice_id);
          }
        }

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('UPDATE_PAYMENT_STATUS', `payments/${id}`, {
          old_status: existing.status,
          new_status: status,
        });

        return payment as Payment;
      },
      'Error al actualizar el estado del pago',
      { context: { paymentId: id, tenantId, status } }
    );
  }
}
