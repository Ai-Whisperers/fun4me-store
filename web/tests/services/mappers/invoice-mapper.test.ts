/**
 * Invoice Mapper Tests
 *
 * Tests type-safe conversion from Supabase query results to domain types:
 * - Raw invoice data mapping with complex relations
 * - Invoice items, payments, and refunds mapping
 * - Relation normalization and array handling
 * - Type guards and validation
 */

import { describe, it, expect } from 'vitest'
import {
  mapInvoiceWithDetails,
  mapInvoicesWithDetails,
  isRawInvoiceWithDetails,
  type RawInvoiceWithDetails,
} from '@/lib/services/mappers/invoice-mapper'
import type { InvoiceWithDetails } from '@/lib/types/entities/invoice'

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createRawOwner() {
  return {
    id: 'owner-john-456',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  }
}

function createRawPet() {
  return {
    id: 'pet-max-123',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    photo_url: 'https://example.com/max.jpg',
    owner: createRawOwner(),
  }
}

function createRawService() {
  return {
    id: 'service-checkup-789',
    name: 'Consulta General',
    category: 'consultation',
  }
}

function createRawProduct() {
  return {
    id: 'product-med-456',
    name: 'Antibiótico Canino',
    sku: 'MED-ANT-001',
  }
}

function createRawInvoiceItem() {
  return {
    id: 'item-123',
    service_id: 'service-checkup-789',
    product_id: null,
    description: 'Consulta veterinaria general',
    quantity: 1,
    unit_price: 50.0,
    discount_percent: 0,
    line_total: 50.0,
    services: createRawService(),
    products: null,
  }
}

function createRawProductItem() {
  return {
    id: 'item-456',
    service_id: null,
    product_id: 'product-med-456',
    description: 'Antibiótico para infección',
    quantity: 2,
    unit_price: 25.0,
    discount_percent: 10,
    line_total: 45.0,
    services: null,
    products: createRawProduct(),
  }
}

function createRawPayment() {
  return {
    id: 'payment-789',
    amount: 95.0,
    payment_method: 'credit_card',
    reference_number: 'REF-CC-123456',
    paid_at: '2024-01-15T14:30:00Z',
  }
}

function createRawRefund() {
  return {
    id: 'refund-012',
    amount: 20.0,
    reason: 'Servicio no prestado',
    refunded_at: '2024-01-16T10:00:00Z',
  }
}

function createRawCreatedBy() {
  return {
    id: 'user-admin-789',
    full_name: 'Dr. Admin González',
  }
}

function createRawInvoiceWithDetails(
  overrides: Partial<RawInvoiceWithDetails> = {}
): RawInvoiceWithDetails {
  return {
    id: 'invoice-123-456',
    tenant_id: 'clinic-vet-centro',
    client_id: 'client-john-789',
    pet_id: 'pet-max-123',
    owner_id: 'owner-john-456',
    invoice_number: 'INV-2024-001',
    appointment_id: 'appointment-123',
    medical_record_id: 'record-456',
    hospitalization_id: null,
    subtotal: 75.0,
    discount_amount: 5.0,
    discount_reason: 'Cliente frecuente',
    tax_rate: 0.21,
    tax_amount: 14.7,
    total_amount: 84.7,
    total: 84.7,
    amount_paid: 84.7,
    balance_due: 0.0,
    status: 'paid',
    due_date: '2024-01-22T00:00:00Z',
    paid_at: '2024-01-15T14:30:00Z',
    sent_at: '2024-01-15T10:00:00Z',
    voided_at: null,
    voided_by: null,
    notes: 'Factura pagada en su totalidad',
    internal_notes: 'Cliente preferencial',
    created_by: 'user-admin-789',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
    pets: createRawPet(),
    invoice_items: [createRawInvoiceItem(), createRawProductItem()],
    payments: [createRawPayment()],
    refunds: [],
    created_by_user: createRawCreatedBy(),
    ...overrides,
  }
}

// =============================================================================
// MAPPING TESTS
// =============================================================================

describe('mapInvoiceWithDetails', () => {
  it('should map complete invoice with all relations', () => {
    const raw = createRawInvoiceWithDetails()

    const result = mapInvoiceWithDetails(raw)

    expect(result).toEqual({
      id: 'invoice-123-456',
      tenant_id: 'clinic-vet-centro',
      client_id: 'client-john-789',
      pet_id: 'pet-max-123',
      invoice_number: 'INV-2024-001',
      appointment_id: 'appointment-123',
      medical_record_id: 'record-456',
      hospitalization_id: null,
      subtotal: 75.0,
      discount_amount: 5.0,
      discount_reason: 'Cliente frecuente',
      tax_rate: 0.21,
      tax_amount: 14.7,
      total_amount: 84.7,
      amount_paid: 84.7,
      balance_due: 0.0,
      status: 'paid',
      due_date: '2024-01-22T00:00:00Z',
      paid_at: '2024-01-15T14:30:00Z',
      sent_at: '2024-01-15T10:00:00Z',
      voided_at: null,
      voided_by: null,
      notes: 'Factura pagada en su totalidad',
      internal_notes: 'Cliente preferencial',
      created_by: 'user-admin-789',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      deleted_at: undefined,
      pet: {
        id: 'pet-max-123',
        name: 'Max',
        species: 'dog',
        breed: 'Labrador',
        photo_url: 'https://example.com/max.jpg',
        owner: {
          id: 'owner-john-456',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      },
      items: [
        {
          id: 'item-123',
          invoice_id: '',
          service_id: 'service-checkup-789',
          product_id: null,
          description: 'Consulta veterinaria general',
          quantity: 1,
          unit_price: 50.0,
          discount_percent: 0,
          tax_rate: 0,
          total_price: 50.0,
          notes: null,
          created_at: '',
          services: {
            id: 'service-checkup-789',
            name: 'Consulta General',
            category: 'consultation',
          },
          products: null,
        },
        {
          id: 'item-456',
          invoice_id: '',
          service_id: null,
          product_id: 'product-med-456',
          description: 'Antibiótico para infección',
          quantity: 2,
          unit_price: 25.0,
          discount_percent: 10,
          tax_rate: 0,
          total_price: 45.0,
          notes: null,
          created_at: '',
          services: null,
          products: {
            id: 'product-med-456',
            name: 'Antibiótico Canino',
            sku: 'MED-ANT-001',
          },
        },
      ],
      payments: [
        {
          id: 'payment-789',
          tenant_id: '',
          invoice_id: '',
          amount: 95.0,
          payment_method: 'credit_card',
          payment_reference: 'REF-CC-123456',
          status: 'completed',
          paid_at: '2024-01-15T14:30:00Z',
          processed_by: null,
          notes: null,
          created_at: '2024-01-15T14:30:00Z',
        },
      ],
      refunds: [],
      created_by_user: {
        id: 'user-admin-789',
        full_name: 'Dr. Admin González',
      },
    } satisfies InvoiceWithDetails)
  })

  it('should handle null optional relations', () => {
    const raw = createRawInvoiceWithDetails({
      pet_id: null,
      appointment_id: null,
      medical_record_id: null,
      pets: null,
      invoice_items: null,
      payments: null,
      refunds: null,
      created_by_user: null,
      notes: null,
      internal_notes: null,
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.pet_id).toBe(null)
    expect(result.appointment_id).toBe(null)
    expect(result.medical_record_id).toBe(null)
    expect(result.pet).toBe(null)
    expect(result.items).toEqual([])
    expect(result.payments).toEqual([])
    expect(result.refunds).toEqual([])
    expect(result.created_by_user).toBe(null)
    expect(result.notes).toBe(null)
    expect(result.internal_notes).toBe(null)
  })

  it('should handle total vs total_amount field differences', () => {
    const rawWithTotalField = createRawInvoiceWithDetails({
      total_amount: undefined as any,
      total: 150.0,
    })

    const result = mapInvoiceWithDetails(rawWithTotalField)

    expect(result.total_amount).toBe(150.0)
  })

  it('should handle voided invoices', () => {
    const raw = createRawInvoiceWithDetails({
      status: 'voided',
      voided_at: '2024-01-16T15:00:00Z',
      voided_by: 'user-admin-123',
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.status).toBe('voided')
    expect(result.voided_at).toBe('2024-01-16T15:00:00Z')
    expect(result.voided_by).toBe('user-admin-123')
  })

  it('should handle deleted invoices', () => {
    const raw = createRawInvoiceWithDetails({
      deleted_at: '2024-01-17T10:00:00Z',
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.deleted_at).toBe('2024-01-17T10:00:00Z')
  })
})

// =============================================================================
// COMPLEX RELATIONS TESTS
// =============================================================================

describe('complex relations mapping', () => {
  it('should handle invoice items with null services/products', () => {
    const rawItemWithNulls = {
      id: 'item-custom-999',
      service_id: null,
      product_id: null,
      description: 'Cargo personalizado',
      quantity: 1,
      unit_price: 100.0,
      discount_percent: 0,
      line_total: 100.0,
      services: null,
      products: null,
    }

    const raw = createRawInvoiceWithDetails({
      invoice_items: [rawItemWithNulls],
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.items[0]).toEqual({
      id: 'item-custom-999',
      invoice_id: '',
      service_id: null,
      product_id: null,
      description: 'Cargo personalizado',
      quantity: 1,
      unit_price: 100.0,
      discount_percent: 0,
      tax_rate: 0,
      total_price: 100.0,
      notes: null,
      created_at: '',
      services: null,
      products: null,
    })
  })

  it('should handle products with null SKU', () => {
    const rawProductNoSku = {
      ...createRawProduct(),
      sku: null,
    }

    const rawItemWithProductNoSku = {
      ...createRawProductItem(),
      products: rawProductNoSku,
    }

    const raw = createRawInvoiceWithDetails({
      invoice_items: [rawItemWithProductNoSku],
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.items[0].products?.sku).toBe(undefined)
  })

  it('should handle services with null category', () => {
    const rawServiceNoCategory = {
      ...createRawService(),
      category: null,
    }

    const rawItemWithServiceNoCategory = {
      ...createRawInvoiceItem(),
      services: rawServiceNoCategory,
    }

    const raw = createRawInvoiceWithDetails({
      invoice_items: [rawItemWithServiceNoCategory],
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.items[0].services?.category).toBe(undefined)
  })

  it('should handle payments with null reference numbers', () => {
    const rawPaymentNoRef = {
      ...createRawPayment(),
      reference_number: null,
    }

    const raw = createRawInvoiceWithDetails({
      payments: [rawPaymentNoRef],
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.payments[0].payment_reference).toBe(null)
  })

  it('should handle refunds with null refunded_at', () => {
    const rawRefundPending = {
      ...createRawRefund(),
      refunded_at: null,
    }

    const raw = createRawInvoiceWithDetails({
      refunds: [rawRefundPending],
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.refunds[0].refunded_at).toBe(null)
  })
})

// =============================================================================
// RELATION NORMALIZATION TESTS
// =============================================================================

describe('relation normalization', () => {
  it('should normalize array relations by taking first element', () => {
    const rawWithArrays = createRawInvoiceWithDetails({
      pets: [createRawPet(), createRawPet()],
      created_by_user: [createRawCreatedBy(), createRawCreatedBy()],
    } as any)

    const result = mapInvoiceWithDetails(rawWithArrays)

    expect(result.pet).toEqual(
      expect.objectContaining({
        id: 'pet-max-123',
        name: 'Max',
      })
    )
    expect(result.created_by_user).toEqual(
      expect.objectContaining({
        id: 'user-admin-789',
        full_name: 'Dr. Admin González',
      })
    )
  })

  it('should handle empty arrays as null', () => {
    const rawWithEmptyArrays = createRawInvoiceWithDetails({
      pets: [],
      created_by_user: [],
    } as any)

    const result = mapInvoiceWithDetails(rawWithEmptyArrays)

    expect(result.pet).toBe(null)
    expect(result.created_by_user).toBe(null)
  })

  it('should normalize nested owner in pet relation', () => {
    const petWithOwnerArray = {
      ...createRawPet(),
      owner: [createRawOwner(), createRawOwner()],
    }

    const raw = createRawInvoiceWithDetails({
      pets: petWithOwnerArray as any,
    })

    const result = mapInvoiceWithDetails(raw)

    expect(result.pet?.owner).toEqual({
      id: 'owner-john-456',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    })
  })
})

// =============================================================================
// ARRAY MAPPING TESTS
// =============================================================================

describe('mapInvoicesWithDetails', () => {
  it('should map array of invoices', () => {
    const rawInvoices = [
      createRawInvoiceWithDetails({
        id: 'invoice-1',
        invoice_number: 'INV-2024-001',
      }),
      createRawInvoiceWithDetails({
        id: 'invoice-2',
        invoice_number: 'INV-2024-002',
      }),
    ]

    const result = mapInvoicesWithDetails(rawInvoices)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('invoice-1')
    expect(result[1].id).toBe('invoice-2')
    expect(result[0].invoice_number).toBe('INV-2024-001')
    expect(result[1].invoice_number).toBe('INV-2024-002')
  })

  it('should handle empty array', () => {
    const result = mapInvoicesWithDetails([])

    expect(result).toEqual([])
  })
})

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('isRawInvoiceWithDetails', () => {
  it('should return true for valid raw invoice data', () => {
    const raw = createRawInvoiceWithDetails()

    expect(isRawInvoiceWithDetails(raw)).toBe(true)
  })

  it('should return false for null/undefined', () => {
    expect(isRawInvoiceWithDetails(null)).toBe(false)
    expect(isRawInvoiceWithDetails(undefined)).toBe(false)
  })

  it('should return false for non-objects', () => {
    expect(isRawInvoiceWithDetails('string')).toBe(false)
    expect(isRawInvoiceWithDetails(123)).toBe(false)
    expect(isRawInvoiceWithDetails([])).toBe(false)
  })

  it('should return false for incomplete objects', () => {
    expect(
      isRawInvoiceWithDetails({
        id: 'invoice-123',
        // Missing required fields
      })
    ).toBe(false)

    expect(
      isRawInvoiceWithDetails({
        id: 'invoice-123',
        tenant_id: 'clinic-123',
        invoice_number: 'INV-001',
        // Missing status
      })
    ).toBe(false)
  })

  it('should return false for objects with wrong field types', () => {
    expect(
      isRawInvoiceWithDetails({
        id: 123, // Should be string
        tenant_id: 'clinic-123',
        invoice_number: 'INV-001',
        status: 'draft',
      })
    ).toBe(false)
  })

  it('should return true even with optional fields missing', () => {
    expect(
      isRawInvoiceWithDetails({
        id: 'invoice-123',
        tenant_id: 'clinic-123',
        invoice_number: 'INV-001',
        status: 'draft',
        // Optional fields can be missing
      })
    ).toBe(true)
  })
})