import { test, expect } from '@playwright/test'

test('homepage loads and displays navigation', async ({ page }) => {
  await page.goto('/terrapet')

  // Check for the navigation
  const nav = page.getByRole('navigation')
  await expect(nav).toBeVisible()

  // Check for clinic name or welcome message
  // Assuming "Adris" is visible somewhere
  await expect(page.getByText('Adris', { exact: false }).first()).toBeVisible()
})
