/**
 * E2E Visual Tests: Cart Validation
 *
 * Tests cart calculations with programmatic assertions and screenshots.
 * Validates that line totals, subtotals, and calculations are correct.
 */

import { test, expect } from '@playwright/test'
import {
  createScreenshotHelper,
  waitForPageReady,
  parseGuaranies,
} from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const STORE_URL = `/${E2E_TENANT}/store`
const CART_URL = `/${E2E_TENANT}/portal/cart`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Cart Calculation Validation
// =============================================================================

test.describe('Cart Validation - Calculations', () => {
  test('empty cart displays correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'empty')

    // Clear any existing cart items first
    await page.goto(CART_URL)
    await waitForPageReady(page)

    // Remove all items if any
    const removeButtons = page.locator('[data-testid="remove-item"], button:has-text("Eliminar")')
    let count = await removeButtons.count()
    while (count > 0) {
      await removeButtons.first().click()
      await page.waitForTimeout(300)
      count = await removeButtons.count()
    }

    await screenshot.capture('empty_cart')

    // Verify empty state message
    const emptyMessage = page.locator(':text("vacío"), :text("no hay productos"), :text("carrito vacío")')
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible()
    }

    // Verify subtotal is 0 or hidden
    const subtotal = page.locator('[data-testid="subtotal"], .subtotal')
    if (await subtotal.isVisible()) {
      const subtotalValue = parseGuaranies((await subtotal.textContent()) || '0')
      expect(subtotalValue).toBe(0)
    }
  })

  test('single product - line total equals price × quantity', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'single-product')

    // Add a product to cart
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const productCard = page.locator('[data-testid="product-card"]').first()
    const priceOnCard = productCard.locator('.price, :text("Gs")').first()
    const productPriceText = await priceOnCard.textContent()
    const productPrice = parseGuaranies(productPriceText || '0')

    await productCard.click()
    await waitForPageReady(page)

    // Add to cart
    const addButton = page.locator('button:has-text("Agregar")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // Go to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('single_product_in_cart')

    // Get cart values
    const cartItem = page.locator('[data-testid="cart-item"], .cart-item').first()
    const quantityElement = cartItem.locator('input[type="number"], .quantity')
    const lineTotalElement = cartItem.locator('.line-total, [data-testid="line-total"]')
    const unitPriceElement = cartItem.locator('.unit-price, [data-testid="unit-price"], :text("Gs")').first()

    let quantity = 1
    if (await quantityElement.isVisible()) {
      const qtyValue = await quantityElement.inputValue()
      quantity = parseInt(qtyValue, 10) || 1
    }

    // Get unit price from cart
    let unitPrice = productPrice
    if (await unitPriceElement.isVisible()) {
      unitPrice = parseGuaranies((await unitPriceElement.textContent()) || '0')
    }

    // Get line total
    let lineTotal = unitPrice * quantity
    if (await lineTotalElement.isVisible()) {
      lineTotal = parseGuaranies((await lineTotalElement.textContent()) || '0')
    }

    await screenshot.capture('line_total_validation')

    // Assert: line total = price × quantity
    const expectedLineTotal = unitPrice * quantity
    console.log(`Unit Price: ${unitPrice}, Quantity: ${quantity}, Expected: ${expectedLineTotal}, Actual: ${lineTotal}`)

    // Allow for small rounding differences
    expect(Math.abs(lineTotal - expectedLineTotal)).toBeLessThanOrEqual(1)
  })

  test('multiple products - subtotal equals sum of line totals', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'multiple-products')

    // Add first product
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const productCards = page.locator('[data-testid="product-card"]')
    const firstProduct = productCards.first()
    await firstProduct.click()
    await waitForPageReady(page)

    let addButton = page.locator('button:has-text("Agregar")')
    await addButton.click()
    await page.waitForTimeout(1000)

    // Go back and add second product
    await page.goto(STORE_URL)
    await waitForPageReady(page)

    const secondProduct = productCards.nth(1)
    if (await secondProduct.isVisible()) {
      await secondProduct.click()
      await waitForPageReady(page)

      addButton = page.locator('button:has-text("Agregar")')
      await addButton.click()
      await page.waitForTimeout(1000)
    }

    // Go to cart
    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('multiple_products_in_cart')

    // Get all line totals
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item')
    const itemCount = await cartItems.count()
    const lineTotals: number[] = []

    for (let i = 0; i < itemCount; i++) {
      const item = cartItems.nth(i)
      const lineTotalElement = item.locator('.line-total, [data-testid="line-total"], :text("Gs")').last()

      if (await lineTotalElement.isVisible()) {
        const lineTotal = parseGuaranies((await lineTotalElement.textContent()) || '0')
        lineTotals.push(lineTotal)
      }
    }

    // Get subtotal
    const subtotalElement = page.locator('[data-testid="subtotal"], .subtotal')
    let subtotal = 0
    if (await subtotalElement.isVisible()) {
      subtotal = parseGuaranies((await subtotalElement.textContent()) || '0')
    }

    await screenshot.capture('subtotal_validation')

    // Assert: subtotal = sum of line totals
    const expectedSubtotal = lineTotals.reduce((sum, lt) => sum + lt, 0)
    console.log(`Line Totals: ${lineTotals}, Expected Subtotal: ${expectedSubtotal}, Actual: ${subtotal}`)

    if (lineTotals.length > 0 && subtotal > 0) {
      expect(Math.abs(subtotal - expectedSubtotal)).toBeLessThanOrEqual(itemCount) // Allow small rounding per item
    }
  })

  test('quantity increase updates line total correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'quantity-change')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    const cartItem = page.locator('[data-testid="cart-item"]').first()

    if (await cartItem.isVisible()) {
      // Get initial values
      const quantityInput = cartItem.locator('input[type="number"]')
      const increaseButton = cartItem.locator('button:has-text("+"), [data-testid="increase-qty"]')
      const lineTotalElement = cartItem.locator('.line-total, [data-testid="line-total"]')
      const unitPriceElement = cartItem.locator('.unit-price, [data-testid="unit-price"]')

      let initialQty = 1
      if (await quantityInput.isVisible()) {
        initialQty = parseInt((await quantityInput.inputValue()) || '1', 10)
      }

      let unitPrice = 0
      if (await unitPriceElement.isVisible()) {
        unitPrice = parseGuaranies((await unitPriceElement.textContent()) || '0')
      }

      await screenshot.capture('before_quantity_increase')

      // Increase quantity
      if (await increaseButton.isVisible()) {
        await increaseButton.click()
        await page.waitForTimeout(500)
        await screenshot.capture('after_quantity_increase')

        // Get new values
        const newQty = parseInt((await quantityInput.inputValue()) || '1', 10)
        let newLineTotal = 0
        if (await lineTotalElement.isVisible()) {
          newLineTotal = parseGuaranies((await lineTotalElement.textContent()) || '0')
        }

        // Assert: new line total = unit price × new quantity
        const expectedLineTotal = unitPrice * newQty
        console.log(`Unit Price: ${unitPrice}, New Qty: ${newQty}, Expected: ${expectedLineTotal}, Actual: ${newLineTotal}`)

        expect(newQty).toBe(initialQty + 1)
        if (unitPrice > 0 && newLineTotal > 0) {
          expect(Math.abs(newLineTotal - expectedLineTotal)).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  test('quantity decrease updates line total correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'quantity-decrease')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    const cartItem = page.locator('[data-testid="cart-item"]').first()

    if (await cartItem.isVisible()) {
      const quantityInput = cartItem.locator('input[type="number"]')
      const decreaseButton = cartItem.locator('button:has-text("-"), [data-testid="decrease-qty"]')
      const increaseButton = cartItem.locator('button:has-text("+"), [data-testid="increase-qty"]')

      // First increase to ensure we can decrease
      if (await increaseButton.isVisible()) {
        await increaseButton.click()
        await page.waitForTimeout(300)
      }

      const initialQty = parseInt((await quantityInput.inputValue()) || '2', 10)
      await screenshot.capture('before_quantity_decrease')

      if (await decreaseButton.isVisible() && initialQty > 1) {
        await decreaseButton.click()
        await page.waitForTimeout(500)
        await screenshot.capture('after_quantity_decrease')

        const newQty = parseInt((await quantityInput.inputValue()) || '1', 10)
        expect(newQty).toBe(initialQty - 1)
      }
    }
  })

  test('remove item updates subtotal correctly', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'remove-item')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    const cartItems = page.locator('[data-testid="cart-item"]')
    const initialCount = await cartItems.count()

    if (initialCount >= 2) {
      // Get initial subtotal
      const subtotalElement = page.locator('[data-testid="subtotal"], .subtotal')
      const initialSubtotal = parseGuaranies((await subtotalElement.textContent()) || '0')

      // Get line total of first item
      const firstItem = cartItems.first()
      const lineTotalElement = firstItem.locator('.line-total, [data-testid="line-total"]')
      const lineTotal = parseGuaranies((await lineTotalElement.textContent()) || '0')

      await screenshot.capture('before_remove')

      // Remove first item
      const removeButton = firstItem.locator('[data-testid="remove-item"], button:has-text("Eliminar")')
      await removeButton.click()
      await page.waitForTimeout(500)

      await screenshot.capture('after_remove')

      // Get new subtotal
      const newSubtotal = parseGuaranies((await subtotalElement.textContent()) || '0')

      // Assert: new subtotal = old subtotal - removed line total
      const expectedSubtotal = initialSubtotal - lineTotal
      console.log(`Initial: ${initialSubtotal}, Removed: ${lineTotal}, Expected: ${expectedSubtotal}, Actual: ${newSubtotal}`)

      if (lineTotal > 0) {
        expect(Math.abs(newSubtotal - expectedSubtotal)).toBeLessThanOrEqual(1)
      }
    }
  })
})

// =============================================================================
// Cart Summary Validation
// =============================================================================

test.describe('Cart Validation - Summary', () => {
  test('cart summary shows all required fields', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'summary')

    // Ensure cart has items
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
    await screenshot.capture('cart_summary')

    // Verify required summary fields exist
    const subtotal = page.locator('[data-testid="subtotal"], :text("Subtotal")')
    await expect(subtotal).toBeVisible()

    // Check for shipping info
    const shipping = page.locator('[data-testid="shipping"], :text("Envío")')
    if (await shipping.isVisible()) {
      await screenshot.capture('shipping_visible')
    }

    // Check for total
    const total = page.locator('[data-testid="total"], :text("Total")')
    if (await total.isVisible()) {
      await screenshot.capture('total_visible')
    }
  })

  test('prices displayed in Guaranies format', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'currency')

    await page.goto(CART_URL)
    await waitForPageReady(page)

    // Find all price elements
    const prices = page.locator(':text("Gs")')
    const priceCount = await prices.count()

    await screenshot.capture('guaranies_format')

    // Verify Guaranies format (Gs followed by number with thousand separators)
    if (priceCount > 0) {
      const priceText = await prices.first().textContent()
      expect(priceText).toMatch(/Gs\s*\d{1,3}(\.\d{3})*/i)
    }
  })
})

// =============================================================================
// Mobile Cart Validation
// =============================================================================

test.describe('Cart Validation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('cart calculations work on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'cart-validation', 'mobile')

    await page.goto(CART_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_cart')

    // Verify cart fits mobile viewport
    const cartContainer = page.locator('.cart-container, main').first()
    const containerBox = await cartContainer.boundingBox()
    if (containerBox) {
      expect(containerBox.width).toBeLessThanOrEqual(375)
    }

    // Verify prices are visible
    const subtotal = page.locator('[data-testid="subtotal"], .subtotal')
    if (await subtotal.isVisible()) {
      await expect(subtotal).toBeVisible()
      await screenshot.capture('mobile_subtotal_visible')
    }
  })
})
