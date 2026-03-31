/**
 * Invoicing Database Tables
 * Service, Invoice, InvoiceItem, Payment, Refund, ClientCredit
 */

import type { InvoiceStatus, PaymentMethod, PaymentStatus } from './enums'

// =============================================================================
// INVOICING
// =============================================================================

export interface Service {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: string
  base_price: number
  duration_minutes: number | null
  is_active: boolean
  tax_rate: number
  requires_appointment: boolean
  created_at: string
  updated_at: string
}

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

export interface InvoiceItem {
  id: string
  invoice_id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  total_price: number
  notes: string | null
  created_at: string
}

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

export interface ClientCredit {
  id: string
  tenant_id: string
  client_id: string
  amount: number
  reason: string
  expires_at: string | null
  used_amount: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
