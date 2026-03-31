/**
 * Invoice Calculations
 *
 * Pure functions for invoice form validation, line item calculations,
 * tax calculations, and due date handling.
 */

// Types
export interface LineItem {
  id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
}

export interface LineItemWithTotal extends LineItem {
  line_total: number
}

export interface InvoiceFormData {
  pet_id: string | null
  items: LineItem[]
  notes: string
  due_date: string
  tax_rate: number
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export interface InvoiceTotals {
  subtotal: number
  discountTotal: number
  taxableAmount: number
  taxAmount: number
  total: number
}

export interface Service {
  id: string
  name: string
  base_price: number
  category?: string
}

export interface Pet {
  id: string
  name: string
  species: string
  owner?: {
    id: string
    full_name: string
  }
}

export interface FormState {
  loading: boolean
  error: string | null
  dirty: boolean
  submitted: boolean
}

export interface SubmitButtonState {
  disabled: boolean
  text: string
  showSpinner: boolean
}

export type DueDateStatus = 'overdue' | 'due_soon' | 'normal'

// Form Validation

/**
 * Validates invoice form data
 */
export function validateInvoiceForm(data: InvoiceFormData): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.pet_id) {
    errors.pet_id = 'Debe seleccionar una mascota'
  }

  if (data.items.length === 0) {
    errors.items = 'Debe agregar al menos un artículo'
  }

  const invalidItems = data.items.filter(
    (i) => !i.description || i.unit_price <= 0
  )
  if (invalidItems.length > 0) {
    errors.item_details = 'Todos los artículos deben tener descripción y precio'
  }

  if (!data.due_date) {
    errors.due_date = 'Debe seleccionar una fecha de vencimiento'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// Line Item Calculations

/**
 * Calculate line total: quantity * unit_price * (1 - discount/100)
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  const subtotal = quantity * unitPrice
  const discountAmount = (subtotal * discountPercent) / 100
  return Math.round(subtotal - discountAmount)
}

/**
 * Calculate invoice totals from line items
 */
export function calculateInvoiceTotals(
  items: LineItemWithTotal[],
  taxRate: number
): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price
  }, 0)

  const discountTotal = items.reduce((sum, item) => {
    const lineSubtotal = item.quantity * item.unit_price
    return sum + (lineSubtotal * item.discount_percent) / 100
  }, 0)

  const taxableAmount = subtotal - discountTotal
  const taxAmount = Math.round((taxableAmount * taxRate) / 100)
  const total = taxableAmount + taxAmount

  return {
    subtotal: Math.round(subtotal),
    discountTotal: Math.round(discountTotal),
    taxableAmount: Math.round(taxableAmount),
    taxAmount,
    total: Math.round(total),
  }
}

// Due Date Handling

/**
 * Gets default due date (30 days from now by default)
 */
export function getDefaultDueDate(daysFromNow: number = 30): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

/**
 * Checks if a due date is valid (not in the past)
 */
export function isDueDateValid(dueDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse date parts to avoid timezone issues with Date constructor
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day) // month is 0-indexed
  return due >= today
}

/**
 * Calculates days until due date
 */
export function getDaysUntilDue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse date parts to avoid timezone issues with Date constructor
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day) // month is 0-indexed
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Gets due date status for display
 */
export function getDueDateStatus(dueDate: string): DueDateStatus {
  const daysUntil = getDaysUntilDue(dueDate)

  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'due_soon'
  return 'normal'
}

// Service Conversion

/**
 * Converts a service to a line item
 */
export function serviceToLineItem(service: Service, itemId: string): LineItem {
  return {
    id: itemId,
    service_id: service.id,
    description: service.name,
    quantity: 1,
    unit_price: service.base_price,
    discount_percent: 0,
  }
}

/**
 * Creates an empty custom line item
 */
export function createCustomLineItem(itemId: string): LineItem {
  return {
    id: itemId,
    service_id: null,
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
  }
}

// Invoice Number Generation

/**
 * Generates invoice number in format PREFIX-YYYY-NNNNNN
 */
export function generateInvoiceNumber(
  existingCount: number,
  tenantPrefix: string = 'FAC'
): string {
  const year = new Date().getFullYear()
  const sequence = String(existingCount + 1).padStart(6, '0')
  return `${tenantPrefix}-${year}-${sequence}`
}

// Pet Selector Logic

/**
 * Filters pets by owner ID
 */
export function filterPetsByOwner(pets: Pet[], ownerId: string): Pet[] {
  return pets.filter((p) => p.owner?.id === ownerId)
}

/**
 * Searches pets by name or owner name
 */
export function searchPets(pets: Pet[], query: string): Pet[] {
  const q = query.toLowerCase()
  return pets.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.owner?.full_name.toLowerCase().includes(q)
  )
}

// Form State Management

/**
 * Gets submit button state based on form state
 */
export function getSubmitButtonState(state: FormState): SubmitButtonState {
  if (state.loading) {
    return {
      disabled: true,
      text: 'Guardando...',
      showSpinner: true,
    }
  }

  return {
    disabled: false,
    text: 'Crear factura',
    showSpinner: false,
  }
}

// Error Message Formatting

const INVOICE_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Por favor revise los campos marcados en rojo',
  PET_NOT_FOUND: 'La mascota seleccionada no existe',
  DUPLICATE_INVOICE: 'Ya existe una factura con estos datos',
  SAVE_FAILED: 'Error al guardar la factura. Por favor intente de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Verifique su internet.',
}

/**
 * Formats invoice error for display
 */
export function formatInvoiceError(errorType: string): string {
  return INVOICE_ERROR_MESSAGES[errorType] || 'Error desconocido'
}
