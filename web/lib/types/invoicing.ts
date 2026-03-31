// Invoice Status and Payment Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'void'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'other'

// Form Data Types for Server Actions

/**
 * Item data for creating/updating an invoice
 */
export interface InvoiceItemFormData {
  service_id?: string | null
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
}

/**
 * Form data for creating/updating an invoice
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
 * Form data for recording a payment
 */
export interface RecordPaymentData {
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string
  notes?: string
  paid_at?: string
}

// Invoice Item
export interface InvoiceItem {
  id?: string
  invoice_id?: string
  service_id?: string | null
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  line_total: number
  // Joined data
  services?: {
    id: string
    name: string
    category?: string
  }
  products?: {
    id: string
    name: string
    sku?: string
  }
}

// Invoice
export interface Invoice {
  id: string
  invoice_number: string
  tenant_id: string
  pet_id?: string | null
  owner_id: string
  status: InvoiceStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  amount_due: number
  notes?: string | null
  due_date?: string | null
  created_at: string
  updated_at?: string
  sent_at?: string | null
  paid_at?: string | null
  voided_at?: string | null
  created_by?: string
  // Joined data
  pets?: {
    id: string
    name: string
    species: string
    breed?: string
    photo_url?: string
    owner?: {
      id: string
      full_name: string
      email: string
      phone?: string
    }
  }
  invoice_items?: InvoiceItem[]
  payments?: Payment[]
  refunds?: Refund[]
  created_by_user?: {
    full_name: string
  }
}

// Payment
export interface Payment {
  id: string
  tenant_id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string | null
  notes?: string | null
  paid_at: string
  received_by: string
  // Joined data
  receiver?: {
    full_name: string
  }
}

// Refund
export interface Refund {
  id: string
  invoice_id: string
  amount: number
  reason?: string
  refunded_at: string
}

// Service for dropdown
export interface Service {
  id: string
  name: string
  description?: string
  base_price: number
  duration_minutes?: number
  category?: string
  is_active: boolean
  tenant_id?: string
}

// Product for dropdown
export interface Product {
  id: string
  name: string
  sku?: string
  price: number
  is_active: boolean
}

// Status Configuration
export const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Enviada', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Pagada', className: 'bg-green-100 text-green-800' },
  partial: { label: 'Pago parcial', className: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Vencida', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
  void: { label: 'Anulada', className: 'bg-red-100 text-red-500' },
}

// Payment Method Labels
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
  other: 'Otro',
}

// Utility Functions

/**
 * Round currency amount to 2 decimal places to avoid floating point arithmetic errors
 * @param amount - The amount to round
 * @returns Rounded amount to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function formatCurrency(amount: number): string {
  return `Gs. ${amount.toLocaleString('es-PY')}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function canEditInvoice(status: InvoiceStatus | string): boolean {
  return status === 'draft'
}

export function canSendInvoice(status: InvoiceStatus | string): boolean {
  return status === 'draft' || status === 'sent'
}

export function canRecordPayment(status: InvoiceStatus | string, amountDue?: number): boolean {
  return (amountDue === undefined || amountDue > 0) && !['void', 'cancelled'].includes(status)
}

export function canVoidInvoice(status: InvoiceStatus | string): boolean {
  return !['void', 'paid'].includes(status)
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0
): number {
  // Round to 2 decimal places to avoid floating point errors
  return roundCurrency(quantity * unitPrice * (1 - discountPercent / 100))
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number = 10
): {
  subtotal: number
  taxAmount: number
  total: number
} {
  // Sum all line totals with proper rounding
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.line_total, 0))
  // Calculate tax with proper rounding
  const taxAmount = roundCurrency(subtotal * (taxRate / 100))
  // Calculate total with proper rounding
  const total = roundCurrency(subtotal + taxAmount)

  return { subtotal, taxAmount, total }
}

// Aliases for compatibility
export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
  partial: 'Pago parcial',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
  void: 'Anulada',
}

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  void: 'bg-red-100 text-red-500',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
  other: 'Otro',
}

// Alias for canRecordPayment
export const canReceivePayment = canRecordPayment
