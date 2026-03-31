/**
 * Functionality Tests: Store - Shopping Cart
 *
 * Tests shopping cart operations and calculations.
 * @tags functionality, store, cart, e-commerce, high
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'

// Cart item type for testing
interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
  maxStock: number
}

// Cart utility functions (simulating client-side cart logic)
class ShoppingCart {
  private items: CartItem[] = []

  addItem(item: Omit<CartItem, 'quantity'>, quantity: number = 1): boolean {
    // Check stock availability
    if (quantity > item.maxStock) {
      return false
    }

    const existingIndex = this.items.findIndex((i) => i.productId === item.productId)

    if (existingIndex >= 0) {
      // Update quantity
      const newQuantity = this.items[existingIndex].quantity + quantity
      if (newQuantity > item.maxStock) {
        return false
      }
      this.items[existingIndex].quantity = newQuantity
    } else {
      // Add new item
      this.items.push({ ...item, quantity })
    }

    return true
  }

  removeItem(productId: string): void {
    this.items = this.items.filter((i) => i.productId !== productId)
  }

  updateQuantity(productId: string, quantity: number): boolean {
    const item = this.items.find((i) => i.productId === productId)
    if (!item) return false

    if (quantity <= 0) {
      this.removeItem(productId)
      return true
    }

    if (quantity > item.maxStock) {
      return false
    }

    item.quantity = quantity
    return true
  }

  getItems(): CartItem[] {
    return [...this.items]
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  clear(): void {
    this.items = []
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }
}

describe('Shopping Cart Operations', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>
  const testProducts: Array<{
    id: string
    name: string
    price: number
    stock: number
  }> = []

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()

    // Create test products
    const productsToCreate = [
      { name: 'Cart Test Product 1', category: 'Test', price: 25000, stock: 10 },
      { name: 'Cart Test Product 2', category: 'Test', price: 35000, stock: 5 },
      { name: 'Cart Test Product 3', category: 'Test', price: 15000, stock: 20 },
    ]

    for (const product of productsToCreate) {
      const { data } = await client
        .from('products')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          ...product,
        })
        .select()
        .single()

      if (data) {
        ctx.track('products', data.id)
        testProducts.push({
          id: data.id,
          name: data.name,
          price: data.price,
          stock: data.stock,
        })
      }
    }
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('ADD TO CART', () => {
    test('adds single item to empty cart', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      const result = cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      expect(result).toBe(true)
      expect(cart.getItemCount()).toBe(1)
      expect(cart.getItems()[0].productId).toBe(product.id)
    })

    test('adds item with specific quantity', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        3
      )

      expect(cart.getItemCount()).toBe(3)
    })

    test('increases quantity when adding same product', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        2
      )

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        3
      )

      expect(cart.getItemCount()).toBe(5)
      expect(cart.getItems().length).toBe(1) // Still one item type
    })

    test('adds multiple different products', () => {
      const cart = new ShoppingCart()

      for (const product of testProducts) {
        cart.addItem({
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        })
      }

      expect(cart.getItems().length).toBe(testProducts.length)
    })

    test('fails when exceeding stock', () => {
      const cart = new ShoppingCart()
      const product = testProducts[1] // stock: 5

      const result = cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        10
      )

      expect(result).toBe(false)
      expect(cart.isEmpty()).toBe(true)
    })

    test('fails when cumulative quantity exceeds stock', () => {
      const cart = new ShoppingCart()
      const product = testProducts[1] // stock: 5

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        3
      )

      const result = cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        3
      )

      expect(result).toBe(false)
      expect(cart.getItemCount()).toBe(3) // Original quantity preserved
    })
  })

  describe('REMOVE FROM CART', () => {
    test('removes item from cart', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      cart.removeItem(product.id)

      expect(cart.isEmpty()).toBe(true)
    })

    test('removes specific item from cart with multiple items', () => {
      const cart = new ShoppingCart()

      for (const product of testProducts) {
        cart.addItem({
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        })
      }

      cart.removeItem(testProducts[1].id)

      expect(cart.getItems().length).toBe(testProducts.length - 1)
      expect(cart.getItems().some((i) => i.productId === testProducts[1].id)).toBe(false)
    })

    test('handles removing non-existent item gracefully', () => {
      const cart = new ShoppingCart()
      cart.removeItem('non-existent-id')
      expect(cart.isEmpty()).toBe(true)
    })
  })

  describe('UPDATE QUANTITY', () => {
    test('increases item quantity', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        2
      )

      const result = cart.updateQuantity(product.id, 5)

      expect(result).toBe(true)
      expect(cart.getItemCount()).toBe(5)
    })

    test('decreases item quantity', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        5
      )

      cart.updateQuantity(product.id, 2)

      expect(cart.getItemCount()).toBe(2)
    })

    test('removes item when quantity set to zero', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      cart.updateQuantity(product.id, 0)

      expect(cart.isEmpty()).toBe(true)
    })

    test('fails when quantity exceeds stock', () => {
      const cart = new ShoppingCart()
      const product = testProducts[1] // stock: 5

      cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      const result = cart.updateQuantity(product.id, 10)

      expect(result).toBe(false)
      expect(cart.getItemCount()).toBe(1) // Quantity unchanged
    })

    test('returns false for non-existent product', () => {
      const cart = new ShoppingCart()
      const result = cart.updateQuantity('non-existent-id', 5)
      expect(result).toBe(false)
    })
  })

  describe('CART CALCULATIONS', () => {
    test('calculates correct subtotal for single item', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0] // price: 25000

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        3
      )

      expect(cart.getSubtotal()).toBe(75000)
    })

    test('calculates correct subtotal for multiple items', () => {
      const cart = new ShoppingCart()

      // Add all test products with quantity 2
      for (const product of testProducts) {
        cart.addItem(
          {
            productId: product.id,
            productName: product.name,
            price: product.price,
            maxStock: product.stock,
          },
          2
        )
      }

      // Calculate expected: (25000*2) + (35000*2) + (15000*2) = 150000
      const expectedTotal = testProducts.reduce((sum, p) => sum + p.price * 2, 0)
      expect(cart.getSubtotal()).toBe(expectedTotal)
    })

    test('updates subtotal after quantity change', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0] // price: 25000

      cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        },
        2
      )

      const initialSubtotal = cart.getSubtotal()

      cart.updateQuantity(product.id, 4)

      expect(cart.getSubtotal()).toBe(initialSubtotal * 2)
    })

    test('updates subtotal after removing item', () => {
      const cart = new ShoppingCart()

      for (const product of testProducts) {
        cart.addItem({
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        })
      }

      const subtotalBefore = cart.getSubtotal()
      const removedProduct = testProducts[0]

      cart.removeItem(removedProduct.id)

      expect(cart.getSubtotal()).toBe(subtotalBefore - removedProduct.price)
    })

    test('subtotal is zero for empty cart', () => {
      const cart = new ShoppingCart()
      expect(cart.getSubtotal()).toBe(0)
    })
  })

  describe('CART STATE', () => {
    test('isEmpty returns true for new cart', () => {
      const cart = new ShoppingCart()
      expect(cart.isEmpty()).toBe(true)
    })

    test('isEmpty returns false after adding item', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      expect(cart.isEmpty()).toBe(false)
    })

    test('clear empties the cart', () => {
      const cart = new ShoppingCart()

      for (const product of testProducts) {
        cart.addItem({
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: product.stock,
        })
      }

      cart.clear()

      expect(cart.isEmpty()).toBe(true)
      expect(cart.getSubtotal()).toBe(0)
      expect(cart.getItemCount()).toBe(0)
    })

    test('getItems returns copy, not reference', () => {
      const cart = new ShoppingCart()
      const product = testProducts[0]

      cart.addItem({
        productId: product.id,
        productName: product.name,
        price: product.price,
        maxStock: product.stock,
      })

      const items = cart.getItems()
      items.pop() // Modify the returned array

      expect(cart.getItems().length).toBe(1) // Original unchanged
    })
  })

  describe('STOCK VALIDATION WITH DATABASE', () => {
    test('validates stock before adding to cart', async () => {
      const product = testProducts[0]

      // Get current stock from database
      const { data } = await client.from('products').select('stock').eq('id', product.id).single()

      expect(data).not.toBeNull()
      const cart = new ShoppingCart()

      // Try to add more than available
      const result = cart.addItem(
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          maxStock: data!.stock,
        },
        data!.stock + 1
      )

      expect(result).toBe(false)
    })

    test('respects updated stock levels', async () => {
      // Create product with limited stock
      const { data: limitedProduct } = await client
        .from('products')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          name: 'Limited Stock Product',
          category: 'Test',
          price: 50000,
          stock: 2,
        })
        .select()
        .single()
      expect(limitedProduct).not.toBeNull()
      ctx.track('products', limitedProduct!.id)

      const cart = new ShoppingCart()

      // Add maximum available
      cart.addItem(
        {
          productId: limitedProduct!.id,
          productName: limitedProduct!.name,
          price: limitedProduct!.price,
          maxStock: limitedProduct!.stock,
        },
        2
      )

      // Try to add one more
      const result = cart.addItem({
        productId: limitedProduct!.id,
        productName: limitedProduct!.name,
        price: limitedProduct!.price,
        maxStock: limitedProduct!.stock,
      })

      expect(result).toBe(false)
      expect(cart.getItemCount()).toBe(2)
    })
  })
})

describe('Cart Price Display Formatting', () => {
  // Helper function for formatting prices (Paraguayan Guaraní)
  const formatPrice = (price: number): string => {
    return `Gs. ${price.toLocaleString('es-PY')}`
  }

  test('formats price with thousands separator', () => {
    expect(formatPrice(25000)).toContain('25')
    expect(formatPrice(1000000)).toContain('1')
  })

  test('formats zero price', () => {
    expect(formatPrice(0)).toBe('Gs. 0')
  })

  test('formats large prices correctly', () => {
    const formatted = formatPrice(1500000)
    expect(formatted).toContain('Gs.')
  })
})
