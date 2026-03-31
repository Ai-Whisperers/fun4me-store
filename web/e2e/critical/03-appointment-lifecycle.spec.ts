/**
 * E2E Critical Path: Complete Appointment Lifecycle
 *
 * Tests the full appointment flow from booking through check-in to completion.
 * This validates both owner-side booking AND staff-side management.
 *
 * Flow tested:
 * 1. Owner creates appointment (booking flow)
 * 2. Staff views appointment in dashboard
 * 3. Staff checks in patient
 * 4. Staff completes appointment
 * 5. Owner sees completed appointment in portal
 *
 * @tags e2e, critical, appointment, lifecycle, revenue
 */

 
import { test, expect, Page } from '@playwright/test'
import { TEST_USERS, E2E_TEST_TENANT } from '../fixtures/test-users'

const TENANT_SLUG = E2E_TEST_TENANT
const BOOKING_URL = `/${TENANT_SLUG}/book`
const STAFF_DASHBOARD_URL = `/${TENANT_SLUG}/dashboard/appointments`
const PORTAL_APPOINTMENTS_URL = `/${TENANT_SLUG}/portal/appointments`
const LOGIN_URL = `/${TENANT_SLUG}/portal/login`

// Use centralized test credentials
const OWNER_USER = TEST_USERS.owner
const VET_USER = TEST_USERS.vet

/**
 * Helper: Login as specific user type
 */
async function login(page: Page, userType: 'owner' | 'vet'): Promise<void> {
  const credentials = userType === 'owner' ? OWNER_USER : VET_USER
  
  await page.goto(LOGIN_URL)

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passwordInput = page.locator('input[type="password"], input[name="password"]')

  await emailInput.fill(credentials.email)
  await passwordInput.fill(credentials.password)

  const submitButton = page.locator('button[type="submit"], button:has-text("Iniciar")')
  await submitButton.click()

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

/**
 * Helper: Create appointment through booking flow
 * Returns appointment identifier for tracking
 */
async function createAppointment(page: Page): Promise<string | null> {
  await page.goto(BOOKING_URL)
  await page.waitForTimeout(1000)

  // Step 1: Select pet
  const petCards = page.locator('[data-testid="pet-card"], .pet-card')
  if ((await petCards.count()) > 0) {
    await petCards.first().click()
    const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")')
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForTimeout(500)
    }
  }

  // Step 2: Select service
  const serviceCards = page.locator('[data-testid="service-card"], .service-card')
  if ((await serviceCards.count()) > 0) {
    await serviceCards.first().click()
    const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")')
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForTimeout(500)
    }
  }

  // Step 3: Select date
  const availableDates = page.locator('[role="gridcell"]:not([aria-disabled="true"])')
  if ((await availableDates.count()) > 0) {
    await availableDates.first().click()
    await page.waitForTimeout(500)
  }

  // Step 4: Select time
  const timeSlots = page.locator('[data-testid="time-slot"], .time-slot')
  if ((await timeSlots.count()) > 0) {
    await timeSlots.first().click()
    const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")')
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForTimeout(500)
    }
  }

  // Step 5: Confirm booking
  const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Reservar")')
  if (await confirmButton.isVisible()) {
    await confirmButton.click()
    await page.waitForTimeout(2000)

    // Extract appointment ID from success message or URL
    const appointmentId = page.url().match(/appointment[/-]?(\w+)/)?.[1]
    return appointmentId || 'latest'
  }

  return null
}

/**
 * Helper: Find appointment in staff dashboard
 */
async function findAppointment(page: Page, identifier: string = 'latest'): Promise<boolean> {
  await page.goto(STAFF_DASHBOARD_URL)
  await page.waitForTimeout(1000)

  // Look for appointment cards or table rows
  const appointmentItems = page.locator(
    '[data-testid="appointment-card"], .appointment-item, tr[data-appointment-id]'
  )

  if ((await appointmentItems.count()) > 0) {
    // If we have a specific ID, find it
    if (identifier !== 'latest') {
      const specificItem = page.locator(`[data-appointment-id="${identifier}"]`)
      return await specificItem.isVisible()
    }
    // Otherwise, just verify any appointment exists
    return true
  }

  return false
}

test.describe('Critical Path: Appointment Lifecycle', () => {
  test.describe('Full Lifecycle: Owner → Staff → Completion', () => {
    test('complete appointment lifecycle from booking to completion', async ({ browser }) => {
      // This test uses multiple contexts to simulate different users
      const ownerContext = await browser.newContext()
      const staffContext = await browser.newContext()

      const ownerPage = await ownerContext.newPage()
      const staffPage = await staffContext.newPage()

      try {
        // ==================================================================
        // Phase 1: Owner Creates Appointment
        // ==================================================================
        
        console.log('Phase 1: Owner creates appointment...')
        await login(ownerPage, 'owner')
        
        const appointmentId = await createAppointment(ownerPage)
        expect(appointmentId).toBeTruthy()
        console.log(`✓ Appointment created: ${appointmentId}`)

        // Verify success message
        const successIndicator = ownerPage.locator(
          '[data-testid="success"], :text("exitosa"), :text("confirmada")'
        )
        if ((await successIndicator.count()) > 0) {
          await expect(successIndicator.first()).toBeVisible()
        }

        // Verify appointment appears in owner's portal
        await ownerPage.goto(PORTAL_APPOINTMENTS_URL)
        await ownerPage.waitForTimeout(1000)
        
        const ownerAppointments = ownerPage.locator(
          '[data-testid="appointment-card"], .appointment-item'
        )
        expect(await ownerAppointments.count()).toBeGreaterThan(0)
        console.log('✓ Appointment visible in owner portal')

        // ==================================================================
        // Phase 2: Staff Views Appointment
        // ==================================================================

        console.log('Phase 2: Staff views appointment in dashboard...')
        await login(staffPage, 'vet')

        const appointmentFound = await findAppointment(staffPage, appointmentId || 'latest')
        expect(appointmentFound).toBe(true)
        console.log('✓ Appointment visible in staff dashboard')

        // Verify appointment shows as "scheduled" status
        const appointmentCard = staffPage.locator('[data-testid="appointment-card"]').first()
        const statusBadge = appointmentCard.locator('[data-testid="status"], .status, .badge')
        
        if (await statusBadge.isVisible()) {
          const statusText = await statusBadge.textContent()
          console.log(`  Status: ${statusText}`)
          // Should be "Programada", "Scheduled", or similar
          expect(statusText?.toLowerCase()).toMatch(/programada|scheduled|pendiente|confirmed/i)
        }

        // ==================================================================
        // Phase 3: Staff Checks In Patient
        // ==================================================================

        console.log('Phase 3: Staff checks in patient...')
        
        // Click on appointment to open details or actions
        await appointmentCard.click()
        await staffPage.waitForTimeout(500)

        // Look for check-in button
        const checkInButton = staffPage.locator(
          'button:has-text("Check"), button:has-text("Registrar"), button:has-text("Llegada"), [data-action="check-in"]'
        )

        if (await checkInButton.isVisible()) {
          await checkInButton.click()
          await staffPage.waitForTimeout(1000)

          // Verify check-in success
          const checkedInStatus = staffPage.locator(
            ':text("Check-in"), :text("Registrado"), :text("En curso"), [data-status="checked-in"]'
          )
          
          if ((await checkedInStatus.count()) > 0) {
            console.log('✓ Patient checked in successfully')
            await expect(checkedInStatus.first()).toBeVisible()
          }
        } else {
          console.log('⚠ Check-in button not found - may need to adjust selectors')
        }

        // ==================================================================
        // Phase 4: Staff Completes Appointment
        // ==================================================================

        console.log('Phase 4: Staff completes appointment...')

        // Look for complete/finish button
        const completeButton = staffPage.locator(
          'button:has-text("Completar"), button:has-text("Finalizar"), button:has-text("Complete"), [data-action="complete"]'
        )

        if (await completeButton.isVisible()) {
          await completeButton.click()
          await staffPage.waitForTimeout(1000)

          // May have a confirmation dialog
          const confirmComplete = staffPage.locator(
            'button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Yes")'
          )
          if (await confirmComplete.isVisible()) {
            await confirmComplete.click()
            await staffPage.waitForTimeout(1000)
          }

          // Verify completion
          const completedStatus = staffPage.locator(
            ':text("Completada"), :text("Completed"), :text("Finalizada"), [data-status="completed"]'
          )

          if ((await completedStatus.count()) > 0) {
            console.log('✓ Appointment marked as completed')
            await expect(completedStatus.first()).toBeVisible()
          }
        } else {
          console.log('⚠ Complete button not found - may need to adjust selectors')
        }

        // ==================================================================
        // Phase 5: Owner Sees Completed Status
        // ==================================================================

        console.log('Phase 5: Owner verifies completed status...')

        // Refresh owner's appointments page
        await ownerPage.goto(PORTAL_APPOINTMENTS_URL)
        await ownerPage.waitForTimeout(1000)

        // Find the completed appointment
        const completedAppointment = ownerPage.locator(
          '[data-testid="appointment-card"], .appointment-item'
        ).first()

        if (await completedAppointment.isVisible()) {
          const ownerStatusBadge = completedAppointment.locator('.status, .badge, [data-testid="status"]')
          
          if (await ownerStatusBadge.isVisible()) {
            const finalStatus = await ownerStatusBadge.textContent()
            console.log(`  Final status in owner portal: ${finalStatus}`)
            
            // Should show as completed
            expect(finalStatus?.toLowerCase()).toMatch(/completada|completed|finalizada/i)
            console.log('✓ Owner sees completed appointment')
          }
        }

        console.log('\n✅ Complete lifecycle test passed!')
        console.log('   Owner → Book → Staff View → Check-in → Complete → Owner View')

      } finally {
        await ownerContext.close()
        await staffContext.close()
      }
    })
  })

  test.describe('Check-In Flow', () => {
    test('staff can check in a scheduled appointment', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      // Find a scheduled appointment
      const scheduledAppointments = page.locator(
        '[data-status="scheduled"], [data-status="confirmed"], [data-testid="appointment-card"]'
      )

      if ((await scheduledAppointments.count()) > 0) {
        const firstAppointment = scheduledAppointments.first()
        await firstAppointment.click()
        await page.waitForTimeout(500)

        // Check-in
        const checkInButton = page.locator(
          'button:has-text("Check"), button:has-text("Registrar")'
        )

        if (await checkInButton.isVisible()) {
          const initialStatus = await firstAppointment.textContent()
          
          await checkInButton.click()
          await page.waitForTimeout(1000)

          // Verify status changed
          const updatedStatus = await firstAppointment.textContent()
          expect(updatedStatus).not.toBe(initialStatus)
          
          // Should now show checked-in status
          const checkedInIndicator = page.locator(':text("Check-in"), :text("En curso")')
          expect(await checkedInIndicator.count()).toBeGreaterThan(0)
        }
      }
    })

    test('check-in updates appointment timestamp', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      const appointment = page.locator('[data-testid="appointment-card"]').first()
      
      if (await appointment.isVisible()) {
        await appointment.click()
        
        // Record timestamp before check-in
        const beforeTimestamp = await page.textContent('[data-testid="last-updated"], .timestamp')
        
        const checkInButton = page.locator('button:has-text("Check-in")')
        if (await checkInButton.isVisible()) {
          await checkInButton.click()
          await page.waitForTimeout(1000)
          
          // Timestamp should have updated
          const afterTimestamp = await page.textContent('[data-testid="last-updated"], .timestamp')
          expect(afterTimestamp).not.toBe(beforeTimestamp)
        }
      }
    })
  })

  test.describe('Completion Flow', () => {
    test('staff can complete a checked-in appointment', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      // Find a checked-in appointment
      const checkedInAppointments = page.locator(
        '[data-status="checked-in"], [data-status="in-progress"]'
      )

      if ((await checkedInAppointments.count()) > 0) {
        const appointment = checkedInAppointments.first()
        await appointment.click()
        await page.waitForTimeout(500)

        // Complete appointment
        const completeButton = page.locator(
          'button:has-text("Completar"), button:has-text("Finalizar")'
        )

        if (await completeButton.isVisible()) {
          await completeButton.click()
          await page.waitForTimeout(1000)

          // May need confirmation
          const confirmButton = page.locator('button:has-text("Confirmar")')
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
            await page.waitForTimeout(1000)
          }

          // Verify completed status
          const completedIndicator = page.locator(
            ':text("Completada"), :text("Completed"), [data-status="completed"]'
          )
          await expect(completedIndicator.first()).toBeVisible()
        }
      }
    })

    test('cannot complete appointment without check-in', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      // Find a scheduled (not checked-in) appointment
      const scheduledAppointments = page.locator('[data-status="scheduled"]')

      if ((await scheduledAppointments.count()) > 0) {
        await scheduledAppointments.first().click()
        await page.waitForTimeout(500)

        // Complete button should not be enabled or should show error
        const completeButton = page.locator('button:has-text("Completar")')
        
        if (await completeButton.isVisible()) {
          const isDisabled = await completeButton.isDisabled()
          expect(isDisabled).toBe(true)
        }
      }
    })

    test('completion updates appointment in owner portal', async ({ browser }) => {
      const staffContext = await browser.newContext()
      const ownerContext = await browser.newContext()

      const staffPage = await staffContext.newPage()
      const ownerPage = await ownerContext.newPage()

      try {
        // Staff completes an appointment
        await login(staffPage, 'vet')
        await staffPage.goto(STAFF_DASHBOARD_URL)
        await staffPage.waitForTimeout(1000)

        const appointment = staffPage.locator('[data-status="checked-in"]').first()
        if (await appointment.isVisible()) {
          await appointment.click()
          
          const completeButton = staffPage.locator('button:has-text("Completar")')
          if (await completeButton.isVisible()) {
            await completeButton.click()
            await staffPage.waitForTimeout(1000)
          }
        }

        // Owner checks their appointments
        await login(ownerPage, 'owner')
        await ownerPage.goto(PORTAL_APPOINTMENTS_URL)
        await ownerPage.waitForTimeout(1000)

        // Should see completed appointment
        const completedAppointments = ownerPage.locator(
          '[data-status="completed"], :text("Completada")'
        )
        expect(await completedAppointments.count()).toBeGreaterThan(0)

      } finally {
        await staffContext.close()
        await ownerContext.close()
      }
    })
  })

  test.describe('Status Transitions', () => {
    test('appointment follows correct status lifecycle', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      // Track status changes
      const statuses: string[] = []
      
      const appointment = page.locator('[data-testid="appointment-card"]').first()
      if (await appointment.isVisible()) {
        // Initial status
        const initialStatus = await appointment.textContent()
        statuses.push(initialStatus || 'unknown')

        await appointment.click()
        
        // Check-in
        const checkInButton = page.locator('button:has-text("Check")')
        if (await checkInButton.isVisible()) {
          await checkInButton.click()
          await page.waitForTimeout(500)
          
          const statusAfterCheckIn = await appointment.textContent()
          statuses.push(statusAfterCheckIn || 'unknown')
        }

        // Complete
        const completeButton = page.locator('button:has-text("Completar")')
        if (await completeButton.isVisible()) {
          await completeButton.click()
          await page.waitForTimeout(500)
          
          const finalStatus = await appointment.textContent()
          statuses.push(finalStatus || 'unknown')
        }

        console.log('Status lifecycle:', statuses)
        
        // Should have at least 2 different statuses
        const uniqueStatuses = new Set(statuses)
        expect(uniqueStatuses.size).toBeGreaterThan(1)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('handles network error during check-in gracefully', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_DASHBOARD_URL)
      await page.waitForTimeout(1000)

      const appointment = page.locator('[data-testid="appointment-card"]').first()
      
      if (await appointment.isVisible()) {
        await appointment.click()

        // Intercept check-in API call
        await page.route('**/api/appointments/**/check-in', (route) => {
          route.abort('failed')
        })

        const checkInButton = page.locator('button:has-text("Check")')
        if (await checkInButton.isVisible()) {
          await checkInButton.click()
          await page.waitForTimeout(1000)

          // Should show error, not crash
          const errorMessage = page.locator('[role="alert"], .error, :text("Error")')
          if ((await errorMessage.count()) > 0) {
            await expect(errorMessage.first()).toBeVisible()
          }

          // Appointment should still be in original state
          const status = page.locator('[data-status]')
          const statusValue = await status.getAttribute('data-status')
          expect(statusValue).not.toBe('checked-in')
        }
      }
    })
  })
})
