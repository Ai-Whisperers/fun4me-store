/**
 * Payment Service
 *
 * Business logic for payment operations.
 * Orchestrates repository calls and applies business rules.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { PaymentRepository } from './repository'
import type {
  Payment,
  Refund,
  RecordPaymentInput,
  PaymentListFilters,
  PaymentListResult,
  PaymentSummary,
} from './types'
import { roundCurrency } from '@/lib/types/invoicing'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export class PaymentService {
  private repository: PaymentRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new PaymentRepository(supabase)
  }

  /**
   * List payments for an invoice
   */
  async getPaymentsByInvoice(
    invoiceId: string,
    tenantId: string
  ): Promise<Payment[]> {
    return this.repository.findByInvoiceId(invoiceId, tenantId)
  }

  /**
   * List payments with filters
   */
  async list(
    tenantId: string,
    filters: PaymentListFilters = {}
  ): Promise<PaymentListResult> {
    return this.repository.findMany(tenantId, filters)
  }

  /**
   * Record a payment for an invoice
   */
  async recordPayment(
    tenantId: string,
    userId: string,
    input: RecordPaymentInput
  ): Promise<Payment> {
    const { invoice_id, amount, payment_method, reference_number, notes, paid_at } = input

    // Validate required fields
    if (!invoice_id) {
      throw new Error('Se requiere factura')
    }
    if (!amount || amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero')
    }
    if (!payment_method) {
      throw new Error('Se requiere método de pago')
    }

    // Get invoice to validate
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('id, tenant_id, total, amount_paid, amount_due, status')
      .eq('id', invoice_id)
      .eq('tenant_id', tenantId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Factura no encontrada')
    }

    if (amount > invoice.amount_due) {
      throw new Error('El monto del pago excede el saldo pendiente')
    }

    // Record payment
    const payment = await this.repository.create(tenantId, {
      invoice_id,
      amount,
      payment_method,
      payment_reference: reference_number || null,
      status: 'completed',
      paid_at: paid_at || new Date().toISOString(),
      processed_by: userId,
      notes: notes || null,
    })

    // Update invoice amounts
    const newAmountPaid = roundCurrency(invoice.amount_paid + amount)
    const newAmountDue = roundCurrency(invoice.total - newAmountPaid)
    const isPaid = newAmountDue === 0

    await this.supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: isPaid ? 'paid' : invoice.status,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq('id', invoice_id)

    await logAudit('RECORD_PAYMENT', `payments/${payment.id}`, {
      invoice_id,
      amount,
      payment_method,
    })

    logger.info('[PaymentService] Payment recorded', {
      paymentId: payment.id,
      invoiceId: invoice_id,
      amount,
    })

    return payment
  }

  /**
   * Process a refund for a payment
   */
  async refundPayment(
    tenantId: string,
    userId: string,
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<Refund> {
    // Validate amount
    if (amount <= 0) {
      throw new Error('El monto del reembolso debe ser mayor a cero')
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Se requiere motivo del reembolso')
    }

    // Get payment
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .select('id, tenant_id, invoice_id, amount, payment_method')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (paymentError || !payment) {
      throw new Error('Pago no encontrado')
    }

    if (amount > payment.amount) {
      throw new Error('El monto del reembolso excede el monto del pago')
    }

    // Create refund
    const refund = await this.repository.createRefund(tenantId, {
      payment_id: paymentId,
      invoice_id: payment.invoice_id,
      amount,
      reason,
      refund_method: payment.payment_method,
      status: 'completed',
      refunded_at: new Date().toISOString(),
      processed_by: userId,
    })

    // Update invoice amounts
    const { data: invoice } = await this.supabase
      .from('invoices')
      .select('total, amount_paid')
      .eq('id', payment.invoice_id)
      .single()

    if (invoice) {
      const newAmountPaid = roundCurrency(invoice.amount_paid - amount)
      const newAmountDue = roundCurrency(invoice.total - newAmountPaid)

      await this.supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          status: newAmountDue > 0 ? 'sent' : 'paid',
        })
        .eq('id', payment.invoice_id)
    }

    await logAudit('PROCESS_REFUND', `refunds/${refund.id}`, {
      payment_id: paymentId,
      amount,
      reason,
    })

    logger.info('[PaymentService] Refund processed', {
      refundId: refund.id,
      paymentId,
      amount,
    })

    return refund
  }

  /**
   * Get refunds for an invoice
   */
  async getRefundsByInvoice(
    invoiceId: string,
    tenantId: string
  ): Promise<Refund[]> {
    return this.repository.findRefundsByInvoiceId(invoiceId, tenantId)
  }

  /**
   * Get payment summary for a period
   */
  async getPaymentSummary(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<PaymentSummary> {
    const [paymentTotals, refundTotals] = await Promise.all([
      this.repository.getPaymentTotals(tenantId, periodStart, periodEnd),
      this.repository.getRefundTotals(tenantId, periodStart, periodEnd),
    ])

    return {
      total_collected: roundCurrency(paymentTotals.total_paid),
      total_refunded: roundCurrency(refundTotals.total_refunded),
      net_revenue: roundCurrency(paymentTotals.total_paid - refundTotals.total_refunded),
      payment_count: paymentTotals.payment_count,
      refund_count: refundTotals.refund_count,
      period_start: periodStart,
      period_end: periodEnd,
    }
  }
}
