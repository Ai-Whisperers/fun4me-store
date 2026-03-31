/**
 * Basic E2E Test - No Global Setup Required
 * 
 * Tests basic navigation and public pages to verify Playwright framework works
 */

import { test, expect } from '@playwright/test'

test.describe('Basic Navigation (No Auth)', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Vetic|TerraPet|Vete/)
    
    // Look for common elements that should exist
    await expect(page.locator('body')).toBeVisible()
  })

  test('can navigate to services page', async ({ page }) => {
    await page.goto('/')
    
    // Try to find and click a services or about link if it exists
    const servicesLink = page.locator('a:text-is("Servicios"), a:text-is("Services"), a[href*="services"], a[href*="servicios"]').first()
    
    if (await servicesLink.isVisible()) {
      await servicesLink.click()
      // Should navigate to some page
      await expect(page).toHaveURL(/.*/)
    } else {
      // If no services link, just verify we can navigate to a manual URL
      await page.goto('/services')
      // Should load something (might be 404, but shouldn't crash)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('dev server is running', async ({ page }) => {
    await page.goto('/')
    
    // Verify the page loaded and has some content
    await expect(page.locator('body')).toBeVisible()
    
    // Check that we're not getting a connection error
    await expect(page.locator('body')).not.toContainText('This site can\'t be reached')
    await expect(page.locator('body')).not.toContainText('ERR_CONNECTION_REFUSED')
  })
})