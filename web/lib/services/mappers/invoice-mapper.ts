/**
 * Invoice Mappers - Type-safe conversion from Supabase to domain types
 *
 * Eliminates unsafe `as unknown as` casts by providing explicit mapping functions.
 */

import type {
  InvoiceWithDetails,
  InvoiceItemWithDetails,
  PaymentWithDetails,
  RefundSummary,
} from '@/lib/types/entities/invoice'

// =============================================================================
// RAW SUPABASE TYPES
// =============================================================================

interface RawOwner {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

interface RawPet {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner: RawOwner | RawOwner[] | null
}

interface RawService {
  id: string
  name: string
  category: string | null
}

interface RawProduct {
  id: string
  name: string
  sku: string | null
}

interface RawInvoiceItem {
  id: string
  service_id: string | null
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  services: RawService | RawService[] | null
  products: RawProduct | RawProduct[] | null
}

interface RawPayment {
  id: string
  amount: number
  payment_method: string
  reference_number: string | null
  paid_at: string
}

interface RawRefund {
  id: string
  amount: number
  reason: string
  refunded_at: string | null
}

interface RawCreatedBy {
  id: string
  full_name: string
}

/**
 * Raw invoice data from Supabase join query
 */
export interface RawInvoiceWithDetails {
  id: string
  tenant_id: string
  client_id: string
  pet_id: string | null
  owner_id: string | null
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
  total: number // Alias used in some queries
  amount_paid: number
  balance_due: number
  status: string
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
  pets: RawPet | RawPet[] | null
  invoice_items: RawInvoiceItem[] | null
  payments: RawPayment[] | null
  refunds: RawRefund[] | null
  created_by_user: RawCreatedBy | RawCreatedBy[] | null
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeRelation<T>(relation: T | T[] | null): T | null {
  if (relation === null) return null
  if (Array.isArray(relation)) {
    return relation.length > 0 ? relation[0] : null
  }
  return relation
}

function normalizeArray<T>(relation: T[] | null): T[] {
  return relation ?? []
}

// =============================================================================
// MAPPER FUNCTIONS
// =============================================================================

function mapInvoiceItem(raw: RawInvoiceItem): InvoiceItemWithDetails {
  const service = normalizeRelation(raw.services)
  const product = normalizeRelation(raw.products)

  return {
    id: raw.id,
    invoice_id: '', // Not included in typical queries
    service_id: raw.service_id,
    product_id: raw.product_id,
    description: raw.description,
    quantity: raw.quantity,
    unit_price: raw.unit_price,
    discount_percent: raw.discount_percent,
    tax_rate: 0, // Calculated at invoice level
    total_price: raw.line_total,
    notes: null,
    created_at: '',
    services: service
      ? {
          id: service.id,
          name: service.name,
          category: service.category ?? undefined,
        }
      : null,
    products: product
      ? {
          id: product.id,
          name: product.name,
          sku: product.sku ?? undefined,
        }
      : null,
  }
}

function mapPayment(raw: RawPayment): PaymentWithDetails {
  return {
    id: raw.id,
    tenant_id: '',
    invoice_id: '',
    amount: raw.amount,
    payment_method: raw.payment_method as PaymentWithDetails['payment_method'],
    payment_reference: raw.reference_number,
    status: 'completed',
    paid_at: raw.paid_at,
    processed_by: null,
    notes: null,
    created_at: raw.paid_at,
  }
}

function mapRefund(raw: RawRefund): RefundSummary {
  return {
    id: raw.id,
    invoice_id: '',
    amount: raw.amount,
    reason: raw.reason,
    refunded_at: raw.refunded_at,
  }
}

/**
 * Map raw invoice with details to domain type
 */
export function mapInvoiceWithDetails(
  raw: RawInvoiceWithDetails
): InvoiceWithDetails {
  const pet = normalizeRelation(raw.pets)
  const createdBy = normalizeRelation(raw.created_by_user)
  const owner = pet ? normalizeRelation(pet.owner) : null

  return {
    id: raw.id,
    tenant_id: raw.tenant_id,
    client_id: raw.client_id,
    pet_id: raw.pet_id,
    invoice_number: raw.invoice_number,
    appointment_id: raw.appointment_id,
    medical_record_id: raw.medical_record_id,
    hospitalization_id: raw.hospitalization_id,
    subtotal: raw.subtotal,
    discount_amount: raw.discount_amount,
    discount_reason: raw.discount_reason,
    tax_rate: raw.tax_rate,
    tax_amount: raw.tax_amount,
    total_amount: raw.total_amount ?? raw.total,
    amount_paid: raw.amount_paid,
    balance_due: raw.balance_due,
    status: raw.status as InvoiceWithDetails['status'],
    due_date: raw.due_date,
    paid_at: raw.paid_at,
    sent_at: raw.sent_at,
    voided_at: raw.voided_at,
    voided_by: raw.voided_by,
    notes: raw.notes,
    internal_notes: raw.internal_notes,
    created_by: raw.created_by,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    deleted_at: raw.deleted_at,
    pet: pet
      ? {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          photo_url: pet.photo_url,
          owner: owner
            ? {
                id: owner.id,
                full_name: owner.full_name,
                email: owner.email,
                phone: owner.phone,
              }
            : null,
        }
      : null,
    items: normalizeArray(raw.invoice_items).map(mapInvoiceItem),
    payments: normalizeArray(raw.payments).map(mapPayment),
    refunds: normalizeArray(raw.refunds).map(mapRefund),
    created_by_user: createdBy ? { id: createdBy.id, full_name: createdBy.full_name } : null,
  }
}

/**
 * Map array of raw invoices to domain types
 */
export function mapInvoicesWithDetails(
  raw: RawInvoiceWithDetails[]
): InvoiceWithDetails[] {
  return raw.map(mapInvoiceWithDetails)
}

/**
 * Type guard for raw invoice data
 */
export function isRawInvoiceWithDetails(
  data: unknown
): data is RawInvoiceWithDetails {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.invoice_number === 'string' &&
    typeof obj.status === 'string'
  )
}
