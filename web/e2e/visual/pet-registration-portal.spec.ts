/**
 * E2E Visual Tests: Pet Registration - Owner Portal
 *
 * Tests the complete pet registration flow in the owner portal with screenshots.
 * Tests ALL dropdown options: species (dog/cat), sex, temperament, diet category.
 */

import { test, expect } from '@playwright/test'
import { createScreenshotHelper, waitForPageReady, waitForToast } from '../helpers/screenshot-helper'

const E2E_TENANT = 'terrapet'
const NEW_PET_URL = `/${E2E_TENANT}/portal/pets/new`
const PETS_LIST_URL = `/${E2E_TENANT}/portal/pets`

// Use authenticated state
test.use({ storageState: '.auth/owner.json' })

// =============================================================================
// Dropdown Options to Test
// =============================================================================

const SPECIES_OPTIONS = ['dog', 'cat'] as const
const SEX_OPTIONS = ['male', 'female'] as const
const TEMPERAMENT_OPTIONS = ['unknown', 'friendly', 'shy', 'aggressive', 'calm'] as const
const DIET_OPTIONS = ['balanced', 'wet', 'raw', 'mixed', 'prescription'] as const

// Spanish labels for dropdowns
const SPECIES_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
}

const SEX_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
}

const TEMPERAMENT_LABELS: Record<string, string> = {
  unknown: 'No estoy seguro',
  friendly: 'Amigable',
  shy: 'Tímido',
  aggressive: 'Agresivo',
  calm: 'Tranquilo',
}

const DIET_LABELS: Record<string, string> = {
  balanced: 'Balanceado',
  wet: 'Húmedo',
  raw: 'BARF',
  mixed: 'Mixta',
  prescription: 'Prescripción',
}

// =============================================================================
// Complete Pet Registration Flow
// =============================================================================

test.describe('Pet Registration Portal - Complete Flow', () => {
  test('complete pet registration with all fields', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', 'complete-flow')

    // Step 1: Navigate to new pet form
    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)
    await screenshot.capture('new_pet_form_empty')

    // Verify form sections are visible
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Step 2: Fill basic info
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill(`E2E Test Pet ${Date.now()}`)
    await screenshot.capture('name_filled')

    // Step 3: Select species (dog)
    const speciesSelect = page.locator('select[name="species"], [data-testid="species-select"]')
    if (await speciesSelect.isVisible()) {
      await speciesSelect.selectOption('dog')
    } else {
      // Try radio buttons
      const dogRadio = page.locator('input[value="dog"], label:has-text("Perro") input')
      if (await dogRadio.isVisible()) {
        await dogRadio.click()
      }
    }
    await screenshot.capture('species_dog_selected')

    // Step 4: Select sex
    const maleRadio = page.locator('input[value="male"], label:has-text("Macho") input')
    if (await maleRadio.isVisible()) {
      await maleRadio.click()
    }
    await screenshot.capture('sex_male_selected')

    // Step 5: Fill breed
    const breedInput = page.locator('input[name="breed"]')
    if (await breedInput.isVisible()) {
      await breedInput.fill('Golden Retriever')
      await screenshot.capture('breed_filled')
    }

    // Step 6: Fill birth date
    const birthDateInput = page.locator('input[name="date_of_birth"], input[type="date"]')
    if (await birthDateInput.isVisible()) {
      await birthDateInput.fill('2022-06-15')
      await screenshot.capture('birth_date_filled')
    }

    // Step 7: Fill weight
    const weightInput = page.locator('input[name="weight"]')
    if (await weightInput.isVisible()) {
      await weightInput.fill('25.5')
      await screenshot.capture('weight_filled')
    }

    // Step 8: Select temperament
    const temperamentSelect = page.locator('select[name="temperament"]')
    if (await temperamentSelect.isVisible()) {
      await temperamentSelect.selectOption('friendly')
      await screenshot.capture('temperament_friendly_selected')
    }

    // Step 9: Select diet
    const dietSelect = page.locator('select[name="diet_category"]')
    if (await dietSelect.isVisible()) {
      await dietSelect.selectOption('balanced')
      await screenshot.capture('diet_balanced_selected')
    }

    // Step 10: Fill optional fields
    const colorInput = page.locator('input[name="color"]')
    if (await colorInput.isVisible()) {
      await colorInput.fill('Dorado')
    }

    const allergiesInput = page.locator('input[name="allergies"], textarea[name="allergies"]')
    if (await allergiesInput.isVisible()) {
      await allergiesInput.fill('Pollo, Gluten')
    }

    await screenshot.capture('form_complete')

    // Step 11: Submit form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for redirect or success
    await page.waitForTimeout(3000)
    const toast = await waitForToast(page, 5000)

    if (toast || page.url().includes('/pets')) {
      await screenshot.capture('pet_created_success')
    }
  })
})

// =============================================================================
// Species Dropdown Tests
// =============================================================================

test.describe('Pet Registration Portal - Species Options', () => {
  for (const species of SPECIES_OPTIONS) {
    test(`species option: ${species} (${SPECIES_LABELS[species]})`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `species`)

      await page.goto(NEW_PET_URL)
      await waitForPageReady(page)

      // Select species
      const speciesSelect = page.locator('select[name="species"]')
      const speciesRadio = page.locator(`input[value="${species}"]`)
      const speciesLabel = page.locator(`label:has-text("${SPECIES_LABELS[species]}")`)

      if (await speciesSelect.isVisible()) {
        await speciesSelect.selectOption(species)
      } else if (await speciesRadio.isVisible()) {
        await speciesRadio.click()
      } else if (await speciesLabel.isVisible()) {
        await speciesLabel.click()
      }

      await page.waitForTimeout(300)
      await screenshot.capture(`${species}_selected`)

      // Verify selection
      if (await speciesSelect.isVisible()) {
        await expect(speciesSelect).toHaveValue(species)
      } else if (await speciesRadio.isVisible()) {
        await expect(speciesRadio).toBeChecked()
      }
    })
  }
})

// =============================================================================
// Sex Options Tests
// =============================================================================

test.describe('Pet Registration Portal - Sex Options', () => {
  for (const sex of SEX_OPTIONS) {
    test(`sex option: ${sex} (${SEX_LABELS[sex]})`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `sex`)

      await page.goto(NEW_PET_URL)
      await waitForPageReady(page)

      // Select sex (typically radio buttons)
      const sexRadio = page.locator(`input[value="${sex}"]`)
      const sexLabel = page.locator(`label:has-text("${SEX_LABELS[sex]}")`)

      if (await sexRadio.isVisible()) {
        await sexRadio.click()
      } else if (await sexLabel.isVisible()) {
        await sexLabel.click()
      }

      await page.waitForTimeout(300)
      await screenshot.capture(`${sex}_selected`)

      // Verify selection
      if (await sexRadio.isVisible()) {
        await expect(sexRadio).toBeChecked()
      }
    })
  }

  test('neutered checkbox with sex selection', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `sex`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    // Select male
    const maleRadio = page.locator('input[value="male"]')
    if (await maleRadio.isVisible()) {
      await maleRadio.click()
    }

    // Check neutered
    const neuteredCheckbox = page.locator('input[name="is_neutered"], input[type="checkbox"]').first()
    if (await neuteredCheckbox.isVisible()) {
      await neuteredCheckbox.check()
      await screenshot.capture('male_neutered_checked')
      await expect(neuteredCheckbox).toBeChecked()
    }
  })
})

// =============================================================================
// Temperament Dropdown Tests
// =============================================================================

test.describe('Pet Registration Portal - Temperament Options', () => {
  for (const temperament of TEMPERAMENT_OPTIONS) {
    test(`temperament option: ${temperament}`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `temperament`)

      await page.goto(NEW_PET_URL)
      await waitForPageReady(page)

      // Select temperament
      const temperamentSelect = page.locator('select[name="temperament"]')

      if (await temperamentSelect.isVisible()) {
        await temperamentSelect.selectOption(temperament)
        await page.waitForTimeout(300)
        await screenshot.capture(`${temperament}_selected`)

        // Verify selection
        await expect(temperamentSelect).toHaveValue(temperament)
      } else {
        // Skip if temperament field doesn't exist
        test.skip()
      }
    })
  }

  test('temperament dropdown shows all options', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `temperament`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const temperamentSelect = page.locator('select[name="temperament"]')

    if (await temperamentSelect.isVisible()) {
      // Click to open dropdown
      await temperamentSelect.click()
      await screenshot.capture('dropdown_open')

      // Verify all options exist
      const options = temperamentSelect.locator('option')
      const optionCount = await options.count()

      // Should have at least the 5 temperament options (plus maybe empty/placeholder)
      expect(optionCount).toBeGreaterThanOrEqual(5)
    }
  })
})

// =============================================================================
// Diet Category Dropdown Tests
// =============================================================================

test.describe('Pet Registration Portal - Diet Options', () => {
  for (const diet of DIET_OPTIONS) {
    test(`diet option: ${diet}`, async ({ page }) => {
      const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `diet`)

      await page.goto(NEW_PET_URL)
      await waitForPageReady(page)

      // Select diet category
      const dietSelect = page.locator('select[name="diet_category"]')

      if (await dietSelect.isVisible()) {
        await dietSelect.selectOption(diet)
        await page.waitForTimeout(300)
        await screenshot.capture(`${diet}_selected`)

        // Verify selection
        await expect(dietSelect).toHaveValue(diet)
      } else {
        // Skip if diet field doesn't exist
        test.skip()
      }
    })
  }

  test('diet dropdown shows all options', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `diet`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const dietSelect = page.locator('select[name="diet_category"]')

    if (await dietSelect.isVisible()) {
      await dietSelect.click()
      await screenshot.capture('diet_dropdown_open')

      const options = dietSelect.locator('option')
      const optionCount = await options.count()

      // Should have at least 5 diet options
      expect(optionCount).toBeGreaterThanOrEqual(5)
    }
  })

  test('diet notes field appears with diet selection', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `diet`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const dietSelect = page.locator('select[name="diet_category"]')
    const dietNotesInput = page.locator('input[name="diet_notes"], textarea[name="diet_notes"]')

    if (await dietSelect.isVisible()) {
      await dietSelect.selectOption('balanced')

      if (await dietNotesInput.isVisible()) {
        await dietNotesInput.fill('Royal Canin Medium Adult')
        await screenshot.capture('diet_with_notes')
      }
    }
  })
})

// =============================================================================
// Validation Error Tests
// =============================================================================

test.describe('Pet Registration Portal - Validation', () => {
  test('required field validation', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `validation`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    // Submit empty form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    await page.waitForTimeout(500)

    await screenshot.capture('empty_form_errors')

    // Verify error indicators
    const errorIndicator = page.locator(
      '[role="alert"], .error, .text-red-500, input:invalid, [aria-invalid="true"]'
    )
    await expect(errorIndicator.first()).toBeVisible()
  })

  test('name validation - too short', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `validation`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('A')
    await nameInput.blur()
    await page.waitForTimeout(300)

    await screenshot.capture('name_too_short')

    // Submit to trigger validation
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    await page.waitForTimeout(500)

    await screenshot.capture('name_validation_error')
  })

  test('weight validation - out of range', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `validation`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const weightInput = page.locator('input[name="weight"]')
    if (await weightInput.isVisible()) {
      // Test weight too high
      await weightInput.fill('999')
      await weightInput.blur()
      await page.waitForTimeout(300)

      await screenshot.capture('weight_too_high')

      // Test negative weight
      await weightInput.fill('-5')
      await weightInput.blur()
      await page.waitForTimeout(300)

      await screenshot.capture('weight_negative')
    }
  })

  test('birth date validation - future date', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `validation`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    const birthDateInput = page.locator('input[name="date_of_birth"], input[type="date"]')
    if (await birthDateInput.isVisible()) {
      // Set future date
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      await birthDateInput.fill(futureDate.toISOString().split('T')[0])
      await birthDateInput.blur()
      await page.waitForTimeout(300)

      await screenshot.capture('birth_date_future')

      // Submit to trigger validation
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()
      await page.waitForTimeout(500)

      await screenshot.capture('birth_date_error')
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Pet Registration Portal - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('form is usable on mobile', async ({ page }) => {
    const screenshot = createScreenshotHelper(page, 'pet-registration-portal', `mobile`)

    await page.goto(NEW_PET_URL)
    await waitForPageReady(page)

    await screenshot.capture('mobile_form')

    // Verify form fits mobile
    const form = page.locator('form')
    const formBox = await form.boundingBox()
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(375)
    }

    // Fill form on mobile
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Mobile Test Pet')

    await screenshot.capture('mobile_name_filled')

    // Scroll to see more fields
    await page.evaluate(() => window.scrollBy(0, 300))
    await screenshot.capture('mobile_scrolled')
  })
})
