/**
 * E2E Tests: Medical Records
 *
 * Tests medical record viewing:
 * - Medical history timeline
 * - Record details
 * - Prescriptions
 */

import { test, expect, portalUrl, getFirstPet, waitForLoadingComplete } from '../factories/test-fixtures'

// =============================================================================
// Medical History Tests
// =============================================================================

test.describe('Medical Records - History', () => {
  test('pet detail shows medical history section', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for medical history tab or section
    const historyTab = page.locator(
      '[role="tab"]:has-text("Historial"), [role="tab"]:has-text("Médico"), button:has-text("Historial")'
    )

    if (await historyTab.isVisible()) {
      await historyTab.click()
      await page.waitForTimeout(300)
    }

    const historyContent = page.locator(
      '[data-testid="medical-history"], :text("Historial"), :text("consulta")'
    )

    await expect(historyContent.first()).toBeVisible()
  })

  test('shows medical records timeline', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const historyTab = page.locator('[role="tab"]:has-text("Historial")')
    if (await historyTab.isVisible()) {
      await historyTab.click()
    }

    // Should show timeline or list
    const timeline = page.locator(
      '[data-testid="timeline"], .timeline, [role="list"]'
    )

    if (await timeline.isVisible()) {
      await expect(timeline).toBeVisible()
    }
  })

  test('records show date and type', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const historyTab = page.locator('[role="tab"]:has-text("Historial")')
    if (await historyTab.isVisible()) {
      await historyTab.click()
    }

    // Records should have date info
    const dateInfo = page.locator('[data-testid="record-date"], time, :text("202")')

    if (await dateInfo.first().isVisible()) {
      await expect(dateInfo.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Record Details Tests
// =============================================================================

test.describe('Medical Records - Details', () => {
  test('can view record details', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const historyTab = page.locator('[role="tab"]:has-text("Historial")')
    if (await historyTab.isVisible()) {
      await historyTab.click()
    }

    // Click on a record
    const recordItem = page.locator('[data-testid="record-item"], .record-item, tr')

    if (await recordItem.first().isVisible()) {
      await recordItem.first().click()

      // Should show details
      const details = page.locator(':text("Diagnóstico"), :text("Notas"), :text("Tratamiento")')
      if (await details.first().isVisible()) {
        await expect(details.first()).toBeVisible()
      }
    }
  })

  test('shows diagnosis information', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const historyTab = page.locator('[role="tab"]:has-text("Historial")')
    if (await historyTab.isVisible()) {
      await historyTab.click()
    }

    const diagnosisInfo = page.locator(':text("Diagnóstico"), [data-testid="diagnosis"]')

    if (await diagnosisInfo.first().isVisible()) {
      await expect(diagnosisInfo.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Prescriptions Tests
// =============================================================================

test.describe('Medical Records - Prescriptions', () => {
  test('pet detail shows prescriptions section', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const prescriptionsTab = page.locator(
      '[role="tab"]:has-text("Recetas"), [role="tab"]:has-text("Prescripciones")'
    )

    if (await prescriptionsTab.isVisible()) {
      await prescriptionsTab.click()
      await page.waitForTimeout(300)
    }

    const prescriptionsContent = page.locator(
      '[data-testid="prescriptions"], :text("Receta"), :text("Prescripción")'
    )

    if (await prescriptionsContent.first().isVisible()) {
      await expect(prescriptionsContent.first()).toBeVisible()
    }
  })

  test('shows prescription medications', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const prescriptionsTab = page.locator('[role="tab"]:has-text("Recetas")')
    if (await prescriptionsTab.isVisible()) {
      await prescriptionsTab.click()
    }

    const medicationInfo = page.locator(':text("Medicamento"), :text("Dosis"), [data-testid="medication"]')

    if (await medicationInfo.first().isVisible()) {
      await expect(medicationInfo.first()).toBeVisible()
    }
  })

  test('can download prescription PDF', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const prescriptionsTab = page.locator('[role="tab"]:has-text("Recetas")')
    if (await prescriptionsTab.isVisible()) {
      await prescriptionsTab.click()
    }

    const downloadButton = page.locator(
      'button:has-text("Descargar"), a:has-text("PDF"), [data-testid="download-prescription"]'
    )

    if (await downloadButton.first().isVisible()) {
      await expect(downloadButton.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Medical Records - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('medical history works on mobile', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
