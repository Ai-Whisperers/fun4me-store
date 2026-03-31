import { Page, expect } from '@playwright/test'

/**
 * Common authentication helpers for E2E tests
 */

export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test User',
}

/**
 * Navigate to the login page for a specific clinic
 */
export async function gotoLogin(page: Page, clinic: string = 'terrapet') {
  await page.goto(`/${clinic}/portal/login`)
}

/**
 * Navigate to the signup page for a specific clinic
 */
export async function gotoSignup(page: Page, clinic: string = 'terrapet') {
  await page.goto(`/${clinic}/portal/signup`)
}

/**
 * Perform login via UI
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.getByLabel(/email|correo/i).fill(email)
  await page.getByLabel(/contrase|password/i).fill(password)
  await page.getByRole('button', { name: /iniciar|login|entrar/i }).click()
}

/**
 * Perform signup via UI
 */
export async function signupViaUI(page: Page, email: string, password: string, fullName: string) {
  await page.getByLabel(/email|correo/i).fill(email)
  await page.getByLabel(/contrase|password/i).fill(password)
  await page.getByLabel(/nombre|full name/i).fill(fullName)
  await page.getByRole('button', { name: /registrar|sign up|crear/i }).click()
}

/**
 * Check if the user is logged in (redirected to dashboard)
 */
export async function expectLoggedIn(page: Page, clinic: string = 'terrapet') {
  await expect(page).toHaveURL(new RegExp(`/${clinic}/portal/dashboard`))
}

/**
 * Check if the user is logged out (redirected to login or public page)
 */
export async function expectLoggedOut(page: Page, clinic: string = 'terrapet') {
  await expect(page).toHaveURL(new RegExp(`/${clinic}/portal/login|/`))
}
