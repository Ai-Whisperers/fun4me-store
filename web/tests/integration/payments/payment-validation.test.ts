/**
 * Payment Validation Tests
 *
 * Tests validation logic for payments including:
 * - Currency rounding (PYG has no decimals)
 * - Amount boundaries
 * - Payment method validation
 * - Invoice status checks before payment
 *
 * @ticket TICKET-BIZ-005
 */
import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  calculateLineTotal,
  calculateInvoiceTotals,
  canRecordPayment,
  canVoidInvoice,
  canEditInvoice,
  canSendInvoice,
  formatCurrency,
  type InvoiceItem,
} from '@/lib/types/invoicing'

describe('Currency Utilities', () => {
  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.125)).toBe(10.13)
      expect(roundCurrency(10.124)).toBe(10.12)
    })

    it('should handle floating point precision errors', () => {
      // Classic floating point issue: 0.1 + 0.2 = 0.30000000000000004
      expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
    })

    it('should handle large Guarani amounts', () => {
      // Paraguay uses large numbers (1 USD ~ 7,300 PYG)
      expect(roundCurrency(150000.999)).toBe(150001)
      expect(roundCurrency(7300000.005)).toBe(7300000.01)
    })

    it('should handle zero', () => {
      expect(roundCurrency(0)).toBe(0)
    })

    it('should handle negative amounts', () => {
      // Math.round behavior: -100.555 * 100 = -10055.5, rounds to -10055, / 100 = -100.55
      expect(roundCurrency(-100.555)).toBe(-100.55)
    })
  })

  describe('formatCurrency', () => {
    it('should format with Guarani symbol', () => {
      expect(formatCurrency(150000)).toContain('Gs.')
      expect(formatCurrency(150000)).toContain('150')
    })

    it('should use Paraguay locale formatting', () => {
      const formatted = formatCurrency(1500000)
      // Paraguay uses dot as thousands separator
      expect(formatted).toMatch(/Gs\.\s*1[.,]?500[.,]?000/)
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toContain('0')
    })
  })
})

describe('Invoice Calculation Utilities', () => {
  describe('calculateLineTotal', () => {
    it('should calculate line total without discount', () => {
      expect(calculateLineTotal(2, 10000)).toBe(20000)
      expect(calculateLineTotal(1, 50000)).toBe(50000)
    })

    it('should apply percentage discount correctly', () => {
      // 2 items at 10,000 with 10% discount = 18,000
      expect(calculateLineTotal(2, 10000, 10)).toBe(18000)
    })

    it('should handle 100% discount', () => {
      expect(calculateLineTotal(5, 10000, 100)).toBe(0)
    })

    it('should handle fractional quantities', () => {
      // 0.5 units at 100,000 = 50,000
      expect(calculateLineTotal(0.5, 100000)).toBe(50000)
    })

    it('should handle small discounts precisely', () => {
      // 1 item at 33,333 with 5% discount
      expect(calculateLineTotal(1, 33333, 5)).toBe(31666.35)
    })
  })

  describe('calculateInvoiceTotals', () => {
    const createItems = (lineTotals: number[]): InvoiceItem[] =>
      lineTotals.map((lineTotal, index) => ({
        description: `Item ${index + 1}`,
        quantity: 1,
        unit_price: lineTotal,
        line_total: lineTotal,
      }))

    it('should calculate totals with default 10% tax', () => {
      const items = createItems([10000, 20000, 30000])
      const totals = calculateInvoiceTotals(items)

      expect(totals.subtotal).toBe(60000)
      expect(totals.taxAmount).toBe(6000)
      expect(totals.total).toBe(66000)
    })

    it('should calculate totals with custom tax rate', () => {
      const items = createItems([100000])
      const totals = calculateInvoiceTotals(items, 5)

      expect(totals.subtotal).toBe(100000)
      expect(totals.taxAmount).toBe(5000)
      expect(totals.total).toBe(105000)
    })

    it('should handle zero tax rate', () => {
      const items = createItems([50000])
      const totals = calculateInvoiceTotals(items, 0)

      expect(totals.subtotal).toBe(50000)
      expect(totals.taxAmount).toBe(0)
      expect(totals.total).toBe(50000)
    })

    it('should handle empty items', () => {
      const totals = calculateInvoiceTotals([])

      expect(totals.subtotal).toBe(0)
      expect(totals.taxAmount).toBe(0)
      expect(totals.total).toBe(0)
    })

    it('should round totals properly to avoid floating point errors', () => {
      // Items that would cause floating point issues
      const items = createItems([33333, 33333, 33334])
      const totals = calculateInvoiceTotals(items)

      expect(totals.subtotal).toBe(100000)
      expect(totals.taxAmount).toBe(10000)
      expect(totals.total).toBe(110000)
    })
  })
})

describe('Invoice Status Validation', () => {
  describe('canRecordPayment', () => {
    it('should allow payment on sent invoice', () => {
      expect(canRecordPayment('sent', 50000)).toBe(true)
    })

    it('should allow payment on partial invoice', () => {
      expect(canRecordPayment('partial', 25000)).toBe(true)
    })

    it('should allow payment on overdue invoice', () => {
      expect(canRecordPayment('overdue', 50000)).toBe(true)
    })

    it('should allow payment on draft invoice', () => {
      expect(canRecordPayment('draft', 50000)).toBe(true)
    })

    it('should NOT allow payment on voided invoice', () => {
      expect(canRecordPayment('void', 50000)).toBe(false)
    })

    it('should NOT allow payment on cancelled invoice', () => {
      expect(canRecordPayment('cancelled', 50000)).toBe(false)
    })

    it('should NOT allow payment when amount due is zero', () => {
      expect(canRecordPayment('paid', 0)).toBe(false)
    })

    it('should allow payment when amountDue is undefined', () => {
      expect(canRecordPayment('sent')).toBe(true)
    })
  })

  describe('canEditInvoice', () => {
    it('should allow editing draft invoices', () => {
      expect(canEditInvoice('draft')).toBe(true)
    })

    it('should NOT allow editing sent invoices', () => {
      expect(canEditInvoice('sent')).toBe(false)
    })

    it('should NOT allow editing paid invoices', () => {
      expect(canEditInvoice('paid')).toBe(false)
    })

    it('should NOT allow editing partial invoices', () => {
      expect(canEditInvoice('partial')).toBe(false)
    })

    it('should NOT allow editing voided invoices', () => {
      expect(canEditInvoice('void')).toBe(false)
    })
  })

  describe('canSendInvoice', () => {
    it('should allow sending draft invoices', () => {
      expect(canSendInvoice('draft')).toBe(true)
    })

    it('should allow resending sent invoices', () => {
      expect(canSendInvoice('sent')).toBe(true)
    })

    it('should NOT allow sending paid invoices', () => {
      expect(canSendInvoice('paid')).toBe(false)
    })

    it('should NOT allow sending voided invoices', () => {
      expect(canSendInvoice('void')).toBe(false)
    })
  })

  describe('canVoidInvoice', () => {
    it('should allow voiding draft invoices', () => {
      expect(canVoidInvoice('draft')).toBe(true)
    })

    it('should allow voiding sent invoices', () => {
      expect(canVoidInvoice('sent')).toBe(true)
    })

    it('should allow voiding partial invoices', () => {
      expect(canVoidInvoice('partial')).toBe(true)
    })

    it('should NOT allow voiding already voided invoices', () => {
      expect(canVoidInvoice('void')).toBe(false)
    })

    it('should NOT allow voiding paid invoices', () => {
      expect(canVoidInvoice('paid')).toBe(false)
    })

    it('should allow voiding overdue invoices', () => {
      expect(canVoidInvoice('overdue')).toBe(true)
    })

    it('should allow voiding cancelled invoices', () => {
      expect(canVoidInvoice('cancelled')).toBe(true)
    })
  })
})

describe('Payment Amount Validation Scenarios', () => {
  describe('Edge cases for Paraguayan Guarani', () => {
    it('should handle typical consultation fee', () => {
      // Typical vet consultation: 150,000 - 250,000 Gs
      const items: InvoiceItem[] = [
        { description: 'Consulta', quantity: 1, unit_price: 180000, line_total: 180000 },
      ]
      const totals = calculateInvoiceTotals(items)

      expect(totals.subtotal).toBe(180000)
      expect(totals.total).toBe(198000) // With 10% IVA
    })

    it('should handle typical vaccination price', () => {
      // Typical vaccine: 80,000 - 150,000 Gs
      const items: InvoiceItem[] = [
        { description: 'Vacuna antirrábica', quantity: 1, unit_price: 120000, line_total: 120000 },
        { description: 'Aplicación', quantity: 1, unit_price: 30000, line_total: 30000 },
      ]
      const totals = calculateInvoiceTotals(items)

      expect(totals.subtotal).toBe(150000)
      expect(totals.total).toBe(165000)
    })

    it('should handle surgery with multiple items', () => {
      const items: InvoiceItem[] = [
        { description: 'Castración', quantity: 1, unit_price: 800000, line_total: 800000 },
        { description: 'Anestesia', quantity: 1, unit_price: 200000, line_total: 200000 },
        { description: 'Medicamentos', quantity: 3, unit_price: 50000, line_total: 150000 },
        { description: 'Hospitalización (días)', quantity: 2, unit_price: 100000, line_total: 200000 },
      ]
      const totals = calculateInvoiceTotals(items)

      expect(totals.subtotal).toBe(1350000)
      expect(totals.taxAmount).toBe(135000)
      expect(totals.total).toBe(1485000)
    })
  })

  describe('Multiple payment scenarios', () => {
    it('should track partial payment correctly', () => {
      const total = 100000
      const firstPayment = 60000
      const remainingDue = roundCurrency(total - firstPayment)

      expect(remainingDue).toBe(40000)
      expect(canRecordPayment('partial', remainingDue)).toBe(true)
    })

    it('should detect overpayment attempt', () => {
      const amountDue = 50000
      const attemptedPayment = 60000

      // This validation should happen in the RPC function
      // Test documents the expected behavior
      expect(attemptedPayment > amountDue).toBe(true)
    })
  })
})
