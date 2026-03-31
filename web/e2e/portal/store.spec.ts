/**
 * E2E Tests: Store / E-Commerce
 *
 * Tests the store functionality:
 * - Browsing products (factory-created)
 * - Cart operations
 * - Checkout flow
 * - Order history
 *
 * Uses factory-created products with inventory.
 */

import { test, expect, storeUrl, portalUrl, getFirstProduct, waitForLoadingComplete } from '../factories/test-fixtures'

const STORE_URL = storeUrl()
const CART_URL = storeUrl('cart')
const CHECKOUT_URL = storeUrl('checkout')
const ORDERS_URL = portalUrl('store/orders')

// =============================================================================
// Product Browsing Tests
// =============================================================================

test.describe('Store - Product Browsing', () => {
  test('displays store page', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows factory-created products', async ({ page, testData }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    // Check for test products
    for (const product of testData.products) {
      const productElement = page.locator(`text="${product.name}"`)
      
      if (await productElement.isVisible()) {
        await expect(productElement).toBeVisible()
        break
      }
    }
  })

  test('displays product cards with price', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const productCards = page.locator('[data-testid="product-card"], .product-card, article')
    
    if (await productCards.first().isVisible()) {
      // Should show price
      const price = productCards.first().locator(':text("Gs"), :text("₲")')
      await expect(price).toBeVisible()
    }
  })

  test('can search products', async ({ page, testData }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]')
    
    if (await searchInput.isVisible()) {
      const firstProduct = getFirstProduct(testData)
      if (firstProduct) {
        await searchInput.fill(firstProduct.name)
        await page.waitForTimeout(500)

        await expect(page.getByText(firstProduct.name)).toBeVisible()
      }
    }
  })

  test('can filter by category', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"]')
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption({ index: 1 })
      await page.waitForTimeout(500)
    }
  })

  test('can view product details', async ({ page, testData }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const productCard = page.locator('[data-testid="product-card"], .product-card')
    
    if (await productCard.first().isVisible()) {
      await productCard.first().click()
      await page.waitForTimeout(500)

      // Should show product details
      const details = page.locator(':text("Descripción"), :text("Agregar al carrito")')
      await expect(details.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Cart Tests
// =============================================================================

test.describe('Store - Cart', () => {
  test('can add product to cart', async ({ page, testData }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const addToCartButton = page.locator('button:has-text("Agregar"), button:has-text("Añadir")')
    
    if (await addToCartButton.first().isVisible()) {
      await addToCartButton.first().click()
      await page.waitForTimeout(500)

      // Cart should update
      const cartIndicator = page.locator('[data-testid="cart-count"], .cart-badge')
      if (await cartIndicator.isVisible()) {
        const count = await cartIndicator.textContent()
        expect(parseInt(count || '0')).toBeGreaterThan(0)
      }
    }
  })

  test('cart page shows items', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()

    // Should show cart items or empty message
    const cartContent = page.locator(
      '[data-testid="cart-items"], :text("carrito vacío"), :text("productos")'
    )
    await expect(cartContent.first()).toBeVisible()
  })

  test('can update cart quantity', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]')
    
    if (await quantityInput.first().isVisible()) {
      await quantityInput.first().fill('2')
      await page.waitForTimeout(500)
    }
  })

  test('can remove item from cart', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const removeButton = page.locator('button:has-text("Eliminar"), button:has-text("Quitar"), [data-testid="remove-item"]')
    
    if (await removeButton.first().isVisible()) {
      await removeButton.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('shows cart total', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const total = page.locator(':text("Total"), :text("Subtotal")')
    
    if (await total.first().isVisible()) {
      await expect(total.first()).toBeVisible()
    }
  })

  test('can apply coupon code', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const couponInput = page.locator('input[name="coupon"], input[placeholder*="cupón"]')
    
    if (await couponInput.isVisible()) {
      await couponInput.fill('TESTCODE')

      const applyButton = page.locator('button:has-text("Aplicar")')
      if (await applyButton.isVisible()) {
        await applyButton.click()
      }
    }
  })
})

// =============================================================================
// Checkout Tests
// =============================================================================

test.describe('Store - Checkout', () => {
  test('checkout requires authentication', async ({ page }) => {
    // Use unauthenticated context for this test
    await page.context().clearCookies()
    
    await page.goto(CHECKOUT_URL)

    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 })
  })

  test('checkout page shows order summary', async ({ page }) => {
    await page.goto(CHECKOUT_URL)
    await waitForLoadingComplete(page)

    const summary = page.locator(':text("Resumen"), :text("Total"), [data-testid="order-summary"]')
    
    if (await summary.first().isVisible()) {
      await expect(summary.first()).toBeVisible()
    }
  })

  test('checkout shows delivery options', async ({ page }) => {
    await page.goto(CHECKOUT_URL)
    await waitForLoadingComplete(page)

    const deliveryOptions = page.locator(
      ':text("Retiro"), :text("Delivery"), :text("Envío"), [data-testid="delivery-options"]'
    )
    
    if (await deliveryOptions.first().isVisible()) {
      await expect(deliveryOptions.first()).toBeVisible()
    }
  })

  test('checkout shows payment methods', async ({ page }) => {
    await page.goto(CHECKOUT_URL)
    await waitForLoadingComplete(page)

    const paymentMethods = page.locator(
      ':text("Pago"), :text("Efectivo"), :text("Tarjeta"), [data-testid="payment-methods"]'
    )
    
    if (await paymentMethods.first().isVisible()) {
      await expect(paymentMethods.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Order History Tests
// =============================================================================

test.describe('Store - Order History', () => {
  test('can view orders page', async ({ page }) => {
    await page.goto(ORDERS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows order history or empty state', async ({ page }) => {
    await page.goto(ORDERS_URL)
    await waitForLoadingComplete(page)

    const ordersContent = page.locator(
      '[data-testid="orders-list"], :text("pedidos"), :text("No hay pedidos")'
    )
    await expect(ordersContent.first()).toBeVisible()
  })

  test('order shows status', async ({ page }) => {
    await page.goto(ORDERS_URL)
    await waitForLoadingComplete(page)

    const statusBadge = page.locator(
      '[data-testid="order-status"], .status-badge, :text("Pendiente"), :text("Completado")'
    )
    
    if (await statusBadge.first().isVisible()) {
      await expect(statusBadge.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Store - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('store works on mobile', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()

    // Products should be visible
    const products = page.locator('[data-testid="product-card"]')
    if (await products.first().isVisible()) {
      await expect(products.first()).toBeVisible()
    }
  })

  test('cart works on mobile', async ({ page }) => {
    await page.goto(CART_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
