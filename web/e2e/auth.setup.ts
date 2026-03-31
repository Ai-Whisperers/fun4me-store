/**
 * E2E Auth Setup Project
 *
 * Playwright setup project that handles authentication.
 * This runs before all browser tests and saves the authenticated state
 * so that other tests can reuse it without logging in again.
 *
 * The global-setup.ts already handles auth state creation,
 * but this file serves as a fallback and verification.
 */

import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import { resolve } from 'path'

const E2E_TEST_TENANT = 'terrapet'

const E2E_TEST_OWNER = {
  email: 'e2e-owner@test.local',
  password: 'E2ETestPassword123!',
}

const AUTH_FILE = resolve(process.cwd(), '.auth', 'owner.json')

setup('authenticate as owner', async ({ page }) => {
  // Check if auth state already exists from global setup
  if (fs.existsSync(AUTH_FILE)) {
    const stats = fs.statSync(AUTH_FILE)
    const ageMs = Date.now() - stats.mtimeMs

    // If auth file is less than 1 hour old, skip re-authentication
    if (ageMs < 60 * 60 * 1000) {
      console.log('[Auth Setup] Using existing auth state (created by global-setup)')
      return
    }
  }

  console.log('[Auth Setup] Authenticating as owner...')

  // Navigate to login page
  await page.goto(`/${E2E_TEST_TENANT}/portal/login`)

  // Wait for login form to load
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    timeout: 10000,
  })

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passwordInput = page.locator('input[type="password"], input[name="password"]')

  await emailInput.fill(E2E_TEST_OWNER.email)
  await passwordInput.fill(E2E_TEST_OWNER.password)

  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')
  await submitButton.click()

  // Wait for successful login (redirected away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15000,
  })

  // Verify we're logged in by checking for portal elements
  const portalIndicator = page.locator(
    '[data-testid="user-menu"], .user-menu, nav, main'
  )
  await expect(portalIndicator.first()).toBeVisible()

  console.log('[Auth Setup] Login successful')

  // Ensure auth directory exists
  const authDir = resolve(process.cwd(), '.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE })
  console.log('[Auth Setup] Auth state saved to', AUTH_FILE)
})
