/**
 * Invoice Entity Types - Single Source of Truth
 *
 * This file contains the canonical Invoice type and all derived variants.
 * Import from here instead of defining inline types.
 *
 * @example
 * ```typescript
 * import type { Invoice, InvoiceWithItems, InvoiceFormData } from '@/lib/types/entities/invoice'
 * ```
 */

import type { InvoiceStatus, PaymentMethod, PaymentStatus } from '../database/enums'

// =============================================================================
// BASE INVOICE TYPE (Database Entity)
// =============================================================================

/**
 * Base Invoice entity - matches database schema exactly
 */
export interface Invoice {
  id: string
  tenant_id: string
  client_id: string
  pet_id: string | null
  invoice_number: string
  appointment_id: string | null
  medical_record_id: string | null
  hospitalization_id: string | null
  subtotal: number
  discount_amount: number
  discount_reason: string | null
  tax_rate: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: InvoiceStatus
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  voided_at: string | null
  voided_by: string | null
  notes: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// =============================================================================
// INVOICE ITEM TYPES
// =============================================================================

/**
 * Base InvoiceItem entity
 */
export interface InvoiceItem {
  id: string
  invoice_id: string
  service_id: string | null
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  total_price: number
  notes: string | null
  created_at: string
}

/**
 * Invoice item with joined service/product data
 */
export interface InvoiceItemWithDetails extends InvoiceItem {
  services?: {
    id: string
    name: string
    category?: string
  } | null
  products?: {
    id: string
    name: string
    sku?: string
  } | null
}

/**
 * Form data for invoice items
 */
export interface InvoiceItemFormData {
  service_id?: string | null
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  line_total?: number
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

/**
 * Base Payment entity
 */
export interface Payment {
  id: string
  tenant_id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_reference: string | null
  status: PaymentStatus
  paid_at: string
  processed_by: string | null
  notes: string | null
  created_at: string
  deleted_at?: string | null
}

/**
 * Payment with receiver info
 */
export interface PaymentWithDetails extends Payment {
  receiver?: {
    full_name: string
  } | null
}

/**
 * Form data for recording a payment
 */
export interface RecordPaymentInput {
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string
  notes?: string
  paid_at?: string
}

// =============================================================================
// REFUND TYPES
// =============================================================================

/**
 * Base Refund entity
 */
export interface Refund {
  id: string
  tenant_id: string
  payment_id: string
  invoice_id: string
  amount: number
  reason: string
  refund_method: PaymentMethod
  refund_reference: string | null
  status: PaymentStatus
  refunded_at: string | null
  processed_by: string | null
  notes: string | null
  created_at: string
}

/**
 * Refund summary for invoice display
 */
export type RefundSummary = Pick<Refund, 'id' | 'invoice_id' | 'amount' | 'reason' | 'refunded_at'>

// =============================================================================
// DERIVED INVOICE TYPES
// =============================================================================

/**
 * Invoice summary for lists
 */
export type InvoiceSummary = Pick<
  Invoice,
  'id' | 'invoice_number' | 'total_amount' | 'balance_due' | 'status' | 'due_date' | 'created_at'
>

/**
 * Invoice with all related data for detail view
 */
export interface InvoiceWithDetails extends Invoice {
  items: InvoiceItemWithDetails[]
  payments?: PaymentWithDetails[]
  refunds?: RefundSummary[]
  client?: {
    id: string
    full_name: string | null
    email: string
    phone: string | null
  } | null
  pet?: {
    id: string
    name: string
    species: string
    breed?: string | null
    photo_url?: string | null
    owner?: {
      id: string
      full_name: string
      email: string | null
      phone: string | null
    } | null
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
  created_by_user?: {
    id: string
    full_name: string
  } | null
  // Include all timestamp fields from Invoice base type
  sent_at: string | null
  voided_at: string | null
  voided_by: string | null
}

/**
 * Form data for creating an invoice
 */
export interface InvoiceFormData {
  pet_id: string
  owner_id?: string
  items: InvoiceItemFormData[]
  tax_rate?: number
  notes?: string
  due_date?: string
}

/**
 * Data for creating an invoice via API
 */
export interface CreateInvoiceInput {
  tenant_id: string
  client_id: string
  pet_id?: string | null
  items: InvoiceItemFormData[]
  tax_rate?: number
  discount_amount?: number
  discount_reason?: string
  notes?: string
  due_date?: string
}

/**
 * Invoice for PDF generation
 */
export interface InvoiceForPdf extends Invoice {
  tenant?: {
    name: string
    billing_name?: string | null
    billing_email?: string | null
    billing_ruc?: string | null
    billing_address?: string | null
    billing_city?: string | null
  } | null
  client?: {
    full_name: string
    email: string | null
    phone: string | null
    address?: string | null
  } | null
  pet?: {
    name: string
    species: string
  } | null
  items: InvoiceItemWithDetails[]
}

// =============================================================================
// TYPE ALIASES FOR BACKWARDS COMPATIBILITY
// =============================================================================

/** @deprecated Use InvoiceWithDetails */
export type InvoiceWithItems = InvoiceWithDetails

/** @deprecated Use RecordPaymentInput */
export type RecordPaymentData = RecordPaymentInput
