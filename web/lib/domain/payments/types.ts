/**
 * Payment Domain Types
 *
 * Type definitions for the payment domain layer.
 * Re-exports base types from entities and adds domain-specific types.
 */

// Re-export base entity types
export type {
  Payment,
  PaymentWithDetails,
  RecordPaymentInput,
  Refund,
  RefundSummary,
} from '@/lib/types/entities/invoice'

/**
 * Filters for listing payments
 */
export interface PaymentListFilters {
  /** Filter by invoice ID */
  invoiceId?: string
  /** Filter by payment status */
  status?: 'pending' | 'completed' | 'failed' | 'refunded'
  /** Filter by payment method */
  paymentMethod?: string
  /** Filter by date range (paid_at >= fromDate) */
  fromDate?: string
  /** Filter by date range (paid_at <= toDate) */
  toDate?: string
  /** Pagination: page number (1-based) */
  page?: number
  /** Pagination: items per page */
  limit?: number
}

/**
 * Refund input data
 */
export interface ProcessRefundInput {
  paymentId: string
  amount: number
  reason: string
}

/**
 * Payment summary for reporting
 */
export interface PaymentSummary {
  total_collected: number
  total_refunded: number
  net_revenue: number
  payment_count: number
  refund_count: number
  period_start: string
  period_end: string
}

/**
 * Paginated payment list result
 */
export interface PaymentListResult {
  payments: import('@/lib/types/entities/invoice').Payment[]
  count: number
  page: number
  limit: number
}
