/**
 * Invoice Domain Types
 *
 * Type definitions for the invoice domain layer.
 * Re-exports base types from entities and adds domain-specific types.
 */

// Re-export base entity types
export type {
  Invoice,
  InvoiceWithDetails,
  InvoiceFormData,
  InvoiceItemFormData,
} from '@/lib/types/entities/invoice'

/**
 * Filters for listing invoices
 */
export interface InvoiceListFilters {
  /** Filter by invoice status */
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
  /** Filter by pet ID */
  petId?: string
  /** Filter by owner ID (for pet owner portal) */
  ownerId?: string
  /** Filter by date range (created_at >= fromDate) */
  fromDate?: string
  /** Filter by date range (created_at <= toDate) */
  toDate?: string
  /** Pagination: page number (1-based) */
  page?: number
  /** Pagination: items per page */
  limit?: number
}

/**
 * Invoice creation input
 */
export interface CreateInvoiceInput {
  pet_id: string
  items: Array<{
    service_id?: string
    product_id?: string
    description: string
    quantity: number
    unit_price: number
    discount_percent?: number
  }>
  tax_rate?: number
  notes?: string
  due_date?: string
  idempotency_key?: string
}

/**
 * Invoice update input (for draft invoices)
 */
export interface UpdateInvoiceInput {
  items?: Array<{
    service_id?: string
    product_id?: string
    description: string
    quantity: number
    unit_price: number
    discount_percent?: number
  }>
  tax_rate?: number
  notes?: string
  due_date?: string
  status?: 'draft' | 'sent'
}

/**
 * Revenue summary statistics
 */
export interface RevenueSummary {
  total_revenue: number
  paid_invoices_count: number
  outstanding_balance: number
  overdue_balance: number
  average_invoice_value: number
  period_start: string
  period_end: string
}

/**
 * Paginated invoice list result
 */
export interface InvoiceListResult {
  invoices: import('@/lib/types/entities/invoice').InvoiceWithDetails[]
  count: number
  page: number
  limit: number
}

/**
 * Delete operation result
 */
export interface DeleteInvoiceResult {
  deleted: boolean
  voided: boolean
}
