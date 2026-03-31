/**
 * Invoice & Payment Factory - Builder pattern for financial records
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import { generateId, pick, randomAmount } from './base'
import { PaymentMethod } from './types'
import { TENANT_IDS } from '@/lib/constants/tenants';

interface InvoiceData {
  id: string
  tenant_id: string
  client_id: string
  pet_id: string | null
  appointment_id: string | null
  invoice_number: string
  invoice_date: string
  subtotal: number
  discount_amount: number
  discount_percentage: number
  tax_amount: number
  total: number
  amount_paid: number
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void' | 'refunded'
  due_date: string | null
  notes: string | null
  internal_notes: string | null
}

interface InvoiceItemData {
  id: string
  invoice_id: string
  tenant_id: string
  item_type: 'service' | 'product' | 'discount' | 'custom'
  service_id: string | null
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_amount: number
  tax_rate: number
  total: number
}

interface PaymentData {
  id: string
  tenant_id: string
  invoice_id: string
  amount: number
  payment_method_name: string
  payment_date: string
  reference_number: string | null
  notes: string | null
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded'
  received_by: string | null
}

const SERVICE_ITEMS = [
  { description: 'Consulta general', price: 80000 },
  { description: 'Vacunación', price: 150000 },
  { description: 'Desparasitación', price: 50000 },
  { description: 'Cirugía menor', price: 500000 },
  { description: 'Limpieza dental', price: 300000 },
  { description: 'Análisis de sangre', price: 200000 },
  { description: 'Radiografía', price: 250000 },
  { description: 'Ecografía', price: 350000 },
  { description: 'Hospitalización (día)', price: 150000 },
  { description: 'Control post-operatorio', price: 60000 },
]

const PRODUCT_ITEMS = [
  { description: 'Alimento premium 15kg', price: 450000 },
  { description: 'Antiparasitario oral', price: 85000 },
  { description: 'Collar antipulgas', price: 120000 },
  { description: 'Vitaminas', price: 75000 },
  { description: 'Shampoo medicado', price: 65000 },
]

export class InvoiceFactory {
  private data: Partial<InvoiceData>
  private items: Array<{
    type: 'service' | 'product' | 'custom'
    description: string
    price: number
    quantity: number
  }> = []
  private payments: Array<{ amount: number; method: PaymentMethod }> = []
  private shouldPersist: boolean = true

  private constructor() {
    const id = generateId()
    this.data = {
      id,
      tenant_id: TENANT_IDS.ADRIS,
      invoice_number: `FAC-${Date.now()}-${id.slice(0, 8)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      pet_id: null,
      appointment_id: null,
      discount_amount: 0,
      discount_percentage: 0,
      status: 'draft',
      notes: null,
      internal_notes: null,
    }
  }

  /**
   * Start building an invoice
   */
  static create(): InvoiceFactory {
    return new InvoiceFactory()
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): InvoiceFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set client ID
   */
  forClient(clientId: string): InvoiceFactory {
    this.data.client_id = clientId
    return this
  }

  /**
   * Set pet ID
   */
  forPet(petId: string): InvoiceFactory {
    this.data.pet_id = petId
    return this
  }

  /**
   * Link to appointment
   */
  forAppointment(appointmentId: string): InvoiceFactory {
    this.data.appointment_id = appointmentId
    return this
  }

  /**
   * Add a service item
   */
  addService(description?: string, price?: number, quantity: number = 1): InvoiceFactory {
    const service = pick(SERVICE_ITEMS)
    this.items.push({
      type: 'service',
      description: description || service.description,
      price: price || service.price,
      quantity,
    })
    return this
  }

  /**
   * Add a product item
   */
  addProduct(description?: string, price?: number, quantity: number = 1): InvoiceFactory {
    const product = pick(PRODUCT_ITEMS)
    this.items.push({
      type: 'product',
      description: description || product.description,
      price: price || product.price,
      quantity,
    })
    return this
  }

  /**
   * Add a custom item
   */
  addCustomItem(description: string, price: number, quantity: number = 1): InvoiceFactory {
    this.items.push({
      type: 'custom',
      description,
      price,
      quantity,
    })
    return this
  }

  /**
   * Add random items
   */
  withRandomItems(count: number = 3): InvoiceFactory {
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.4) {
        this.addService()
      } else {
        this.addProduct()
      }
    }
    return this
  }

  /**
   * Apply discount
   */
  withDiscount(amount: number): InvoiceFactory {
    this.data.discount_amount = amount
    return this
  }

  /**
   * Apply percentage discount
   */
  withDiscountPercent(percent: number): InvoiceFactory {
    this.data.discount_percentage = percent
    return this
  }

  /**
   * Add a payment
   */
  addPayment(amount: number, method: PaymentMethod = 'cash'): InvoiceFactory {
    this.payments.push({ amount, method })
    return this
  }

  /**
   * Mark as fully paid
   */
  paid(method: PaymentMethod = 'cash'): InvoiceFactory {
    // We'll add full payment in build
    this.payments = [{ amount: -1, method }] // -1 means "full amount"
    return this
  }

  /**
   * Mark as partial payment
   */
  partialPayment(amount: number, method: PaymentMethod = 'cash'): InvoiceFactory {
    this.payments.push({ amount, method })
    return this
  }

  /**
   * Set due date
   */
  dueOn(date: Date): InvoiceFactory {
    this.data.due_date = date.toISOString().split('T')[0]
    return this
  }

  /**
   * Set as overdue (past due date, not paid)
   */
  overdue(): InvoiceFactory {
    // Set invoice_date to 60 days ago
    const invoiceDate = new Date()
    invoiceDate.setDate(invoiceDate.getDate() - 60)
    this.data.invoice_date = invoiceDate.toISOString().split('T')[0]

    // Set due_date to 30 days after invoice_date (which is 30 days ago - past due)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)
    this.data.due_date = dueDate.toISOString().split('T')[0]
    this.data.status = 'overdue'
    return this
  }

  /**
   * Set as cancelled (void)
   */
  cancelled(): InvoiceFactory {
    this.data.status = 'void'
    return this
  }

  /**
   * Add notes
   */
  withNotes(notes: string): InvoiceFactory {
    this.data.notes = notes
    return this
  }

  /**
   * Set ID explicitly
   */
  withId(id: string): InvoiceFactory {
    this.data.id = id
    return this
  }

  /**
   * Don't persist to database
   */
  inMemoryOnly(): InvoiceFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build invoice data (without persisting)
   */
  buildData(): InvoiceData {
    // Calculate totals
    let subtotal = 0
    for (const item of this.items) {
      subtotal += item.price * item.quantity
    }

    // Calculate discount (fixed amount or percentage)
    let discountAmount = this.data.discount_amount || 0
    const discountPercentage = this.data.discount_percentage || 0
    if (discountPercentage > 0) {
      discountAmount = Math.round((subtotal * discountPercentage) / 100)
    }

    const taxableAmount = subtotal - discountAmount
    const taxAmount = 0 // Tax calculated per line item
    const total = taxableAmount

    // Calculate payments
    let amountPaid = 0
    for (const payment of this.payments) {
      if (payment.amount === -1) {
        amountPaid = total // Full payment
      } else {
        amountPaid += payment.amount
      }
    }

    const balanceDue = total - amountPaid

    // Determine status
    let status: InvoiceData['status'] = this.data.status || 'draft'
    if (status !== 'void') {
      if (balanceDue === 0 && total > 0) {
        status = 'paid'
      } else if (amountPaid > 0 && balanceDue > 0) {
        status = 'partial'
      } else if (
        this.data.due_date &&
        new Date(this.data.due_date) < new Date() &&
        balanceDue > 0
      ) {
        status = 'overdue'
      } else if (this.items.length > 0) {
        status = 'sent'
      }
    }

    // Set due date if not set
    if (!this.data.due_date) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      this.data.due_date = dueDate.toISOString().split('T')[0]
    }

    this.data.subtotal = subtotal
    this.data.discount_amount = discountAmount
    this.data.tax_amount = taxAmount
    this.data.total = total
    this.data.amount_paid = amountPaid
    this.data.status = status

    return this.data as InvoiceData
  }

  /**
   * Build and persist invoice
   */
  async build(): Promise<{
    invoice: InvoiceData
    items: InvoiceItemData[]
    payments: PaymentData[]
  }> {
    const invoiceData = this.buildData()
    const itemRecords: InvoiceItemData[] = []
    const paymentRecords: PaymentData[] = []

    if (!this.shouldPersist) {
      return { invoice: invoiceData, items: itemRecords, payments: paymentRecords }
    }

    if (!invoiceData.client_id) {
      throw new Error('Invoice must have a client_id. Use .forClient(clientId) before building.')
    }

    // Insert invoice (note: balance_due is a GENERATED column, amount_paid is updated by trigger)
    const { error: invoiceError } = await apiClient.dbInsert('invoices', {
      id: invoiceData.id,
      tenant_id: invoiceData.tenant_id,
      client_id: invoiceData.client_id,
      pet_id: invoiceData.pet_id,
      appointment_id: invoiceData.appointment_id,
      invoice_number: invoiceData.invoice_number,
      invoice_date: invoiceData.invoice_date,
      subtotal: invoiceData.subtotal,
      discount_amount: invoiceData.discount_amount,
      discount_percentage: invoiceData.discount_percentage,
      tax_amount: invoiceData.tax_amount,
      total: invoiceData.total,
      status: invoiceData.status,
      due_date: invoiceData.due_date,
      notes: invoiceData.notes,
      internal_notes: invoiceData.internal_notes,
    })

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError}`)
    }

    testContext.track('invoices', invoiceData.id, invoiceData.tenant_id)

    // Insert invoice items (total is calculated by trigger)
    for (const item of this.items) {
      const lineTotal = item.price * item.quantity
      const itemData: InvoiceItemData = {
        id: generateId(),
        invoice_id: invoiceData.id,
        tenant_id: invoiceData.tenant_id,
        item_type: item.type,
        service_id: null,
        product_id: null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
        discount_amount: 0,
        tax_rate: 0,
        total: lineTotal,
      }

      const { error: itemError } = await apiClient.dbInsert('invoice_items', {
        id: itemData.id,
        invoice_id: itemData.invoice_id,
        tenant_id: itemData.tenant_id,
        item_type: itemData.item_type,
        service_id: itemData.service_id,
        product_id: itemData.product_id,
        description: itemData.description,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        discount_amount: itemData.discount_amount,
        tax_rate: itemData.tax_rate,
      })
      if (itemError) {
        console.warn(`Failed to create invoice item: ${itemError}`)
        continue
      }

      testContext.track('invoice_items', itemData.id)
      itemRecords.push(itemData)
    }

    // Insert payments
    for (const payment of this.payments) {
      const paymentAmount = payment.amount === -1 ? invoiceData.total : payment.amount
      const paymentData: PaymentData = {
        id: generateId(),
        tenant_id: invoiceData.tenant_id,
        invoice_id: invoiceData.id,
        amount: paymentAmount,
        payment_method_name: payment.method,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: payment.method === 'transfer' ? `TRF${Date.now()}` : null,
        notes: null,
        status: 'completed',
        received_by: null,
      }

      const { error: paymentError } = await apiClient.dbInsert(
        'payments',
        paymentData as unknown as Record<string, unknown>
      )
      if (paymentError) {
        console.warn(`Failed to create payment: ${paymentError}`)
        continue
      }

      testContext.track('payments', paymentData.id, invoiceData.tenant_id)
      paymentRecords.push(paymentData)
    }

    return { invoice: invoiceData, items: itemRecords, payments: paymentRecords }
  }
}

/**
 * Create invoice history for a client/pet
 */
export async function createInvoiceHistory(
  clientId: string,
  petId: string | null,
  tenantId: string = 'terrapet',
  options: { count?: number; includeUnpaid?: boolean } = {}
): Promise<Array<{ invoice: InvoiceData; items: InvoiceItemData[]; payments: PaymentData[] }>> {
  const { count = 5, includeUnpaid = true } = options
  const results: Array<{
    invoice: InvoiceData
    items: InvoiceItemData[]
    payments: PaymentData[]
  }> = []

  for (let i = 0; i < count; i++) {
    const factory = InvoiceFactory.create()
      .forTenant(tenantId)
      .forClient(clientId)
      .withRandomItems(2 + Math.floor(Math.random() * 3))

    if (petId) {
      factory.forPet(petId)
    }

    // Decide payment status
    const rand = Math.random()
    if (rand < 0.7) {
      // 70% fully paid
      factory.paid(pick(['cash', 'card', 'transfer']))
    } else if (rand < 0.85 && includeUnpaid) {
      // 15% partial
      factory.partialPayment(randomAmount(50000, 200000))
    } else if (includeUnpaid) {
      // 15% overdue
      factory.overdue()
    } else {
      factory.paid()
    }

    const result = await factory.build()
    results.push(result)
  }

  return results
}
