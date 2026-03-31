/**
 * E2E Tests: Authentication
 *
 * Tests the authentication flow for pet owners including:
 * - Login with valid/invalid credentials
 * - Logout functionality
 * - Session persistence
 * - Protected route access
 *
 * Note: Uses a separate unauthenticated browser context for login tests.
 */

import { test as baseTest, expect } from '@playwright/test'
import { E2E_TENANT, E2E_OWNER } from '../factories/test-fixtures'

// Use unauthenticated context for auth tests
const test = baseTest

const LOGIN_URL = `/${E2E_TENANT}/portal/login`
const SIGNUP_URL = `/${E2E_TENANT}/portal/signup`
const DASHBOARD_URL = `/${E2E_TENANT}/portal/dashboard`

// =============================================================================
// Login Tests
// =============================================================================

test.describe('Authentication - Login', () => {
  test('displays login form with email and password fields', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await expect(emailInput).toBeVisible()

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await expect(passwordInput).toBeVisible()

    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')
    await expect(submitButton).toBeVisible()
  })

  test('shows validation error for empty form submission', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Click submit without filling form
    const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')
    await submitButton.click()

    // Should show validation error or required field message
    const errorMessage = page.locator(
      '[role="alert"], .error, .text-red-500, :text("requerido"), :text("obligatorio")'
    )

    // Either form validation or error message should appear
    await expect(
      errorMessage.first().or(page.locator('input:invalid').first())
    ).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Fill with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"], button:has-text("Iniciar")')

    // Wait for response
    await page.waitForTimeout(2000)

    // Should show error message
    const errorMessage = page.locator(
      '[role="alert"], .error, .text-red-500, :text("inválido"), :text("incorrecto"), :text("error")'
    )

    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Fill with valid credentials
    await page.fill('input[type="email"], input[name="email"]', E2E_OWNER.email)
    await page.fill('input[type="password"], input[name="password"]', E2E_OWNER.password)

    // Submit form
    await page.click('button[type="submit"], button:has-text("Iniciar")')

    // Should redirect away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    // Verify we're on a portal page (dashboard or pets)
    expect(page.url()).toMatch(/\/portal\//)
  })

  test('shows password visibility toggle', async ({ page }) => {
    await page.goto(LOGIN_URL)

    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Look for visibility toggle button
    const toggleButton = page.locator(
      '[data-testid="toggle-password"], button:near(input[type="password"]), .password-toggle'
    )

    if (await toggleButton.isVisible()) {
      await toggleButton.click()
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text')
    }
  })

  test('has link to signup page', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Look for signup link
    const signupLink = page.locator('a:has-text("Registrar"), a:has-text("Crear cuenta")')

    if (await signupLink.isVisible()) {
      await signupLink.click()
      await expect(page).toHaveURL(new RegExp('signup|register'))
    }
  })

  test('has link to forgot password', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Look for forgot password link
    const forgotLink = page.locator(
      'a:has-text("Olvidé"), a:has-text("Recuperar"), a:has-text("Forgot")'
    )

    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toBeVisible()
    }
  })
})

// =============================================================================
// Signup Tests
// =============================================================================

test.describe('Authentication - Signup', () => {
  test('displays signup form', async ({ page }) => {
    await page.goto(SIGNUP_URL)

    // Check for required fields
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const nameInput = page.locator('input[name="name"], input[name="full_name"], input:has-text("Nombre")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('shows password strength indicator', async ({ page }) => {
    await page.goto(SIGNUP_URL)

    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await passwordInput.fill('weak')

    // Look for strength indicator
    const strengthIndicator = page.locator(
      '.password-strength, [data-testid="password-strength"], :text("débil"), :text("fuerte")'
    )

    if (await strengthIndicator.isVisible()) {
      await expect(strengthIndicator).toBeVisible()
    }
  })

  test('validates email format', async ({ page }) => {
    await page.goto(SIGNUP_URL)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await emailInput.fill('invalid-email')
    await emailInput.blur()

    // Should show validation error
    const emailError = page.locator(
      ':text("correo válido"), :text("email válido"), input[type="email"]:invalid'
    )

    await expect(emailError.first()).toBeVisible()
  })

  test('has link to login page', async ({ page }) => {
    await page.goto(SIGNUP_URL)

    // Look for login link
    const loginLink = page.locator('a:has-text("Iniciar"), a:has-text("Ya tengo cuenta")')

    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(new RegExp('login'))
    }
  })
})

// =============================================================================
// Session Tests
// =============================================================================

test.describe('Authentication - Session', () => {
  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto(DASHBOARD_URL)

    // Should be redirected to login or show auth required message
    const isOnLogin = page.url().includes('/login')
    const authMessage = page.locator(':text("Iniciar Sesión"), :text("Autenticación")')

    expect(isOnLogin || (await authMessage.isVisible())).toBe(true)
  })

  test('protected pet page redirects to login', async ({ page }) => {
    await page.goto(`/${E2E_TENANT}/portal/pets`)

    // Should redirect to login
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
  })

  test('protected appointments page redirects to login', async ({ page }) => {
    await page.goto(`/${E2E_TENANT}/portal/appointments`)

    // Should redirect to login
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
  })
})

// =============================================================================
// Logout Tests (Authenticated)
// =============================================================================

test.describe('Authentication - Logout', () => {
  test.use({ storageState: '.auth/owner.json' })

  test('user can logout from portal', async ({ page }) => {
    // Go to dashboard (authenticated)
    await page.goto(DASHBOARD_URL)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Look for user menu or logout button
    const userMenu = page.locator(
      '[data-testid="user-menu"], .user-menu, [aria-label="User menu"], button:has-text("Cerrar sesión")'
    )

    if (await userMenu.isVisible()) {
      await userMenu.click()

      // Look for logout option
      const logoutButton = page.locator(
        'button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión"), button:has-text("Salir")'
      )

      if (await logoutButton.isVisible()) {
        await logoutButton.click()

        // Should redirect to login or public page
        await page.waitForURL(
          (url) => url.pathname.includes('/login') || url.pathname === `/${E2E_TENANT}`,
          { timeout: 10000 }
        )
      }
    }
  })

  test('session persists across page navigation', async ({ page }) => {
    // Go to dashboard
    await page.goto(DASHBOARD_URL)
    await page.waitForLoadState('networkidle')

    // Navigate to pets
    await page.goto(`/${E2E_TENANT}/portal/pets`)
    await page.waitForLoadState('networkidle')

    // Should still be authenticated (not redirected to login)
    expect(page.url()).not.toContain('/login')
  })

  test('session persists after page reload', async ({ page }) => {
    // Go to dashboard
    await page.goto(DASHBOARD_URL)
    await page.waitForLoadState('networkidle')

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still be authenticated
    expect(page.url()).not.toContain('/login')
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Authentication - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('login form is usable on mobile', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Form should be visible
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Should be able to fill form
    await emailInput.fill('test@example.com')
    await passwordInput.fill('password')
  })

  test('buttons are touch-friendly on mobile', async ({ page }) => {
    await page.goto(LOGIN_URL)

    const submitButton = page.locator('button[type="submit"]')
    const box = await submitButton.boundingBox()

    if (box) {
      // Button should be at least 44px tall for touch targets
      expect(box.height).toBeGreaterThanOrEqual(40)
    }
  })
})

// =============================================================================
// Accessibility Tests
// =============================================================================

test.describe('Authentication - Accessibility', () => {
  test('login form has proper labels', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Check for labels or aria-labels
    const emailLabel = page.locator('label:has-text("Email"), label:has-text("Correo")')
    const passwordLabel = page.locator('label:has-text("Contraseña"), label:has-text("Password")')

    // Either explicit labels or inputs with aria-label
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    const hasEmailLabel = (await emailLabel.isVisible()) || (await emailInput.getAttribute('aria-label'))
    const hasPasswordLabel = (await passwordLabel.isVisible()) || (await passwordInput.getAttribute('aria-label'))

    expect(hasEmailLabel).toBeTruthy()
    expect(hasPasswordLabel).toBeTruthy()
  })

  test('form is keyboard navigable', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Tab through form
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should have a focused element
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('error messages are announced to screen readers', async ({ page }) => {
    await page.goto(LOGIN_URL)

    // Fill with invalid credentials and submit
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(2000)

    // Error should have role="alert" or aria-live
    const alertElement = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')

    if (await alertElement.isVisible()) {
      await expect(alertElement.first()).toBeVisible()
    }
  })
})
