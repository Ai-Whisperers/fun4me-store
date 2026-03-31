/**
 * Screenshot Helper Utilities for E2E Visual Validation Tests
 *
 * Provides utilities for capturing screenshots at each test step,
 * parsing prices in Guaranies format, and validating visual elements.
 */

import { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// =============================================================================
// Screenshot Utilities
// =============================================================================

/**
 * Capture a screenshot at a specific test step
 *
 * @param page - Playwright page object
 * @param testName - Name of the test (used as folder name)
 * @param stepName - Description of the step (used in filename)
 * @param stepNumber - Step number for ordering
 * @param options - Additional screenshot options
 */
export async function screenshotStep(
  page: Page,
  testName: string,
  stepName: string,
  stepNumber: number,
  options: {
    fullPage?: boolean
    subFolder?: string
    highlight?: string // Selector to highlight before screenshot
  } = {}
): Promise<string> {
  const { fullPage = true, subFolder, highlight } = options

  // Build path
  const baseDir = path.join(process.cwd(), 'screenshots', testName)
  const dir = subFolder ? path.join(baseDir, subFolder) : baseDir

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Build filename with zero-padded step number
  const paddedStep = stepNumber.toString().padStart(2, '0')
  const sanitizedStepName = stepName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${paddedStep}_${sanitizedStepName}.png`
  const filepath = path.join(dir, filename)

  // Optionally highlight an element before screenshot
  if (highlight) {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (element) {
        ;(element as HTMLElement).style.outline = '3px solid red'
        ;(element as HTMLElement).style.outlineOffset = '2px'
      }
    }, highlight)
  }

  // Take screenshot
  await page.screenshot({
    path: filepath,
    fullPage,
  })

  // Remove highlight after screenshot
  if (highlight) {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (element) {
        ;(element as HTMLElement).style.outline = ''
        ;(element as HTMLElement).style.outlineOffset = ''
      }
    }, highlight)
  }

  return filepath
}

/**
 * Create a screenshot helper bound to a specific test
 * Makes it easier to capture sequential steps
 */
export function createScreenshotHelper(page: Page, testName: string, subFolder?: string) {
  let currentStep = 0

  return {
    /**
     * Capture a screenshot and auto-increment step number
     */
    async capture(stepName: string, options: { fullPage?: boolean; highlight?: string } = {}) {
      currentStep++
      return screenshotStep(page, testName, stepName, currentStep, {
        ...options,
        subFolder,
      })
    },

    /**
     * Reset step counter (for new test sections)
     */
    reset() {
      currentStep = 0
    },

    /**
     * Get current step number
     */
    getStep() {
      return currentStep
    },
  }
}

// =============================================================================
// Price Parsing Utilities (Guaranies Format)
// =============================================================================

/**
 * Parse a Guaranies price string to a number
 *
 * @example
 * parseGuaranies("Gs 150.000") // => 150000
 * parseGuaranies("Gs. 1.500.000") // => 1500000
 * parseGuaranies("150000") // => 150000
 */
export function parseGuaranies(text: string): number {
  if (!text) return 0

  // Remove currency symbol, spaces, and thousand separators
  const cleaned = text
    .replace(/Gs\.?/gi, '') // Remove "Gs" or "Gs."
    .replace(/\s/g, '') // Remove spaces
    .replace(/\./g, '') // Remove thousand separators (dots)
    .replace(/,/g, '') // Remove commas if any

  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format a number as Guaranies price string
 *
 * @example
 * formatGuaranies(150000) // => "Gs 150.000"
 */
export function formatGuaranies(amount: number): string {
  return `Gs ${amount.toLocaleString('es-PY')}`
}

/**
 * Extract price from an element's text content
 */
export async function getPriceFromElement(page: Page, selector: string): Promise<number> {
  const text = await page.locator(selector).textContent()
  return parseGuaranies(text || '')
}

/**
 * Extract multiple prices from elements
 */
export async function getPricesFromElements(page: Page, selector: string): Promise<number[]> {
  const elements = page.locator(selector)
  const count = await elements.count()
  const prices: number[] = []

  for (let i = 0; i < count; i++) {
    const text = await elements.nth(i).textContent()
    prices.push(parseGuaranies(text || ''))
  }

  return prices
}

// =============================================================================
// Calculation Validators
// =============================================================================

/**
 * Validate cart line item calculation
 */
export function validateLineTotal(price: number, quantity: number, lineTotal: number): boolean {
  return price * quantity === lineTotal
}

/**
 * Validate subtotal equals sum of line totals
 */
export function validateSubtotal(lineTotals: number[], subtotal: number): boolean {
  const sum = lineTotals.reduce((acc, total) => acc + total, 0)
  return sum === subtotal
}

/**
 * Validate shipping cost based on business rules
 * Free shipping for orders >= 150,000 Gs, otherwise 15,000 Gs
 */
export function calculateShipping(subtotal: number): number {
  return subtotal >= 150000 ? 0 : 15000
}

/**
 * Validate tax calculation (10% IVA)
 */
export function calculateTax(subtotalAfterDiscount: number): number {
  return Math.round(subtotalAfterDiscount * 0.1)
}

/**
 * Validate percentage discount
 */
export function calculatePercentageDiscount(subtotal: number, percentage: number): number {
  return Math.round(subtotal * (percentage / 100))
}

/**
 * Validate final total calculation
 */
export function calculateFinalTotal(
  subtotal: number,
  discount: number,
  shipping: number,
  tax: number
): number {
  return subtotal - discount + shipping + tax
}

/**
 * Full cart validation helper
 */
export interface CartValidation {
  lineTotals: number[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
}

export function validateCart(cart: CartValidation): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate subtotal
  const expectedSubtotal = cart.lineTotals.reduce((sum, lt) => sum + lt, 0)
  if (cart.subtotal !== expectedSubtotal) {
    errors.push(
      `Subtotal mismatch: expected ${expectedSubtotal}, got ${cart.subtotal}`
    )
  }

  // Validate shipping
  const expectedShipping = calculateShipping(cart.subtotal - cart.discount)
  if (cart.shipping !== expectedShipping) {
    errors.push(
      `Shipping mismatch: expected ${expectedShipping}, got ${cart.shipping}`
    )
  }

  // Validate tax (10% on subtotal after discount)
  const expectedTax = calculateTax(cart.subtotal - cart.discount)
  // Allow for small rounding differences
  if (Math.abs(cart.tax - expectedTax) > 1) {
    errors.push(`Tax mismatch: expected ${expectedTax}, got ${cart.tax}`)
  }

  // Validate total
  const expectedTotal = calculateFinalTotal(
    cart.subtotal,
    cart.discount,
    cart.shipping,
    cart.tax
  )
  if (cart.total !== expectedTotal) {
    errors.push(`Total mismatch: expected ${expectedTotal}, got ${cart.total}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// =============================================================================
// Visual Assertion Helpers
// =============================================================================

/**
 * Check if an element has a specific warning color (red for overdue)
 */
export async function hasWarningColor(
  page: Page,
  selector: string,
  expectedColor: 'red' | 'yellow' | 'green'
): Promise<boolean> {
  const colorMap = {
    red: ['rgb(239, 68, 68)', 'rgb(220, 38, 38)', 'rgb(185, 28, 28)', '#ef4444', '#dc2626'],
    yellow: ['rgb(245, 158, 11)', 'rgb(234, 179, 8)', 'rgb(217, 119, 6)', '#f59e0b', '#eab308'],
    green: ['rgb(34, 197, 94)', 'rgb(22, 163, 74)', 'rgb(21, 128, 61)', '#22c55e', '#16a34a'],
  }

  const element = page.locator(selector).first()
  const color = await element.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return style.color || style.backgroundColor || style.borderColor
  })

  return colorMap[expectedColor].some(
    (c) => color.toLowerCase().includes(c.toLowerCase())
  )
}

/**
 * Check if element contains a specific icon or visual indicator
 */
export async function hasVisualIndicator(
  page: Page,
  containerSelector: string,
  indicatorType: 'warning' | 'success' | 'error' | 'info'
): Promise<boolean> {
  const container = page.locator(containerSelector).first()

  // Check for common indicator patterns
  const indicators = {
    warning: [
      'svg[data-icon="warning"]',
      '.text-yellow-500',
      '.text-amber-500',
      '[class*="warning"]',
    ],
    success: [
      'svg[data-icon="check"]',
      '.text-green-500',
      '.text-emerald-500',
      '[class*="success"]',
    ],
    error: [
      'svg[data-icon="x"]',
      'svg[data-icon="alert"]',
      '.text-red-500',
      '[class*="error"]',
    ],
    info: ['svg[data-icon="info"]', '.text-blue-500', '[class*="info"]'],
  }

  for (const selector of indicators[indicatorType]) {
    const count = await container.locator(selector).count()
    if (count > 0) return true
  }

  return false
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Wait for page to be fully loaded (no loading spinners)
 */
export async function waitForPageReady(page: Page): Promise<void> {
  // Wait for network idle
  await page.waitForLoadState('networkidle')

  // Wait for any loading indicators to disappear
  const loadingIndicators = page.locator(
    '.loading, .spinner, [data-loading="true"], [aria-busy="true"], .animate-spin'
  )

  const count = await loadingIndicators.count()
  if (count > 0) {
    await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 10000 })
  }
}

/**
 * Wait for a toast/notification to appear
 */
export async function waitForToast(page: Page, timeout = 5000): Promise<string | null> {
  const toast = page.locator(
    '[role="alert"], .toast, .notification, [data-testid="toast"]'
  )

  try {
    await toast.first().waitFor({ state: 'visible', timeout })
    return await toast.first().textContent()
  } catch (_error: unknown) {
    return null
  }
}
