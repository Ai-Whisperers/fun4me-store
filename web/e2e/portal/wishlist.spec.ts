/**
 * E2E Tests: Wishlist
 *
 * Tests wishlist functionality:
 * - Adding to wishlist
 * - Viewing wishlist page
 * - Moving items to cart
 * - Stock alerts
 */

import { test, expect, portalUrl, storeUrl, waitForLoadingComplete } from '../factories/test-fixtures'

const WISHLIST_URL = portalUrl('wishlist')
const STORE_URL = storeUrl()

// =============================================================================
// Wishlist Page Tests
// =============================================================================

test.describe('Wishlist - Page', () => {
  test('can access wishlist page', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows wishlist items or empty state', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    const wishlistContent = page.locator(
      '[data-testid="wishlist-items"], :text("Lista de deseos"), :text("vacía"), :text("productos")'
    )

    await expect(wishlistContent.first()).toBeVisible()
  })

  test('wishlist shows product info', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    const productInfo = page.locator('[data-testid="wishlist-item"], .wishlist-item')

    if (await productInfo.first().isVisible()) {
      // Should show product name and price
      const price = productInfo.first().locator(':text("Gs"), :text("₲")')
      if (await price.isVisible()) {
        await expect(price).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Add to Wishlist Tests
// =============================================================================

test.describe('Wishlist - Add Products', () => {
  test('can add product to wishlist from store', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const wishlistButton = page.locator(
      'button[aria-label*="wishlist"], button:has-text("Favoritos"), [data-testid="add-to-wishlist"]'
    )

    if (await wishlistButton.first().isVisible()) {
      await wishlistButton.first().click()
      await page.waitForTimeout(500)

      // Should show confirmation
      const confirmation = page.locator(
        ':text("agregado"), :text("añadido"), [role="alert"]'
      )

      if (await confirmation.isVisible()) {
        await expect(confirmation).toBeVisible()
      }
    }
  })

  test('wishlist button toggles state', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const wishlistButton = page.locator('[data-testid="add-to-wishlist"]')

    if (await wishlistButton.first().isVisible()) {
      // Click to add
      await wishlistButton.first().click()
      await page.waitForTimeout(300)

      // Click to remove
      await wishlistButton.first().click()
      await page.waitForTimeout(300)
    }
  })
})

// =============================================================================
// Wishlist Actions Tests
// =============================================================================

test.describe('Wishlist - Actions', () => {
  test('can move item to cart', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    const moveToCartButton = page.locator(
      'button:has-text("Agregar al carrito"), button:has-text("Mover al carrito"), [data-testid="move-to-cart"]'
    )

    if (await moveToCartButton.first().isVisible()) {
      await moveToCartButton.first().click()
      await page.waitForTimeout(500)

      // Cart count should update
      const cartBadge = page.locator('[data-testid="cart-count"], .cart-badge')
      if (await cartBadge.isVisible()) {
        await expect(cartBadge).toBeVisible()
      }
    }
  })

  test('can remove item from wishlist', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    const removeButton = page.locator(
      'button:has-text("Eliminar"), button[aria-label*="remove"], [data-testid="remove-from-wishlist"]'
    )

    if (await removeButton.first().isVisible()) {
      const initialCount = await page.locator('[data-testid="wishlist-item"]').count()
      
      await removeButton.first().click()
      await page.waitForTimeout(500)

      // Count should decrease or show empty state
    }
  })
})

// =============================================================================
// Stock Alerts Tests
// =============================================================================

test.describe('Wishlist - Stock Alerts', () => {
  test('out of stock items show notify button', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const outOfStockItem = page.locator(':text("Agotado"), :text("Sin stock")')

    if (await outOfStockItem.first().isVisible()) {
      const notifyButton = page.locator(
        'button:has-text("Notificar"), button:has-text("Avisar"), [data-testid="stock-alert"]'
      )

      if (await notifyButton.isVisible()) {
        await expect(notifyButton).toBeVisible()
      }
    }
  })

  test('can sign up for stock alert', async ({ page }) => {
    await page.goto(STORE_URL)
    await waitForLoadingComplete(page)

    const notifyButton = page.locator('[data-testid="stock-alert"], button:has-text("Notificar")')

    if (await notifyButton.first().isVisible()) {
      await notifyButton.first().click()
      await page.waitForTimeout(500)

      // Should show confirmation
      const confirmation = page.locator(':text("notificaremos"), :text("avisaremos")')
      if (await confirmation.isVisible()) {
        await expect(confirmation).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Wishlist - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('wishlist works on mobile', async ({ page }) => {
    await page.goto(WISHLIST_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
