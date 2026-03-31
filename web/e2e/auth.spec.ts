import { test, expect } from '@playwright/test'
import {
  gotoSignup,
  gotoLogin,
  signupViaUI,
  loginViaUI,
  expectLoggedIn,
  expectLoggedOut,
} from './auth-helpers'

test.describe('Authentication Flow', () => {
  const clinic = 'terrapet'

  // Use a unique email for each test run to avoid "already registered" errors
  // since we don't have an easy way to delete users from E2E yet.
  const testEmail = `e2e-user-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testName = 'E2E Test User'

  test.describe('Signup', () => {
    test('should allow a new user to sign up', async ({ page }) => {
      await gotoSignup(page, clinic)

      await signupViaUI(page, testEmail, testPassword, testName)

      // After signup, the app shows a "Check your email" message
      await expect(page.getByText(/cuenta creada|revisa tu email/i)).toBeVisible()

      // And a link to go back to login
      await expect(page.getByRole('link', { name: /volver al login|inicia sesión/i })).toBeVisible()
    })
  })

  test.describe('Login & Logout', () => {
    // These will be implemented in Phase 2
    // But we can add them now as placeholders or skipped if we want to follow the phase strictly

    test.skip('should allow an existing user to login', async ({ page }) => {
      await gotoLogin(page, clinic)
      await loginViaUI(page, testEmail, testPassword)
      await expectLoggedIn(page, clinic)
    })

    test.skip('should allow a logged in user to logout', async ({ page }) => {
      // Setup: login first
      await gotoLogin(page, clinic)
      await loginViaUI(page, testEmail, testPassword)
      await expectLoggedIn(page, clinic)

      // Action: logout
      const logoutButton = page.getByLabel(/cerrar sesión/i)
      await logoutButton.click()

      // Assertion: redirected to login or home
      await expectLoggedOut(page, clinic)
    })
  })
})
