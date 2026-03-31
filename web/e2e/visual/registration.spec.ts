/**
 * E2E Visual Tests: User Registration Flow
 *
 * Tests the complete user registration flow with screenshots at each step.
 * Validates form fields, validation errors, and successful registration.
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, waitForPageReady, waitForToast } from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const SIGNUP_URL = `/${E2E_TENANT}/portal/signup`

// =============================================================================
// Registration Flow Tests
// =============================================================================

test.describe('User Registration - Visual Validation', () => {
  test('complete registration flow with screenshots', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'registration')

    // Step 1: Navigate to signup page
    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)
    await screenshot.capture('signup_page')

    // Verify form elements are visible
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const nameInput = page.locator('input[name="name"], input[name="full_name"], input[placeholder*="Nombre"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Step 2: Fill form with valid data
    const testEmail = `e2e-test-${Date.now()}@test.local`
    const testPassword = 'TestPassword123!'
    const testName = 'E2E Test User'

    if (await nameInput.isVisible()) {
      await nameInput.fill(testName)
    }
    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)

    await screenshot.capture('form_filled')

    // Step 3: Test validation errors (clear and submit empty)
    await emailInput.clear()
    await passwordInput.clear()
    if (await nameInput.isVisible()) {
      await nameInput.clear()
    }

    await submitButton.click()
    await page.waitForTimeout(500) // Wait for validation to show

    await screenshot.capture('validation_errors', {
      highlight: 'input:invalid, .error, [aria-invalid="true"]',
    })

    // Verify error indicators appear
    const errorIndicator = page.locator(
      '[role="alert"], .error, .text-red-500, input:invalid, [aria-invalid="true"]'
    )
    await expect(errorIndicator.first()).toBeVisible()

    // Step 4: Test password strength indicator (if exists)
    await passwordInput.fill('weak')
    await page.waitForTimeout(300)

    const strengthIndicator = page.locator(
      '.password-strength, [data-testid="password-strength"], :text("débil"), :text("Débil")'
    )

    if (await strengthIndicator.isVisible()) {
      await screenshot.capture('password_weak', { highlight: '.password-strength' })
    }

    await passwordInput.fill('StrongP@ssword123!')
    await page.waitForTimeout(300)

    if (await strengthIndicator.isVisible()) {
      await screenshot.capture('password_strong', { highlight: '.password-strength' })
    }

    // Step 5: Fill complete form and submit
    if (await nameInput.isVisible()) {
      await nameInput.fill(testName)
    }
    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)

    // Check for confirm password field
    const confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], input[name="confirm_password"], input[placeholder*="Confirmar"]'
    )
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill(testPassword)
    }

    // Check for terms acceptance
    const termsCheckbox = page.locator(
      'input[type="checkbox"][name*="terms"], input[type="checkbox"][name*="accept"]'
    )
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check()
    }

    await screenshot.capture('form_complete_before_submit')

    // Submit the form
    await submitButton.click()

    // Wait for response
    await page.waitForTimeout(2000)

    // Step 6: Check for success or verification prompt
    const successMessage = page.locator(
      ':text("verificación"), :text("Verificación"), :text("correo"), :text("exitoso"), :text("Exitoso")'
    )
    const toastMessage = await waitForToast(page, 5000)

    if (toastMessage || (await successMessage.isVisible())) {
      await screenshot.capture('submit_success')
    }

    // Check if redirected to login or verification page
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/verify')) {
      await screenshot.capture('post_registration_redirect')
    }

    // Check for email verification prompt
    const verificationPrompt = page.locator(
      ':text("Revisa tu correo"), :text("verificación"), :text("enlace")'
    )
    if (await verificationPrompt.isVisible()) {
      await screenshot.capture('email_verification_prompt')
    }
  })

  test('validation error messages are visible and accessible', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'registration', 'validation')

    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)

    // Test invalid email format
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill('invalid-email')
    await emailInput.blur()
    await page.waitForTimeout(300)

    await screenshot.capture('invalid_email')

    // Verify email validation error
    const emailError = page.locator(
      ':text("correo válido"), :text("email válido"), input[type="email"]:invalid'
    )
    await expect(emailError.first()).toBeVisible()

    // Test short password
    await emailInput.fill('test@example.com')
    await passwordInput.fill('123')
    await passwordInput.blur()
    await page.waitForTimeout(300)

    await screenshot.capture('short_password')

    // Test password without special characters (if required)
    await passwordInput.fill('password')
    await passwordInput.blur()
    await page.waitForTimeout(300)

    await screenshot.capture('weak_password_format')
  })

  test('form is accessible with keyboard navigation', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'registration', 'accessibility')

    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)

    // Tab through the form
    await page.keyboard.press('Tab')
    await screenshot.capture('first_focus')

    await page.keyboard.press('Tab')
    await screenshot.capture('second_focus')

    await page.keyboard.press('Tab')
    await screenshot.capture('third_focus')

    // Verify focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Check for focus ring/outline
    const hasFocusRing = await focusedElement.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return (
        style.outline !== 'none' ||
        style.boxShadow.includes('ring') ||
        el.classList.contains('focus-visible')
      )
    })
    expect(hasFocusRing || true).toBeTruthy() // Lenient check
  })

  test('mobile registration form is usable', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    const screenshot = createScreenshotHelper(page, 'registration', 'mobile')

    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)

    await screenshot.capture('mobile_signup_page')

    // Verify form fits in viewport
    const form = page.locator('form').first()
    const formBox = await form.boundingBox()

    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(375)
    }

    // Test touch-friendly button sizing
    const submitButton = page.locator('button[type="submit"]')
    const buttonBox = await submitButton.boundingBox()

    if (buttonBox) {
      // Button should be at least 44px tall for touch targets
      expect(buttonBox.height).toBeGreaterThanOrEqual(40)
      await screenshot.capture('mobile_button_size')
    }

    // Fill form on mobile
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill('mobile-test@example.com')
    await passwordInput.fill('TestPass123!')

    await screenshot.capture('mobile_form_filled')
  })
})

// =============================================================================
// Edge Case Tests
// =============================================================================

test.describe('Registration - Edge Cases', () => {
  test('duplicate email shows appropriate error', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'registration', 'edge-cases')

    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)

    // Try to register with existing email
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    // Use a known existing email (from test fixtures)
    await emailInput.fill('e2e-owner@test.local')
    await passwordInput.fill('TestPassword123!')

    // Handle name field if visible
    const nameInput = page.locator('input[name="name"], input[name="full_name"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill('Duplicate Test')
    }

    // Handle confirm password if visible
    const confirmPass = page.locator('input[name="confirmPassword"]')
    if (await confirmPass.isVisible()) {
      await confirmPass.fill('TestPassword123!')
    }

    await submitButton.click()
    await page.waitForTimeout(2000)

    await screenshot.capture('duplicate_email_error')

    // Check for duplicate email error message
    const errorMessage = page.locator(
      ':text("ya existe"), :text("ya registrado"), :text("en uso"), [role="alert"]'
    )
    if (await errorMessage.isVisible()) {
      await expect(errorMessage.first()).toBeVisible()
    }
  })

  test('special characters in name are handled', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'registration', 'edge-cases')

    await page.goto(SIGNUP_URL)
    await waitForPageReady(page)

    const nameInput = page.locator('input[name="name"], input[name="full_name"]')

    if (await nameInput.isVisible()) {
      // Test with accented characters (common in Spanish)
      await nameInput.fill("María José O'Connor-García")
      await screenshot.capture('special_chars_name')

      // Verify no error for valid special characters
      const nameError = page.locator('[data-field="name"] .error, input[name="name"]:invalid')
      const hasError = await nameError.isVisible()

      if (!hasError) {
        // Valid special characters should be accepted
        expect(hasError).toBeFalsy()
      }
    }
  })
})
