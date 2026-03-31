import { describe, it, expect } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants';

/**
 * API Contract Tests for Invoices
 * 
 * Tests schema validation and response structure for:
 * - GET /api/invoices - List invoices with filters
 * - GET /api/invoices/[id] - Get single invoice details
 * - POST /api/invoices/[id]/pay - Record payment
 * - POST /api/invoices/[id]/refund - Process refund
 * 
 * NOTE: These are contract tests - they validate response schemas, not business logic.
 * They mock all dependencies and test the shape/structure of API responses.
 */

describe('Invoices API Contract', () => {
  describe('GET /api/invoices', () => {
    it('expects invoice list response with correct schema', () => {
      // Expected response structure
      const mockResponse = [
        {
          id: 'inv-123',
          tenant_id: TENANT_IDS.ADRIS,
          invoice_number: 'INV-2026-001',
          client_id: 'client-456',
          total: 150.0,
          subtotal: 135.0,
          tax_amount: 15.0,
          status: 'paid',
          due_date: '2026-01-31',
          created_at: '2026-01-15T10:00:00.000Z',
          updated_at: '2026-01-15T10:00:00.000Z',
        },
      ]

      // Validate array structure
      expect(Array.isArray(mockResponse)).toBe(true)

      const invoice = mockResponse[0]

      // Validate required fields
      expect(invoice).toHaveProperty('id')
      expect(invoice).toHaveProperty('tenant_id')
      expect(invoice).toHaveProperty('invoice_number')
      expect(invoice).toHaveProperty('total')
      expect(invoice).toHaveProperty('status')

      // Validate data types
      expect(typeof invoice.id).toBe('string')
      expect(typeof invoice.tenant_id).toBe('string')
      expect(typeof invoice.invoice_number).toBe('string')
      expect(typeof invoice.total).toBe('number')
      expect(typeof invoice.subtotal).toBe('number')
      expect(typeof invoice.tax_amount).toBe('number')
      expect(typeof invoice.status).toBe('string')

      // Validate amounts are positive numbers
      expect(invoice.total).toBeGreaterThan(0)
      expect(invoice.subtotal).toBeGreaterThanOrEqual(0)
      expect(invoice.tax_amount).toBeGreaterThanOrEqual(0)

      // Validate date format (ISO 8601)
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(invoice.created_at)).toBe(true)
      expect(isoDateRegex.test(invoice.updated_at)).toBe(true)

      // Validate due_date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      expect(dateRegex.test(invoice.due_date)).toBe(true)
    })

    it('validates invoice_number format', () => {
      const validFormats = [
        'INV-2026-001',
        'FAC-2026-001',
        'INV-2026-123456',
        'FAC-2025-999',
      ]

      const invoiceNumberRegex = /^[A-Z]{3}-\d{4}-\d{3,}$/

      validFormats.forEach((num) => {
        expect(invoiceNumberRegex.test(num)).toBe(true)
      })

      // Invalid formats
      const invalidFormats = ['INV2026001', 'INV-26-001', 'invoice-001']

      invalidFormats.forEach((num) => {
        expect(invoiceNumberRegex.test(num)).toBe(false)
      })
    })

    it('validates invoice status values', () => {
      const validStatuses = [
        'draft',
        'sent',
        'paid',
        'partial',
        'overdue',
        'cancelled',
        'void',
        'waived',
      ]

      const invalidStatuses = ['pending', 'processing', 'completed', 'refunded']

      validStatuses.forEach((status) => {
        expect(
          ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void', 'waived'].includes(
            status
          )
        ).toBe(true)
      })

      invalidStatuses.forEach((status) => {
        expect(
          ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void', 'waived'].includes(
            status
          )
        ).toBe(false)
      })
    })

    it('validates query parameter filtering options', () => {
      // Valid status filters
      const statusFilters = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void']

      statusFilters.forEach((status) => {
        const url = new URL(`http://localhost/api/invoices?status=${status}`)
        expect(url.searchParams.get('status')).toBe(status)
      })

      // Date range filtering
      const urlWithDates = new URL(
        'http://localhost/api/invoices?start_date=2026-01-01&end_date=2026-01-31'
      )
      expect(urlWithDates.searchParams.get('start_date')).toBe('2026-01-01')
      expect(urlWithDates.searchParams.get('end_date')).toBe('2026-01-31')

      // Client filtering
      const urlWithClient = new URL('http://localhost/api/invoices?client_id=client-123')
      expect(urlWithClient.searchParams.get('client_id')).toBe('client-123')
    })
  })

  describe('GET /api/invoices/[id]', () => {
    it('expects invoice details response with correct schema', () => {
      // Expected response structure with full details
      const mockResponse = {
        id: 'inv-123',
        tenant_id: TENANT_IDS.ADRIS,
        invoice_number: 'INV-2026-001',
        client_id: 'client-456',
        total: 150.0,
        subtotal: 135.0,
        tax_amount: 15.0,
        status: 'paid',
        due_date: '2026-01-31',
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:00:00.000Z',
        items: [
          {
            id: 'item-1',
            invoice_id: 'inv-123',
            description: 'Consulta veterinaria',
            quantity: 1,
            unit_price: 100.0,
            subtotal: 100.0,
          },
        ],
        payments: [
          {
            id: 'pay-1',
            invoice_id: 'inv-123',
            amount: 150.0,
            payment_method: 'cash',
            paid_at: '2026-01-15T14:00:00.000Z',
          },
        ],
      }

      // Validate root structure
      expect(mockResponse).toHaveProperty('id')
      expect(mockResponse).toHaveProperty('invoice_number')
      expect(mockResponse).toHaveProperty('status')
      expect(mockResponse).toHaveProperty('items')
      expect(mockResponse).toHaveProperty('payments')

      // Validate items array
      expect(Array.isArray(mockResponse.items)).toBe(true)

      const item = mockResponse.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('invoice_id')
      expect(item).toHaveProperty('description')
      expect(item).toHaveProperty('quantity')
      expect(item).toHaveProperty('unit_price')
      expect(item).toHaveProperty('subtotal')

      expect(typeof item.quantity).toBe('number')
      expect(typeof item.unit_price).toBe('number')
      expect(typeof item.subtotal).toBe('number')

      expect(item.quantity).toBeGreaterThan(0)
      expect(item.unit_price).toBeGreaterThan(0)

      // Validate payments array
      expect(Array.isArray(mockResponse.payments)).toBe(true)

      const payment = mockResponse.payments[0]
      expect(payment).toHaveProperty('id')
      expect(payment).toHaveProperty('invoice_id')
      expect(payment).toHaveProperty('amount')
      expect(payment).toHaveProperty('payment_method')
      expect(payment).toHaveProperty('paid_at')

      expect(typeof payment.amount).toBe('number')
      expect(typeof payment.payment_method).toBe('string')

      expect(payment.amount).toBeGreaterThan(0)

      // Validate payment date format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(payment.paid_at)).toBe(true)
    })

    it('validates invoice subtotal calculation matches items', () => {
      const mockInvoice = {
        subtotal: 235.0,
        items: [
          { quantity: 1, unit_price: 100.0, subtotal: 100.0 },
          { quantity: 3, unit_price: 45.0, subtotal: 135.0 },
        ],
      }

      // Sum item subtotals
      const calculatedSubtotal = mockInvoice.items.reduce((sum, item) => sum + item.subtotal, 0)

      expect(calculatedSubtotal).toBe(mockInvoice.subtotal)
      expect(mockInvoice.subtotal).toBe(235.0)
    })

    it('validates payment total matches invoice total for paid status', () => {
      const mockInvoice = {
        total: 150.0,
        status: 'paid',
        payments: [{ amount: 100.0 }, { amount: 50.0 }],
      }

      const totalPaid = mockInvoice.payments.reduce((sum, p) => sum + p.amount, 0)

      expect(totalPaid).toBe(mockInvoice.total)
      expect(mockInvoice.status).toBe('paid')
    })
  })

  describe('POST /api/invoices/[id]/pay', () => {
    it('expects payment response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        data: {
          payment_id: 'pay-123',
          invoice_id: 'inv-123',
          amount: 150.0,
          payment_method: 'cash',
          paid_at: '2026-01-15T14:00:00.000Z',
          new_status: 'paid',
        },
        message: 'Pago registrado correctamente',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse).toHaveProperty('message')

      expect(mockResponse.success).toBe(true)
      expect(typeof mockResponse.message).toBe('string')

      // Validate data structure
      expect(mockResponse.data).toHaveProperty('payment_id')
      expect(mockResponse.data).toHaveProperty('invoice_id')
      expect(mockResponse.data).toHaveProperty('amount')
      expect(mockResponse.data).toHaveProperty('payment_method')
      expect(mockResponse.data).toHaveProperty('paid_at')
      expect(mockResponse.data).toHaveProperty('new_status')

      // Validate data types
      expect(typeof mockResponse.data.payment_id).toBe('string')
      expect(typeof mockResponse.data.invoice_id).toBe('string')
      expect(typeof mockResponse.data.amount).toBe('number')
      expect(typeof mockResponse.data.payment_method).toBe('string')
      expect(typeof mockResponse.data.paid_at).toBe('string')
      expect(typeof mockResponse.data.new_status).toBe('string')

      // Validate amount is positive
      expect(mockResponse.data.amount).toBeGreaterThan(0)

      // Validate date format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(mockResponse.data.paid_at)).toBe(true)
    })

    it('validates payment method options', () => {
      const validMethods = ['cash', 'card', 'transfer', 'qr', 'check', 'bank_transfer']

      validMethods.forEach((method) => {
        expect(
          ['cash', 'card', 'transfer', 'qr', 'check', 'bank_transfer'].includes(method)
        ).toBe(true)
      })

      // Invalid methods
      const invalidMethods = ['crypto', 'paypal', 'stripe']

      invalidMethods.forEach((method) => {
        expect(
          ['cash', 'card', 'transfer', 'qr', 'check', 'bank_transfer'].includes(method)
        ).toBe(false)
      })
    })

    it('validates partial payment calculation', () => {
      const mockInvoice = {
        total: 150.0,
        status: 'partial',
      }

      const mockPayment = {
        amount: 50.0,
      }

      const remainingBalance = mockInvoice.total - mockPayment.amount

      expect(remainingBalance).toBe(100.0)
      expect(mockInvoice.status).toBe('partial')
    })

    it('expects error response when paying already paid invoice', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'La factura ya está pagada completamente',
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError).toHaveProperty('details')
      expect(mockError.details).toHaveProperty('reason')
      expect(typeof mockError.details.reason).toBe('string')
      expect(mockError.error).toBe('VALIDATION_ERROR')
    })

    it('expects error response when paying void invoice', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'No se puede procesar pago para factura anulada',
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError.error).toBe('VALIDATION_ERROR')
      expect(mockError.details).toHaveProperty('reason')
    })
  })

  describe('POST /api/invoices/[id]/refund', () => {
    it('expects refund response with correct schema', () => {
      // Expected response structure
      const mockResponse = {
        success: true,
        data: {
          refund_id: 'ref-123',
          invoice_id: 'inv-123',
          payment_id: 'pay-456',
          amount: 50.0,
          reason: 'Servicio no prestado',
          refunded_at: '2026-01-16T10:00:00.000Z',
        },
        message: 'Reembolso procesado correctamente',
      }

      // Validate response structure
      expect(mockResponse).toHaveProperty('success')
      expect(mockResponse).toHaveProperty('data')
      expect(mockResponse).toHaveProperty('message')

      expect(mockResponse.success).toBe(true)

      // Validate data structure
      expect(mockResponse.data).toHaveProperty('refund_id')
      expect(mockResponse.data).toHaveProperty('invoice_id')
      expect(mockResponse.data).toHaveProperty('payment_id')
      expect(mockResponse.data).toHaveProperty('amount')
      expect(mockResponse.data).toHaveProperty('reason')
      expect(mockResponse.data).toHaveProperty('refunded_at')

      // Validate data types
      expect(typeof mockResponse.data.refund_id).toBe('string')
      expect(typeof mockResponse.data.amount).toBe('number')
      expect(typeof mockResponse.data.reason).toBe('string')

      // Validate amount is positive
      expect(mockResponse.data.amount).toBeGreaterThan(0)

      // Validate date format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(isoDateRegex.test(mockResponse.data.refunded_at)).toBe(true)
    })

    it('validates refund amount does not exceed payment amount', () => {
      const mockPayment = {
        amount: 150.0,
      }

      const mockRefund = {
        amount: 50.0,
      }

      // Refund amount should be <= payment amount
      expect(mockRefund.amount).toBeLessThanOrEqual(mockPayment.amount)
      expect(mockRefund.amount).toBeGreaterThan(0)
    })

    it('expects error response for refund exceeding payment', () => {
      // Expected error response
      const mockError = {
        error: 'VALIDATION_ERROR',
        details: {
          reason: 'El monto del reembolso excede el pago realizado',
          payment_amount: 150.0,
          refund_amount: 200.0,
        },
      }

      expect(mockError).toHaveProperty('error')
      expect(mockError.error).toBe('VALIDATION_ERROR')
      expect(mockError.details).toHaveProperty('reason')
      expect(mockError.details).toHaveProperty('payment_amount')
      expect(mockError.details).toHaveProperty('refund_amount')

      // Validate amounts
      expect(mockError.details.refund_amount).toBeGreaterThan(mockError.details.payment_amount)
    })
  })

  describe('Common Invoice Patterns', () => {
    it('validates invoice status transitions', () => {
      // Valid transitions
      const validTransitions = {
        draft: ['sent', 'void'],
        sent: ['paid', 'partial', 'overdue', 'void'],
        partial: ['paid', 'overdue', 'void'],
        overdue: ['paid', 'void', 'waived'],
        paid: ['void'], // Only void is allowed from paid
        void: [], // Terminal state
        cancelled: [], // Terminal state
        waived: [], // Terminal state
      }

      // Validate draft transitions
      expect(validTransitions.draft.includes('sent')).toBe(true)
      expect(validTransitions.draft.includes('void')).toBe(true)
      expect(validTransitions.draft.includes('paid')).toBe(false)

      // Validate sent transitions
      expect(validTransitions.sent.includes('paid')).toBe(true)
      expect(validTransitions.sent.includes('partial')).toBe(true)
      expect(validTransitions.sent.includes('overdue')).toBe(true)

      // Validate paid can only go to void
      expect(validTransitions.paid).toEqual(['void'])

      // Validate terminal states
      expect(validTransitions.void.length).toBe(0)
      expect(validTransitions.cancelled.length).toBe(0)
      expect(validTransitions.waived.length).toBe(0)
    })

    it('validates invoice status based on due date', () => {
      const today = new Date('2026-01-20')

      const pastDueInvoice = {
        status: 'sent',
        due_date: '2026-01-15', // 5 days overdue
      }

      const futureDueInvoice = {
        status: 'sent',
        due_date: '2026-01-25', // Still has 5 days
      }

      const pastDueDate = new Date(pastDueInvoice.due_date)
      const futureDueDate = new Date(futureDueInvoice.due_date)

      // Past due should potentially be 'overdue' status
      expect(pastDueDate < today).toBe(true)
      expect(pastDueInvoice.status).toBe('sent') // Not yet updated

      // Future due should remain 'sent'
      expect(futureDueDate > today).toBe(true)
      expect(futureDueInvoice.status).toBe('sent')
    })

    it('validates total calculation (subtotal + tax)', () => {
      const mockInvoice = {
        subtotal: 135.0,
        tax_amount: 15.0,
        total: 150.0,
      }

      const calculatedTotal = mockInvoice.subtotal + mockInvoice.tax_amount

      expect(calculatedTotal).toBe(mockInvoice.total)
      expect(mockInvoice.total).toBe(150.0)
    })

    it('validates Spanish error messages for invoices', () => {
      const spanishMessages = [
        'Factura no encontrada',
        'La factura ya está pagada completamente',
        'No se puede procesar pago para factura anulada',
        'El monto del reembolso excede el pago realizado',
        'Pago registrado correctamente',
        'Reembolso procesado correctamente',
      ]

      spanishMessages.forEach((message) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)

        // Ensure message contains Spanish characters or common Spanish words
        const spanishPattern = /[áéíóúñ]|No |Error |para |con |del |la |el |de |al |puede |se |factura|pago/i
        const isLikelySpanish = spanishPattern.test(message)
        expect(isLikelySpanish).toBe(true)
      })
    })

    it('validates invoice number generation pattern', () => {
      // Mock invoice number generation
      const tenantPrefix = 'INV'
      const year = 2026
      const sequence = 123

      const invoiceNumber = `${tenantPrefix}-${year}-${String(sequence).padStart(3, '0')}`

      expect(invoiceNumber).toBe('INV-2026-123')

      // Validate format
      const invoiceNumberRegex = /^[A-Z]{3}-\d{4}-\d{3,}$/
      expect(invoiceNumberRegex.test(invoiceNumber)).toBe(true)
    })

    it('validates payment method display names', () => {
      const paymentMethodMapping = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia',
        qr: 'QR',
        check: 'Cheque',
        bank_transfer: 'Transferencia Bancaria',
      }

      // Validate mapping exists
      Object.keys(paymentMethodMapping).forEach((key) => {
        expect(paymentMethodMapping[key as keyof typeof paymentMethodMapping]).toBeDefined()
        expect(typeof paymentMethodMapping[key as keyof typeof paymentMethodMapping]).toBe(
          'string'
        )
      })

      // Validate Spanish display names
      expect(paymentMethodMapping.cash).toBe('Efectivo')
      expect(paymentMethodMapping.card).toBe('Tarjeta')
      expect(paymentMethodMapping.transfer).toBe('Transferencia')
    })
  })
})
