/**
 * Financial Audit Logging Utility
 *
 * AUDIT-001: Provides specialized logging for financial operations
 * with comprehensive state tracking for compliance.
 *
 * Features:
 * - Previous/new state capture for change tracking
 * - Amount and currency tracking
 * - IP address and user agent capture
 * - Actor type identification (user, system, cron)
 * - Non-blocking (errors logged but don't fail operations)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// =============================================================================
// TYPES
// =============================================================================

export type FinancialEntityType = 'order' | 'invoice' | 'payment' | 'refund' | 'subscription'

export type FinancialOperation =
  // Orders
  | 'order_created'
  | 'order_confirmed'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_completed'
  // Invoices
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_voided'
  | 'invoice_updated'
  // Payments
  | 'payment_recorded'
  | 'payment_voided'
  | 'payment_failed'
  // Refunds
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_rejected'
  | 'refund_processed'
  // Subscriptions
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_failed'
  // Other
  | 'discount_applied'
  | 'price_override'
  | string // Allow custom operations

export type ActorType = 'user' | 'system' | 'cron'

export interface FinancialAuditEntry {
  /** The operation being logged */
  operation: FinancialOperation
  /** Type of entity being operated on */
  entityType: FinancialEntityType
  /** UUID of the entity */
  entityId: string
  /** User ID performing the action (null for system/cron) */
  actorId?: string | null
  /** Type of actor */
  actorType: ActorType
  /** Monetary amount (if applicable) */
  amount?: number | null
  /** Currency code (defaults to PYG) */
  currency?: string
  /** State before the operation */
  previousState?: Record<string, unknown> | null
  /** State after the operation */
  newState?: Record<string, unknown> | null
  /** Additional context/metadata */
  metadata?: Record<string, unknown>
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Log a financial audit event
 *
 * @param supabase - Supabase client (already initialized)
 * @param tenantId - Tenant ID for multi-tenancy
 * @param entry - Audit entry details
 * @param request - Optional request for IP/user-agent capture
 *
 * @example
 * ```typescript
 * await logFinancialAudit(supabase, tenantId, {
 *   operation: 'order_created',
 *   entityType: 'order',
 *   entityId: order.id,
 *   actorId: userId,
 *   actorType: 'user',
 *   amount: order.total,
 *   newState: { status: order.status, items_count: order.items.length },
 *   metadata: { coupon_applied: !!order.coupon_code },
 * }, request)
 * ```
 */
export async function logFinancialAudit(
  supabase: SupabaseClient,
  tenantId: string,
  entry: FinancialAuditEntry,
  request?: NextRequest
): Promise<void> {
  try {
    // Extract request context if available
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request?.headers.get('x-real-ip')
      || null
    const userAgent = request?.headers.get('user-agent') || null

    const { error } = await supabase.from('financial_audit_logs').insert({
      tenant_id: tenantId,
      operation: entry.operation,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      actor_id: entry.actorId || null,
      actor_type: entry.actorType,
      amount: entry.amount ?? null,
      currency: entry.currency || 'PYG',
      previous_state: entry.previousState || null,
      new_state: entry.newState || null,
      metadata: entry.metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (error) {
      // Log error but don't throw - audit should never break main flow
      logger.error('Failed to create financial audit log', {
        error: error.message,
        operation: entry.operation,
        entityType: entry.entityType,
        entityId: entry.entityId,
      })
    }
  } catch (err: unknown) {
    // Catch-all to ensure audit never breaks operations
    logger.error('Error in financial audit logging', {
      error: err instanceof Error ? err.message : String(err),
      operation: entry.operation,
    })
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log order creation
 */
export async function logOrderCreated(
  supabase: SupabaseClient,
  tenantId: string,
  order: {
    id: string
    status: string
    total: number
    items_count: number
    payment_method?: string
    coupon_code?: string | null
    discount_amount?: number
  },
  userId: string,
  request?: NextRequest
): Promise<void> {
  await logFinancialAudit(supabase, tenantId, {
    operation: 'order_created',
    entityType: 'order',
    entityId: order.id,
    actorId: userId,
    actorType: 'user',
    amount: order.total,
    newState: {
      status: order.status,
      items_count: order.items_count,
      payment_method: order.payment_method,
    },
    metadata: {
      coupon_applied: !!order.coupon_code,
      discount_amount: order.discount_amount || 0,
    },
  }, request)
}

/**
 * Log payment recorded
 */
export async function logPaymentRecorded(
  supabase: SupabaseClient,
  tenantId: string,
  payment: {
    id: string
    invoice_id: string
    amount: number
    method?: string
    reference?: string
  },
  previousInvoiceState: Record<string, unknown>,
  newInvoiceState: Record<string, unknown>,
  userId: string,
  request?: NextRequest
): Promise<void> {
  await logFinancialAudit(supabase, tenantId, {
    operation: 'payment_recorded',
    entityType: 'payment',
    entityId: payment.id,
    actorId: userId,
    actorType: 'user',
    amount: payment.amount,
    previousState: previousInvoiceState,
    newState: newInvoiceState,
    metadata: {
      invoice_id: payment.invoice_id,
      payment_method: payment.method,
      reference: payment.reference,
    },
  }, request)
}

/**
 * Log invoice status change
 */
export async function logInvoiceStatusChange(
  supabase: SupabaseClient,
  tenantId: string,
  invoice: { id: string },
  previousStatus: string,
  newStatus: string,
  actorId: string | null,
  actorType: ActorType,
  metadata?: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logFinancialAudit(supabase, tenantId, {
    operation: `invoice_${newStatus}` as FinancialOperation,
    entityType: 'invoice',
    entityId: invoice.id,
    actorId,
    actorType,
    previousState: { status: previousStatus },
    newState: { status: newStatus },
    metadata,
  }, request)
}

/**
 * Log refund processing
 */
export async function logRefundProcessed(
  supabase: SupabaseClient,
  tenantId: string,
  refund: {
    id: string
    amount: number
    payment_id: string
    status: string
    reason?: string
  },
  userId: string,
  request?: NextRequest
): Promise<void> {
  await logFinancialAudit(supabase, tenantId, {
    operation: 'refund_processed',
    entityType: 'refund',
    entityId: refund.id,
    actorId: userId,
    actorType: 'user',
    amount: refund.amount,
    newState: { status: refund.status },
    metadata: {
      payment_id: refund.payment_id,
      reason: refund.reason,
    },
  }, request)
}

/**
 * Log subscription renewal (typically from cron)
 */
export async function logSubscriptionRenewal(
  supabase: SupabaseClient,
  tenantId: string,
  subscription: {
    id: string
    amount: number
    status: string
  },
  success: boolean,
  error?: string
): Promise<void> {
  await logFinancialAudit(supabase, tenantId, {
    operation: success ? 'subscription_renewed' : 'subscription_failed',
    entityType: 'subscription',
    entityId: subscription.id,
    actorType: 'cron',
    amount: subscription.amount,
    newState: { status: subscription.status },
    metadata: success ? {} : { error },
  })
}
