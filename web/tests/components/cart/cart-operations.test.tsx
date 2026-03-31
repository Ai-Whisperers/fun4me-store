/**
 * Cart Component Tests
 *
 * Tests the shopping cart functionality including:
 * - Cart item management (add, remove, update quantity)
 * - Price calculations with discounts
 * - Stock validation
 * - Prescription product handling
 * - Cart persistence
 *
 * @ticket TICKET-UI-004
 */
import { describe, it, expect } from 'vitest'

// Import REAL functions from lib module - this is the key fix!
import {
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  calculateItemSubtotal,
  calculateItemDiscount,
  calculateItemTotal,
  calculateCartTotals,
  validateStock,
  validatePrescriptions,
  hasPrescriptionItems,
  getCartBadgeCount,
  formatBadgeCount,
  serializeCart,
  deserializeCart,
  isCartStale,
  calculateShippingCost,
  getShippingMessage,
  getEmptyCartMessage,
  createEmptyCart,
  DEFAULT_SHIPPING_RULES,
  type Cart,
  type CartItem,
  type CartItemForCalculation,
  type StockInfo,
  type PrescriptionCartItem,
  type CartItemForCount,
  type CartForPersistence,
  type CartState,
} from '@/lib/cart/operations'

describe('Cart Item Management', () => {
  const emptyCart: Cart = createEmptyCart('tenant-1')

  const sampleItem: CartItem = {
    productId: 'prod-1',
    name: 'Dog Food Premium',
    quantity: 1,
    unitPrice: 150000,
    discountPercent: 0,
    maxStock: 10,
    requiresPrescription: false,
  }

  it('should add item to empty cart', () => {
    const newCart = addItemToCart(emptyCart, sampleItem)

    expect(newCart.items).toHaveLength(1)
    expect(newCart.items[0].productId).toBe('prod-1')
    expect(newCart.items[0].quantity).toBe(1)
  })

  it('should increment quantity when adding same item', () => {
    let cart = addItemToCart(emptyCart, sampleItem)
    cart = addItemToCart(cart, sampleItem)

    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].quantity).toBe(2)
  })

  it('should not exceed max stock when adding', () => {
    let cart = addItemToCart(emptyCart, { ...sampleItem, quantity: 8 })
    cart = addItemToCart(cart, { ...sampleItem, quantity: 5 })

    expect(cart.items[0].quantity).toBe(10) // Max stock
  })

  it('should remove item from cart', () => {
    const cart = addItemToCart(emptyCart, sampleItem)
    const newCart = removeItemFromCart(cart, 'prod-1')

    expect(newCart.items).toHaveLength(0)
  })

  it('should update item quantity', () => {
    const cart = addItemToCart(emptyCart, sampleItem)
    const newCart = updateItemQuantity(cart, 'prod-1', 5)

    expect(newCart.items[0].quantity).toBe(5)
  })

  it('should remove item when quantity set to 0', () => {
    const cart = addItemToCart(emptyCart, sampleItem)
    const newCart = updateItemQuantity(cart, 'prod-1', 0)

    expect(newCart.items).toHaveLength(0)
  })

  it('should not exceed max stock when updating quantity', () => {
    const cart = addItemToCart(emptyCart, sampleItem)
    const newCart = updateItemQuantity(cart, 'prod-1', 15)

    expect(newCart.items[0].quantity).toBe(10) // Max stock
  })
})

describe('Cart Price Calculations', () => {
  it('should calculate item subtotal', () => {
    const item: CartItemForCalculation = { quantity: 2, unitPrice: 50000, discountPercent: 0 }
    expect(calculateItemSubtotal(item)).toBe(100000)
  })

  it('should calculate item discount', () => {
    const item: CartItemForCalculation = { quantity: 1, unitPrice: 100000, discountPercent: 15 }
    expect(calculateItemDiscount(item)).toBe(15000)
  })

  it('should calculate item total with discount', () => {
    const item: CartItemForCalculation = { quantity: 2, unitPrice: 50000, discountPercent: 10 }
    // Subtotal: 100000, Discount: 10000
    expect(calculateItemTotal(item)).toBe(90000)
  })

  it('should calculate cart totals', () => {
    const items: CartItemForCalculation[] = [
      { quantity: 2, unitPrice: 50000, discountPercent: 0 },
      { quantity: 1, unitPrice: 80000, discountPercent: 10 },
    ]

    const totals = calculateCartTotals(items, 15000)

    expect(totals.subtotal).toBe(180000) // 100000 + 80000
    expect(totals.totalDiscount).toBe(8000) // 0 + 8000
    expect(totals.shippingCost).toBe(15000)
    expect(totals.total).toBe(187000) // 180000 - 8000 + 15000
  })

  it('should handle empty cart', () => {
    const totals = calculateCartTotals([])

    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)
  })
})

describe('Stock Validation', () => {
  it('should validate available stock', () => {
    const stock: StockInfo = { productId: 'p1', availableStock: 10, reservedStock: 2 }
    const result = validateStock('p1', 5, stock)

    expect(result.valid).toBe(true)
    expect(result.availableQuantity).toBe(8)
  })

  it('should reject when requesting more than available', () => {
    const stock: StockInfo = { productId: 'p1', availableStock: 10, reservedStock: 2 }
    const result = validateStock('p1', 10, stock)

    expect(result.valid).toBe(false)
    expect(result.message).toContain('8 unidades')
  })

  it('should reject zero quantity', () => {
    const stock: StockInfo = { productId: 'p1', availableStock: 10, reservedStock: 0 }
    const result = validateStock('p1', 0, stock)

    expect(result.valid).toBe(false)
    expect(result.message).toContain('mayor a 0')
  })

  it('should consider reserved stock', () => {
    const stock: StockInfo = { productId: 'p1', availableStock: 10, reservedStock: 8 }
    const result = validateStock('p1', 3, stock)

    expect(result.valid).toBe(false)
    expect(result.availableQuantity).toBe(2)
  })
})

describe('Prescription Product Handling', () => {
  it('should pass validation when no prescriptions needed', () => {
    const items: PrescriptionCartItem[] = [
      { productId: 'p1', name: 'Dog Food', requiresPrescription: false },
    ]

    const result = validatePrescriptions(items)
    expect(result.valid).toBe(true)
  })

  it('should pass validation when prescriptions provided', () => {
    const items: PrescriptionCartItem[] = [
      {
        productId: 'p1',
        name: 'Antibiotics',
        requiresPrescription: true,
        prescriptionUrl: 'https://example.com/prescription.pdf',
      },
    ]

    const result = validatePrescriptions(items)
    expect(result.valid).toBe(true)
  })

  it('should fail validation when prescription missing', () => {
    const items: PrescriptionCartItem[] = [
      { productId: 'p1', name: 'Antibiotics', requiresPrescription: true },
    ]

    const result = validatePrescriptions(items)
    expect(result.valid).toBe(false)
    expect(result.missingPrescriptions).toContain('Antibiotics')
  })

  it('should detect prescription items in cart', () => {
    const itemsWithPrescription: PrescriptionCartItem[] = [
      { productId: 'p1', name: 'Food', requiresPrescription: false },
      { productId: 'p2', name: 'Medicine', requiresPrescription: true },
    ]

    const itemsWithout: PrescriptionCartItem[] = [
      { productId: 'p1', name: 'Food', requiresPrescription: false },
    ]

    expect(hasPrescriptionItems(itemsWithPrescription)).toBe(true)
    expect(hasPrescriptionItems(itemsWithout)).toBe(false)
  })
})

describe('Cart Badge Count', () => {
  it('should count total items in cart', () => {
    const items: CartItemForCount[] = [{ quantity: 2 }, { quantity: 3 }, { quantity: 1 }]

    expect(getCartBadgeCount(items)).toBe(6)
  })

  it('should return 0 for empty cart', () => {
    expect(getCartBadgeCount([])).toBe(0)
  })

  it('should format badge count', () => {
    expect(formatBadgeCount(0)).toBe('')
    expect(formatBadgeCount(5)).toBe('5')
    expect(formatBadgeCount(99)).toBe('99')
    expect(formatBadgeCount(100)).toBe('99+')
  })
})

describe('Cart Persistence', () => {
  it('should serialize cart to JSON', () => {
    const cart: CartForPersistence = {
      items: [{ productId: 'p1', quantity: 2 }],
      tenantId: 't1',
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const json = serializeCart(cart)
    expect(JSON.parse(json)).toEqual(cart)
  })

  it('should deserialize valid JSON', () => {
    const json = '{"items":[{"productId":"p1","quantity":2}],"tenantId":"t1","updatedAt":"2024-01-15T10:00:00Z"}'
    const cart = deserializeCart(json)

    expect(cart).not.toBeNull()
    expect(cart?.items).toHaveLength(1)
  })

  it('should return null for invalid JSON', () => {
    expect(deserializeCart('invalid')).toBeNull()
    expect(deserializeCart('{}')).toBeNull()
    expect(deserializeCart('{"items":[]}')).toBeNull()
  })

  it('should detect stale cart', () => {
    const oldCart: CartForPersistence = {
      items: [],
      tenantId: 't1',
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    }

    const recentCart: CartForPersistence = {
      items: [],
      tenantId: 't1',
      updatedAt: new Date().toISOString(),
    }

    expect(isCartStale(oldCart)).toBe(true)
    expect(isCartStale(recentCart)).toBe(false)
  })
})

describe('Shipping Cost Calculation', () => {
  it('should apply free shipping for orders over 500k', () => {
    expect(calculateShippingCost(600000, DEFAULT_SHIPPING_RULES)).toBe(0)
    expect(calculateShippingCost(500000, DEFAULT_SHIPPING_RULES)).toBe(0)
  })

  it('should apply reduced shipping for orders over 200k', () => {
    expect(calculateShippingCost(300000, DEFAULT_SHIPPING_RULES)).toBe(15000)
    expect(calculateShippingCost(200000, DEFAULT_SHIPPING_RULES)).toBe(15000)
  })

  it('should apply full shipping for small orders', () => {
    expect(calculateShippingCost(100000, DEFAULT_SHIPPING_RULES)).toBe(25000)
    expect(calculateShippingCost(50000, DEFAULT_SHIPPING_RULES)).toBe(25000)
  })

  it('should show free shipping message', () => {
    expect(getShippingMessage(0, 600000)).toBe('¡Envío gratis!')
  })

  it('should show remaining for free shipping', () => {
    const message = getShippingMessage(15000, 350000)
    expect(message).toContain('150.000')
    expect(message).toContain('envío gratis')
  })
})

describe('Cart Empty States', () => {
  it('should show default empty message', () => {
    const state: CartState = { isEmpty: true, itemCount: 0 }
    expect(getEmptyCartMessage(state)).toContain('Explora nuestros productos')
  })

  it('should show post-checkout message', () => {
    const state: CartState = { isEmpty: true, itemCount: 0, lastAction: 'checkout_completed' }
    expect(getEmptyCartMessage(state)).toContain('Gracias por tu compra')
  })

  it('should show cleared cart message', () => {
    const state: CartState = { isEmpty: true, itemCount: 0, lastAction: 'cart_cleared' }
    expect(getEmptyCartMessage(state)).toContain('vaciado')
  })
})
