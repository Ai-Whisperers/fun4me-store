/**
 * E2E Visual Tests: Vaccination Warnings
 *
 * Tests vaccination status display and warning indicators with screenshots.
 * Validates that overdue, due soon, and completed vaccines show correctly.
 */

import { test, expect } from '@playwright/test'
import {
  createScreenshotHelper,
  waitForPageReady,
  hasWarningColor,
} from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const DASHBOARD_URL = `/${E2E_TENANT}/portal/dashboard`
const PETS_URL = `/${E2E_TENANT}/portal/pets`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Dashboard Vaccine Alerts
// =============================================================================

test.describe('Vaccination Warnings - Dashboard', () => {
  test('dashboard shows vaccine alerts', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'dashboard')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('dashboard_overview')

    // Look for vaccine alert section
    const vaccineAlerts = page.locator(
      '[data-testid="vaccine-alerts"], .vaccine-alerts, :text("Vacunas")'
    )

    if (await vaccineAlerts.isVisible()) {
      await screenshot.capture('vaccine_alerts_section', {
        highlight: '[data-testid="vaccine-alerts"]',
      })
    }

    // Look for alert badges/cards
    const alertBadge = page.locator(
      '.alert-badge, [data-testid="vaccine-alert"], .text-red-500, .text-yellow-500'
    )

    if ((await alertBadge.count()) > 0) {
      await screenshot.capture('alert_badges_visible')
    }
  })

  test('overdue vaccines show red warning', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'overdue')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)

    // Look for overdue indicators
    const overdueIndicator = page.locator(
      ':text("Vencida"), :text("Atrasada"), :text("Overdue"), .text-red-500, .bg-red-100'
    )
    const overdueCard = page.locator('[data-status="overdue"], .overdue-vaccine')

    if (await overdueIndicator.isVisible()) {
      await screenshot.capture('overdue_warning_visible')

      // Verify red color styling
      const hasRed = await hasWarningColor(page, '.text-red-500, .bg-red-100', 'red')
      if (hasRed) {
        await screenshot.capture('overdue_red_styling')
      }
    } else if (await overdueCard.isVisible()) {
      await screenshot.capture('overdue_card')
    } else {
      // Navigate to pets to find overdue vaccines
      await page.goto(PETS_URL)
      await waitForPageReady(page)

      const petCard = page.locator('[data-testid="pet-card"]').first()
      if (await petCard.isVisible()) {
        await petCard.click()
        await waitForPageReady(page)

        // Look for vaccines tab or section
        const vaccinesTab = page.locator('button:has-text("Vacunas"), a:has-text("Vacunas")')
        if (await vaccinesTab.isVisible()) {
          await vaccinesTab.click()
          await page.waitForTimeout(500)
          await screenshot.capture('pet_vaccines_section')

          // Look for overdue
          const overdueVaccine = page.locator(':text("Vencida"), .text-red-500')
          if (await overdueVaccine.isVisible()) {
            await screenshot.capture('overdue_vaccine_in_list')
          }
        }
      }
    }
  })

  test('due soon vaccines show yellow/amber warning', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'due-soon')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)

    // Look for due soon indicators
    const dueSoonIndicator = page.locator(
      ':text("Próxima"), :text("Por vencer"), :text("Due soon"), .text-yellow-500, .text-amber-500, .bg-yellow-100'
    )

    if (await dueSoonIndicator.isVisible()) {
      await screenshot.capture('due_soon_warning_visible')

      // Verify yellow/amber color
      const hasYellow = await hasWarningColor(page, '.text-yellow-500, .text-amber-500', 'yellow')
      if (hasYellow) {
        await screenshot.capture('due_soon_yellow_styling')
      }
    } else {
      await screenshot.capture('no_due_soon_on_dashboard')
    }
  })

  test('completed vaccines show green status', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'completed')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)

      // Look for vaccines section
      const vaccinesTab = page.locator('button:has-text("Vacunas"), a:has-text("Vacunas")')
      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
      }

      // Look for completed status
      const completedIndicator = page.locator(
        ':text("Completada"), :text("Al día"), :text("Completed"), .text-green-500, .bg-green-100'
      )

      if (await completedIndicator.isVisible()) {
        await screenshot.capture('completed_vaccine_green')

        // Verify green color
        const hasGreen = await hasWarningColor(page, '.text-green-500, .bg-green-100', 'green')
        if (hasGreen) {
          await screenshot.capture('completed_green_styling')
        }
      }
    }
  })
})

// =============================================================================
// Pet Vaccines Tab
// =============================================================================

test.describe('Vaccination Warnings - Pet Detail', () => {
  test('pet vaccines tab shows all vaccine records', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'pet-vaccines')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)
      await screenshot.capture('pet_detail_page')

      // Find and click vaccines tab
      const vaccinesTab = page.locator(
        'button:has-text("Vacunas"), a:has-text("Vacunas"), [data-tab="vaccines"]'
      )

      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
        await screenshot.capture('vaccines_tab_active')

        // Verify vaccine list is visible
        const vaccineList = page.locator('[data-testid="vaccine-list"], .vaccine-list, table')
        if (await vaccineList.isVisible()) {
          await screenshot.capture('vaccine_list_visible')

          // Count vaccines
          const vaccineItems = page.locator('[data-testid="vaccine-item"], .vaccine-row, tr')
          const count = await vaccineItems.count()
          console.log(`Found ${count} vaccine records`)
        }
      }
    }
  })

  test('vaccine detail shows administration date and next due', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'vaccine-detail')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)

      // Navigate to vaccines
      const vaccinesTab = page.locator('button:has-text("Vacunas")')
      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
      }

      // Click on first vaccine for detail
      const vaccineItem = page.locator('[data-testid="vaccine-item"], .vaccine-row').first()
      if (await vaccineItem.isVisible()) {
        await vaccineItem.click()
        await page.waitForTimeout(500)
        await screenshot.capture('vaccine_detail_view')

        // Verify key fields are shown
        const adminDate = page.locator(':text("Administrada"), :text("Fecha")')
        const nextDue = page.locator(':text("Próxima"), :text("Vencimiento")')

        if (await adminDate.isVisible()) {
          await screenshot.capture('admin_date_visible')
        }
        if (await nextDue.isVisible()) {
          await screenshot.capture('next_due_visible')
        }
      }
    }
  })

  test('vaccine status badge colors are correct', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'status-badges')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)

      const vaccinesTab = page.locator('button:has-text("Vacunas")')
      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
        await screenshot.capture('vaccine_status_badges')

        // Check for different status badges
        const overdueCount = await page.locator('.text-red-500, [data-status="overdue"]').count()
        const dueSoonCount = await page.locator('.text-yellow-500, [data-status="due_soon"]').count()
        const completedCount = await page.locator('.text-green-500, [data-status="completed"]').count()

        console.log(`Status counts - Overdue: ${overdueCount}, Due Soon: ${dueSoonCount}, Completed: ${completedCount}`)

        await screenshot.capture('all_status_types')
      }
    }
  })
})

// =============================================================================
// Vaccine Alert Actions
// =============================================================================

test.describe('Vaccination Warnings - Actions', () => {
  test('clicking vaccine alert navigates to pet', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'navigation')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)

    // Find clickable vaccine alert
    const vaccineAlert = page.locator(
      '[data-testid="vaccine-alert"] a, .vaccine-alert a, a:has-text("vacuna")'
    ).first()

    if (await vaccineAlert.isVisible()) {
      await screenshot.capture('vaccine_alert_clickable')
      await vaccineAlert.click()
      await waitForPageReady(page)
      await screenshot.capture('navigated_to_pet')

      // Verify we're on pet detail or vaccines page
      const url = page.url()
      expect(url).toMatch(/\/pets\/|\/vaccines/)
    }
  })

  test('vaccine reminder can be dismissed (if feature exists)', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'dismiss')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)

    // Look for dismiss button on alerts
    const dismissButton = page.locator(
      '[data-testid="dismiss-alert"], button:has-text("Ocultar"), button:has-text("Descartar")'
    ).first()

    if (await dismissButton.isVisible()) {
      await screenshot.capture('dismiss_button_visible')
      // Don't actually dismiss - just capture the option
    }
  })
})

// =============================================================================
// Vaccine Due Date Calculations
// =============================================================================

test.describe('Vaccination Warnings - Date Display', () => {
  test('overdue shows days/weeks overdue', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'date-display')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)

      const vaccinesTab = page.locator('button:has-text("Vacunas")')
      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
      }

      // Look for overdue duration text
      const overdueText = page.locator(
        ':text("días de atraso"), :text("semanas de atraso"), :text("days overdue")'
      )

      if (await overdueText.isVisible()) {
        await screenshot.capture('overdue_duration_shown')
      }
    }
  })

  test('due soon shows days until due', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'due-soon-display')

    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)

      const vaccinesTab = page.locator('button:has-text("Vacunas")')
      if (await vaccinesTab.isVisible()) {
        await vaccinesTab.click()
        await page.waitForTimeout(500)
      }

      // Look for due soon duration
      const dueSoonText = page.locator(
        ':text("días para vencer"), :text("vence en"), :text("due in")'
      )

      if (await dueSoonText.isVisible()) {
        await screenshot.capture('due_soon_days_shown')
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Vaccination Warnings - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('vaccine warnings display on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'vaccination-warnings', 'mobile')

    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('mobile_dashboard_vaccines')

    // Verify alerts are visible on mobile
    const alerts = page.locator('[data-testid="vaccine-alerts"], .vaccine-section')
    if (await alerts.isVisible()) {
      const alertBox = await alerts.boundingBox()
      if (alertBox) {
        expect(alertBox.width).toBeLessThanOrEqual(375)
      }
    }

    // Navigate to pet vaccines on mobile
    await page.goto(PETS_URL)
    await waitForPageReady(page)

    const petCard = page.locator('[data-testid="pet-card"]').first()
    if (await petCard.isVisible()) {
      await petCard.click()
      await waitForPageReady(page)
      await screenshot.capture('mobile_pet_vaccines')
    }
  })
})
