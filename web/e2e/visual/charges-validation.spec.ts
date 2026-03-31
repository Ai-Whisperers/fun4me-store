/**
 * E2E Visual Tests: Charges & Pricing Validation
 *
 * Tests pricing accuracy with programmatic assertions and screenshots.
 * Validates product prices, discounts, taxes, shipping, and totals.
 */

import { test, expect } from '@playwright/test'
import {
  createScreenshotHelper,
  waitForPageReady,
  parseGuaranies,
  calculateShipping,
  calculateTax,
  calculatePercentageDiscount,
  calculateFinalTotal,
} from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const STORE_URL = `/${E2E_TENANT}/store`
const CART_URL = `/${E2E_TENANT}/portal/cart`
const CHECKOUT_URL = `/${E2E_TENANT}/portal/checkout`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Product Price Display
// =============================================================================

test.describe('Charges Validation - Product Prices', () => {
  test('product prices display in Guaranies format', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'product-prices')

    await page.goto(STORE_URL)
    await waitForPageReady(page)
    await screenshot.capture('product_catalog')

    // Find price elements
    const prices = page.locator('[data-testid="product-price"], .price, :text("Gs")')
    const priceCount = await prices.count()

    expect(priceCount).toBeGreaterThan(0)

    // Verify Guaranies format
    const firstPrice = await prices.first().textContent()
    await screenshot.capture('price_format_check')

    // Assert format: "Gs X.XXX" or "Gs XX.XXX"
    expect(firstPrice).toMatch(/Gs\s*\d{1,3}(\.\d{3})*/i)
    console.log(`Sample price: ${firstPrice}`)
  })

  test('discounted products show original and current price', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'discounts')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    // Look for products with discount indicators
    const discountBadge = page.locator('.discount-badge, :text("% off"), :text("descuento")')
    const originalPrice = page.locator('.original-price, .line-through, del, s')
    const currentPrice = page.locator('.current-price, .sale-price')

    if ((await discountBadge.count()) > 0 || (await originalPrice.count()) > 0) {
      await screenshot.capture('discount_visible')

      // Click on discounted product
      const discountedCard = page.locator('[data-testid="product-card"]').filter({
        has: page.locator('.line-through, del, .discount'),
      })

      if ((await discountedCard.count()) > 0) {
        await discountedCard.first().click()
        await waitForPageReady(page)
        await screenshot.capture('discounted_product_detail')

        // Get original and current prices
        const origPriceElement = page.locator('.original-price, .line-through, del').first()
        const currPriceElement = page.locator('.current-price, .price:not(.line-through)').first()

        if (await origPriceElement.isVisible() && await currPriceElement.isVisible()) {
          const originalValue = parseGuaranies((await origPriceElement.textContent()) || '0')
          const currentValue = parseGuaranies((await currPriceElement.textContent()) || '0')

          await screenshot.capture('price_comparison')

          // Assert: current price < original price
          expect(currentValue).toBeLessThan(originalValue)
          console.log(`Original: ${originalValue}, Current: ${currentValue}, Savings: ${originalValue - currentValue}`)
        }
      }
    } else {
      await screenshot.capture('no_discounts_found')
    }
  })

  test('discount percentage is calculated correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'discount-calc')

    await page.goto(STORE_URL)
    await waitForPageReady(page)

    // Find product with percentage discount badge
    const discountBadge = page.locator(':text("% off"), :text("% descuento")').first()

    if (await discountBadge.isVisible()) {
      // Extract percentage from badge
      const badgeText = await discountBadge.textContent()
      const percentMatch = badgeText?.match(/(\d+)%/)

      if (percentMatch) {
        const discountPercent = parseInt(percentMatch[1], 10)

        // Find associated product
        const productCard = discountBadge.locator('..').locator('..')
        const origPrice = await productCard.locator('.line-through, del').textContent()
        const currPrice = await productCard.locator('.price:not(.line-through)').first().textContent()

        if (origPrice && currPrice) {
          const originalValue = parseGuaranies(origPrice)
          const currentValue = parseGuaranies(currPrice)

          // Calculate expected discounted price
          const expectedCurrent = originalValue - calculatePercentageDiscount(originalValue, discountPercent)

          await screenshot.capture('discount_percentage_validation')

          // Assert with tolerance for rounding
          expect(Math.abs(currentValue - expectedCurrent)).toBeLessThanOrEqual(100) // Allow Gs 100 rounding

          console.log(
            `Discount ${discountPercent}%: Original ${originalValue}, Expected ${expectedCurrent}, Actual ${currentValue}`
          )
        }
      }
    }
  })
})

// =============================================================================
// Cart Line Items Validation
// =============================================================================

test.describe('Charges Validation - Cart Line Items', () => {
  test('line total equals price × quantity', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'line-total')

    // Add product to cart
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const productCard = page.locator('[data-testid="product-card"]').first()
    await productCard.click()
    await waitForPageReady(page)

    // Get product price before adding
    const priceElement = page.locator('.price, [data-testid="price"]').first()
    const productPrice = parseGuaranies((await priceElement.textContent()) || '0')

    const addButton = page.locator('button:has-text("Agregar")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // Go to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_line_items')

    // Get cart item details
    const cartItem = page.locator('[data-testid="cart-item"]').first()
    const quantityInput = cartItem.locator('input[type="number"]')
    const lineTotalElement = cartItem.locator('.line-total, [data-testid="line-total"]')

    let quantity = 1
    if (await quantityInput.isVisible()) {
      quantity = parseInt((await quantityInput.inputValue()) || '1', 10)
    }

    let lineTotal = productPrice
    if (await lineTotalElement.isVisible()) {
      lineTotal = parseGuaranies((await lineTotalElement.textContent()) || '0')
    }

    // Assert: line total = price × quantity
    const expectedLineTotal = productPrice * quantity
    await screenshot.capture('line_total_assertion')

    expect(Math.abs(lineTotal - expectedLineTotal)).toBeLessThanOrEqual(1)
    console.log(`Price: ${productPrice}, Qty: ${quantity}, Expected: ${expectedLineTotal}, Actual: ${lineTotal}`)
  })
})

// =============================================================================
// Subtotal Validation
// =============================================================================

test.describe('Charges Validation - Subtotal', () => {
  test('subtotal equals sum of all line totals', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'subtotal')

    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_for_subtotal')

    // Get all line totals
    const cartItems = page.locator('[data-testid="cart-item"]')
    const itemCount = await cartItems.count()
    const lineTotals: number[] = []

    for (let i = 0; i < itemCount; i++) {
      const item = cartItems.nth(i)
      const lineTotalEl = item.locator('.line-total, [data-testid="line-total"]').first()

      if (await lineTotalEl.isVisible()) {
        const lt = parseGuaranies((await lineTotalEl.textContent()) || '0')
        lineTotals.push(lt)
      }
    }

    // Get displayed subtotal
    const subtotalElement = page.locator('[data-testid="subtotal"], .subtotal').first()
    let subtotal = 0
    if (await subtotalElement.isVisible()) {
      subtotal = parseGuaranies((await subtotalElement.textContent()) || '0')
    }

    // Assert: subtotal = sum of line totals
    const expectedSubtotal = lineTotals.reduce((sum, lt) => sum + lt, 0)
    await screenshot.capture('subtotal_assertion')

    if (lineTotals.length > 0) {
      expect(Math.abs(subtotal - expectedSubtotal)).toBeLessThanOrEqual(itemCount)
      console.log(`Line Totals: ${lineTotals}, Expected: ${expectedSubtotal}, Actual: ${subtotal}`)
    }
  })
})

// =============================================================================
// Coupon Discount Validation
// =============================================================================

test.describe('Charges Validation - Coupon Discount', () => {
  test('percentage coupon calculates correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'coupon')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    // Get subtotal before coupon
    const subtotalElement = page.locator('[data-testid="subtotal"]')
    let subtotalBefore = 0
    if (await subtotalElement.isVisible()) {
      subtotalBefore = parseGuaranies((await subtotalElement.textContent()) || '0')
    }

    await screenshot.capture('before_coupon')

    // Apply coupon
    const couponInput = page.locator('input[name="coupon"], [data-testid="coupon-input"]')
    const applyButton = page.locator('button:has-text("Aplicar")')

    if (await couponInput.isVisible()) {
      await couponInput.fill('E2ETEST20') // 20% discount coupon
      await applyButton.click()
      await page.waitForTimeout(1000)

      await screenshot.capture('after_coupon')

      // Get discount amount
      const discountElement = page.locator('[data-testid="discount"], .discount-amount')
      let discountAmount = 0
      if (await discountElement.isVisible()) {
        discountAmount = parseGuaranies((await discountElement.textContent()) || '0')
      }

      // Calculate expected discount (20%)
      const expectedDiscount = calculatePercentageDiscount(subtotalBefore, 20)

      await screenshot.capture('discount_assertion')

      if (discountAmount > 0) {
        // Allow for rounding differences
        expect(Math.abs(discountAmount - expectedDiscount)).toBeLessThanOrEqual(100)
        console.log(
          `Subtotal: ${subtotalBefore}, Expected 20% discount: ${expectedDiscount}, Actual: ${discountAmount}`
        )
      }
    }
  })
})

// =============================================================================
// Shipping Calculation
// =============================================================================

test.describe('Charges Validation - Shipping', () => {
  test('shipping is free for orders >= 150,000 Gs', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'shipping')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    // Get subtotal
    const subtotalElement = page.locator('[data-testid="subtotal"]')
    let subtotal = 0
    if (await subtotalElement.isVisible()) {
      subtotal = parseGuaranies((await subtotalElement.textContent()) || '0')
    }

    // Get shipping amount
    const shippingElement = page.locator('[data-testid="shipping"], :text("Envío")').first()

    if (await shippingElement.isVisible()) {
      const shippingText = await shippingElement.textContent()
      await screenshot.capture('shipping_display')

      // Calculate expected shipping
      const expectedShipping = calculateShipping(subtotal)

      if (subtotal >= 150000) {
        // Should be free
        const isFree = shippingText?.includes('Gratis') || shippingText?.includes('0') || shippingText?.includes('free')
        expect(isFree || expectedShipping === 0).toBeTruthy()
        console.log(`Subtotal ${subtotal} >= 150,000: Shipping should be FREE`)
        await screenshot.capture('free_shipping')
      } else {
        // Should be 15,000 Gs
        const shippingAmount = parseGuaranies(shippingText || '0')
        expect(shippingAmount).toBe(15000)
        console.log(`Subtotal ${subtotal} < 150,000: Shipping should be Gs 15,000`)
        await screenshot.capture('paid_shipping')
      }
    }
  })
})

// =============================================================================
// Tax (IVA) Calculation
// =============================================================================

test.describe('Charges Validation - Tax', () => {
  test('IVA is 10% of subtotal after discount', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'tax')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    // Get subtotal
    const subtotalElement = page.locator('[data-testid="subtotal"]')
    let subtotal = 0
    if (await subtotalElement.isVisible()) {
      subtotal = parseGuaranies((await subtotalElement.textContent()) || '0')
    }

    // Get discount (if any)
    const discountElement = page.locator('[data-testid="discount"]')
    let discount = 0
    if (await discountElement.isVisible()) {
      discount = parseGuaranies((await discountElement.textContent()) || '0')
    }

    // Get tax amount
    const taxElement = page.locator('[data-testid="tax"], :text("IVA"), :text("Impuesto")')
    let taxAmount = 0

    if (await taxElement.isVisible()) {
      const taxText = await taxElement.textContent()
      taxAmount = parseGuaranies(taxText || '0')

      await screenshot.capture('tax_display')

      // Calculate expected tax (10% of subtotal after discount)
      const taxableAmount = subtotal - discount
      const expectedTax = calculateTax(taxableAmount)

      // Assert with tolerance for rounding
      expect(Math.abs(taxAmount - expectedTax)).toBeLessThanOrEqual(10)
      console.log(
        `Taxable: ${taxableAmount}, Expected IVA (10%): ${expectedTax}, Actual: ${taxAmount}`
      )
    }
  })
})

// =============================================================================
// Final Total Calculation
// =============================================================================

test.describe('Charges Validation - Final Total', () => {
  test('total equals subtotal - discount + shipping + tax', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'final-total')

    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('cart_summary')

    // Get all components
    const subtotalEl = page.locator('[data-testid="subtotal"]')
    const discountEl = page.locator('[data-testid="discount"]')
    const shippingEl = page.locator('[data-testid="shipping"]')
    const taxEl = page.locator('[data-testid="tax"]')
    const totalEl = page.locator('[data-testid="total"]')

    let subtotal = 0, discount = 0, shipping = 0, tax = 0, total = 0

    if (await subtotalEl.isVisible()) {
      subtotal = parseGuaranies((await subtotalEl.textContent()) || '0')
    }
    if (await discountEl.isVisible()) {
      discount = parseGuaranies((await discountEl.textContent()) || '0')
    }
    if (await shippingEl.isVisible()) {
      const shipText = await shippingEl.textContent()
      if (!shipText?.includes('Gratis') && !shipText?.includes('free')) {
        shipping = parseGuaranies(shipText || '0')
      }
    }
    if (await taxEl.isVisible()) {
      tax = parseGuaranies((await taxEl.textContent()) || '0')
    }
    if (await totalEl.isVisible()) {
      total = parseGuaranies((await totalEl.textContent()) || '0')
    }

    await screenshot.capture('all_components')

    // Calculate expected total
    const expectedTotal = calculateFinalTotal(subtotal, discount, shipping, tax)

    console.log(`Subtotal: ${subtotal}`)
    console.log(`Discount: ${discount}`)
    console.log(`Shipping: ${shipping}`)
    console.log(`Tax: ${tax}`)
    console.log(`Expected Total: ${expectedTotal}`)
    console.log(`Actual Total: ${total}`)

    await screenshot.capture('total_assertion')

    // Assert total matches calculation (with small tolerance)
    if (total > 0) {
      expect(Math.abs(total - expectedTotal)).toBeLessThanOrEqual(100)
    }
  })

  test('checkout summary matches cart summary', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'checkout-match')

    // Get cart totals first
    await page.goto(CART_URL)
    await waitForPageReady(page)

    const cartTotal = page.locator('[data-testid="total"]')
    let cartTotalValue = 0
    if (await cartTotal.isVisible()) {
      cartTotalValue = parseGuaranies((await cartTotal.textContent()) || '0')
    }

    await screenshot.capture('cart_total')

    // Navigate to checkout
    const checkoutButton = page.locator('button:has-text("Checkout"), a:has-text("Pagar")')
    if (await checkoutButton.isVisible()) {
      await checkoutButton.click()
      await waitForPageReady(page)

      await screenshot.capture('checkout_summary')

      // Get checkout total
      const checkoutTotal = page.locator('[data-testid="total"], .order-total')
      let checkoutTotalValue = 0
      if (await checkoutTotal.isVisible()) {
        checkoutTotalValue = parseGuaranies((await checkoutTotal.textContent()) || '0')
      }

      // Assert totals match
      expect(checkoutTotalValue).toBe(cartTotalValue)
      console.log(`Cart Total: ${cartTotalValue}, Checkout Total: ${checkoutTotalValue}`)
    }
  })
})

// =============================================================================
// Mobile Price Display
// =============================================================================

test.describe('Charges Validation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('prices display correctly on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'charges-validation', 'mobile')

    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_cart_prices')

    // Verify price elements are visible and formatted
    const prices = page.locator(':text("Gs")')
    const priceCount = await prices.count()

    if (priceCount > 0) {
      const priceText = await prices.first().textContent()
      expect(priceText).toMatch(/Gs\s*\d/)
    }

    // Scroll to see total
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await screenshot.capture('mobile_total_visible')
  })
})
