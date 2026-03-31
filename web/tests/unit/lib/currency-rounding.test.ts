import { describe, it, expect } from 'vitest'
import {
  roundCurrency,
  calculateLineTotal,
  calculateInvoiceTotals,
  type InvoiceItem,
} from '@/lib/types/invoicing'

describe('Currency Rounding', () => {
  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(123.456)).toBe(123.46)
      expect(roundCurrency(123.454)).toBe(123.45)
      expect(roundCurrency(123.455)).toBe(123.46) // Round half up
    })

    it('should handle floating point arithmetic errors', () => {
      // Common floating point issues
      expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
      expect(roundCurrency(1.005 * 100)).toBe(100.5)
      // Note: 9.995 rounds to 9.99 due to floating point representation
      // 9.995 is actually 9.994999999... in binary, which rounds down
      expect(roundCurrency(9.995)).toBe(9.99)
    })

    it('should handle large numbers', () => {
      expect(roundCurrency(1234567.891)).toBe(1234567.89)
      expect(roundCurrency(999999.999)).toBe(1000000.0)
    })

    it('should handle negative numbers', () => {
      expect(roundCurrency(-123.456)).toBe(-123.46)
      expect(roundCurrency(-0.1 - 0.2)).toBe(-0.3)
    })

    it('should handle zero and very small numbers', () => {
      expect(roundCurrency(0)).toBe(0)
      expect(roundCurrency(0.001)).toBe(0)
      expect(roundCurrency(0.005)).toBe(0.01)
    })
  })

  describe('calculateLineTotal', () => {
    it('should calculate line total with no discount', () => {
      expect(calculateLineTotal(2, 100)).toBe(200)
      expect(calculateLineTotal(3, 50.5)).toBe(151.5)
    })

    it('should calculate line total with discount', () => {
      expect(calculateLineTotal(2, 100, 10)).toBe(180) // 200 - 10%
      expect(calculateLineTotal(3, 50, 20)).toBe(120) // 150 - 20%
    })

    it('should round to avoid floating point errors', () => {
      // This would normally produce 133.33333... but should round to 133.33
      expect(calculateLineTotal(1, 400, 66.67)).toBe(133.32)

      // Real-world example that can cause floating point errors
      expect(calculateLineTotal(5, 7.99, 0)).toBe(39.95)
      expect(calculateLineTotal(3, 33.33, 10)).toBe(89.99)
    })

    it('should handle edge cases', () => {
      expect(calculateLineTotal(0, 100)).toBe(0)
      expect(calculateLineTotal(1, 0)).toBe(0)
      expect(calculateLineTotal(1, 100, 100)).toBe(0) // 100% discount
      expect(calculateLineTotal(1, 99.99, 0)).toBe(99.99)
    })
  })

  describe('calculateInvoiceTotals', () => {
    it('should calculate totals correctly with no tax', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 2, unit_price: 100, line_total: 200 },
        { description: 'Item 2', quantity: 1, unit_price: 50, line_total: 50 },
      ]

      const result = calculateInvoiceTotals(items, 0)
      expect(result.subtotal).toBe(250)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(250)
    })

    it('should calculate totals correctly with 10% tax', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 2, unit_price: 100, line_total: 200 },
        { description: 'Item 2', quantity: 1, unit_price: 50, line_total: 50 },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(250)
      expect(result.taxAmount).toBe(25)
      expect(result.total).toBe(275)
    })

    it('should handle floating point errors in tax calculations', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 3, unit_price: 33.33, line_total: 99.99 },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(99.99)
      expect(result.taxAmount).toBe(10.0) // Should be exactly 10.00, not 10.000000000001
      expect(result.total).toBe(109.99)
    })

    it('should round all intermediate calculations', () => {
      // Items with values that would cause floating point errors
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 1, unit_price: 7.99, line_total: 7.99 },
        { description: 'Item 2', quantity: 5, unit_price: 12.49, line_total: 62.45 },
        { description: 'Item 3', quantity: 2, unit_price: 99.99, line_total: 199.98 },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(270.42)
      expect(result.taxAmount).toBe(27.04)
      expect(result.total).toBe(297.46)
    })

    it('should handle Paraguay IVA (10%) correctly', () => {
      // Real-world Paraguay prices
      const items: InvoiceItem[] = [
        {
          description: 'Consulta veterinaria',
          quantity: 1,
          unit_price: 150000,
          line_total: 150000,
        },
        { description: 'Vacuna rabia', quantity: 1, unit_price: 80000, line_total: 80000 },
        { description: 'Desparasitante', quantity: 2, unit_price: 35000, line_total: 70000 },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(300000)
      expect(result.taxAmount).toBe(30000)
      expect(result.total).toBe(330000)
    })

    it('should handle complex discount scenarios', () => {
      // Items with discounts already applied to line_total
      const items: InvoiceItem[] = [
        // 2 x 100 = 200, 10% discount = 180
        {
          description: 'Item 1',
          quantity: 2,
          unit_price: 100,
          discount_percent: 10,
          line_total: 180,
        },
        // 3 x 50 = 150, 20% discount = 120
        {
          description: 'Item 2',
          quantity: 3,
          unit_price: 50,
          discount_percent: 20,
          line_total: 120,
        },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(300)
      expect(result.taxAmount).toBe(30)
      expect(result.total).toBe(330)
    })

    it('should handle empty items array', () => {
      const result = calculateInvoiceTotals([], 10)
      expect(result.subtotal).toBe(0)
      expect(result.taxAmount).toBe(0)
      expect(result.total).toBe(0)
    })

    it('should handle single item', () => {
      const items: InvoiceItem[] = [
        { description: 'Single item', quantity: 1, unit_price: 99.99, line_total: 99.99 },
      ]

      const result = calculateInvoiceTotals(items, 10)
      expect(result.subtotal).toBe(99.99)
      expect(result.taxAmount).toBe(10.0)
      expect(result.total).toBe(109.99)
    })
  })

  describe('End-to-end invoice calculation', () => {
    it('should calculate complete invoice correctly', () => {
      // Simulate real invoice creation flow
      const items = [
        { quantity: 2, unit_price: 150.5, discount_percent: 5 },
        { quantity: 1, unit_price: 99.99, discount_percent: 0 },
        { quantity: 3, unit_price: 45.0, discount_percent: 10 },
      ]

      // Calculate line totals
      const processedItems: InvoiceItem[] = items.map((item, idx) => ({
        description: `Item ${idx + 1}`,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        line_total: calculateLineTotal(item.quantity, item.unit_price, item.discount_percent),
      }))

      // Verify line totals are rounded
      expect(processedItems[0].line_total).toBe(285.95) // 301 - 5%
      expect(processedItems[1].line_total).toBe(99.99)
      expect(processedItems[2].line_total).toBe(121.5) // 135 - 10%

      // Calculate totals
      const totals = calculateInvoiceTotals(processedItems, 10)
      expect(totals.subtotal).toBe(507.44)
      expect(totals.taxAmount).toBe(50.74)
      expect(totals.total).toBe(558.18)
    })

    it('should handle payment calculations', () => {
      const total = 558.18
      const payment1 = 300
      const payment2 = 200

      const amountPaid = roundCurrency(payment1 + payment2)
      const amountDue = roundCurrency(total - amountPaid)

      expect(amountPaid).toBe(500)
      expect(amountDue).toBe(58.18)
    })
  })
})
