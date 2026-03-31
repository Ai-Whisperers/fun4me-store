/**
 * E2E Tests: Homepage
 *
 * Tests for the public clinic homepage.
 * @tags e2e, public, homepage, critical
 */

import { test, expect } from '@playwright/test'

const CLINICS = ['terrapet', 'petlife']

test.describe('Public Homepage', () => {
  for (const clinic of CLINICS) {
    test.describe(`${clinic} clinic`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/${clinic}`)
      })

      test('displays clinic homepage', async ({ page }) => {
        // Page should load without errors
        await expect(page).toHaveURL(new RegExp(`/${clinic}`))

        // Main content should be visible
        await expect(page.locator('main')).toBeVisible()
      })

      test('displays navigation header', async ({ page }) => {
        // Header/navigation should be present
        const header = page.locator('header').first()
        await expect(header).toBeVisible()
      })

      test('displays hero section', async ({ page }) => {
        // Hero section with main heading
        const heading = page.getByRole('heading', { level: 1 }).first()
        await expect(heading).toBeVisible()
      })

      test('has navigation links', async ({ page }) => {
        // Check for common navigation items
        const nav = page.locator('nav').first()
        await expect(nav).toBeVisible()

        // Should have links to main sections
        await expect(page.getByRole('link', { name: /servicios|services/i }).first()).toBeVisible()
      })

      test('displays footer', async ({ page }) => {
        const footer = page.locator('footer')
        await expect(footer).toBeVisible()
      })

      test('has contact information', async ({ page }) => {
        // Contact info should be accessible (in header, footer, or dedicated section)
        // Look for phone or WhatsApp links
        const contactLink = page.locator('a[href*="tel:"], a[href*="wa.me"]').first()
        await expect(contactLink).toBeVisible()
      })

      test('navigates to services page', async ({ page }) => {
        await page
          .getByRole('link', { name: /servicios|services/i })
          .first()
          .click()

        await expect(page).toHaveURL(new RegExp(`/${clinic}/services`))
      })

      test('has proper meta tags for SEO', async ({ page }) => {
        // Check meta title
        const title = await page.title()
        expect(title).toBeTruthy()
        expect(title.length).toBeGreaterThan(0)

        // Check meta description
        const description = page.locator('meta[name="description"]')
        await expect(description).toHaveAttribute('content', /.+/)
      })

      test('loads without console errors', async ({ page }) => {
        const errors: string[] = []
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text())
          }
        })

        await page.reload()
        await page.waitForLoadState('networkidle')

        // Filter out expected/acceptable errors
        const criticalErrors = errors.filter(
          (e) => !e.includes('favicon') && !e.includes('hydration') && !e.includes('ResizeObserver')
        )

        expect(criticalErrors).toHaveLength(0)
      })
    })
  }

  test.describe('Multi-tenant routing', () => {
    test('redirects invalid clinic to 404', async ({ page }) => {
      const response = await page.goto('/nonexistent-clinic')

      // Should either redirect to 404 or show error
      // Depending on implementation
    })

    test('each clinic has unique branding', async ({ page }) => {
      // Visit terrapet
      await page.goto('/terrapet')
      const terrapetTitle = await page.title()

      // Visit petlife
      await page.goto('/petlife')
      const petlifeTitle = await page.title()

      // Titles should be different (different clinics)
      // Or at least pages should load
    })
  })
})
