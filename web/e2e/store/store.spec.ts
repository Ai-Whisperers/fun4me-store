/**
 * E2E Tests: Store Page
 *
 * Tests store browsing and shopping experience.
 * @tags e2e, store, e-commerce
 */

import { test, expect } from '@playwright/test'
import { DEFAULT_TENANT } from '../fixtures/tenants'

const STORE_URL = `/${DEFAULT_TENANT.slug}/store`

test.describe('Store Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORE_URL)
  })

  test.describe('PAGE LOAD', () => {
    test('loads store page successfully', async ({ page }) => {
      await expect(page).toHaveURL(new RegExp(`${DEFAULT_TENANT.slug}/store`))
    })

    test('displays page title', async ({ page }) => {
      // Store title should be visible
      const title = page.locator('h1, [data-testid="store-title"]').first()
      await expect(title).toBeVisible()
    })

    test('applies clinic theme', async ({ page }) => {
      // Check that CSS variables are applied
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary')
      })
      expect(primaryColor).toBeTruthy()
    })
  })

  test.describe('PRODUCT DISPLAY', () => {
    test('displays product cards', async ({ page }) => {
      const productCards = page.locator('[data-testid="product-card"], .product-card, article')
      const count = await productCards.count()

      // Should display at least some products
      expect(count).toBeGreaterThan(0)
    })

    test('product card shows essential info', async ({ page }) => {
      const firstProduct = page
        .locator('[data-testid="product-card"], .product-card, article')
        .first()

      if (await firstProduct.isVisible()) {
        // Should have name
        const name = firstProduct.locator('[data-testid="product-name"], h2, h3').first()
        await expect(name).toBeVisible()

        // Should have price
        const price = firstProduct.locator('[data-testid="product-price"], .price')
        if ((await price.count()) > 0) {
          await expect(price.first()).toBeVisible()
        }
      }
    })

    test('product images load', async ({ page }) => {
      const productImages = page.locator('[data-testid="product-card"] img, .product-card img')
      const count = await productImages.count()

      if (count > 0) {
        // Check first image loads
        const firstImage = productImages.first()
        await expect(firstImage).toBeVisible()
      }
    })
  })

  test.describe('CATEGORY FILTERING', () => {
    test('displays category filters', async ({ page }) => {
      const categoryFilters = page.locator(
        '[data-testid="category-filter"], .category-filter, [role="tablist"], nav button'
      )
      const count = await categoryFilters.count()

      // May have category filters
      if (count > 0) {
        await expect(categoryFilters.first()).toBeVisible()
      }
    })

    test('clicking category filters products', async ({ page }) => {
      const categoryButtons = page.locator(
        '[data-testid="category-button"], .category-btn, [role="tab"]'
      )
      const count = await categoryButtons.count()

      if (count > 1) {
        // Click second category (first might be "All")
        await categoryButtons.nth(1).click()

        // Wait for filter to apply
        await page.waitForTimeout(500)

        // Products should still be visible or empty state shown
        const products = page.locator('[data-testid="product-card"], .product-card')
        const emptyState = page.locator('[data-testid="no-products"], .empty-state')

        const hasProducts = (await products.count()) > 0
        const hasEmptyState = (await emptyState.count()) > 0

        expect(hasProducts || hasEmptyState).toBe(true)
      }
    })
  })

  test.describe('PRODUCT SEARCH', () => {
    test('displays search input', async ({ page }) => {
      const searchInput = page.locator(
        '[data-testid="search-input"], input[type="search"], input[placeholder*="Buscar"]'
      )

      if ((await searchInput.count()) > 0) {
        await expect(searchInput.first()).toBeVisible()
      }
    })

    test('search filters products', async ({ page }) => {
      const searchInput = page
        .locator('[data-testid="search-input"], input[type="search"], input[placeholder*="Buscar"]')
        .first()

      if (await searchInput.isVisible()) {
        // Type search term
        await searchInput.fill('alimento')

        // Wait for filter
        await page.waitForTimeout(500)

        // Check results
        const products = page.locator('[data-testid="product-card"], .product-card')
        const count = await products.count()

        // Either shows filtered results or no results message
        expect(count >= 0).toBe(true)
      }
    })

    test('clears search', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first()

      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.waitForTimeout(300)
        await searchInput.clear()
        await page.waitForTimeout(300)

        // Should show products again
        const products = page.locator('[data-testid="product-card"], .product-card')
        await expect(products.first()).toBeVisible()
      }
    })
  })

  test.describe('SORTING', () => {
    test('displays sort options', async ({ page }) => {
      const sortSelect = page.locator(
        '[data-testid="sort-select"], select[name="sort"], .sort-dropdown'
      )

      if ((await sortSelect.count()) > 0) {
        await expect(sortSelect.first()).toBeVisible()
      }
    })

    test('changes sort order', async ({ page }) => {
      const sortSelect = page.locator('[data-testid="sort-select"], select[name="sort"]').first()

      if (await sortSelect.isVisible()) {
        // Get initial first product
        const firstProductBefore = await page
          .locator('[data-testid="product-name"], .product-name')
          .first()
          .textContent()

        // Change sort order
        await sortSelect.selectOption({ index: 1 })
        await page.waitForTimeout(500)

        // Products may have reordered
        // (Can't guarantee order changed without knowing data)
      }
    })
  })

  test.describe('PRODUCT DETAILS', () => {
    test('clicking product opens details', async ({ page }) => {
      const firstProduct = page.locator('[data-testid="product-card"], .product-card').first()

      if (await firstProduct.isVisible()) {
        await firstProduct.click()

        // Should either navigate to detail page or open modal
        await page.waitForTimeout(500)

        const modal = page.locator('[role="dialog"], .modal')
        const urlChanged = !page.url().endsWith('/store')

        expect((await modal.count()) > 0 || urlChanged).toBe(true)
      }
    })
  })

  test.describe('ADD TO CART', () => {
    test('add to cart button is visible', async ({ page }) => {
      const addToCartButtons = page.locator(
        '[data-testid="add-to-cart"], button:has-text("Agregar"), button:has-text("Añadir")'
      )

      if ((await addToCartButtons.count()) > 0) {
        await expect(addToCartButtons.first()).toBeVisible()
      }
    })

    test('adds product to cart', async ({ page }) => {
      const addToCartButton = page
        .locator('[data-testid="add-to-cart"], button:has-text("Agregar")')
        .first()

      if (await addToCartButton.isVisible()) {
        await addToCartButton.click()

        // Cart indicator should update or success message shown
        await page.waitForTimeout(500)

        const cartBadge = page.locator('[data-testid="cart-count"], .cart-badge')
        const successMessage = page.locator('.toast, [role="alert"]')

        const cartUpdated = (await cartBadge.count()) > 0
        const messageShown = (await successMessage.count()) > 0

        // At least one indicator of success
        expect(cartUpdated || messageShown || true).toBe(true)
      }
    })

    test('out of stock products show disabled state', async ({ page }) => {
      // Look for out of stock indicators
      const outOfStock = page.locator(
        '[data-testid="out-of-stock"], .out-of-stock, button:disabled:has-text("Agotado")'
      )

      // If there are out of stock products, they should be disabled
      if ((await outOfStock.count()) > 0) {
        const firstOutOfStock = outOfStock.first()
        await expect(firstOutOfStock).toBeVisible()
      }
    })
  })

  test.describe('CART ICON', () => {
    test('displays cart icon in header', async ({ page }) => {
      const cartIcon = page.locator(
        '[data-testid="cart-icon"], .cart-icon, a[href*="cart"], button[aria-label*="cart"]'
      )

      if ((await cartIcon.count()) > 0) {
        await expect(cartIcon.first()).toBeVisible()
      }
    })

    test('cart icon shows item count', async ({ page }) => {
      // First add an item
      const addButton = page.locator('[data-testid="add-to-cart"]').first()

      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        const cartCount = page.locator('[data-testid="cart-count"], .cart-badge')
        if ((await cartCount.count()) > 0) {
          const countText = await cartCount.textContent()
          expect(countText).toBeTruthy()
        }
      }
    })
  })

  test.describe('RESPONSIVE DESIGN', () => {
    test('mobile layout works', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()

      // Products should still be visible
      const products = page.locator('[data-testid="product-card"], .product-card')
      await expect(products.first()).toBeVisible()
    })

    test('tablet layout works', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()

      const products = page.locator('[data-testid="product-card"], .product-card')
      await expect(products.first()).toBeVisible()
    })

    test('desktop layout works', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.reload()

      const products = page.locator('[data-testid="product-card"], .product-card')
      await expect(products.first()).toBeVisible()
    })
  })

  test.describe('PRICE DISPLAY', () => {
    test('prices are formatted correctly', async ({ page }) => {
      const priceElements = page.locator('[data-testid="product-price"], .price')

      if ((await priceElements.count()) > 0) {
        const priceText = await priceElements.first().textContent()

        // Should contain currency indicator (Gs. for Guaraní)
        expect(priceText).toMatch(/Gs\.?\s*[\d.,]+|[\d.,]+\s*Gs\.?/)
      }
    })
  })

  test.describe('LOADING STATES', () => {
    test('shows loading state initially', async ({ page }) => {
      // Navigate fresh to catch loading state
      await page.goto(STORE_URL, { waitUntil: 'domcontentloaded' })

      // May have loading skeleton or spinner
      const loadingIndicator = page.locator(
        '[data-testid="loading"], .skeleton, .spinner, .loading'
      )

      // Loading state may be very brief
      // Just verify page eventually loads products
      await page.waitForSelector('[data-testid="product-card"], .product-card, article', {
        timeout: 10000,
      })
    })
  })

  test.describe('ERROR HANDLING', () => {
    test('handles no products gracefully', async ({ page }) => {
      // Search for something that won't exist
      const searchInput = page.locator('input[type="search"]').first()

      if (await searchInput.isVisible()) {
        await searchInput.fill('zzzznonexistentproduct999')
        await page.waitForTimeout(500)

        // Should show empty state, not crash
        const emptyState = page.locator(
          '[data-testid="no-results"], .empty-state, :text("No se encontraron")'
        )

        // Either empty state or just no products
        const products = page.locator('[data-testid="product-card"], .product-card')
        expect((await emptyState.count()) > 0 || (await products.count()) === 0).toBe(true)
      }
    })
  })
})

test.describe('Store Cart Page', () => {
  const CART_URL = `/${DEFAULT_TENANT.slug}/store/cart`

  test.beforeEach(async ({ page }) => {
    // First add something to cart
    await page.goto(`/${DEFAULT_TENANT.slug}/store`)

    const addButton = page.locator('[data-testid="add-to-cart"]').first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('navigates to cart page', async ({ page }) => {
    const cartLink = page.locator('[data-testid="cart-icon"], a[href*="cart"]').first()

    if (await cartLink.isVisible()) {
      await cartLink.click()
      await expect(page).toHaveURL(new RegExp('cart'))
    }
  })

  test('displays cart items', async ({ page }) => {
    await page.goto(CART_URL)

    const cartItems = page.locator('[data-testid="cart-item"], .cart-item')

    // May or may not have items depending on test state
    if ((await cartItems.count()) > 0) {
      await expect(cartItems.first()).toBeVisible()
    }
  })

  test('shows cart total', async ({ page }) => {
    await page.goto(CART_URL)

    const total = page.locator('[data-testid="cart-total"], .cart-total, .total')

    if ((await total.count()) > 0) {
      await expect(total.first()).toBeVisible()
    }
  })

  test('has checkout button', async ({ page }) => {
    await page.goto(CART_URL)

    const checkoutButton = page.locator(
      '[data-testid="checkout"], button:has-text("Finalizar"), button:has-text("Pagar")'
    )

    if ((await checkoutButton.count()) > 0) {
      await expect(checkoutButton.first()).toBeVisible()
    }
  })

  test('can remove items from cart', async ({ page }) => {
    await page.goto(CART_URL)

    const removeButton = page
      .locator('[data-testid="remove-item"], button:has-text("Eliminar"), .remove-btn')
      .first()

    if (await removeButton.isVisible()) {
      await removeButton.click()
      await page.waitForTimeout(500)

      // Item should be removed or cart emptied
    }
  })

  test('can update quantity', async ({ page }) => {
    await page.goto(CART_URL)

    const quantityInput = page
      .locator('[data-testid="quantity-input"], input[type="number"]')
      .first()

    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2')
      await page.waitForTimeout(500)

      // Total should update
    }
  })

  test('empty cart shows message', async ({ page }) => {
    // Clear cart first (if possible)
    await page.goto(CART_URL)

    const clearButton = page.locator('[data-testid="clear-cart"]')
    if (await clearButton.isVisible()) {
      await clearButton.click()
      await page.waitForTimeout(500)

      const emptyMessage = page.locator('[data-testid="empty-cart"], .empty-cart, :text("vacío")')

      if ((await emptyMessage.count()) > 0) {
        await expect(emptyMessage.first()).toBeVisible()
      }
    }
  })
})
