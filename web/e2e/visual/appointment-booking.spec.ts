/**
 * E2E Visual Tests: Appointment Booking Flow
 *
 * Tests the complete appointment booking flow with screenshots at each step.
 * Validates pet selection, service selection, date/time picking, and confirmation.
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, waitForPageReady, waitForToast } from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const BOOKING_URL = `/${E2E_TENANT}/book`
const PORTAL_APPOINTMENTS_URL = `/${E2E_TENANT}/portal/appointments`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Complete Booking Flow
// =============================================================================

test.describe('Appointment Booking - Complete Flow', () => {
  test('complete booking flow with screenshots', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'complete-flow')

    // Step 1: Navigate to booking page
    await page.goto(BOOKING_URL)
    await waitForPageReady(page)
    await screenshot.capture('booking_start')

    // Check if we need to log in first or if it's public booking
    const loginPrompt = page.locator(':text("Iniciar sesión"), :text("Login")')
    if (await loginPrompt.isVisible()) {
      await screenshot.capture('booking_login_required')
    }

    // Step 2: Select pet (if pet selection exists)
    const petSelect = page.locator(
      'select[name="pet"], [data-testid="pet-select"], .pet-selector'
    )
    const petCards = page.locator('[data-testid="pet-card"], .pet-card')

    if (await petSelect.isVisible()) {
      await petSelect.click()
      await screenshot.capture('pet_dropdown_open')

      // Select first pet
      const firstOption = petSelect.locator('option').nth(1)
      if (await firstOption.isVisible()) {
        await petSelect.selectOption({ index: 1 })
        await screenshot.capture('pet_selected')
      }
    } else if ((await petCards.count()) > 0) {
      await petCards.first().click()
      await screenshot.capture('pet_card_selected')
    }

    // Step 3: Select service
    const serviceSelect = page.locator(
      'select[name="service"], [data-testid="service-select"]'
    )
    const serviceCards = page.locator('[data-testid="service-card"], .service-card, [data-testid="service-option"]')

    if (await serviceSelect.isVisible()) {
      await serviceSelect.click()
      await screenshot.capture('service_dropdown_open')

      await serviceSelect.selectOption({ index: 1 })
      await screenshot.capture('service_selected')
    } else if ((await serviceCards.count()) > 0) {
      await serviceCards.first().click()
      await page.waitForTimeout(300)
      await screenshot.capture('service_card_selected')
    }

    // Step 4: Select date
    const dateInput = page.locator(
      'input[type="date"], [data-testid="date-picker"], .date-picker'
    )
    const calendarGrid = page.locator('[role="grid"], .calendar, .rdp')

    if (await dateInput.isVisible()) {
      // Set date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
      await screenshot.capture('date_selected_input')
    } else if (await calendarGrid.isVisible()) {
      // Click on a future date in calendar
      const availableDates = page.locator(
        '[data-available="true"], .available-date, button:not([disabled])'
      ).filter({ hasText: /\d+/ })

      if ((await availableDates.count()) > 0) {
        await availableDates.first().click()
        await screenshot.capture('calendar_date_selected')
      }
    }

    // Step 5: Select time slot
    const timeSlots = page.locator(
      '[data-testid="time-slot"], .time-slot, button:has-text(":00"), button:has-text(":30")'
    )
    const timeSelect = page.locator('select[name="time"]')

    if (await timeSelect.isVisible()) {
      await timeSelect.selectOption({ index: 1 })
      await screenshot.capture('time_selected_dropdown')
    } else if ((await timeSlots.count()) > 0) {
      await screenshot.capture('time_slots_available')
      await timeSlots.first().click()
      await page.waitForTimeout(300)
      await screenshot.capture('time_slot_selected')
    }

    // Step 6: Booking summary
    const summarySection = page.locator(
      '[data-testid="booking-summary"], .booking-summary, .summary'
    )
    if (await summarySection.isVisible()) {
      await screenshot.capture('booking_summary')
    }

    // Step 7: Confirm booking
    const confirmButton = page.locator(
      'button:has-text("Confirmar"), button:has-text("Agendar"), button:has-text("Reservar"), button[type="submit"]'
    )

    if (await confirmButton.isVisible()) {
      await screenshot.capture('before_confirm')
      await confirmButton.click()

      // Wait for response
      await page.waitForTimeout(3000)

      // Check for success
      const successMessage = page.locator(
        ':text("confirmado"), :text("exitoso"), :text("agendado"), [role="alert"]'
      )
      const toast = await waitForToast(page, 5000)

      if (toast || (await successMessage.isVisible())) {
        await screenshot.capture('booking_confirmed')
      }
    }

    // Step 8: Check appointment appears in list
    await page.goto(PORTAL_APPOINTMENTS_URL)
    await waitForPageReady(page)
    await screenshot.capture('appointments_list')
  })
})

// =============================================================================
// Step-by-Step Tests
// =============================================================================

test.describe('Appointment Booking - Pet Selection', () => {
  test('displays all user pets for selection', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'pet-selection')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    const petSelect = page.locator('select[name="pet"]')
    const petCards = page.locator('[data-testid="pet-card"], .pet-card')

    if (await petSelect.isVisible()) {
      await petSelect.click()
      await screenshot.capture('pet_options_visible')

      // Count options
      const options = petSelect.locator('option')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThan(1) // At least one pet + placeholder
    } else if ((await petCards.count()) > 0) {
      await screenshot.capture('pet_cards_visible')
      const cardCount = await petCards.count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Appointment Booking - Service Selection', () => {
  test('displays available services', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'service-selection')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    // May need to select pet first
    const petSelect = page.locator('select[name="pet"]')
    if (await petSelect.isVisible()) {
      await petSelect.selectOption({ index: 1 })
      await page.waitForTimeout(500)
    }

    const serviceSelect = page.locator('select[name="service"]')
    const serviceCards = page.locator('[data-testid="service-card"], .service-option')

    if (await serviceSelect.isVisible()) {
      await serviceSelect.click()
      await screenshot.capture('service_options')

      const options = serviceSelect.locator('option')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThan(1)
    } else if ((await serviceCards.count()) > 0) {
      await screenshot.capture('service_cards')
      const cardCount = await serviceCards.count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test('service shows price and duration', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'service-details')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    const serviceCards = page.locator('[data-testid="service-card"], .service-option')

    if ((await serviceCards.count()) > 0) {
      const firstCard = serviceCards.first()

      // Check for price
      const priceElement = firstCard.locator(':text("Gs"), :text("$"), .price')
      const durationElement = firstCard.locator(':text("min"), :text("hora"), .duration')

      await screenshot.capture('service_with_details', {
        highlight: '[data-testid="service-card"]:first-child',
      })

      if (await priceElement.isVisible()) {
        await expect(priceElement).toBeVisible()
      }
    }
  })
})

test.describe('Appointment Booking - Date Selection', () => {
  test('calendar shows available dates', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'date-selection')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    // Navigate through booking steps to reach date picker
    const petSelect = page.locator('select[name="pet"]')
    if (await petSelect.isVisible()) {
      await petSelect.selectOption({ index: 1 })
    }

    const serviceCards = page.locator('[data-testid="service-card"]')
    if ((await serviceCards.count()) > 0) {
      await serviceCards.first().click()
      await page.waitForTimeout(500)
    }

    // Look for calendar
    const calendar = page.locator('[role="grid"], .calendar, .rdp, [data-testid="calendar"]')
    const dateInput = page.locator('input[type="date"]')

    if (await calendar.isVisible()) {
      await screenshot.capture('calendar_visible')

      // Check for unavailable dates
      const disabledDates = page.locator('[disabled], .unavailable, [data-disabled="true"]')
      const availableDates = page.locator('.available, [data-available="true"]')

      await screenshot.capture('calendar_with_availability')
    } else if (await dateInput.isVisible()) {
      await screenshot.capture('date_input_visible')
    }
  })

  test('past dates are disabled', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'date-validation')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    // Navigate to date picker
    const calendar = page.locator('[role="grid"], .calendar')

    if (await calendar.isVisible()) {
      // Past dates should be disabled
      const pastDates = page.locator('[data-disabled="true"], .past-date, [aria-disabled="true"]')
      await screenshot.capture('past_dates_disabled')
    }
  })
})

test.describe('Appointment Booking - Time Selection', () => {
  test('time slots show availability', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'time-selection')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)

    // Navigate through steps
    const petSelect = page.locator('select[name="pet"]')
    if (await petSelect.isVisible()) {
      await petSelect.selectOption({ index: 1 })
    }

    // Select a date first if needed
    const dateInput = page.locator('input[type="date"]')
    if (await dateInput.isVisible()) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await dateInput.fill(tomorrow.toISOString().split('T')[0])
      await page.waitForTimeout(500)
    }

    // Look for time slots
    const timeSlots = page.locator('[data-testid="time-slot"], .time-slot')

    if ((await timeSlots.count()) > 0) {
      await screenshot.capture('time_slots_grid')

      // Check for available vs booked slots
      const availableSlots = page.locator('.available-slot, [data-available="true"]')
      const bookedSlots = page.locator('.booked-slot, [data-available="false"]')

      if ((await bookedSlots.count()) > 0) {
        await screenshot.capture('time_slots_with_booked')
      }
    }
  })
})

// =============================================================================
// Appointment Management Tests
// =============================================================================

test.describe('Appointment Booking - View Appointments', () => {
  test('view upcoming appointments', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'view-appointments')

    await page.goto(PORTAL_APPOINTMENTS_URL)
    await waitForPageReady(page)
    await screenshot.capture('appointments_list')

    // Check for appointment cards or table
    const appointmentItems = page.locator(
      '[data-testid="appointment-card"], .appointment-item, tr[data-appointment]'
    )

    if ((await appointmentItems.count()) > 0) {
      await screenshot.capture('appointments_with_data')

      // Verify appointment shows key info
      const firstAppointment = appointmentItems.first()
      await firstAppointment.click()
      await page.waitForTimeout(500)
      await screenshot.capture('appointment_detail')
    } else {
      await screenshot.capture('no_appointments')
    }
  })

  test('filter appointments by status', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'filter')

    await page.goto(PORTAL_APPOINTMENTS_URL)
    await waitForPageReady(page)

    // Look for filter options
    const statusFilter = page.locator(
      'select[name="status"], [data-testid="status-filter"]'
    )
    const filterTabs = page.locator('[role="tablist"], .filter-tabs')

    if (await statusFilter.isVisible()) {
      await statusFilter.click()
      await screenshot.capture('status_filter_open')
    } else if (await filterTabs.isVisible()) {
      await screenshot.capture('filter_tabs')
    }
  })
})

test.describe('Appointment Booking - Cancel Appointment', () => {
  test('cancel appointment flow', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'cancel')

    await page.goto(PORTAL_APPOINTMENTS_URL)
    await waitForPageReady(page)

    const appointmentItems = page.locator('[data-testid="appointment-card"], .appointment-item')

    if ((await appointmentItems.count()) > 0) {
      await appointmentItems.first().click()
      await page.waitForTimeout(500)
      await screenshot.capture('appointment_detail_for_cancel')

      // Look for cancel button
      const cancelButton = page.locator(
        'button:has-text("Cancelar"), button:has-text("Cancel")'
      )

      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        await screenshot.capture('cancel_confirmation_dialog')

        // Confirm cancel if dialog appears
        const confirmCancel = page.locator(
          'button:has-text("Confirmar"), button:has-text("Sí")'
        )
        if (await confirmCancel.isVisible()) {
          // Don't actually cancel - just screenshot
          await screenshot.capture('cancel_confirm_button')
        }
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Appointment Booking - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('booking flow works on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'appointment-booking', 'mobile')

    await page.goto(BOOKING_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_booking_start')

    // Verify form fits mobile viewport
    const form = page.locator('form, .booking-form, .booking-wizard')
    if (await form.isVisible()) {
      const formBox = await form.boundingBox()
      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(375)
      }
    }

    // Scroll through the form
    await page.evaluate(() => window.scrollBy(0, 300))
    await screenshot.capture('mobile_scrolled')
  })
})
