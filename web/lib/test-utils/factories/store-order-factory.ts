/**
 * Store Order Factory - Builder pattern for e-commerce orders
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import { generateId, pick } from './base'
import { OrderScenario, PaymentMethod } from './types'
import { TENANT_IDS } from '@/lib/constants/tenants';

interface StoreOrderData {
  id: string
  tenant_id: string
  customer_id: string
  order_number: string
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'ready'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'
  subtotal: number
  discount_amount: number
  shipping_cost: number
  tax_amount: number
  total: number
  payment_method: string | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  shipping_address: Record<string, unknown> | null
  customer_notes: string | null
  coupon_code: string | null
}

interface StoreOrderItemData {
  id: string
  tenant_id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  total_price: number
}

interface StoreCartData {
  id: string
  tenant_id: string
  customer_id: string
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    requires_prescription: boolean
  }>
}

// Sample products (used as fallback if no products in DB)
const SAMPLE_PRODUCTS: Array<{ id: string; name: string; price: number; prescription: boolean }> = [
  { id: generateId(), name: 'Alimento Premium Perros 15kg', price: 450000, prescription: false },
  { id: generateId(), name: 'Alimento Gatos Adultos 10kg', price: 380000, prescription: false },
  { id: generateId(), name: 'Juguete Kong Classic', price: 75000, prescription: false },
  { id: generateId(), name: 'Pelota de Tenis (Pack 3)', price: 35000, prescription: false },
  { id: generateId(), name: 'Collar Antipulgas 6 meses', price: 120000, prescription: false },
  { id: generateId(), name: 'Shampoo Hipoalergénico', price: 65000, prescription: false },
  { id: generateId(), name: 'Vitaminas Multifuncionales', price: 95000, prescription: false },
  { id: generateId(), name: 'Antiparasitario Oral', price: 85000, prescription: true },
  { id: generateId(), name: 'Antibiótico Amoxicilina', price: 125000, prescription: true },
  { id: generateId(), name: 'Antiinflamatorio Meloxicam', price: 95000, prescription: true },
  { id: generateId(), name: 'Cama Ortopédica Mediana', price: 250000, prescription: false },
  { id: generateId(), name: 'Transportador Plástico', price: 180000, prescription: false },
]

// Cache for database products
let cachedProducts: Array<{
  id: string
  name: string
  price: number
  prescription: boolean
}> | null = null

async function getProductsFromDB(
  tenantId: string
): Promise<Array<{ id: string; name: string; price: number; prescription: boolean }>> {
  if (cachedProducts !== null) {
    return cachedProducts
  }

  const { data, error } = await apiClient.dbSelect('store_products', {
    eq: { tenant_id: tenantId, is_active: true },
    limit: 50,
  })

  if (error || !data || data.length === 0) {
    cachedProducts = []
    return []
  }

  cachedProducts = (
    data as Array<{
      id: string
      name: string
      base_price: number
      is_prescription_required: boolean
    }>
  ).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.base_price) || 100000,
    prescription: p.is_prescription_required || false,
  }))

  return cachedProducts
}

const SHIPPING_ADDRESSES = [
  { street: 'Av. Mariscal López 1234', city: 'Asunción', zipCode: '1234' },
  { street: 'Calle Palma 567', city: 'Asunción', zipCode: '1234' },
  { street: 'Av. España 890', city: 'San Lorenzo', zipCode: '2000' },
  { street: 'Calle Brasil 432', city: 'Fernando de la Mora', zipCode: '2300' },
]

const COUPON_CODES = [
  { code: 'WELCOME10', discount: 0.1, type: 'percent' },
  { code: 'SUMMER20', discount: 0.2, type: 'percent' },
  { code: 'FLAT50K', discount: 50000, type: 'fixed' },
]

export class StoreOrderFactory {
  private data: Partial<StoreOrderData>
  private items: Array<{
    productId: string | null
    name: string
    price: number
    quantity: number
    prescription: boolean
  }> = []
  private scenario: OrderScenario = 'simple'
  private shouldPersist: boolean = true

  private constructor() {
    const id = generateId()
    this.data = {
      id,
      tenant_id: TENANT_IDS.ADRIS,
      order_number: `ORD-${Date.now()}-${id.slice(0, 8)}`,
      status: 'pending',
      discount_amount: 0,
      shipping_cost: 0,
      payment_method: null,
      payment_status: 'pending',
      shipping_address: null,
      customer_notes: null,
      coupon_code: null,
    }
  }

  /**
   * Start building a store order
   */
  static create(): StoreOrderFactory {
    return new StoreOrderFactory()
  }

  /**
   * Set order scenario
   */
  withScenario(scenario: OrderScenario): StoreOrderFactory {
    this.scenario = scenario
    return this
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): StoreOrderFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set customer ID
   */
  forCustomer(customerId: string): StoreOrderFactory {
    this.data.customer_id = customerId
    return this
  }

  /**
   * Add a product to the order
   */
  addProduct(
    productId: string,
    name: string,
    price: number,
    quantity: number = 1,
    prescription: boolean = false
  ): StoreOrderFactory {
    this.items.push({
      productId,
      name,
      price,
      quantity,
      prescription,
    })

    return this
  }

  /**
   * Add random products
   */
  addRandomProducts(count: number = 3, includePrescription: boolean = false): StoreOrderFactory {
    const availableProducts = includePrescription
      ? SAMPLE_PRODUCTS
      : SAMPLE_PRODUCTS.filter((p) => !p.prescription)

    const selected = []
    const shuffled = [...availableProducts].sort(() => Math.random() - 0.5)

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const product = shuffled[i]
      selected.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1 + Math.floor(Math.random() * 2),
        prescription: product.prescription,
      })
    }

    this.items.push(...selected)

    return this
  }

  /**
   * Apply a coupon
   */
  withCoupon(code?: string): StoreOrderFactory {
    const coupon = code
      ? COUPON_CODES.find((c) => c.code === code) || COUPON_CODES[0]
      : pick(COUPON_CODES)

    this.data.coupon_code = coupon.code
    // Discount will be calculated in buildData
    return this
  }

  /**
   * Set shipping address
   */
  withShipping(address?: Record<string, unknown>): StoreOrderFactory {
    this.data.shipping_address = address || pick(SHIPPING_ADDRESSES)
    this.data.shipping_cost = 25000 // Standard shipping
    return this
  }

  /**
   * Set payment method
   */
  paidWith(method: PaymentMethod): StoreOrderFactory {
    this.data.payment_method = method
    this.data.payment_status = 'paid'
    this.data.status = 'confirmed'
    return this
  }

  /**
   * Mark order as confirmed/processing
   */
  confirmed(): StoreOrderFactory {
    this.data.status = 'confirmed'
    return this
  }

  /**
   * Mark order as delivered
   */
  delivered(): StoreOrderFactory {
    this.data.status = 'delivered'
    this.data.payment_status = 'paid'
    return this
  }

  /**
   * Mark order as cancelled
   */
  cancelled(): StoreOrderFactory {
    this.data.status = 'cancelled'
    return this
  }

  /**
   * Add notes
   */
  withNotes(notes: string): StoreOrderFactory {
    this.data.customer_notes = notes
    return this
  }

  /**
   * Set ID explicitly
   */
  withId(id: string): StoreOrderFactory {
    this.data.id = id
    return this
  }

  /**
   * Don't persist to database
   */
  inMemoryOnly(): StoreOrderFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build order data (without persisting)
   */
  buildData(): StoreOrderData {
    // Apply scenario-specific settings
    switch (this.scenario) {
      case 'prescription':
        if (!this.items.some((i) => i.prescription)) {
          // Non-null assertion safe: SAMPLE_PRODUCTS has 3 prescription items (lines 71-73)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const prescriptionProduct = SAMPLE_PRODUCTS.find((p) => p.prescription)!
          this.items.push({
            productId: prescriptionProduct.id,
            name: prescriptionProduct.name,
            price: prescriptionProduct.price,
            quantity: 1,
            prescription: true,
          })
        }
        break

      case 'coupon':
        if (!this.data.coupon_code) {
          this.withCoupon()
        }
        break

      case 'bulk':
        for (const item of this.items) {
          item.quantity = 3 + Math.floor(Math.random() * 3)
        }
        break
    }

    // Add random products if none added
    if (this.items.length === 0) {
      this.addRandomProducts(2 + Math.floor(Math.random() * 3), this.scenario === 'prescription')
    }

    // Calculate totals
    let subtotal = 0
    for (const item of this.items) {
      subtotal += item.price * item.quantity
    }

    // Apply coupon discount
    let couponDiscount = 0
    if (this.data.coupon_code) {
      const coupon = COUPON_CODES.find((c) => c.code === this.data.coupon_code)
      if (coupon) {
        couponDiscount =
          coupon.type === 'percent' ? Math.round(subtotal * coupon.discount) : coupon.discount
      }
    }

    const discountAmount = (this.data.discount_amount || 0) + couponDiscount
    const shippingCost = this.data.shipping_cost || 0
    const taxableAmount = subtotal - discountAmount
    const taxRate = 0.1
    const taxAmount = Math.round(taxableAmount * taxRate)
    const total = taxableAmount + taxAmount + shippingCost

    this.data.subtotal = subtotal
    this.data.discount_amount = discountAmount
    this.data.tax_amount = taxAmount
    this.data.total = total

    return this.data as StoreOrderData
  }

  /**
   * Build and persist order
   */
  async build(): Promise<{ order: StoreOrderData; items: StoreOrderItemData[] }> {
    const orderData = this.buildData()
    const itemRecords: StoreOrderItemData[] = []

    if (!this.shouldPersist) {
      return { order: orderData, items: itemRecords }
    }

    if (!orderData.customer_id) {
      throw new Error(
        'Order must have a customer_id. Use .forCustomer(customerId) before building.'
      )
    }

    // Fetch real products from DB to assign to items
    const dbProducts = await getProductsFromDB(orderData.tenant_id)

    // If no products in DB, we can't create order items (product_id is NOT NULL)
    // Still create the order, just without items
    const hasRealProducts = dbProducts.length > 0

    // Insert order
    const { error: orderError } = await apiClient.dbInsert('store_orders', {
      id: orderData.id,
      tenant_id: orderData.tenant_id,
      customer_id: orderData.customer_id,
      order_number: orderData.order_number,
      status: orderData.status,
      subtotal: orderData.subtotal,
      discount_amount: orderData.discount_amount,
      shipping_cost: orderData.shipping_cost,
      tax_amount: orderData.tax_amount,
      total: orderData.total,
      payment_method: orderData.payment_method,
      payment_status: orderData.payment_status,
      shipping_address: orderData.shipping_address,
      customer_notes: orderData.customer_notes,
      coupon_code: orderData.coupon_code,
    })

    if (orderError) {
      throw new Error(`Failed to create store order: ${orderError}`)
    }

    testContext.track('store_orders', orderData.id, orderData.tenant_id)

    // Insert order items (only if we have real products)
    if (hasRealProducts) {
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i]
        // Assign a real product from DB (cycling through available products)
        const dbProduct = dbProducts[i % dbProducts.length]
        const totalPrice = dbProduct.price * item.quantity

        const itemData: StoreOrderItemData = {
          id: generateId(),
          tenant_id: orderData.tenant_id,
          order_id: orderData.id,
          product_id: dbProduct.id,
          product_name: dbProduct.name,
          quantity: item.quantity,
          unit_price: dbProduct.price,
          discount_amount: 0,
          total_price: totalPrice,
        }

        const { error: itemError } = await apiClient.dbInsert(
          'store_order_items',
          itemData as unknown as Record<string, unknown>
        )
        if (itemError) {
          console.warn(`Failed to create order item: ${itemError}`)
          continue
        }

        testContext.track('store_order_items', itemData.id)
        itemRecords.push(itemData)
      }
    }

    return { order: orderData, items: itemRecords }
  }
}

/**
 * Create an abandoned cart for a customer
 */
export class CartFactory {
  private data: Partial<StoreCartData>
  private items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
    prescription: boolean
  }> = []
  private shouldPersist: boolean = true

  private constructor() {
    this.data = {
      id: generateId(),
      tenant_id: TENANT_IDS.ADRIS,
      items: [],
    }
  }

  /**
   * Start building a cart
   */
  static create(): CartFactory {
    return new CartFactory()
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): CartFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set customer ID
   */
  forCustomer(customerId: string): CartFactory {
    this.data.customer_id = customerId
    return this
  }

  /**
   * Add random products
   */
  addRandomProducts(count: number = 2): CartFactory {
    const shuffled = [...SAMPLE_PRODUCTS].sort(() => Math.random() - 0.5)

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const product = shuffled[i]
      this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1 + Math.floor(Math.random() * 2),
        prescription: product.prescription,
      })
    }

    return this
  }

  /**
   * Don't persist to database
   */
  inMemoryOnly(): CartFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build and persist cart
   */
  async build(): Promise<StoreCartData> {
    this.data.items = this.items.map((item) => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      requires_prescription: item.prescription,
    }))

    if (!this.shouldPersist) {
      return this.data as StoreCartData
    }

    if (!this.data.customer_id) {
      throw new Error('Cart must have a customer_id. Use .forCustomer(customerId) before building.')
    }

    // Upsert cart
    const { error } = await apiClient.dbUpsert(
      'store_carts',
      {
        id: this.data.id,
        tenant_id: this.data.tenant_id,
        customer_id: this.data.customer_id,
        items: this.data.items,
      },
      'customer_id,tenant_id'
    )

    if (error) {
      throw new Error(`Failed to create cart: ${error}`)
    }

    // Non-null assertion safe: id initialized in constructor (line 495)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    testContext.track('store_carts', this.data.id!, this.data.tenant_id)

    return this.data as StoreCartData
  }
}

/**
 * Create order history for a customer based on scenario
 */
export async function createOrderHistory(
  customerId: string,
  tenantId: string = 'terrapet',
  options: { count?: number; scenarios?: OrderScenario[] } = {}
): Promise<Array<{ order: StoreOrderData; items: StoreOrderItemData[] }>> {
  const { count = 3, scenarios = ['simple', 'simple', 'coupon'] } = options
  const results: Array<{ order: StoreOrderData; items: StoreOrderItemData[] }> = []

  for (let i = 0; i < count; i++) {
    const scenario = scenarios[i % scenarios.length]

    const factory = StoreOrderFactory.create()
      .forTenant(tenantId)
      .forCustomer(customerId)
      .withScenario(scenario)
      .withShipping()
      .addRandomProducts(2 + Math.floor(Math.random() * 2), scenario === 'prescription')

    // Most orders should be delivered
    if (Math.random() < 0.8) {
      factory.paidWith(pick(['cash', 'card', 'transfer'])).delivered()
    } else if (Math.random() < 0.5) {
      factory.confirmed()
    }

    const result = await factory.build()
    results.push(result)
  }

  return results
}

/**
 * Create abandoned carts (items in cart but not checked out)
 */
export async function createAbandonedCarts(
  customerIds: string[],
  tenantId: string = 'terrapet'
): Promise<StoreCartData[]> {
  const carts: StoreCartData[] = []

  // Only create carts for some customers
  const customersWithCarts = customerIds.filter(() => Math.random() < 0.3)

  for (const customerId of customersWithCarts) {
    const cart = await CartFactory.create()
      .forTenant(tenantId)
      .forCustomer(customerId)
      .addRandomProducts(1 + Math.floor(Math.random() * 3))
      .build()

    carts.push(cart)
  }

  return carts
}
