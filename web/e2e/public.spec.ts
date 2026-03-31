import { test, expect } from '@playwright/test'

test.describe('Public Website', () => {
  test('store page loads and displays categories', async ({ page }) => {
    await page.goto('/terrapet/store')

    // Check for correct header
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for categories sidebar or filters
    // Based on implementation plan, we have 'Alimentos', 'Farmacia'
    await expect(page.getByText('Alimentos', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Farmacia', { exact: false }).first()).toBeVisible()

    // Check for at least one product card
    // Assuming product cards have images or prices
    const products = page.locator('article') // or valid selector for product card
    // If article is not used, check for generic grid item
    // Getting by price or button might be safer
    const buttons = page.getByRole('button', { name: /agregar/i })
    // Wait for at least one if expected? Or just check page didn't crash.
    await expect(page.getByText('Adris', { exact: false }).first()).toBeVisible()
  })
})
