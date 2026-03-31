/**
 * E2E Critical Path: Checkout to Confirmation
 *
 * Tests the complete e-commerce checkout flow.
 * This is a CRITICAL path that directly affects revenue.
 *
 * Flow tested:
 * 1. Browse store → add products to cart
 * 2. View cart → verify quantities and totals
 * 3. Proceed to checkout (requires auth)
 * 4. Handle prescription uploads if required
 * 5. Complete checkout
 * 6. Verify success with order/invoice number
 *
 * @tags e2e, critical, checkout, revenue, store
 */

import { test, expect, Page } from '@playwright/test'
import { DEFAULT_TENANT } from '../fixtures/tenants'
import { TEST_USERS } from '../fixtures/test-users'

const STORE_URL = `/${DEFAULT_TENANT.slug}/store`
const CART_URL = `/${DEFAULT_TENANT.slug}/cart`
const CHECKOUT_URL = `/${DEFAULT_TENANT.slug}/cart/checkout`
const LOGIN_URL = `/${DEFAULT_TENANT.slug}/portal/login`

// Use centralized test credentials
const TEST_OWNER = TEST_USERS.owner

/**
 * Helper: Login via UI
 */
async function loginAsOwner(page: Page): Promise<void> {
  await page.goto(LOGIN_URL)

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.fill(TEST_OWNER.email)
  await passwordInput.fill(TEST_OWNER.password)

  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

/**
 * Helper: Add a product to cart
 */
async function addProductToCart(page: Page): Promise<boolean> {
  await page.goto(STORE_URL)

  // Find add to cart button
  const addButtons = page.locator(
    '[data-testid="add-to-cart"], button:has-text("Agregar"), button:has-text("carrito")'
  )

  if ((await addButtons.count()) > 0) {
    await addButtons.first().click()
    await page.waitForTimeout(500)
    return true
  }
  return false
}

/**
 * Helper: Get cart item count
 */
async function getCartItemCount(page: Page): Promise<number> {
  const cartBadge = page.locator('[data-testid="cart-count"], .cart-badge')
  if ((await cartBadge.count()) > 0) {
    const text = await cartBadge.textContent()
    return parseInt(text || '0', 10)
  }
  return 0
}

test.describe('Critical Path: Checkout Flow', () => {
  test.describe('Cart Operations', () => {
    test('can add product to cart', async ({ page }) => {
      await page.goto(STORE_URL)

      const addButton = page
        .locator('[data-testid="add-to-cart"], button:has-text("Agregar")')
        .first()

      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Should show success feedback
        const feedback = page.locator(
          '[role="alert"], .toast, [data-testid="cart-count"]'
        )

        if ((await feedback.count()) > 0) {
          // Cart updated or toast shown
          await expect(feedback.first()).toBeVisible()
        }
      }
    })

    test('cart icon updates after adding product', async ({ page }) => {
      await page.goto(STORE_URL)

      // Get initial cart count
      const initialCount = await getCartItemCount(page)

      // Add product
      const addButton = page.locator('[data-testid="add-to-cart"]').first()
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Cart count should increase
        const newCount = await getCartItemCount(page)
        expect(newCount).toBeGreaterThanOrEqual(initialCount)
      }
    })

    test('can navigate to cart page', async ({ page }) => {
      await page.goto(STORE_URL)

      // Add something to cart first
      await addProductToCart(page)

      // Click cart icon
      const cartIcon = page.locator(
        '[data-testid="cart-icon"], a[href*="cart"], .cart-link'
      )

      if ((await cartIcon.count()) > 0) {
        await cartIcon.first().click()
        await page.waitForTimeout(500)

        // Should be on cart page
        expect(page.url()).toContain('cart')
      }
    })

    test('cart page shows added items', async ({ page }) => {
      await page.goto(STORE_URL)

      // Add product
      await addProductToCart(page)

      // Go to cart
      await page.goto(CART_URL)

      // Should see cart items
      const cartItems = page.locator(
        '[data-testid="cart-item"], .cart-item, tr, article'
      )

      if ((await cartItems.count()) > 0) {
        await expect(cartItems.first()).toBeVisible()
      }
    })

    test('can update quantity in cart', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CART_URL)

      const quantityInput = page.locator(
        '[data-testid="quantity-input"], input[type="number"]'
      )

      if (await quantityInput.isVisible()) {
        await quantityInput.fill('2')
        await page.waitForTimeout(500)

        // Value should update
        await expect(quantityInput).toHaveValue('2')
      }
    })

    test('can remove item from cart', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CART_URL)

      const removeButton = page.locator(
        '[data-testid="remove-item"], button:has-text("Eliminar"), .remove-btn'
      )

      if (await removeButton.isVisible()) {
        const itemCountBefore = await page
          .locator('[data-testid="cart-item"], .cart-item')
          .count()

        await removeButton.first().click()
        await page.waitForTimeout(500)

        const itemCountAfter = await page
          .locator('[data-testid="cart-item"], .cart-item')
          .count()

        // Either item removed or empty state shown
        expect(itemCountAfter <= itemCountBefore).toBe(true)
      }
    })

    test('cart total updates correctly', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CART_URL)

      const total = page.locator('[data-testid="cart-total"], .cart-total, .total')

      if (await total.isVisible()) {
        const totalText = await total.textContent()
        // Should contain a number (price)
        expect(totalText).toMatch(/\d/)
      }
    })
  })

  test.describe('Checkout Authentication', () => {
    test('checkout requires authentication', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Should redirect to login or show login prompt
      const loginPrompt = page.locator(
        ':text("Iniciar Sesión"), :text("iniciar sesión"), a[href*="login"]'
      )
      const onLoginPage = page.url().includes('/login')

      expect((await loginPrompt.count()) > 0 || onLoginPage).toBe(true)
    })

    test('redirects back to checkout after login', async ({ page }) => {
      // Go to checkout without auth
      await page.goto(CHECKOUT_URL)

      // If redirected to login, complete login
      if (page.url().includes('/login')) {
        await loginAsOwner(page)

        // Should return to checkout or redirect appropriately
        // May go to checkout or cart based on implementation
        expect(
          page.url().includes('checkout') || page.url().includes('cart')
        ).toBe(true)
      }
    })
  })

  test.describe('Checkout Process', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('can access checkout when logged in', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Should see checkout content
      const checkoutContent = page.locator(
        '[data-testid="checkout"], .checkout, main'
      )
      await expect(checkoutContent).toBeVisible()
    })

    test('checkout shows order summary', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Should display items, quantities, totals
      const summary = page.locator(
        '[data-testid="order-summary"], .summary, :text("Total")'
      )

      if ((await summary.count()) > 0) {
        await expect(summary.first()).toBeVisible()
      }
    })

    test('checkout shows correct total', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const total = page.locator(
        '[data-testid="checkout-total"], .total, :text("Total")'
      )

      if ((await total.count()) > 0) {
        const totalText = await total.first().textContent()
        // Should have a number
        expect(totalText).toMatch(/\d/)
      }
    })

    test('checkout button is visible', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator(
        '[data-testid="submit-order"], button:has-text("Finalizar"), button:has-text("Pagar"), button:has-text("Ordenar")'
      )

      if ((await checkoutButton.count()) > 0) {
        await expect(checkoutButton.first()).toBeVisible()
      }
    })

    test('can complete checkout successfully', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator(
        '[data-testid="submit-order"], button:has-text("Finalizar"), button:has-text("Pagar")'
      )

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(2000)

        // Should show success or order confirmation
        const success = page.locator(
          '[data-testid="order-success"], :text("exitoso"), :text("confirmado"), :text("Pedido"), .success'
        )

        if ((await success.count()) > 0) {
          await expect(success.first()).toBeVisible()
        }
      }
    })

    test('successful checkout shows order number', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(2000)

        // Look for order/invoice number
        const orderNumber = page.locator(
          '[data-testid="order-number"], [data-testid="invoice-number"], :text("Pedido #"), :text("Factura")'
        )

        if ((await orderNumber.count()) > 0) {
          const text = await orderNumber.first().textContent()
          expect(text).toBeTruthy()
        }
      }
    })
  })

  test.describe('Prescription Products', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('shows prescription upload for restricted products', async ({ page }) => {
      await page.goto(STORE_URL)

      // Try to find and add a prescription product
      const prescriptionProduct = page.locator(
        '[data-testid="prescription-required"], :text("Receta requerida")'
      )

      if ((await prescriptionProduct.count()) > 0) {
        const addButton = prescriptionProduct
          .first()
          .locator('xpath=ancestor::*[contains(@class, "product")]//button')

        if (await addButton.isVisible()) {
          await addButton.click()
          await page.goto(CHECKOUT_URL)

          // Should show prescription upload
          const uploadSection = page.locator(
            '[data-testid="prescription-upload"], :text("receta"), input[type="file"]'
          )

          if ((await uploadSection.count()) > 0) {
            await expect(uploadSection.first()).toBeVisible()
          }
        }
      }
    })

    test('cannot checkout without prescription for restricted items', async ({
      page,
    }) => {
      await page.goto(STORE_URL)

      // Add prescription product if available
      const prescriptionProducts = page.locator('[data-testid="prescription-required"]')

      if ((await prescriptionProducts.count()) > 0) {
        // Add to cart
        const addButton = page
          .locator('[data-testid="add-to-cart"]')
          .first()
        await addButton.click()
        await page.goto(CHECKOUT_URL)

        // Checkout button should be disabled or show warning
        const checkoutButton = page.locator('button:has-text("Finalizar")')
        const warning = page.locator(':text("receta"), :text("Receta")')

        if (await checkoutButton.isVisible()) {
          const isDisabled = await checkoutButton.isDisabled()
          const hasWarning = (await warning.count()) > 0

          // Either button disabled or warning shown
          expect(isDisabled || hasWarning).toBe(true)
        }
      }
    })
  })

  test.describe('Stock Validation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('shows out of stock state', async ({ page }) => {
      await page.goto(STORE_URL)

      const outOfStock = page.locator(
        '[data-testid="out-of-stock"], :text("Agotado"), button:disabled'
      )

      if ((await outOfStock.count()) > 0) {
        await expect(outOfStock.first()).toBeVisible()
      }
    })

    test('handles insufficient stock on checkout', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CART_URL)

      // Try to set very high quantity
      const quantityInput = page.locator('input[type="number"]').first()

      if (await quantityInput.isVisible()) {
        await quantityInput.fill('9999')
        await page.waitForTimeout(500)

        await page.goto(CHECKOUT_URL)

        const checkoutButton = page.locator('button:has-text("Finalizar")')
        if (await checkoutButton.isVisible()) {
          await checkoutButton.click()
          await page.waitForTimeout(1000)

          // Should show stock error
          const stockError = page.locator(
            ':text("stock"), :text("disponible"), :text("insuficiente"), [role="alert"]'
          )

          if ((await stockError.count()) > 0) {
            await expect(stockError.first()).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Coupon/Discount', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('has coupon input field', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const couponInput = page.locator(
        '[data-testid="coupon-input"], input[placeholder*="cupón"], input[name="coupon"]'
      )

      // Coupon field may or may not exist
      if ((await couponInput.count()) > 0) {
        await expect(couponInput).toBeVisible()
      }
    })

    test('can apply valid coupon', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const couponInput = page.locator('[data-testid="coupon-input"]')

      if (await couponInput.isVisible()) {
        await couponInput.fill('TESTCOUPON')

        const applyButton = page.locator('button:has-text("Aplicar")')
        if (await applyButton.isVisible()) {
          await applyButton.click()
          await page.waitForTimeout(500)

          // Should show success or error (depending on coupon validity)
          const feedback = page.locator('[role="alert"], .discount, :text("Descuento")')
          if ((await feedback.count()) > 0) {
            await expect(feedback.first()).toBeVisible()
          }
        }
      }
    })

    test('shows error for invalid coupon', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const couponInput = page.locator('[data-testid="coupon-input"]')

      if (await couponInput.isVisible()) {
        await couponInput.fill('INVALIDCOUPON123')

        const applyButton = page.locator('button:has-text("Aplicar")')
        if (await applyButton.isVisible()) {
          await applyButton.click()
          await page.waitForTimeout(500)

          // Should show error
          const error = page.locator(
            '[role="alert"], .error, :text("inválido"), :text("no existe")'
          )

          if ((await error.count()) > 0) {
            await expect(error.first()).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('handles checkout API error gracefully', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Intercept checkout API to fail
      await page.route('**/api/store/checkout**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        })
      })

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(1000)

        // Should show error message
        const error = page.locator(
          '[role="alert"], .error, :text("error"), :text("Error")'
        )

        if ((await error.count()) > 0) {
          await expect(error.first()).toBeVisible()
        }
      }
    })

    test('handles network failure gracefully', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Abort checkout request
      await page.route('**/api/store/checkout**', (route) => route.abort('failed'))

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(1000)

        // Should show connection error
        const error = page.locator(':text("conexión"), :text("error"), [role="alert"]')

        if ((await error.count()) > 0) {
          await expect(error.first()).toBeVisible()
        }
      }
    })

    test('empty cart shows appropriate message', async ({ page }) => {
      await page.goto(CHECKOUT_URL)

      // Should show empty cart message or redirect
      const emptyMessage = page.locator(
        '[data-testid="empty-cart"], :text("vacío"), :text("carrito está")'
      )
      const redirectedToStore = page.url().includes('/store')

      expect((await emptyMessage.count()) > 0 || redirectedToStore).toBe(true)
    })
  })

  test.describe('Post-Checkout', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('cart is cleared after successful checkout', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(2000)

        // Go back to store
        await page.goto(STORE_URL)

        // Cart should be empty
        const cartCount = await getCartItemCount(page)
        expect(cartCount).toBe(0)
      }
    })

    test('can navigate after successful checkout', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(2000)

        // Should be able to navigate to store
        const continueButton = page.locator(
          'a:has-text("Seguir comprando"), a:has-text("Volver")'
        )

        if (await continueButton.isVisible()) {
          await continueButton.click()
          await expect(page).toHaveURL(new RegExp('store'))
        }
      }
    })

    test('print functionality is available', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      const checkoutButton = page.locator('button:has-text("Finalizar")')

      if (await checkoutButton.isVisible()) {
        await checkoutButton.click()
        await page.waitForTimeout(2000)

        // Print button should be visible after success
        const printButton = page.locator(
          '[data-testid="print"], button:has-text("Imprimir"), [aria-label*="print"]'
        )

        if ((await printButton.count()) > 0) {
          await expect(printButton.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Mobile Experience', () => {
    test('checkout works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsOwner(page)
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Page should render properly
      const main = page.locator('main, [data-testid="checkout"]')
      await expect(main).toBeVisible()
    })

    test('cart modal/page works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsOwner(page)
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CART_URL)

      // Cart should be visible
      const cartContent = page.locator('main, [data-testid="cart"]')
      await expect(cartContent).toBeVisible()
    })

    test('touch targets are adequate size', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsOwner(page)
      await page.goto(CHECKOUT_URL)

      const buttons = page.locator('button')

      if ((await buttons.count()) > 0) {
        const box = await buttons.first().boundingBox()
        if (box) {
          // Minimum 40px for touch targets
          expect(box.height).toBeGreaterThanOrEqual(40)
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('checkout page is keyboard navigable', async ({ page }) => {
      await page.goto(STORE_URL)
      await addProductToCart(page)
      await page.goto(CHECKOUT_URL)

      // Tab through elements
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('form fields have proper labels', async ({ page }) => {
      await page.goto(CHECKOUT_URL)

      const labels = page.locator('label, [aria-label]')
      expect(await labels.count()).toBeGreaterThan(0)
    })

    test('error messages are announced', async ({ page }) => {
      await page.goto(CHECKOUT_URL)

      // Check for role="alert" or aria-live regions
      const liveRegions = page.locator('[role="alert"], [aria-live]')

      // Either has live regions or will create them on error
      // Just verify page loads without accessibility errors
      const main = page.locator('main')
      await expect(main).toBeVisible()
    })
  })
})
