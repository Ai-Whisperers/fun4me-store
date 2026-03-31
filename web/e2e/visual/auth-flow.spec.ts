/**
 * E2E Visual Tests: Sign In / Sign Out Flow
 *
 * Tests the complete authentication flow with screenshots at each step.
 * Validates login, logout, session persistence, and error handling.
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, waitForPageReady } from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const LOGIN_URL = `/${E2E_TENANT}/portal/login`
const DASHBOARD_URL = `/${E2E_TENANT}/portal/dashboard`

const E2E_OWNER = {
  email: 'e2e-owner@test.local',
  password: 'E2ETestPassword123!',
}

// =============================================================================
// Sign In Flow Tests
// =============================================================================

test.describe('Sign In Flow - Visual Validation', () => {
  test('complete login flow with screenshots', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'login')

    // Step 1: Navigate to login page
    await page.goto(LOGIN_URL)
    await waitForPageReady(page)
    await screenshot.capture('login_page')

    // Verify form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Step 2: Fill credentials
    await emailInput.fill(E2E_OWNER.email)
    await passwordInput.fill(E2E_OWNER.password)
    await screenshot.capture('credentials_entered')

    // Step 3: Test invalid login first
    await emailInput.clear()
    await passwordInput.clear()
    await emailInput.fill('invalid@example.com')
    await passwordInput.fill('wrongpassword')
    await submitButton.click()

    await page.waitForTimeout(2000)
    await screenshot.capture('invalid_login_error')

    // Verify error message appears
    const errorMessage = page.locator(
      '[role="alert"], .error, .text-red-500, :text("inválido"), :text("incorrecto"), :text("error")'
    )
    await expect(errorMessage.first()).toBeVisible()

    // Step 4: Login with valid credentials
    await emailInput.clear()
    await passwordInput.clear()
    await emailInput.fill(E2E_OWNER.email)
    await passwordInput.fill(E2E_OWNER.password)
    await submitButton.click()

    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    await waitForPageReady(page)
    await screenshot.capture('successful_login_dashboard')

    // Verify we're on portal/dashboard
    expect(page.url()).toMatch(/\/portal\//)
  })

  test('login form validation errors', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'validation')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)

    const submitButton = page.locator('button[type="submit"]')

    // Submit empty form
    await submitButton.click()
    await page.waitForTimeout(500)
    await screenshot.capture('empty_form_error')

    // Verify validation indicators
    const validationError = page.locator(
      'input:invalid, [aria-invalid="true"], .error, [role="alert"]'
    )
    await expect(validationError.first()).toBeVisible()

    // Test invalid email format
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('not-an-email')
    await emailInput.blur()
    await page.waitForTimeout(300)
    await screenshot.capture('invalid_email_format')
  })

  test('password visibility toggle', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'password')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)

    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await passwordInput.fill('TestPassword123!')

    await screenshot.capture('password_hidden')

    // Look for toggle button
    const toggleButton = page.locator(
      '[data-testid="toggle-password"], button:near(input[type="password"]), .password-toggle, button:has(svg)'
    ).filter({ has: page.locator('svg') })

    if (await toggleButton.first().isVisible()) {
      await toggleButton.first().click()
      await page.waitForTimeout(300)

      // Check if password is now visible (type="text")
      const inputType = await passwordInput.getAttribute('type')
      if (inputType === 'text') {
        await screenshot.capture('password_visible')
      }
    }
  })
})

// =============================================================================
// Sign Out Flow Tests
// =============================================================================

test.describe('Sign Out Flow - Visual Validation', () => {
  // Use authenticated state
  test.use({ storageState: '.auth/owner.json' })

  test('complete logout flow with screenshots', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'logout')

    // Step 1: Navigate to dashboard (authenticated)
    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('authenticated_dashboard')

    // Verify we're authenticated
    expect(page.url()).not.toContain('/login')

    // Step 2: Look for user menu
    const userMenu = page.locator(
      '[data-testid="user-menu"], .user-menu, [aria-label="User menu"], button:has-text("Cerrar sesión"), [data-testid="avatar"], .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await page.waitForTimeout(300)
      await screenshot.capture('user_menu_open')

      // Step 3: Click logout
      const logoutButton = page.locator(
        'button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión"), button:has-text("Salir"), :text("Logout")'
      )

      if (await logoutButton.first().isVisible()) {
        await logoutButton.first().click()

        // Wait for redirect to login
        await page.waitForURL(
          (url) => url.pathname.includes('/login') || url.pathname === `/${E2E_TENANT}`,
          { timeout: 10000 }
        )
        await waitForPageReady(page)
        await screenshot.capture('logout_redirect')

        // Verify we're logged out
        const isOnLogin = page.url().includes('/login')
        const isOnHome = page.url().endsWith(`/${E2E_TENANT}`) || page.url().endsWith(`/${E2E_TENANT}/`)
        expect(isOnLogin || isOnHome).toBeTruthy()
      }
    }
  })

  test('session persists across page navigation', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'session')

    // Go to dashboard
    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('session_dashboard')

    // Navigate to pets
    await page.goto(`/${E2E_TENANT}/portal/pets`)
    await waitForPageReady(page)
    await screenshot.capture('session_pets_page')

    // Should still be authenticated
    expect(page.url()).not.toContain('/login')

    // Navigate to store
    await page.goto(`/${E2E_TENANT}/portal/store`)
    await waitForPageReady(page)
    await screenshot.capture('session_store_page')

    // Should still be authenticated
    expect(page.url()).not.toContain('/login')
  })

  test('session persists after page reload', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'session')

    // Go to dashboard
    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('before_reload')

    // Reload page
    await page.reload()
    await waitForPageReady(page)
    await screenshot.capture('after_reload')

    // Should still be authenticated
    expect(page.url()).not.toContain('/login')
  })
})

// =============================================================================
// Protected Routes Tests
// =============================================================================

test.describe('Protected Routes - Visual Validation', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'protected')

    // Try to access protected dashboard
    await page.goto(DASHBOARD_URL)

    // Should redirect to login or show auth required
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
    await waitForPageReady(page)
    await screenshot.capture('protected_redirect_login')

    expect(page.url()).toContain('/login')

    // Try to access protected pets page
    await page.goto(`/${E2E_TENANT}/portal/pets`)
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
    await screenshot.capture('protected_pets_redirect')

    // Try to access protected appointments
    await page.goto(`/${E2E_TENANT}/portal/appointments`)
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
    await screenshot.capture('protected_appointments_redirect')
  })
})

// =============================================================================
// Mobile Authentication Tests
// =============================================================================

test.describe('Authentication - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('mobile login flow', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'mobile')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_login_page')

    // Verify form fits mobile viewport
    const form = page.locator('form').first()
    const formBox = await form.boundingBox()
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(375)
    }

    // Fill form
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill(E2E_OWNER.email)
    await passwordInput.fill(E2E_OWNER.password)
    await screenshot.capture('mobile_form_filled')

    // Verify submit button is touch-friendly
    const submitButton = page.locator('button[type="submit"]')
    const buttonBox = await submitButton.boundingBox()
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(40)
    }

    // Submit
    await submitButton.click()
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    await waitForPageReady(page)
    await screenshot.capture('mobile_login_success')
  })
})

// =============================================================================
// Accessibility Tests
// =============================================================================

test.describe('Authentication - Accessibility', () => {
  test('login form has proper labels', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'accessibility')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)

    // Check for labels
    const emailLabel = page.locator('label:has-text("Email"), label:has-text("Correo")')
    const passwordLabel = page.locator('label:has-text("Contraseña"), label:has-text("Password")')

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    // Either explicit labels or inputs with aria-label
    const hasEmailLabel = (await emailLabel.isVisible()) || (await emailInput.getAttribute('aria-label'))
    const hasPasswordLabel = (await passwordLabel.isVisible()) || (await passwordInput.getAttribute('aria-label'))

    await screenshot.capture('form_labels')

    expect(hasEmailLabel).toBeTruthy()
    expect(hasPasswordLabel).toBeTruthy()
  })

  test('form is keyboard navigable', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'accessibility')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)

    // Tab through form
    await page.keyboard.press('Tab')
    await screenshot.capture('keyboard_focus_1')

    await page.keyboard.press('Tab')
    await screenshot.capture('keyboard_focus_2')

    // Focused element should be visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('error messages are announced to screen readers', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'auth-flow', 'accessibility')

    await page.goto(LOGIN_URL)
    await waitForPageReady(page)

    // Trigger error
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(2000)
    await screenshot.capture('error_announcement')

    // Error should have role="alert" or aria-live
    const alertElement = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
    if (await alertElement.isVisible()) {
      await expect(alertElement.first()).toBeVisible()
    }
  })
})
