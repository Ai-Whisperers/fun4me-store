/**
 * Cart Operations
 *
 * Pure functions for shopping cart management including:
 * - Item management (add, remove, update)
 * - Price calculations with discounts
 * - Stock validation
 * - Prescription product handling
 * - Cart persistence
 * - Shipping cost calculations
 */

// Types

export interface CartItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  discountPercent: number
  maxStock: number
  requiresPrescription: boolean
  prescriptionUrl?: string
}

export interface Cart {
  items: CartItem[]
  tenantId: string
  updatedAt: string
}

export interface CartItemForCalculation {
  quantity: number
  unitPrice: number
  discountPercent: number
}

export interface CartTotals {
  subtotal: number
  totalDiscount: number
  shippingCost: number
  total: number
}

export interface StockInfo {
  productId: string
  availableStock: number
  reservedStock: number
}

export interface StockValidation {
  valid: boolean
  productId: string
  requestedQuantity: number
  availableQuantity: number
  message?: string
}

export interface PrescriptionCartItem {
  productId: string
  name: string
  requiresPrescription: boolean
  prescriptionUrl?: string
}

export interface PrescriptionValidation {
  valid: boolean
  missingPrescriptions: string[]
  message?: string
}

export interface CartItemForCount {
  quantity: number
}

export interface CartForPersistence {
  items: Array<{ productId: string; quantity: number }>
  tenantId: string
  updatedAt: string
}

export interface ShippingRule {
  minOrderValue: number
  shippingCost: number
}

export interface CartState {
  isEmpty: boolean
  itemCount: number
  lastAction?: string
}

// Default shipping rules for Paraguayan market
export const DEFAULT_SHIPPING_RULES: ShippingRule[] = [
  { minOrderValue: 500000, shippingCost: 0 }, // Free shipping over 500k
  { minOrderValue: 200000, shippingCost: 15000 },
  { minOrderValue: 0, shippingCost: 25000 },
]

// Cart Item Management

/**
 * Adds an item to the cart, handling duplicates and stock limits
 */
export function addItemToCart(
  cart: Cart,
  item: Omit<CartItem, 'quantity'> & { quantity?: number }
): Cart {
  const existingIndex = cart.items.findIndex((i) => i.productId === item.productId)

  if (existingIndex >= 0) {
    // Update quantity
    const newItems = [...cart.items]
    const newQuantity = newItems[existingIndex].quantity + (item.quantity || 1)
    newItems[existingIndex] = {
      ...newItems[existingIndex],
      quantity: Math.min(newQuantity, item.maxStock),
    }
    return { ...cart, items: newItems, updatedAt: new Date().toISOString() }
  }

  // Add new item
  return {
    ...cart,
    items: [...cart.items, { ...item, quantity: item.quantity || 1 }],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Removes an item from the cart by product ID
 */
export function removeItemFromCart(cart: Cart, productId: string): Cart {
  return {
    ...cart,
    items: cart.items.filter((i) => i.productId !== productId),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Updates the quantity of an item in the cart
 * Removes item if quantity is set to 0 or less
 */
export function updateItemQuantity(cart: Cart, productId: string, quantity: number): Cart {
  const newItems = cart.items.map((item) => {
    if (item.productId === productId) {
      const validQuantity = Math.max(0, Math.min(quantity, item.maxStock))
      return { ...item, quantity: validQuantity }
    }
    return item
  })

  // Remove items with quantity 0
  return {
    ...cart,
    items: newItems.filter((i) => i.quantity > 0),
    updatedAt: new Date().toISOString(),
  }
}

// Cart Price Calculations

/**
 * Calculates item subtotal (quantity * unit price)
 */
export function calculateItemSubtotal(item: CartItemForCalculation): number {
  return item.quantity * item.unitPrice
}

/**
 * Calculates discount amount for an item
 */
export function calculateItemDiscount(item: CartItemForCalculation): number {
  const subtotal = calculateItemSubtotal(item)
  return Math.round((subtotal * item.discountPercent) / 100)
}

/**
 * Calculates item total after discount
 */
export function calculateItemTotal(item: CartItemForCalculation): number {
  const subtotal = calculateItemSubtotal(item)
  const discount = calculateItemDiscount(item)
  return subtotal - discount
}

/**
 * Calculates full cart totals including shipping
 */
export function calculateCartTotals(
  items: CartItemForCalculation[],
  shippingCost: number = 0
): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0)
  const totalDiscount = items.reduce((sum, item) => sum + calculateItemDiscount(item), 0)

  return {
    subtotal,
    totalDiscount,
    shippingCost,
    total: subtotal - totalDiscount + shippingCost,
  }
}

// Stock Validation

/**
 * Validates stock availability for a product
 */
export function validateStock(
  productId: string,
  requestedQuantity: number,
  stockInfo: StockInfo
): StockValidation {
  const available = stockInfo.availableStock - stockInfo.reservedStock

  if (requestedQuantity <= 0) {
    return {
      valid: false,
      productId,
      requestedQuantity,
      availableQuantity: available,
      message: 'La cantidad debe ser mayor a 0',
    }
  }

  if (requestedQuantity > available) {
    return {
      valid: false,
      productId,
      requestedQuantity,
      availableQuantity: available,
      message: `Solo hay ${available} unidades disponibles`,
    }
  }

  return {
    valid: true,
    productId,
    requestedQuantity,
    availableQuantity: available,
  }
}

// Prescription Product Handling

/**
 * Validates that all prescription items have prescriptions attached
 */
export function validatePrescriptions(items: PrescriptionCartItem[]): PrescriptionValidation {
  const prescriptionItems = items.filter((i) => i.requiresPrescription)
  const missingPrescriptions = prescriptionItems
    .filter((i) => !i.prescriptionUrl)
    .map((i) => i.name)

  if (missingPrescriptions.length > 0) {
    return {
      valid: false,
      missingPrescriptions,
      message: `Falta receta para: ${missingPrescriptions.join(', ')}`,
    }
  }

  return {
    valid: true,
    missingPrescriptions: [],
  }
}

/**
 * Checks if cart contains any prescription items
 */
export function hasPrescriptionItems(items: PrescriptionCartItem[]): boolean {
  return items.some((i) => i.requiresPrescription)
}

// Cart Badge Count

/**
 * Gets total item count for cart badge display
 */
export function getCartBadgeCount(items: CartItemForCount[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Formats badge count for display (caps at 99+)
 */
export function formatBadgeCount(count: number): string {
  if (count === 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

// Cart Persistence

/**
 * Serializes cart to JSON string for storage
 */
export function serializeCart(cart: CartForPersistence): string {
  return JSON.stringify(cart)
}

/**
 * Deserializes cart from JSON string
 * Returns null if invalid
 */
export function deserializeCart(json: string): CartForPersistence | null {
  try {
    const parsed = JSON.parse(json)
    if (!parsed.items || !parsed.tenantId) return null
    return parsed as CartForPersistence
  } catch (_error: unknown) {
    return null
  }
}

/**
 * Checks if a cart is stale (older than maxAgeHours)
 */
export function isCartStale(cart: CartForPersistence, maxAgeHours: number = 24): boolean {
  const updatedAt = new Date(cart.updatedAt)
  const now = new Date()
  const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
  return diffHours > maxAgeHours
}

// Shipping Cost Calculation

/**
 * Calculates shipping cost based on order value and rules
 */
export function calculateShippingCost(orderValue: number, rules: ShippingRule[]): number {
  // Sort by minOrderValue descending to find the best matching rule
  const sortedRules = [...rules].sort((a, b) => b.minOrderValue - a.minOrderValue)

  for (const rule of sortedRules) {
    if (orderValue >= rule.minOrderValue) {
      return rule.shippingCost
    }
  }

  return sortedRules[sortedRules.length - 1]?.shippingCost || 0
}

/**
 * Gets shipping message for display
 */
export function getShippingMessage(shippingCost: number, orderValue: number): string {
  if (shippingCost === 0) {
    return '¡Envío gratis!'
  }

  const freeShippingThreshold = 500000
  const remaining = freeShippingThreshold - orderValue

  if (remaining > 0) {
    return `Agrega ₲ ${remaining.toLocaleString('es-PY')} más para envío gratis`
  }

  return `Costo de envío: ₲ ${shippingCost.toLocaleString('es-PY')}`
}

// Cart Empty States

/**
 * Gets appropriate message for empty cart based on state
 */
export function getEmptyCartMessage(state: CartState): string {
  if (state.lastAction === 'checkout_completed') {
    return '¡Gracias por tu compra! Tu carrito está vacío.'
  }

  if (state.lastAction === 'cart_cleared') {
    return 'Has vaciado tu carrito.'
  }

  return 'Tu carrito está vacío. ¡Explora nuestros productos!'
}

// Empty Cart Factory

/**
 * Creates an empty cart for a tenant
 */
export function createEmptyCart(tenantId: string): Cart {
  return {
    items: [],
    tenantId,
    updatedAt: new Date().toISOString(),
  }
}
