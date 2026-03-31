/**
 * E2E Tests: Toxic Food Checker Tool
 *
 * Tests for the toxic food checker interactive tool.
 * @tags e2e, tools, public
 */

import { test, expect } from '@playwright/test'

test.describe('Toxic Food Checker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terrapet/tools/toxic-food')
  })

  test('displays toxic food checker page', async ({ page }) => {
    await expect(page).toHaveURL(/\/tools\/toxic-food/)

    // Should have a heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('has search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/buscar|search/i).or(page.getByRole('searchbox'))

    await expect(searchInput.first()).toBeVisible()
  })

  test('displays list of foods', async ({ page }) => {
    // Should show food items
    const content = await page.content()

    // Check for common toxic foods
    expect(content.toLowerCase()).toMatch(/chocolate|cebolla|onion|uva|grape|aguacate|avocado/)
  })

  test('filters foods when searching', async ({ page }) => {
    const searchInput = page
      .getByPlaceholder(/buscar|search/i)
      .or(page.getByRole('searchbox'))
      .first()

    // Search for chocolate
    await searchInput.fill('chocolate')

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Should show chocolate-related results
    const results = page.locator('main')
    await expect(results).toContainText(/chocolate/i)
  })

  test('shows toxicity levels', async ({ page }) => {
    const content = await page.content()

    // Should have toxicity indicators (high, medium, low or colors)
    expect(content.toLowerCase()).toMatch(/alto|high|medio|medium|bajo|low|grave|moderado/)
  })

  test('shows symptoms for toxic foods', async ({ page }) => {
    // Look for symptom information
    const content = await page.content()

    expect(content.toLowerCase()).toMatch(/síntoma|symptom|vómito|diarrea|efecto/)
  })

  test('works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Page should still be functional
    await expect(page.locator('main')).toBeVisible()

    // Search should be accessible
    const searchInput = page
      .getByPlaceholder(/buscar|search/i)
      .or(page.getByRole('searchbox'))
      .first()
    await expect(searchInput).toBeVisible()
  })

  test('clears search', async ({ page }) => {
    const searchInput = page
      .getByPlaceholder(/buscar|search/i)
      .or(page.getByRole('searchbox'))
      .first()

    // Type something
    await searchInput.fill('chocolate')
    await page.waitForTimeout(300)

    // Clear it
    await searchInput.clear()
    await page.waitForTimeout(300)

    // Should show all foods again
  })
})
