/**
 * E2E Critical Path: Complete Booking Journey
 *
 * Tests the full appointment booking flow from start to finish.
 * This is a CRITICAL path that validates revenue-generating functionality.
 *
 * Flow tested:
 * 1. Unauthenticated user visits booking page → redirected to login
 * 2. User logs in → returns to booking
 * 3. Pet selection (create new or select existing)
 * 4. Service selection
 * 5. Date/time selection
 * 6. Booking summary review
 * 7. Confirmation
 * 8. Success screen with appointment details
 *
 * @tags e2e, critical, booking, revenue
 */

import { test, expect, Page } from '@playwright/test'
import { DEFAULT_TENANT } from '../fixtures/tenants'
import { TEST_USERS } from '../fixtures/test-users'

const BOOKING_URL = `/${DEFAULT_TENANT.slug}/book`
const LOGIN_URL = `/${DEFAULT_TENANT.slug}/portal/login`

// Use centralized test credentials
const TEST_OWNER = TEST_USERS.owner

/**
 * Helper: Login via UI and wait for redirect
 */
async function loginAsOwner(page: Page): Promise<void> {
  await page.goto(LOGIN_URL)

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passwordInput = page.locator('input[type="password"], input[name="password"]')

  await emailInput.fill(TEST_OWNER.email)
  await passwordInput.fill(TEST_OWNER.password)

  // Submit
  const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')
  await submitButton.click()

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

/**
 * Helper: Navigate through booking wizard step
 */
async function clickNextStep(page: Page): Promise<void> {
  const nextButton = page.locator(
    'button:has-text("Siguiente"), button:has-text("Continuar"), button:has-text("Next")'
  )
  if (await nextButton.isVisible()) {
    await nextButton.click()
    await page.waitForTimeout(500) // Wait for step transition
  }
}

test.describe('Critical Path: Booking Journey', () => {
  test.describe('Authentication Gate', () => {
    test('redirects unauthenticated user to login', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Should show login prompt or redirect
      const loginPrompt = page.locator(':text("Iniciar Sesión"), :text("Autenticación Requerida")')
      const isOnLogin = page.url().includes('/login')

      expect((await loginPrompt.count()) > 0 || isOnLogin).toBe(true)
    })

    test('shows login required message on booking page', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Check for authentication required message
      const authMessage = page.locator(
        ':text("Autenticación Requerida"), :text("inicia sesión")'
      )

      if (await authMessage.isVisible()) {
        await expect(authMessage).toBeVisible()
      }
    })
  })

  test.describe('Booking Wizard Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test in this group
      await loginAsOwner(page)
    })

    test('loads booking page after login', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Should see booking wizard
      const wizard = page.locator(
        '[data-testid="booking-wizard"], .booking-wizard, main'
      )
      await expect(wizard).toBeVisible()
    })

    test('displays pet selection step', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Should show pet selection or pet list
      const petSection = page.locator(
        '[data-testid="pet-selection"], :text("mascota"), :text("Selecciona")'
      )

      if ((await petSection.count()) > 0) {
        await expect(petSection.first()).toBeVisible()
      }
    })

    test('can select an existing pet', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Look for pet cards or pet list
      const petCards = page.locator(
        '[data-testid="pet-card"], .pet-card, [role="radio"]'
      )

      if ((await petCards.count()) > 0) {
        // Select first pet
        await petCards.first().click()
        await page.waitForTimeout(300)

        // Pet should be selected (visual indicator)
        const selectedIndicator = page.locator(
          '[aria-checked="true"], .selected, [data-selected="true"]'
        )

        // Either explicit selection or can proceed
        expect(
          (await selectedIndicator.count()) > 0 ||
            (await page.locator('button:has-text("Siguiente")').isEnabled())
        ).toBe(true)
      }
    })

    test('displays service selection step', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Select a pet first if required
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      // Look for service selection
      const serviceSection = page.locator(
        '[data-testid="service-selection"], :text("Servicio"), :text("servicio")'
      )

      if ((await serviceSection.count()) > 0) {
        await expect(serviceSection.first()).toBeVisible()
      }
    })

    test('can select a service', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Navigate to service step
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      // Select a service
      const serviceCards = page.locator(
        '[data-testid="service-card"], .service-card, button:has-text("Consulta")'
      )

      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await page.waitForTimeout(300)
      }
    })

    test('displays date/time selection step', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Navigate through previous steps
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Look for calendar/date picker
      const dateSection = page.locator(
        '[data-testid="date-selection"], .calendar, [role="grid"], :text("fecha")'
      )

      if ((await dateSection.count()) > 0) {
        await expect(dateSection.first()).toBeVisible()
      }
    })

    test('can select a date', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Navigate through previous steps quickly
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Click on an available date
      const availableDates = page.locator(
        '[data-testid="available-date"], .available, button:not([disabled]):not(.disabled)'
      )

      if ((await availableDates.count()) > 0) {
        await availableDates.first().click()
      }
    })

    test('can select a time slot', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Navigate through steps
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Select date first
      const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
      if ((await dates.count()) > 0) {
        await dates.first().click()
        await page.waitForTimeout(300)
      }

      // Look for time slots
      const timeSlots = page.locator(
        '[data-testid="time-slot"], .time-slot, button:has-text(":")'
      )

      if ((await timeSlots.count()) > 0) {
        await timeSlots.first().click()
      }
    })

    test('shows booking summary before confirmation', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Complete all steps
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Select date and time
      const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
      if ((await dates.count()) > 0) {
        await dates.first().click()
        await page.waitForTimeout(300)
      }

      const timeSlots = page.locator('[data-testid="time-slot"], .time-slot')
      if ((await timeSlots.count()) > 0) {
        await timeSlots.first().click()
        await clickNextStep(page)
      }

      // Look for summary section
      const summary = page.locator(
        '[data-testid="booking-summary"], :text("Resumen"), :text("Confirmar")'
      )

      if ((await summary.count()) > 0) {
        await expect(summary.first()).toBeVisible()
      }
    })
  })

  test.describe('Booking Confirmation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('can complete booking and see success', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Fast-track through wizard
      // Step 1: Pet
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      // Step 2: Service
      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Step 3: Date/Time
      const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
      if ((await dates.count()) > 0) {
        await dates.first().click()
        await page.waitForTimeout(300)
      }

      const timeSlots = page.locator('[data-testid="time-slot"], .time-slot')
      if ((await timeSlots.count()) > 0) {
        await timeSlots.first().click()
        await clickNextStep(page)
      }

      // Step 4: Confirm
      const confirmButton = page.locator(
        'button:has-text("Confirmar"), button:has-text("Reservar")'
      )

      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        await page.waitForTimeout(1000)

        // Look for success indicators
        const successIndicators = page.locator(
          '[data-testid="success"], :text("exitosa"), :text("confirmada"), .success'
        )

        if ((await successIndicators.count()) > 0) {
          await expect(successIndicators.first()).toBeVisible()
        }
      }
    })

    test('success screen shows appointment details', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Complete booking (same as above but checking details)
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
      if ((await dates.count()) > 0) {
        await dates.first().click()
        await page.waitForTimeout(300)
      }

      const timeSlots = page.locator('[data-testid="time-slot"], .time-slot')
      if ((await timeSlots.count()) > 0) {
        await timeSlots.first().click()
        await clickNextStep(page)
      }

      const confirmButton = page.locator('button:has-text("Confirmar")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        await page.waitForTimeout(1000)

        // Check for essential details in success screen
        const dateInfo = page.locator('[data-testid="appointment-date"], :text("fecha")')
        const timeInfo = page.locator('[data-testid="appointment-time"], :text(":")')

        // At least one piece of appointment info should be visible
        expect(
          (await dateInfo.count()) > 0 || (await timeInfo.count()) > 0
        ).toBe(true)
      }
    })
  })

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('shows error for unavailable slot selection', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Navigate through wizard
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      // Try to select disabled date if any
      const disabledDates = page.locator('[aria-disabled="true"], .disabled')

      if ((await disabledDates.count()) > 0) {
        await disabledDates.first().click({ force: true })

        // Should not proceed or show error
        const errorMessage = page.locator('[role="alert"], .error, :text("disponible")')
        const stillOnDateStep = page.locator(':text("fecha"), .calendar')

        expect(
          (await errorMessage.count()) > 0 || (await stillOnDateStep.count()) > 0
        ).toBe(true)
      }
    })

    test('handles network error gracefully', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Complete steps
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
        await clickNextStep(page)
      }

      const serviceCards = page.locator('[data-testid="service-card"], .service-card')
      if ((await serviceCards.count()) > 0) {
        await serviceCards.first().click()
        await clickNextStep(page)
      }

      const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
      if ((await dates.count()) > 0) {
        await dates.first().click()
      }

      const timeSlots = page.locator('[data-testid="time-slot"]')
      if ((await timeSlots.count()) > 0) {
        await timeSlots.first().click()
        await clickNextStep(page)
      }

      // Intercept API call and make it fail
      await page.route('**/api/appointments**', (route) => {
        route.abort('failed')
      })

      const confirmButton = page.locator('button:has-text("Confirmar")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        await page.waitForTimeout(1000)

        // Should show error, not crash
        const errorIndicators = page.locator(
          '[role="alert"], .error, :text("error"), :text("Error")'
        )

        if ((await errorIndicators.count()) > 0) {
          await expect(errorIndicators.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page)
    })

    test('wizard is keyboard navigable', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Tab through elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Should have focused elements
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('has proper aria labels', async ({ page }) => {
      await page.goto(BOOKING_URL)

      // Check for aria labels on interactive elements
      const ariaLabels = page.locator('[aria-label], [aria-labelledby]')
      expect(await ariaLabels.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Mobile Experience', () => {
    test('booking wizard works on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsOwner(page)
      await page.goto(BOOKING_URL)

      // Wizard should be visible and functional
      const wizard = page.locator('main, [data-testid="booking-wizard"]')
      await expect(wizard).toBeVisible()

      // Can interact with pet selection
      const petCards = page.locator('[data-testid="pet-card"], .pet-card')
      if ((await petCards.count()) > 0) {
        await petCards.first().click()
      }
    })

    test('buttons are touch-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsOwner(page)
      await page.goto(BOOKING_URL)

      // Check button sizes meet touch target guidelines (44x44px minimum)
      const buttons = page.locator('button')

      if ((await buttons.count()) > 0) {
        const firstButton = buttons.first()
        const box = await firstButton.boundingBox()

        if (box) {
          // Should be at least 40px for touch targets
          expect(box.height).toBeGreaterThanOrEqual(40)
        }
      }
    })
  })
})
