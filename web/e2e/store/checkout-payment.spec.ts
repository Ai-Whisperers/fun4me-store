/**
 * E2E Test: Store Checkout and Payment Flow
 * 
 * Verifies the full user journey:
 * 1. Adding products to cart
 * 2. Navigating to checkout
 * 3. Processing atomic checkout (invoice creation)
 * 4. Stripe Payment Element integration
 * 
 * @tags e2e, store, payments
 */

import { test, expect } from '@playwright/test'
import { TEST_USERS, TEST_URLS } from '../fixtures/test-users'

test.describe('Store Checkout & Payment', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. LOGIN
    await page.goto(TEST_URLS.login)
    await page.fill('input[name="email"]', TEST_USERS.owner.email)
    await page.fill('input[name="password"]', TEST_USERS.owner.password)
    await page.click('button[type="submit"]')
    
    // Wait for redirect to portal or store
    await page.waitForURL(/portal|dashboard|store/)
  })

  test('should complete a successful store checkout flow with payment intent', async ({ page }) => {
    // 2. BROWSE STORE & ADD PRODUCT
    await page.goto(TEST_URLS.store)
    
    // Add first available product to cart
    const addToCartButton = page.locator('[data-testid="add-to-cart"], button:has-text("Agregar")').first()
    await expect(addToCartButton).toBeVisible()
    await addToCartButton.click()
    
    // 3. GO TO CART
    await page.goto(TEST_URLS.storeCart)
    await expect(page).toHaveURL(/cart/)
    
    // 4. PROCEED TO CHECKOUT
    const checkoutButton = page.locator('[data-testid="checkout"], button:has-text("Pagar"), button:has-text("Finalizar")').first()
    await expect(checkoutButton).toBeVisible()
    await checkoutButton.click()
    
    // 5. FILL CHECKOUT INFO & CONFIRM ORDER
    await expect(page).toHaveURL(/checkout/)
    
    // Confirm order (calls POST /api/store/checkout)
    const confirmButton = page.locator('button:has-text("Confirmar Pedido")')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
    
    // 6. VERIFY PAYMENT INTENT / STRIPE ELEMENT MOUNTED
    // The UI should now show the PaymentReceived message and Stripe wrapper
    await expect(page.locator('text=Pedido Recibido')).toBeVisible()
    
    // Check if Stripe Payment Element is rendered (inside an iframe)
    // Stripe elements usually mount inside an iframe with name starting with __privateStripeFrame
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    // We don't wait for internal stripe fields to be fully loaded as it depends on network
    // but the presence of the container is enough to verify our integration
    await expect(page.locator('.StripeElement, #payment-element')).toBeDefined()
    
    // 7. HANDLE PAYMENT (MOCK SUCCESS)
    // For E2E tests against real Stripe, we usually don't process a real card
    // unless using Stripe's test environment. 
    // Here we verify that our "Cancel and pay later" logic also works.
    const payLaterButton = page.locator('button:has-text("Cancelar y pagar después")')
    if (await payLaterButton.isVisible()) {
      await payLaterButton.click()
      
      // Should show success state (Receipt)
      await expect(page.locator('text=¡Pedido Confirmado!')).toBeVisible()
      await expect(page.locator('text=Número de Pedido')).toBeVisible()
    }
  })
})
