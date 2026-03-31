import { test, expect } from '@playwright/test'

test.describe('Appointment Scheduling UI Responsiveness', () => {
  test('should display responsive layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/booking/schedule')
    // Assuming a desktop-specific element, e.g., a wide navigation bar
    await expect(page.locator('.desktop-nav')).toBeVisible()
    await expect(page.locator('.mobile-menu-button')).toBeHidden()
  })

  test('should display responsive layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/booking/schedule')
    // Assuming a tablet-specific element, e.g., a collapsed menu but wider content
    await expect(page.locator('.mobile-menu-button')).toBeVisible()
    await expect(page.locator('.desktop-nav')).toBeHidden()
    // Further assertions can be added here
  })

  test('should display responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/booking/schedule')
    // Assuming a mobile-specific element, e.g., a hamburger menu
    await expect(page.locator('.mobile-menu-button')).toBeVisible()
    await expect(page.locator('.desktop-nav')).toBeHidden()
    // Further assertions can be added here
  })
})
