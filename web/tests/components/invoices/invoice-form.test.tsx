/**
 * InvoiceForm Component Tests
 *
 * Tests the invoice creation form including:
 * - Form validation
 * - Line item calculations
 * - Tax calculations
 * - Due date handling
 * - Submit handling
 *
 * @ticket TICKET-UI-002
 */
import { describe, it, expect } from 'vitest'

// Import REAL functions from lib module - this is the key fix!
import {
  validateInvoiceForm,
  calculateLineTotal,
  calculateInvoiceTotals,
  getDefaultDueDate,
  isDueDateValid,
  getDaysUntilDue,
  getDueDateStatus,
  serviceToLineItem,
  createCustomLineItem,
  generateInvoiceNumber,
  filterPetsByOwner,
  searchPets,
  getSubmitButtonState,
  formatInvoiceError,
  type InvoiceFormData,
  type LineItemWithTotal,
  type Service,
  type Pet,
  type FormState,
} from '@/lib/invoices/calculations'

describe('Invoice Form Validation', () => {
  it('should require pet selection', () => {
    const data: InvoiceFormData = {
      pet_id: null,
      items: [{ id: '1', service_id: null, description: 'Test', quantity: 1, unit_price: 50000, discount_percent: 0 }],
      notes: '',
      due_date: '2024-02-15',
      tax_rate: 10,
    }

    const result = validateInvoiceForm(data)
    expect(result.valid).toBe(false)
    expect(result.errors.pet_id).toBeDefined()
  })

  it('should require at least one item', () => {
    const data: InvoiceFormData = {
      pet_id: 'pet-1',
      items: [],
      notes: '',
      due_date: '2024-02-15',
      tax_rate: 10,
    }

    const result = validateInvoiceForm(data)
    expect(result.valid).toBe(false)
    expect(result.errors.items).toBeDefined()
  })

  it('should require description and positive price for items', () => {
    const data: InvoiceFormData = {
      pet_id: 'pet-1',
      items: [
        { id: '1', service_id: null, description: '', quantity: 1, unit_price: 50000, discount_percent: 0 },
      ],
      notes: '',
      due_date: '2024-02-15',
      tax_rate: 10,
    }

    const result = validateInvoiceForm(data)
    expect(result.valid).toBe(false)
    expect(result.errors.item_details).toBeDefined()
  })

  it('should reject zero price items', () => {
    const data: InvoiceFormData = {
      pet_id: 'pet-1',
      items: [
        { id: '1', service_id: null, description: 'Test', quantity: 1, unit_price: 0, discount_percent: 0 },
      ],
      notes: '',
      due_date: '2024-02-15',
      tax_rate: 10,
    }

    const result = validateInvoiceForm(data)
    expect(result.valid).toBe(false)
    expect(result.errors.item_details).toBeDefined()
  })

  it('should accept valid invoice', () => {
    const data: InvoiceFormData = {
      pet_id: 'pet-1',
      items: [
        { id: '1', service_id: 'svc-1', description: 'Consulta', quantity: 1, unit_price: 50000, discount_percent: 0 },
      ],
      notes: 'Notas de prueba',
      due_date: '2024-02-15',
      tax_rate: 10,
    }

    const result = validateInvoiceForm(data)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })
})

describe('Line Item Calculations', () => {
  it('should calculate line total without discount', () => {
    expect(calculateLineTotal(1, 50000, 0)).toBe(50000)
    expect(calculateLineTotal(2, 50000, 0)).toBe(100000)
    expect(calculateLineTotal(3, 25000, 0)).toBe(75000)
  })

  it('should apply percentage discount', () => {
    // 50000 * 10% = 5000 discount
    expect(calculateLineTotal(1, 50000, 10)).toBe(45000)

    // 100000 * 20% = 20000 discount
    expect(calculateLineTotal(2, 50000, 20)).toBe(80000)
  })

  it('should handle 100% discount', () => {
    expect(calculateLineTotal(1, 50000, 100)).toBe(0)
  })

  it('should round to nearest integer (Guarani)', () => {
    // 33333.33... should round to 33333
    expect(calculateLineTotal(1, 100000, 66.6667)).toBe(33333)
  })

  it('should handle fractional quantities', () => {
    expect(calculateLineTotal(1.5, 20000, 0)).toBe(30000)
    expect(calculateLineTotal(0.5, 100000, 0)).toBe(50000)
  })
})

describe('Invoice Totals Calculation', () => {
  it('should calculate totals without discounts', () => {
    const items: LineItemWithTotal[] = [
      { id: '1', service_id: 'svc-1', description: 'Consulta', quantity: 1, unit_price: 50000, discount_percent: 0, line_total: 50000 },
      { id: '2', service_id: 'svc-2', description: 'Vacuna', quantity: 1, unit_price: 80000, discount_percent: 0, line_total: 80000 },
    ]

    const totals = calculateInvoiceTotals(items, 10)

    expect(totals.subtotal).toBe(130000)
    expect(totals.discountTotal).toBe(0)
    expect(totals.taxableAmount).toBe(130000)
    expect(totals.taxAmount).toBe(13000) // 10% tax
    expect(totals.total).toBe(143000)
  })

  it('should calculate totals with discounts', () => {
    const items: LineItemWithTotal[] = [
      { id: '1', service_id: 'svc-1', description: 'Consulta', quantity: 1, unit_price: 100000, discount_percent: 10, line_total: 90000 },
    ]

    const totals = calculateInvoiceTotals(items, 10)

    expect(totals.subtotal).toBe(100000)
    expect(totals.discountTotal).toBe(10000)
    expect(totals.taxableAmount).toBe(90000)
    expect(totals.taxAmount).toBe(9000) // 10% of 90000
    expect(totals.total).toBe(99000)
  })

  it('should handle empty invoice', () => {
    const totals = calculateInvoiceTotals([], 10)

    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)
  })

  it('should handle different tax rates', () => {
    const items: LineItemWithTotal[] = [
      { id: '1', service_id: 'svc-1', description: 'Test', quantity: 1, unit_price: 100000, discount_percent: 0, line_total: 100000 },
    ]

    const totals5 = calculateInvoiceTotals(items, 5)
    expect(totals5.taxAmount).toBe(5000)
    expect(totals5.total).toBe(105000)

    const totals21 = calculateInvoiceTotals(items, 21)
    expect(totals21.taxAmount).toBe(21000)
    expect(totals21.total).toBe(121000)
  })
})

describe('Due Date Handling', () => {
  it('should generate default due date 30 days from now', () => {
    const defaultDate = getDefaultDueDate()
    const expected = new Date()
    expected.setDate(expected.getDate() + 30)

    expect(defaultDate).toBe(expected.toISOString().split('T')[0])
  })

  it('should validate future due dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15)

    expect(isDueDateValid(futureDate.toISOString().split('T')[0])).toBe(true)
  })

  it('should validate today as valid due date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(isDueDateValid(today)).toBe(true)
  })

  it('should reject past due dates', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    expect(isDueDateValid(pastDate.toISOString().split('T')[0])).toBe(false)
  })

  it('should calculate days until due', () => {
    const inTenDays = new Date()
    inTenDays.setDate(inTenDays.getDate() + 10)

    expect(getDaysUntilDue(inTenDays.toISOString().split('T')[0])).toBe(10)
  })

  it('should identify overdue invoices', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    expect(getDueDateStatus(pastDate.toISOString().split('T')[0])).toBe('overdue')
  })

  it('should identify due soon invoices', () => {
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 3)

    expect(getDueDateStatus(soonDate.toISOString().split('T')[0])).toBe('due_soon')
  })

  it('should identify normal due dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 20)

    expect(getDueDateStatus(futureDate.toISOString().split('T')[0])).toBe('normal')
  })
})

describe('Service to Line Item Conversion', () => {
  it('should convert service to line item', () => {
    const service: Service = {
      id: 'svc-1',
      name: 'Consulta General',
      base_price: 50000,
      category: 'clinical',
    }

    const item = serviceToLineItem(service, 'item-1')

    expect(item.service_id).toBe('svc-1')
    expect(item.description).toBe('Consulta General')
    expect(item.unit_price).toBe(50000)
    expect(item.quantity).toBe(1)
    expect(item.discount_percent).toBe(0)
  })

  it('should create empty custom line item', () => {
    const item = createCustomLineItem('item-2')

    expect(item.service_id).toBeNull()
    expect(item.description).toBe('')
    expect(item.unit_price).toBe(0)
    expect(item.quantity).toBe(1)
  })
})

describe('Invoice Number Generation', () => {
  it('should generate invoice number with correct format', () => {
    const year = new Date().getFullYear()
    const invoiceNum = generateInvoiceNumber(0)

    expect(invoiceNum).toBe(`FAC-${year}-000001`)
  })

  it('should increment sequence correctly', () => {
    const year = new Date().getFullYear()

    expect(generateInvoiceNumber(0)).toBe(`FAC-${year}-000001`)
    expect(generateInvoiceNumber(1)).toBe(`FAC-${year}-000002`)
    expect(generateInvoiceNumber(99)).toBe(`FAC-${year}-000100`)
    expect(generateInvoiceNumber(999999)).toBe(`FAC-${year}-1000000`)
  })

  it('should support custom tenant prefix', () => {
    const year = new Date().getFullYear()

    expect(generateInvoiceNumber(0, 'ADR')).toBe(`ADR-${year}-000001`)
    expect(generateInvoiceNumber(0, 'PL')).toBe(`PL-${year}-000001`)
  })
})

describe('Pet Selector Logic', () => {
  const samplePets: Pet[] = [
    { id: '1', name: 'Max', species: 'dog', owner: { id: 'o1', full_name: 'Juan García' } },
    { id: '2', name: 'Luna', species: 'cat', owner: { id: 'o1', full_name: 'Juan García' } },
    { id: '3', name: 'Rocky', species: 'dog', owner: { id: 'o2', full_name: 'María López' } },
  ]

  it('should filter pets by owner', () => {
    const juanPets = filterPetsByOwner(samplePets, 'o1')
    expect(juanPets).toHaveLength(2)
    expect(juanPets.map((p) => p.name)).toEqual(['Max', 'Luna'])
  })

  it('should search pets by name', () => {
    const results = searchPets(samplePets, 'max')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Max')
  })

  it('should search pets by owner name', () => {
    const results = searchPets(samplePets, 'juan')
    expect(results).toHaveLength(2) // Max and Luna
  })

  it('should return empty for no matches', () => {
    const results = searchPets(samplePets, 'xyz')
    expect(results).toHaveLength(0)
  })
})

describe('Form State Management', () => {
  it('should show loading state', () => {
    const state: FormState = { loading: true, error: null, dirty: true, submitted: false }
    const buttonState = getSubmitButtonState(state)

    expect(buttonState.disabled).toBe(true)
    expect(buttonState.text).toBe('Guardando...')
    expect(buttonState.showSpinner).toBe(true)
  })

  it('should show normal state when not loading', () => {
    const state: FormState = { loading: false, error: null, dirty: true, submitted: false }
    const buttonState = getSubmitButtonState(state)

    expect(buttonState.disabled).toBe(false)
    expect(buttonState.text).toBe('Crear factura')
    expect(buttonState.showSpinner).toBe(false)
  })
})

describe('Error Message Formatting', () => {
  it('should format validation error', () => {
    expect(formatInvoiceError('VALIDATION_ERROR')).toContain('campos marcados')
  })

  it('should format network error', () => {
    expect(formatInvoiceError('NETWORK_ERROR')).toContain('conexión')
  })

  it('should provide generic message for unknown errors', () => {
    expect(formatInvoiceError('UNKNOWN')).toBe('Error desconocido')
  })
})
