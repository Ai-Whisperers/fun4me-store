/**
 * TerraPet E2E Tests - Multi-Tenant Isolation
 *
 * Verifies that TerraPet and Adris are completely isolated in the browser:
 * - Visual branding
 * - Content differences
 * - Theme colors
 * - Service offerings
 * - Data isolation
 */

import { test, expect } from '@playwright/test'

test.describe('TerraPet Multi-Tenant Isolation (E2E)', () => {
  test.describe('Visual Isolation', () => {
    test('terrapet shows earth tone colors', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Check primary color
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      // TerraPet uses #78866B (earth tone green)
      expect(primaryColor).toContain('78866B')
    })

    test('terrapet shows different colors', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Check primary color
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      // Adris should NOT use TerraPet's color
      expect(primaryColor).not.toContain('78866B')
    })

    test('terrapet shows TerraPet branding', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Verify TerraPet name appears
      const terrapetHeading = page.locator('h1, h2, .logo').filter({ hasText: /terrapet/i })
      await expect(terrapetHeading.first()).toBeVisible()
      
      // Verify NO Adris branding
      const terrapetHeading = page.locator('text=/^terrapet$/i')
      const count = await terrapetHeading.count()
      expect(count).toBe(0)
    })

    test('terrapet shows Adris branding', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Verify Adris name appears
      const terrapetHeading = page.locator('h1, h2, .logo').filter({ hasText: /terrapet/i })
      await expect(terrapetHeading.first()).toBeVisible()
      
      // Verify NO TerraPet branding
      const terrapetHeading = page.locator('text=/^terrapet$/i')
      const count = await terrapetHeading.count()
      expect(count).toBe(0)
    })

    test('tenant-specific content displays correctly', async ({ page }) => {
      // Check TerraPet
      await page.goto('/terrapet')
      const terrapetContent = await page.textContent('body')
      expect(terrapetContent).toBeTruthy()
      
      // Check Adris
      await page.goto('/terrapet')
      const terrapetContent = await page.textContent('body')
      expect(terrapetContent).toBeTruthy()
      
      // Content should be different
      expect(terrapetContent).not.toBe(terrapetContent)
    })
  })

  test.describe('Service Isolation', () => {
    test('terrapet shows 9 services', async ({ page }) => {
      await page.goto('/terrapet/services')
      
      // Wait for services
      await page.waitForSelector('text=/consulta|vacun/i', { timeout: 10000 })
      
      // Count services
      const services = page.locator('[data-testid="service-item"], .service-card, article').filter({ hasText: /consulta|vacun/i })
      const count = await services.count()
      
      // Should have around 9 services (may vary slightly)
      expect(count).toBeGreaterThanOrEqual(5)
      expect(count).toBeLessThanOrEqual(15)
    })

    test('terrapet shows different service count or offerings', async ({ page }) => {
      await page.goto('/terrapet/services')
      
      // Wait for services
      await page.waitForSelector('text=/servicio|consulta/i', { timeout: 10000 })
      
      // Get service list
      const terrapetServices = await page.textContent('body')
      
      // Now check TerraPet
      await page.goto('/terrapet/services')
      await page.waitForSelector('text=/servicio|consulta/i', { timeout: 10000 })
      
      const terrapetServices = await page.textContent('body')
      
      // Services content should differ
      expect(terrapetServices).not.toBe(terrapetServices)
    })

    test('services unique to terrapet visible', async ({ page }) => {
      await page.goto('/terrapet/services')
      
      // TerraPet specializes in dogs - may have dog-specific language
      const dogMention = page.locator('text=/perro|canino|dog/i')
      const count = await dogMention.count()
      
      expect(count).toBeGreaterThan(0)
    })

    test('home visit only in terrapet', async ({ page }) => {
      // Check TerraPet has home visit
      await page.goto('/terrapet/services')
      const terrapetHomeVisit = page.locator('text=/domicilio|casa/i')
      const terrapetCount = await terrapetHomeVisit.count()
      
      expect(terrapetCount).toBeGreaterThan(0)
      
      // Check if Adris has it (may or may not)
      await page.goto('/terrapet/services')
      const terrapetHomeVisit = page.locator('text=/domicilio|casa/i')
      const terrapetCount = await terrapetHomeVisit.count()
      
      // TerraPet should have at least as many mentions
      expect(terrapetCount).toBeGreaterThanOrEqual(terrapetCount)
    })

    test('booking creates for correct tenant', async ({ page }) => {
      // Navigate to TerraPet booking
      await page.goto('/terrapet/book')
      
      // URL should contain terrapet
      const url = page.url()
      expect(url).toContain('terrapet')
      expect(url).not.toContain('terrapet')
    })
  })

  test.describe('Contact Information Isolation', () => {
    test('terrapet shows correct contact information', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Find contact section
      const contactSection = page.locator('text=/contacto|teléfono|email/i').first()
      await contactSection.scrollIntoViewIfNeeded()
      
      // Should have TerraPet-specific contact info
      const bodyText = await page.textContent('body')
      expect(bodyText).toBeTruthy()
    })

    test('terrapet shows different contact information', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Get Adris contact info
      const terrapetContact = await page.textContent('footer, [data-testid="contact"]')
      
      // Get TerraPet contact info
      await page.goto('/terrapet')
      const terrapetContact = await page.textContent('footer, [data-testid="contact"]')
      
      // Contact info should be different
      expect(terrapetContact).not.toBe(terrapetContact)
    })
  })

  test.describe('Navigation Isolation', () => {
    test('terrapet navigation stays within /terrapet/*', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Click on services link
      await page.click('text=/servicios/i')
      
      // URL should still be under /terrapet/
      const url = page.url()
      expect(url).toMatch(/\/terrapet\//i)
      expect(url).not.toContain('/terrapet/')
    })

    test('terrapet navigation stays within /terrapet/*', async ({ page }) => {
      await page.goto('/terrapet')
      
      // Click on any internal link
      const internalLink = page.locator('a[href^="/terrapet"]').first()
      
      if (await internalLink.isVisible()) {
        await internalLink.click()
        
        // URL should still be under /terrapet/
        const url = page.url()
        expect(url).toMatch(/\/terrapet\//i)
        expect(url).not.toContain('/terrapet/')
      }
    })

    test('cannot access terrapet portal from terrapet context', async ({ page }) => {
      // Try to navigate to TerraPet portal from Adris
      await page.goto('/terrapet')
      
      // Directly navigate to terrapet portal
      await page.goto('/terrapet/portal')
      
      // URL should be /terrapet/portal, not /terrapet/
      const url = page.url()
      expect(url).toContain('terrapet')
      expect(url).not.toContain('terrapet')
    })
  })

  test.describe('Theme Isolation', () => {
    test('terrapet uses earth tone theme consistently', async ({ page }) => {
      await page.goto('/terrapet')
      
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      expect(primaryColor).toContain('78866B')
      
      // Navigate to another page
      await page.click('text=/servicios/i')
      
      // Theme should persist
      const primaryColorAfter = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      expect(primaryColorAfter).toContain('78866B')
    })

    test('theme changes when switching between tenants', async ({ page }) => {
      // Get TerraPet theme
      await page.goto('/terrapet')
      const terrapetPrimary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      // Get Adris theme
      await page.goto('/terrapet')
      const terrapetPrimary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      })
      
      // Themes should be different
      expect(terrapetPrimary).not.toBe(terrapetPrimary)
    })
  })

  test.describe('Data Isolation (Visual)', () => {
    test('terrapet appointment list shows only terrapet appointments', async ({ page }) => {
      // This requires authentication and test data
      // Skipped for now
      
      // await page.goto('/terrapet/portal/appointments')
      // All appointments should be for TerraPet
    })

    test('search results filtered by tenant', async ({ page }) => {
      // If there's a search functionality
      await page.goto('/terrapet')
      
      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="buscar"]').first()
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('consulta')
        await page.keyboard.press('Enter')
        
        // Results should be TerraPet-specific
        await page.waitForTimeout(1000)
        
        const url = page.url()
        expect(url).toContain('terrapet')
      }
    })
  })
})
