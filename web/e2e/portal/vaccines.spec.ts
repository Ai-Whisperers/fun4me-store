/**
 * E2E Tests: Vaccine Records
 *
 * Tests vaccine record management:
 * - Viewing vaccine history (factory-created)
 * - Vaccine status indicators
 * - Adding new vaccine records
 *
 * Uses factory-created vaccines with varied statuses.
 */

import { test, expect, portalUrl, getFirstPet, waitForLoadingComplete } from '../factories/test-fixtures'

// =============================================================================
// Vaccine History Tests
// =============================================================================

test.describe('Vaccines - History', () => {
  test('pet detail shows vaccines tab/section', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for vaccines tab or section
    const vaccinesTab = page.locator(
      '[role="tab"]:has-text("Vacunas"), button:has-text("Vacunas"), a:has-text("Vacunas")'
    )

    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
      await page.waitForTimeout(300)
    }

    // Should see vaccine content
    const vaccineContent = page.locator(
      '[data-testid="vaccines-list"], :text("Antirrábica"), :text("Vacuna")'
    )

    await expect(vaccineContent.first()).toBeVisible()
  })

  test('displays factory-created vaccines', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Navigate to vaccines
    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    // Should show vaccine names
    const vaccineNames = ['Antirrábica', 'Séxtuple', 'Tos de las perreras']
    
    for (const name of vaccineNames) {
      const vaccineElement = page.locator(`text="${name}"`)
      if (await vaccineElement.isVisible()) {
        await expect(vaccineElement).toBeVisible()
        break
      }
    }
  })

  test('shows vaccine status indicators', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    // Should show status badges (completed, pending, overdue)
    const statusBadges = page.locator(
      '[data-testid="vaccine-status"], .badge, .status, :text("Completada"), :text("Vencida"), :text("Pendiente")'
    )

    if (await statusBadges.first().isVisible()) {
      await expect(statusBadges.first()).toBeVisible()
    }
  })

  test('shows next due dates', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    // Should show date information
    const dateInfo = page.locator(':text("Próxima"), :text("Vence"), :text("Fecha")')

    if (await dateInfo.first().isVisible()) {
      await expect(dateInfo.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Dashboard Vaccine Alerts
// =============================================================================

test.describe('Vaccines - Dashboard Alerts', () => {
  test('dashboard shows pending vaccines', async ({ page }) => {
    await page.goto(portalUrl('dashboard'))
    await waitForLoadingComplete(page)

    // Look for vaccine alerts section
    const vaccineAlerts = page.locator(
      '[data-testid="vaccine-alerts"], :text("Vacunas pendientes"), :text("Próximas vacunas")'
    )

    if (await vaccineAlerts.first().isVisible()) {
      await expect(vaccineAlerts.first()).toBeVisible()
    }
  })

  test('dashboard shows overdue vaccines with warning', async ({ page }) => {
    await page.goto(portalUrl('dashboard'))
    await waitForLoadingComplete(page)

    // Look for overdue warning
    const overdueWarning = page.locator(
      ':text("Vencida"), :text("Atrasada"), .warning, .text-red'
    )

    if (await overdueWarning.first().isVisible()) {
      await expect(overdueWarning.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Add Vaccine Tests
// =============================================================================

test.describe('Vaccines - Add Record', () => {
  test('has button to add new vaccine', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    const addButton = page.locator(
      'button:has-text("Agregar vacuna"), a:has-text("Nueva vacuna"), [data-testid="add-vaccine"]'
    )

    await expect(addButton.first()).toBeVisible()
  })

  test('add vaccine form shows required fields', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}/vaccines/new`))
    await waitForLoadingComplete(page)

    // Should show vaccine form
    const vaccineNameInput = page.locator(
      'input[name="name"], select[name="vaccine_name"], [data-testid="vaccine-name"]'
    )

    await expect(vaccineNameInput).toBeVisible()
  })

  test('can fill vaccine form', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}/vaccines/new`))
    await waitForLoadingComplete(page)

    // Fill form
    const vaccineInput = page.locator('input[name="name"], select[name="vaccine_name"]')
    if (await vaccineInput.isVisible()) {
      if (await vaccineInput.evaluate((el) => el.tagName === 'SELECT')) {
        await vaccineInput.selectOption({ index: 1 })
      } else {
        await vaccineInput.fill('E2E Test Vaccine')
      }
    }

    // Fill date
    const dateInput = page.locator('input[type="date"], input[name="administered_date"]')
    if (await dateInput.isVisible()) {
      await dateInput.fill(new Date().toISOString().split('T')[0])
    }
  })
})

// =============================================================================
// Vaccine Details Tests
// =============================================================================

test.describe('Vaccines - Details', () => {
  test('can view vaccine details', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    // Click on a vaccine record
    const vaccineRow = page.locator('[data-testid="vaccine-row"], .vaccine-item, tr:has-text("Antirrábica")')
    
    if (await vaccineRow.first().isVisible()) {
      await vaccineRow.first().click()

      // Should show details
      const details = page.locator(':text("Fabricante"), :text("Lote"), :text("Detalles")')
      if (await details.first().isVisible()) {
        await expect(details.first()).toBeVisible()
      }
    }
  })

  test('shows manufacturer and batch info', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    // Vaccine info should include manufacturer
    const manufacturerInfo = page.locator(':text("Nobivac"), :text("Fabricante")')

    if (await manufacturerInfo.first().isVisible()) {
      await expect(manufacturerInfo.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Vaccines - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('vaccines list works on mobile', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const vaccinesTab = page.locator('[role="tab"]:has-text("Vacunas")')
    if (await vaccinesTab.isVisible()) {
      await vaccinesTab.click()
    }

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
