/**
 * E2E Test Factory: Appointments
 *
 * Provides helper functions for creating test appointment data.
 * These functions can be used in tests to programmatically create
 * appointments, booking requests, and related entities.
 */

import { Page } from '@playwright/test'
import { TEST_URLS } from '../fixtures/test-users'

// =============================================================================
// Types
// =============================================================================

export interface AppointmentData {
  id?: string
  petId: string
  serviceId: string
  startTime: Date
  endTime: Date
  status: 'scheduled' | 'checked-in' | 'completed' | 'cancelled' | 'no-show'
  schedulingStatus?: 'pending_scheduling' | 'scheduled'
  notes?: string
  vetId?: string
}

export interface BookingRequestData {
  petId: string
  serviceIds: string[]
  preferredDateStart?: string
  preferredDateEnd?: string
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'any'
  notes?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get test data IDs from the saved test data file
 * This reads the data created by global-setup
 */
export async function getTestDataIds(page: Page): Promise<{
  ownerId: string
  pets: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string }>
} | null> {
  try {
    const testData = await page.evaluate(() => {
      const dataStr = localStorage.getItem('e2e-test-data')
      return dataStr ? JSON.parse(dataStr) : null
    })

    return testData
  } catch (_error: unknown) {
    return null
  }
}

/**
 * Create a pending booking request via the UI
 * Returns the appointment ID if successful
 */
export async function createPendingBookingRequest(
  page: Page,
  options?: {
    petIndex?: number
    serviceIndex?: number
    notes?: string
  }
): Promise<{ success: boolean; appointmentId?: string; petName?: string }> {
  const { petIndex = 0, serviceIndex = 0, notes } = options || {}

  await page.goto(TEST_URLS.booking)
  await page.waitForTimeout(1500)

  // Step 1: Select pet
  const petCards = page.locator('[data-testid="pet-card"], .pet-card, [data-pet-id]')

  if ((await petCards.count()) <= petIndex) {
    console.log('Not enough pets found')
    return { success: false }
  }

  const petCard = petCards.nth(petIndex)
  const petName = await petCard.locator('.pet-name, h3, h4').textContent() || 'Pet'

  await petCard.click()
  await page.waitForTimeout(300)

  // Click next if available
  const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")')
  if (await nextButton.isVisible()) {
    await nextButton.click()
    await page.waitForTimeout(500)
  }

  // Step 2: Select service
  const serviceCards = page.locator('[data-testid="service-card"], .service-card, [data-service-id]')

  if ((await serviceCards.count()) <= serviceIndex) {
    console.log('Not enough services found')
    return { success: false }
  }

  await serviceCards.nth(serviceIndex).click()
  await page.waitForTimeout(300)

  if (await nextButton.isVisible()) {
    await nextButton.click()
    await page.waitForTimeout(500)
  }

  // Step 3: Add notes if provided
  if (notes) {
    const notesField = page.locator('textarea[name="notes"], [data-testid="booking-notes"]')
    if (await notesField.isVisible()) {
      await notesField.fill(notes)
    }
  }

  // Step 4: Submit booking request
  const submitButton = page.locator(
    'button:has-text("Enviar Solicitud"), button:has-text("Solicitar"), button:has-text("Confirmar")'
  )

  if (!(await submitButton.isVisible())) {
    return { success: false }
  }

  // Track response for appointment ID
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/appointments') ||
      response.url().includes('/actions/create-booking-request'),
    { timeout: 10000 }
  ).catch(() => null)

  await submitButton.click()
  await page.waitForTimeout(2000)

  // Try to extract appointment ID from response
  const response = await responsePromise
  let appointmentId: string | undefined

  if (response) {
    try {
      const data = await response.json()
      appointmentId = data?.data?.appointment_id || data?.appointment_id
    } catch (_error: unknown) {
      // Ignore JSON parse errors
    }
  }

  // Check for success indicators
  const successIndicator = page.locator(
    '[data-testid="success"], :text("exitosa"), :text("recibida"), .success'
  )

  const success = (await successIndicator.count()) > 0

  return { success, appointmentId, petName: petName || undefined }
}

/**
 * Create a scheduled appointment via the staff dashboard
 */
export async function createScheduledAppointment(
  page: Page,
  data: {
    petName?: string
    startTime: Date
    duration?: number // minutes
    vetSelect?: boolean
  }
): Promise<{ success: boolean; appointmentId?: string }> {
  const { startTime, duration = 30, vetSelect = false } = data

  // Navigate to calendar
  await page.goto(TEST_URLS.dashboardCalendar)
  await page.waitForTimeout(1500)

  // Find and click the target time slot
  const timeString = startTime.toTimeString().slice(0, 5)
  const dateString = startTime.toISOString().split('T')[0]

  const slot = page.locator(
    `[data-date="${dateString}"][data-time="${timeString}"], ` +
    `[data-slot-time="${timeString}"], .time-slot[data-time="${timeString}"]`
  ).first()

  if (!(await slot.isVisible())) {
    // Try to find any available slot
    const anySlot = page.locator('[data-available="true"], .available-slot').first()
    if (!(await anySlot.isVisible())) {
      return { success: false }
    }
    await anySlot.click()
  } else {
    await slot.click()
  }

  await page.waitForTimeout(500)

  // Fill the appointment form
  const petSelect = page.locator('[data-testid="pet-select"], select[name="pet_id"]')
  if (await petSelect.isVisible()) {
    await petSelect.selectOption({ index: 1 })
  }

  const serviceSelect = page.locator('[data-testid="service-select"], select[name="service_id"]')
  if (await serviceSelect.isVisible()) {
    await serviceSelect.selectOption({ index: 1 })
  }

  if (vetSelect) {
    const vetSelectField = page.locator('[data-testid="vet-select"], select[name="vet_id"]')
    if (await vetSelectField.isVisible()) {
      await vetSelectField.selectOption({ index: 1 })
    }
  }

  // Set duration if field exists
  const durationField = page.locator('input[name="duration"]')
  if (await durationField.isVisible()) {
    await durationField.fill(String(duration))
  }

  // Submit
  const submitButton = page.locator(
    'button:has-text("Guardar"), button:has-text("Crear"), button[type="submit"]'
  )

  if (!(await submitButton.isVisible())) {
    return { success: false }
  }

  await submitButton.click()
  await page.waitForTimeout(2000)

  // Check for success
  const successIndicator = page.locator(
    '[data-testid="success"], :text("exitosa"), :text("creada"), .success'
  )

  return { success: (await successIndicator.count()) > 0 }
}

/**
 * Schedule a pending booking request (for staff)
 */
export async function schedulePendingRequest(
  page: Page,
  requestId: string,
  scheduleTime: Date
): Promise<{ success: boolean }> {
  // Navigate to waiting room or appointments
  await page.goto(TEST_URLS.dashboardWaitingRoom)
  await page.waitForTimeout(1000)

  // Find the pending request
  const request = page.locator(`[data-appointment-id="${requestId}"], [data-request-id="${requestId}"]`)

  if (!(await request.isVisible())) {
    // Try appointments page
    await page.goto(TEST_URLS.dashboardAppointments)
    await page.waitForTimeout(1000)
  }

  const requestCard = page.locator('[data-scheduling-status="pending_scheduling"]').first()

  if (!(await requestCard.isVisible())) {
    return { success: false }
  }

  await requestCard.click()
  await page.waitForTimeout(500)

  // Click schedule button
  const scheduleButton = page.locator('button:has-text("Programar"), button:has-text("Agendar")')

  if (await scheduleButton.isVisible()) {
    await scheduleButton.click()
    await page.waitForTimeout(500)
  }

  // Fill schedule form
  const dateInput = page.locator('input[type="date"], [data-testid="schedule-date"]')
  if (await dateInput.isVisible()) {
    await dateInput.fill(scheduleTime.toISOString().split('T')[0])
  }

  const timeInput = page.locator('input[type="time"], [data-testid="schedule-time"]')
  if (await timeInput.isVisible()) {
    await timeInput.fill(scheduleTime.toTimeString().slice(0, 5))
  }

  // Confirm
  const confirmButton = page.locator('button:has-text("Confirmar"), button[type="submit"]')

  if (await confirmButton.isVisible()) {
    await confirmButton.click()
    await page.waitForTimeout(2000)
  }

  // Check for success
  const successIndicator = page.locator(
    ':text("programada"), :text("éxito"), .success'
  )

  return { success: (await successIndicator.count()) > 0 }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  page: Page,
  appointmentId: string,
  reason?: string
): Promise<{ success: boolean }> {
  // Navigate to appointment detail
  await page.goto(`${TEST_URLS.dashboardAppointments}/${appointmentId}`)
  await page.waitForTimeout(1000)

  // Find cancel button
  const cancelButton = page.locator('button:has-text("Cancelar"), [data-action="cancel"]')

  if (!(await cancelButton.isVisible())) {
    return { success: false }
  }

  await cancelButton.click()
  await page.waitForTimeout(500)

  // Fill reason if dialog appears
  if (reason) {
    const reasonField = page.locator('textarea[name="reason"], input[name="cancel_reason"]')
    if (await reasonField.isVisible()) {
      await reasonField.fill(reason)
    }
  }

  // Confirm cancellation
  const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí")')

  if (await confirmButton.isVisible()) {
    await confirmButton.click()
    await page.waitForTimeout(1000)
  }

  // Check for success
  const cancelledStatus = page.locator(':text("Cancelada"), [data-status="cancelled"]')

  return { success: (await cancelledStatus.count()) > 0 }
}

/**
 * Helper to get tomorrow's date at a specific hour
 */
export function getTomorrowAt(hour: number, minute: number = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, minute, 0, 0)
  return date
}

/**
 * Helper to get a date X days from now at a specific hour
 */
export function getFutureDateAt(daysFromNow: number, hour: number, minute: number = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, minute, 0, 0)
  return date
}
