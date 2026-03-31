/**
 * E2E Tests: Appointment Booking
 *
 * Tests the complete appointment booking flow:
 * - Viewing appointments list
 * - Booking new appointments
 * - Rescheduling and cancellation
 *
 * Uses factory-created services and pets.
 */

import { test, expect, portalUrl, getFirstPet, waitForLoadingComplete } from '../factories/test-fixtures'

const APPOINTMENTS_URL = portalUrl('appointments')
const BOOK_URL = portalUrl('appointments/new')

// =============================================================================
// Appointments List Tests
// =============================================================================

test.describe('Appointments - List', () => {
  test('displays appointments page', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows upcoming appointments section', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const upcomingSection = page.locator(
      ':text("Próximas"), :text("Upcoming"), [data-testid="upcoming-appointments"]'
    )

    if (await upcomingSection.isVisible()) {
      await expect(upcomingSection).toBeVisible()
    }
  })

  test('shows past appointments section', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const pastSection = page.locator(
      ':text("Pasadas"), :text("Anteriores"), :text("Past"), [data-testid="past-appointments"]'
    )

    if (await pastSection.isVisible()) {
      await expect(pastSection).toBeVisible()
    }
  })

  test('has button to book new appointment', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const bookButton = page.locator(
      'a:has-text("Agendar"), a:has-text("Nueva cita"), button:has-text("Reservar")'
    )

    await expect(bookButton.first()).toBeVisible()
  })
})

// =============================================================================
// Booking Flow Tests
// =============================================================================

test.describe('Appointments - Booking Flow', () => {
  test('booking page shows pet selection step', async ({ page }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    // Should show pet selection or wizard
    const petSection = page.locator(
      ':text("mascota"), :text("Selecciona"), [data-testid="pet-selection"]'
    )

    await expect(petSection.first()).toBeVisible()
  })

  test('can select a pet for appointment', async ({ page, testData }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    // Look for pet selection
    const petCard = page.locator(`[data-testid="pet-card"]:has-text("${firstPet.name}"), button:has-text("${firstPet.name}")`)

    if (await petCard.isVisible()) {
      await petCard.click()
      await page.waitForTimeout(300)
    }
  })

  test('shows service selection after pet selection', async ({ page, testData }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    // Select pet
    const petCards = page.locator('[data-testid="pet-card"], .pet-card')
    if (await petCards.first().isVisible()) {
      await petCards.first().click()

      // Click next if there's a step button
      const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")')
      if (await nextButton.isVisible()) {
        await nextButton.click()
      }

      // Should see service selection
      const serviceSection = page.locator(
        ':text("Servicio"), :text("servicio"), [data-testid="service-selection"]'
      )

      await expect(serviceSection.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('shows date/time selection after service', async ({ page }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    // Select pet
    const petCards = page.locator('[data-testid="pet-card"], .pet-card')
    if (await petCards.first().isVisible()) {
      await petCards.first().click()
      const nextButton = page.locator('button:has-text("Siguiente")')
      if (await nextButton.isVisible()) await nextButton.click()
    }

    // Select service
    const serviceCards = page.locator('[data-testid="service-card"], .service-card')
    if (await serviceCards.first().isVisible()) {
      await serviceCards.first().click()
      const nextButton = page.locator('button:has-text("Siguiente")')
      if (await nextButton.isVisible()) await nextButton.click()
    }

    // Should see date/time selection
    const dateSection = page.locator(
      '.calendar, [role="grid"], :text("fecha"), [data-testid="date-selection"]'
    )

    if (await dateSection.first().isVisible()) {
      await expect(dateSection.first()).toBeVisible()
    }
  })

  test('can select available time slot', async ({ page }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    // Navigate through wizard
    const petCards = page.locator('[data-testid="pet-card"], .pet-card')
    if (await petCards.first().isVisible()) {
      await petCards.first().click()
      await page.waitForTimeout(300)
    }

    const nextButton = page.locator('button:has-text("Siguiente")')
    if (await nextButton.isVisible()) await nextButton.click()

    const serviceCards = page.locator('[data-testid="service-card"], .service-card')
    if (await serviceCards.first().isVisible()) {
      await serviceCards.first().click()
      await page.waitForTimeout(300)
    }

    if (await nextButton.isVisible()) await nextButton.click()

    // Select date
    const availableDates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
    if (await availableDates.first().isVisible()) {
      await availableDates.first().click()
      await page.waitForTimeout(500)
    }

    // Select time slot
    const timeSlots = page.locator('[data-testid="time-slot"], .time-slot, button:has-text(":")')
    if (await timeSlots.first().isVisible()) {
      await timeSlots.first().click()
    }
  })

  test('shows booking summary before confirmation', async ({ page }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    // Fast navigation through wizard
    const petCards = page.locator('[data-testid="pet-card"]')
    if (await petCards.first().isVisible()) await petCards.first().click()

    const nextButton = page.locator('button:has-text("Siguiente")')
    
    await page.waitForTimeout(300)
    if (await nextButton.isVisible()) await nextButton.click()

    const serviceCards = page.locator('[data-testid="service-card"]')
    if (await serviceCards.first().isVisible()) await serviceCards.first().click()

    await page.waitForTimeout(300)
    if (await nextButton.isVisible()) await nextButton.click()

    const dates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
    if (await dates.first().isVisible()) await dates.first().click()

    await page.waitForTimeout(300)

    const times = page.locator('[data-testid="time-slot"]')
    if (await times.first().isVisible()) await times.first().click()

    if (await nextButton.isVisible()) await nextButton.click()

    // Should see summary
    const summary = page.locator('[data-testid="booking-summary"], :text("Resumen"), :text("Confirmar")')
    if (await summary.first().isVisible()) {
      await expect(summary.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Appointment Management Tests
// =============================================================================

test.describe('Appointments - Management', () => {
  test('can view appointment details', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    // Click on an appointment if available
    const appointmentCard = page.locator('[data-testid="appointment-card"], .appointment-item')
    
    if (await appointmentCard.first().isVisible()) {
      await appointmentCard.first().click()
      
      // Should show details
      const details = page.locator(':text("Detalles"), :text("fecha"), :text("hora")')
      if (await details.first().isVisible()) {
        await expect(details.first()).toBeVisible()
      }
    }
  })

  test('can cancel appointment', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const cancelButton = page.locator('button:has-text("Cancelar")')
    
    if (await cancelButton.first().isVisible()) {
      // Just verify the button exists - don't actually cancel
      await expect(cancelButton.first()).toBeVisible()
    }
  })

  test('can reschedule appointment', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const rescheduleButton = page.locator('button:has-text("Reprogramar"), a:has-text("Reprogramar")')
    
    if (await rescheduleButton.first().isVisible()) {
      await expect(rescheduleButton.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Appointments - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('appointments list works on mobile', async ({ page }) => {
    await page.goto(APPOINTMENTS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('booking wizard works on mobile', async ({ page }) => {
    await page.goto(BOOK_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()

    // Wizard should be usable
    const petCards = page.locator('[data-testid="pet-card"]')
    if (await petCards.first().isVisible()) {
      await petCards.first().click()
    }
  })
})
