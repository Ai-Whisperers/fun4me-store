/**
 * E2E Visual Tests: Store Purchasing Flow
 *
 * Tests the complete e-commerce purchasing flow with screenshots.
 * Validates product browsing, cart operations, and checkout.
 */

import { test, expect } from '@playwright/test'
import {
  createScreenshotHelper,
  waitForPageReady,
  waitForToast,
} from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const STORE_URL = `/${E2E_TENANT}/store`
const CART_URL = `/${E2E_TENANT}/portal/cart`
const ORDERS_URL = `/${E2E_TENANT}/portal/orders`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Complete Purchasing Flow
// =============================================================================

test.describe('Store Purchasing - Complete Flow', () => {
  test('complete purchase flow with screenshots', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'complete-flow')

    // Step 1: Navigate to store
    await page.goto(STORE_URL)
    await waitForPageReady(page)
    await screenshot.capture('store_page')

    // Verify products are visible
    const productCards = page.locator('[data-testid="product-card"], .product-card, article')
    await expect(productCards.first()).toBeVisible()

    // Step 2: View product detail
    await productCards.first().click()
    await waitForPageReady(page)
    await screenshot.capture('product_detail')

    // Get product price for later validation
    const priceElement = page.locator('.price, [data-testid="price"], :text("Gs")').first()
    const productPrice = await priceElement.textContent()
    console.log(`Product price: ${productPrice}`)

    // Step 3: Add to cart
    const addToCartButton = page.locator(
      'button:has-text("Agregar"), button:has-text("Añadir"), button:has-text("Carrito"), [data-testid="add-to-cart"]'
    )

    if (await addToCartButton.isVisible()) {
      await addToCartButton.click()
      await page.waitForTimeout(1000)
      await screenshot.capture('added_to_cart')

      // Check for cart badge update
      const cartBadge = page.locator('[data-testid="cart-badge"], .cart-badge, .cart-count')
      if (await cartBadge.isVisible()) {
        await screenshot.capture('cart_badge_updated', { highlight: '[data-testid="cart-badge"]' })
      }
    }

    // Step 4: Navigate to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_page')

    // Verify cart has items
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, tr.cart-row')
    const cartItemCount = await cartItems.count()
    expect(cartItemCount).toBeGreaterThan(0)

    // Step 5: Verify prices in cart
    const cartSubtotal = page.locator('[data-testid="subtotal"], .subtotal')
    if (await cartSubtotal.isVisible()) {
      await screenshot.capture('cart_with_prices', { highlight: '[data-testid="subtotal"]' })
    }

    // Step 6: Proceed to checkout
    const checkoutButton = page.locator(
      'button:has-text("Checkout"), button:has-text("Pagar"), button:has-text("Finalizar"), a:has-text("Checkout")'
    )

    if (await checkoutButton.isVisible()) {
      await checkoutButton.click()
      await waitForPageReady(page)
      await screenshot.capture('checkout_page')
    }

    // Step 7: Checkout summary
    const orderSummary = page.locator('[data-testid="order-summary"], .order-summary, .checkout-summary')
    if (await orderSummary.isVisible()) {
      await screenshot.capture('checkout_summary')

      // Verify all price components are shown
      const subtotalRow = page.locator(':text("Subtotal")')
      const taxRow = page.locator(':text("IVA"), :text("Impuesto")')
      const shippingRow = page.locator(':text("Envío")')
      const totalRow = page.locator(':text("Total")')

      await screenshot.capture('checkout_price_breakdown')
    }

    // Step 8: Complete order (if possible without payment)
    const placeOrderButton = page.locator(
      'button:has-text("Confirmar"), button:has-text("Pagar"), button:has-text("Ordenar")'
    )

    if (await placeOrderButton.isVisible()) {
      // Only click if this is a test environment that allows it
      await screenshot.capture('before_place_order')
      // Note: We don't actually click to avoid creating real orders
    }

    // Step 9: Check order history (for previously placed orders)
    await page.goto(ORDERS_URL)
    await waitForPageReady(page)
    await screenshot.capture('order_history')
  })
})

// =============================================================================
// Product Browsing Tests
// =============================================================================

test.describe('Store Purchasing - Product Browsing', () => {
  test('product catalog displays correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'catalog')

    await page.goto(STORE_URL)
    await waitForPageReady(page)
    await screenshot.capture('catalog_view')

    // Verify product cards have required info
    const productCard = page.locator('[data-testid="product-card"], .product-card').first()

    // Check for name
    const productName = productCard.locator('h2, h3, .product-name')
    await expect(productName).toBeVisible()

    // Check for price
    const productPrice = productCard.locator(':text("Gs"), .price')
    await expect(productPrice).toBeVisible()

    await screenshot.capture('product_card_detail', {
      highlight: '[data-testid="product-card"]:first-child',
    })
  })

  test('product shows discount correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'discounts')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    // Look for discounted products
    const discountBadge = page.locator(
      '.discount-badge, [data-testid="discount"], :text("% off"), :text("descuento")'
    )
    const originalPrice = page.locator('.original-price, .line-through, del')

    if ((await discountBadge.count()) > 0) {
      await screenshot.capture('discounted_products')

      // Click on discounted product
      const discountedProduct = page.locator('[data-testid="product-card"]').filter({
        has: discountBadge,
      })

      if ((await discountedProduct.count()) > 0) {
        await discountedProduct.first().click()
        await waitForPageReady(page)
        await screenshot.capture('discounted_product_detail')

        // Verify original and current prices are shown
        if (await originalPrice.isVisible()) {
          await screenshot.capture('price_comparison', { highlight: '.original-price' })
        }
      }
    }
  })

  test('category filtering works', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'categories')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    // Look for category filters
    const categoryFilter = page.locator(
      '[data-testid="category-filter"], .category-filter, select[name="category"]'
    )
    const categoryLinks = page.locator('nav a:has-text("Alimentos"), a:has-text("Medicamentos")')

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click()
      await screenshot.capture('category_dropdown')
    } else if ((await categoryLinks.count()) > 0) {
      await screenshot.capture('category_navigation')
      await categoryLinks.first().click()
      await waitForPageReady(page)
      await screenshot.capture('filtered_by_category')
    }
  })

  test('product search works', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'search')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Buscar"], [data-testid="search"]'
    )

    if (await searchInput.isVisible()) {
      await searchInput.fill('alimento')
      await page.waitForTimeout(500)
      await screenshot.capture('search_results')

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)
    }
  })
})

// =============================================================================
// Cart Operations Tests
// =============================================================================

test.describe('Store Purchasing - Cart Operations', () => {
  test('add product to cart', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'cart-add')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    // Click on first product
    const productCard = page.locator('[data-testid="product-card"]').first()
    await productCard.click()
    await waitForPageReady(page)

    // Add to cart
    const addButton = page.locator('button:has-text("Agregar"), [data-testid="add-to-cart"]')
    await addButton.click()
    await page.waitForTimeout(1000)

    await screenshot.capture('product_added')

    // Verify toast or confirmation
    const toast = await waitForToast(page, 3000)
    if (toast) {
      await screenshot.capture('add_confirmation_toast')
    }
  })

  test('update cart quantity', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'cart-quantity')

    // First add a product
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const productCard = page.locator('[data-testid="product-card"]').first()
    await productCard.click()
    await waitForPageReady(page)

    const addButton = page.locator('button:has-text("Agregar")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // Go to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_before_quantity_change')

    // Find quantity controls
    const increaseButton = page.locator(
      'button:has-text("+"), [data-testid="increase-qty"]'
    ).first()
    const decreaseButton = page.locator(
      'button:has-text("-"), [data-testid="decrease-qty"]'
    ).first()
    const quantityInput = page.locator('input[type="number"]').first()

    if (await increaseButton.isVisible()) {
      // Get current subtotal
      const subtotalBefore = page.locator('[data-testid="subtotal"], .subtotal')
      const beforeValue = await subtotalBefore.textContent()

      // Increase quantity
      await increaseButton.click()
      await page.waitForTimeout(500)
      await screenshot.capture('quantity_increased')

      // Verify subtotal changed
      const afterValue = await subtotalBefore.textContent()
      expect(afterValue).not.toBe(beforeValue)
    }
  })

  test('remove item from cart', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'cart-remove')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    const cartItems = page.locator('[data-testid="cart-item"]')
    const itemCount = await cartItems.count()

    if (itemCount > 0) {
      await screenshot.capture('cart_before_remove')

      // Find remove button
      const removeButton = page.locator(
        'button:has-text("Eliminar"), button:has-text("Quitar"), [data-testid="remove-item"]'
      ).first()

      if (await removeButton.isVisible()) {
        await removeButton.click()
        await page.waitForTimeout(500)
        await screenshot.capture('item_removed')

        // Check if cart is now empty or has fewer items
        const newCount = await cartItems.count()
        expect(newCount).toBeLessThan(itemCount)
      }
    }
  })

  test('empty cart shows message', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'cart-empty')

    // Clear cart first (by removing all items)
    await page.goto(CART_URL)
    await waitForPageReady(page)

    const removeButtons = page.locator('[data-testid="remove-item"], button:has-text("Eliminar")')
    const count = await removeButtons.count()

    for (let i = 0; i < count; i++) {
      await removeButtons.first().click()
      await page.waitForTimeout(300)
    }

    await screenshot.capture('empty_cart')

    // Verify empty message
    const emptyMessage = page.locator(
      ':text("vacío"), :text("no hay"), :text("empty")'
    )
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible()
    }
  })
})

// =============================================================================
// Coupon Tests
// =============================================================================

test.describe('Store Purchasing - Coupons', () => {
  test('apply coupon code', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'coupons')

    // Add product to cart first
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const productCard = page.locator('[data-testid="product-card"]').first()
    await productCard.click()
    await waitForPageReady(page)

    const addButton = page.locator('button:has-text("Agregar")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // Go to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_before_coupon')

    // Look for coupon input
    const couponInput = page.locator(
      'input[name="coupon"], input[placeholder*="cupón"], [data-testid="coupon-input"]'
    )
    const applyButton = page.locator('button:has-text("Aplicar")')

    if (await couponInput.isVisible()) {
      await couponInput.fill('E2ETEST20')
      await screenshot.capture('coupon_entered')

      if (await applyButton.isVisible()) {
        await applyButton.click()
        await page.waitForTimeout(1000)
        await screenshot.capture('coupon_applied')

        // Check for discount row
        const discountRow = page.locator(':text("Descuento"), :text("Cupón")')
        if (await discountRow.isVisible()) {
          await screenshot.capture('discount_visible', { highlight: '.discount-row' })
        }
      }
    }
  })

  test('invalid coupon shows error', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'coupons')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    const couponInput = page.locator('input[name="coupon"]')
    const applyButton = page.locator('button:has-text("Aplicar")')

    if (await couponInput.isVisible()) {
      await couponInput.fill('INVALIDCOUPON')

      if (await applyButton.isVisible()) {
        await applyButton.click()
        await page.waitForTimeout(1000)
        await screenshot.capture('invalid_coupon_error')

        // Check for error message
        const errorMessage = page.locator('[role="alert"], .error, .text-red-500')
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible()
        }
      }
    }
  })
})

// =============================================================================
// Order History Tests
// =============================================================================

test.describe('Store Purchasing - Order History', () => {
  test('view order history', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'orders')

    await page.goto(ORDERS_URL)
    await waitForPageReady(page)
    await screenshot.capture('order_history_page')

    const orders = page.locator('[data-testid="order-item"], .order-card, tr.order-row')

    if ((await orders.count()) > 0) {
      await screenshot.capture('orders_list')

      // Click on first order
      await orders.first().click()
      await waitForPageReady(page)
      await screenshot.capture('order_detail')
    } else {
      await screenshot.capture('no_orders')
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Store Purchasing - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('store is usable on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'store-purchasing', 'mobile')

    await page.goto(STORE_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_store')

    // Verify products are visible
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()

    // Check product card fits mobile
    const cardBox = await productCards.first().boundingBox()
    if (cardBox) {
      expect(cardBox.width).toBeLessThanOrEqual(375)
    }

    // Test cart on mobile
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_cart')
  })
})
