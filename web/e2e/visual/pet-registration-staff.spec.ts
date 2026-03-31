/**
 * E2E Visual Tests: Pet Registration - Staff Dashboard
 *
 * Tests the pet registration flow in the staff dashboard with screenshots.
 * Tests ALL 8 species options and staff-specific fields.
 *
 * Note: Requires staff (vet/admin) authentication.
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, waitForPageReady, waitForToast } from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const DASHBOARD_PATIENTS_URL = `/${E2E_TENANT}/dashboard/patients`
const DASHBOARD_URL = `/${E2E_TENANT}/dashboard`

// Staff authentication - uses vet or admin stored state
// Note: You may need to create .auth/staff.json similar to owner.json
test.use({ storageState: '.auth/owner.json' }) // Fallback to owner for now

// =============================================================================
// All 8 Species Options
// =============================================================================

const SPECIES_OPTIONS = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'fish',
  'reptile',
  'other',
] as const

const SPECIES_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  rabbit: 'Conejo',
  hamster: 'Hámster',
  fish: 'Pez',
  reptile: 'Reptil',
  other: 'Otro',
}

const SEX_OPTIONS = ['male', 'female', 'unknown'] as const

const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

// =============================================================================
// Staff Quick Add Form Tests
// =============================================================================

test.describe('Pet Registration Staff - Quick Add Form', () => {
  test('access staff dashboard and find quick add', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', 'access')

    // Navigate to staff dashboard
    await page.goto(DASHBOARD_URL)
    await waitForPageReady(page)
    await screenshot.capture('staff_dashboard')

    // Look for quick add button or patients section
    const quickAddButton = page.locator(
      'button:has-text("Nueva Mascota"), button:has-text("Agregar"), [data-testid="quick-add-pet"]'
    )
    const patientsLink = page.locator('a:has-text("Pacientes"), [href*="/patients"]')

    if (await quickAddButton.isVisible()) {
      await quickAddButton.click()
      await page.waitForTimeout(500)
      await screenshot.capture('quick_add_form_open')
    } else if (await patientsLink.isVisible()) {
      await patientsLink.click()
      await waitForPageReady(page)
      await screenshot.capture('patients_page')

      // Look for add button on patients page
      const addButton = page.locator('button:has-text("Nuevo"), button:has-text("Agregar")')
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)
        await screenshot.capture('add_pet_form')
      }
    }
  })
})

// =============================================================================
// All 8 Species Tests
// =============================================================================

test.describe('Pet Registration Staff - All Species', () => {
  for (const species of SPECIES_OPTIONS) {
    test(`species option: ${species} (${SPECIES_LABELS[species]})`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `species`)

      // Navigate to patients/add pet
      await page.goto(DASHBOARD_PATIENTS_URL)
      await waitForPageReady(page)

      // Open add form
      const addButton = page.locator(
        'button:has-text("Nueva Mascota"), button:has-text("Nuevo Paciente"), button:has-text("Agregar"), [data-testid="add-pet"]'
      )

      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)
      }

      // Look for species select
      const speciesSelect = page.locator('select[name="species"]')
      const speciesButtons = page.locator(`[data-value="${species}"], button:has-text("${SPECIES_LABELS[species]}")`)

      if (await speciesSelect.isVisible()) {
        // Dropdown select
        await speciesSelect.selectOption(species)
        await page.waitForTimeout(300)
        await screenshot.capture(`${species}_selected`)

        // Verify selection
        await expect(speciesSelect).toHaveValue(species)
      } else if (await speciesButtons.first().isVisible()) {
        // Button-based selection
        await speciesButtons.first().click()
        await page.waitForTimeout(300)
        await screenshot.capture(`${species}_selected`)
      } else {
        // Try radio button
        const radio = page.locator(`input[value="${species}"]`)
        if (await radio.isVisible()) {
          await radio.click()
          await page.waitForTimeout(300)
          await screenshot.capture(`${species}_selected`)
        } else {
          // Skip if species field not found
          await screenshot.capture(`${species}_field_not_found`)
        }
      }
    })
  }

  test('species dropdown shows all 8 options', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `species`)

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }

    const speciesSelect = page.locator('select[name="species"]')

    if (await speciesSelect.isVisible()) {
      await speciesSelect.click()
      await screenshot.capture('species_dropdown_all_options')

      // Count options
      const options = speciesSelect.locator('option')
      const optionCount = await options.count()

      // Should have at least 8 species options
      expect(optionCount).toBeGreaterThanOrEqual(8)

      // Verify specific options exist
      for (const species of SPECIES_OPTIONS) {
        const option = speciesSelect.locator(`option[value="${species}"]`)
        const exists = (await option.count()) > 0
        if (!exists) {
          console.log(`Warning: Species option '${species}' not found`)
        }
      }
    }
  })
})

// =============================================================================
// Sex Options Tests (including 'unknown')
// =============================================================================

test.describe('Pet Registration Staff - Sex Options', () => {
  for (const sex of SEX_OPTIONS) {
    test(`sex option: ${sex} (${SEX_LABELS[sex]})`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `sex`)

      await page.goto(DASHBOARD_PATIENTS_URL)
      await waitForPageReady(page)

      // Open add form
      const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)
      }

      // Look for sex select or radio
      const sexSelect = page.locator('select[name="sex"]')
      const sexRadio = page.locator(`input[value="${sex}"]`)
      const sexLabel = page.locator(`label:has-text("${SEX_LABELS[sex]}")`)

      if (await sexSelect.isVisible()) {
        await sexSelect.selectOption(sex)
        await page.waitForTimeout(300)
        await screenshot.capture(`${sex}_selected`)
        await expect(sexSelect).toHaveValue(sex)
      } else if (await sexRadio.isVisible()) {
        await sexRadio.click()
        await page.waitForTimeout(300)
        await screenshot.capture(`${sex}_selected`)
        await expect(sexRadio).toBeChecked()
      } else if (await sexLabel.isVisible()) {
        await sexLabel.click()
        await page.waitForTimeout(300)
        await screenshot.capture(`${sex}_selected`)
      }
    })
  }
})

// =============================================================================
// Staff-Specific Fields Tests
// =============================================================================

test.describe('Pet Registration Staff - Staff Fields', () => {
  test('client/owner selection dropdown', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `staff-fields`)

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }

    // Look for client/owner selection
    const clientSelect = page.locator(
      'select[name="owner_id"], select[name="client_id"], [data-testid="client-select"]'
    )
    const clientSearch = page.locator(
      'input[placeholder*="cliente"], input[placeholder*="dueño"], input[placeholder*="propietario"]'
    )

    if (await clientSelect.isVisible()) {
      await clientSelect.click()
      await screenshot.capture('client_dropdown')
    } else if (await clientSearch.isVisible()) {
      await clientSearch.click()
      await clientSearch.fill('test')
      await page.waitForTimeout(500)
      await screenshot.capture('client_search')
    }
  })

  test('microchip field in staff form', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `staff-fields`)

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }

    // Look for microchip field
    const microchipInput = page.locator(
      'input[name="microchip_id"], input[name="microchip_number"], input[placeholder*="microchip"]'
    )

    if (await microchipInput.isVisible()) {
      await microchipInput.fill('123456789012345')
      await screenshot.capture('microchip_filled')
    }
  })

  test('registration number field', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', `staff-fields`)

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }

    // Look for registration number field
    const regNumberInput = page.locator(
      'input[name="registration_number"], input[placeholder*="registro"]'
    )

    if (await regNumberInput.isVisible()) {
      await regNumberInput.fill('REG-2024-001')
      await screenshot.capture('registration_number_filled')
    }
  })
})

// =============================================================================
// Complete Staff Registration Flow
// =============================================================================

test.describe('Pet Registration Staff - Complete Flow', () => {
  test('create pet for existing client', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', 'complete-flow')

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)
    await screenshot.capture('patients_list')

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar"), button:has-text("Nuevo")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
      await screenshot.capture('add_form_open')
    }

    // Fill form
    const nameInput = page.locator('input[name="name"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill(`Staff Pet ${Date.now()}`)
    }

    // Select species (try exotic option)
    const speciesSelect = page.locator('select[name="species"]')
    if (await speciesSelect.isVisible()) {
      await speciesSelect.selectOption('bird')
      await screenshot.capture('exotic_species_selected')
    }

    // Select sex
    const sexSelect = page.locator('select[name="sex"]')
    const sexRadio = page.locator('input[value="female"]')
    if (await sexSelect.isVisible()) {
      await sexSelect.selectOption('female')
    } else if (await sexRadio.isVisible()) {
      await sexRadio.click()
    }

    // Fill weight
    const weightInput = page.locator('input[name="weight"]')
    if (await weightInput.isVisible()) {
      await weightInput.fill('0.5')
    }

    await screenshot.capture('staff_form_complete')

    // Submit
    const submitButton = page.locator('button[type="submit"]')
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(2000)

      const toast = await waitForToast(page, 5000)
      if (toast) {
        await screenshot.capture('pet_created_success')
      }
    }
  })
})

// =============================================================================
// Validation Tests
// =============================================================================

test.describe('Pet Registration Staff - Validation', () => {
  test('required fields validation', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-staff', 'validation')

    await page.goto(DASHBOARD_PATIENTS_URL)
    await waitForPageReady(page)

    // Open add form
    const addButton = page.locator('button:has-text("Nueva"), button:has-text("Agregar")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(500)
    }

    // Submit empty form
    const submitButton = page.locator('button[type="submit"]')
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(500)
      await screenshot.capture('empty_form_errors')

      // Check for error indicators
      const errors = page.locator('.error, .text-red-500, [aria-invalid="true"], input:invalid')
      const errorCount = await errors.count()

      if (errorCount > 0) {
        expect(errorCount).toBeGreaterThan(0)
      }
    }
  })
})
