/**
 * E2E Test Fixtures
 *
 * Playwright fixtures that provide access to test data created in global setup.
 * These fixtures extend the base Playwright test with typed access to test data.
 *
 * @example
 * ```typescript
 * import { test, expect } from './factories/test-fixtures'
 *
 * test('shows pets list', async ({ page, testData }) => {
 *   await page.goto('/terrapet/portal/pets')
 *   // testData.pets contains the pre-created pets
 *   for (const pet of testData.pets) {
 *     await expect(page.getByText(pet.name)).toBeVisible()
 *   }
 * })
 * ```
 */

import { test as base, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import { resolve } from 'path'
import { E2EDataFactory, e2eFactory } from './e2e-data-factory'

// =============================================================================
// Types
// =============================================================================

export interface E2ETestData {
  ownerId: string
  ownerProfileId: string
  ownerEmail: string
  ownerPassword: string
  pets: Array<{ id: string; name: string; species: string }>
  vaccines: string[]
  products: Array<{ id: string; name: string; sku: string }>
  services: Array<{ id: string; name: string }>
  loyaltyPoints: number
  appointments: string[]
  invoices: string[]
  conversations: string[]
}

export interface TestFixtures {
  testData: E2ETestData
  factory: E2EDataFactory
}

// =============================================================================
// Constants
// =============================================================================

export const E2E_TENANT = 'terrapet'

export const E2E_OWNER = {
  email: 'e2e-owner@test.local',
  password: 'E2ETestPassword123!',
}

// =============================================================================
// Test Data Loading
// =============================================================================

/**
 * Load test data from global setup
 */
function loadTestData(): E2ETestData {
  const dataPath = resolve(process.cwd(), '.e2e-test-data.json')

  if (!fs.existsSync(dataPath)) {
    // Return default empty data if file doesn't exist
    console.warn('[Test Fixtures] No test data file found, using defaults')
    return {
      ownerId: '',
      ownerProfileId: '',
      ownerEmail: E2E_OWNER.email,
      ownerPassword: E2E_OWNER.password,
      pets: [],
      vaccines: [],
      products: [],
      services: [],
      loyaltyPoints: 0,
      appointments: [],
      invoices: [],
      conversations: [],
    }
  }

  try {
    const content = fs.readFileSync(dataPath, 'utf-8')
    const data = JSON.parse(content)
    return {
      ...data,
      ownerEmail: E2E_OWNER.email,
      ownerPassword: E2E_OWNER.password,
    }
  } catch (error) {
    console.error('[Test Fixtures] Failed to load test data:', error)
    throw error
  }
}

// =============================================================================
// Extended Test with Fixtures
// =============================================================================

/**
 * Extended Playwright test with E2E fixtures
 */
export const test = base.extend<TestFixtures>({
  testData: async ({}, use) => {
    const data = loadTestData()
    await use(data)
  },

  factory: async ({}, use) => {
    // Use the singleton factory
    await use(e2eFactory)

    // Cleanup any resources created during the test
    await e2eFactory.cleanup()
  },
})

// Re-export expect
export { expect }

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Navigate to portal page for the test tenant
 */
export function portalUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/${E2E_TENANT}/portal/${cleanPath}`
}

/**
 * Navigate to public page for the test tenant
 */
export function publicUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/${E2E_TENANT}/${cleanPath}`
}

/**
 * Navigate to store page for the test tenant
 */
export function storeUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `/${E2E_TENANT}/store${cleanPath ? '/' + cleanPath : ''}`
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/**
 * Get the first pet from test data (convenience helper)
 */
export function getFirstPet(testData: E2ETestData): { id: string; name: string; species: string } | undefined {
  return testData.pets[0]
}

/**
 * Get the first product from test data (convenience helper)
 */
export function getFirstProduct(testData: E2ETestData): { id: string; name: string; sku: string } | undefined {
  return testData.products[0]
}

/**
 * Get the first service from test data (convenience helper)
 */
export function getFirstService(testData: E2ETestData): { id: string; name: string } | undefined {
  return testData.services[0]
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to verify element contains text
 */
export async function expectTextVisible(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text, { exact: false })).toBeVisible()
}

/**
 * Helper to verify page title
 */
export async function expectTitleContains(page: Page, text: string): Promise<void> {
  await expect(page).toHaveTitle(new RegExp(text, 'i'))
}

/**
 * Helper to fill a form field by label
 */
export async function fillByLabel(page: Page, label: string | RegExp, value: string): Promise<void> {
  await page.getByLabel(label).fill(value)
}

/**
 * Helper to click a button by text
 */
export async function clickButton(page: Page, text: string | RegExp): Promise<void> {
  await page.getByRole('button', { name: text }).click()
}

/**
 * Helper to verify toast/alert message
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
  const toast = page.locator('[role="alert"], .toast, .notification, [data-testid="toast"]')
  await expect(toast.filter({ hasText: message })).toBeVisible()
}

/**
 * Helper to wait for loading to complete
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for any loading indicators to disappear
  const loadingIndicators = page.locator(
    '.loading, .spinner, [data-loading="true"], [aria-busy="true"]'
  )

  // If there are loading indicators, wait for them to disappear
  if ((await loadingIndicators.count()) > 0) {
    await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 10000 })
  }
}

/**
 * Helper to verify a table row exists with specific text
 */
export async function expectTableRow(page: Page, ...cellTexts: string[]): Promise<void> {
  const table = page.locator('table, [role="table"], [data-testid="data-table"]')
  const rows = table.locator('tr, [role="row"]')

  for (const text of cellTexts) {
    await expect(rows.filter({ hasText: text })).toBeVisible()
  }
}

/**
 * Helper to verify a card/list item exists
 */
export async function expectCard(page: Page, text: string): Promise<void> {
  const card = page.locator(
    '[data-testid="card"], .card, article, [role="listitem"]'
  ).filter({ hasText: text })
  await expect(card).toBeVisible()
}

// =============================================================================
// API Verification Helpers
// =============================================================================

/**
 * Verify data exists in database (via factory)
 */
export async function verifyPetInDatabase(
  factory: E2EDataFactory,
  petId: string,
  expectedName?: string
): Promise<boolean> {
  const pet = await factory.getPet(petId)
  if (!pet) return false
  if (expectedName && pet.name !== expectedName) return false
  return true
}

/**
 * Verify vaccine was created
 */
export async function verifyVaccineCount(
  factory: E2EDataFactory,
  petId: string,
  expectedCount: number
): Promise<boolean> {
  const vaccines = await factory.getVaccines(petId)
  return vaccines.length >= expectedCount
}

/**
 * Verify cart has items
 */
export async function verifyCartHasItems(
  factory: E2EDataFactory,
  userId: string
): Promise<boolean> {
  const cart = await factory.getCart(userId)
  if (!cart) return false
  const items = (cart.items as unknown[]) || []
  return items.length > 0
}

/**
 * Verify loyalty points balance
 */
export async function verifyLoyaltyBalance(
  factory: E2EDataFactory,
  userId: string,
  expectedBalance: number
): Promise<boolean> {
  const balance = await factory.getLoyaltyBalance(userId)
  return balance === expectedBalance
}
