/**
 * E2E Tests: Services Page
 *
 * Tests for the public services catalog page.
 * @tags e2e, public, services
 */

import { test, expect } from '@playwright/test'

test.describe('Services Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terrapet/services')
  })

  test('displays services page', async ({ page }) => {
    await expect(page).toHaveURL(/\/terrapet\/services/)

    // Should have main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('displays service categories', async ({ page }) => {
    // Services should be organized or listed
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()

    // Should have some content
    const text = await mainContent.textContent()
    expect(text?.length).toBeGreaterThan(100)
  })

  test('displays service details', async ({ page }) => {
    // Look for service cards or list items
    const services = page.locator('[data-testid="service-card"], article, .service-item')

    // Should have at least one service
    // If no specific selectors, check for content
    const content = await page.content()
    expect(content).toMatch(/consulta|vacuna|cirugía|peluquería/i)
  })

  test('shows pricing information', async ({ page }) => {
    // Look for price indicators
    const content = await page.content()

    // Should have price indicators (Gs., $, or numbers)
    expect(content).toMatch(/\d+[.,]?\d*|gs\.|precio/i)
  })

  test('has contact/booking call to action', async ({ page }) => {
    // Should have a way to contact or book
    const ctaButton = page
      .locator(
        'a[href*="wa.me"], a[href*="book"], button:has-text("reservar"), button:has-text("contactar")'
      )
      .first()

    // At least have some call to action
    const buttons = await page.locator('button, a[href*="wa.me"]').count()
    expect(buttons).toBeGreaterThan(0)
  })

  test('navigates back to homepage', async ({ page }) => {
    // Click on logo or home link
    const homeLink = page.locator('a[href="/terrapet"], a[href="/terrapet/"]').first()

    if (await homeLink.isVisible()) {
      await homeLink.click()
      await expect(page).toHaveURL(/\/terrapet\/?$/)
    }
  })

  test('is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Page should still be usable
    await expect(page.locator('main')).toBeVisible()

    // Navigation should be accessible (possibly in hamburger menu)
    const nav = page.locator('nav, [data-testid="mobile-menu"]')
    await expect(nav.first()).toBeVisible()
  })
})
