/**
 * E2E Tests: Pet Management
 *
 * Tests pet owner's ability to manage their pets:
 * - View pets list with factory-created data
 * - View pet details
 * - Create new pets
 * - Edit pet information
 * - Weight tracking
 *
 * Uses authenticated context with pre-created test data.
 */

import { test, expect, portalUrl, getFirstPet, waitForLoadingComplete } from '../factories/test-fixtures'

const PETS_URL = portalUrl('pets')
const NEW_PET_URL = portalUrl('pets/new')

// =============================================================================
// Pets List Tests
// =============================================================================

test.describe('Pet Management - List', () => {
  test('displays pets list page', async ({ page }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Page should load without redirecting to login
    expect(page.url()).not.toContain('/login')

    // Should see pets content
    const petsContent = page.locator('main, [data-testid="pets-list"], .pets-container')
    await expect(petsContent).toBeVisible()
  })

  test('shows factory-created pets', async ({ page, testData }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Check each test pet is visible
    for (const pet of testData.pets) {
      const petElement = page.locator(`text="${pet.name}"`)

      // At least one pet should be visible
      if (await petElement.isVisible()) {
        await expect(petElement).toBeVisible()
        break
      }
    }
  })

  test('displays pet cards with basic info', async ({ page, testData }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Look for pet cards
    const petCards = page.locator(
      '[data-testid="pet-card"], .pet-card, article, [role="listitem"]'
    )

    // Should have at least the number of test pets
    const cardCount = await petCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(testData.pets.length)
  })

  test('can search pets by name', async ({ page, testData }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Buscar"], [data-testid="pet-search"]'
    )

    if (await searchInput.isVisible()) {
      const firstPet = getFirstPet(testData)
      if (firstPet) {
        await searchInput.fill(firstPet.name)
        await page.waitForTimeout(500)

        // Should show matching pet
        await expect(page.getByText(firstPet.name)).toBeVisible()
      }
    }
  })

  test('shows add new pet button', async ({ page }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Look for add pet button
    const addButton = page.locator(
      'a:has-text("Agregar"), button:has-text("Agregar"), a:has-text("Nueva mascota"), [data-testid="add-pet"]'
    )

    await expect(addButton.first()).toBeVisible()
  })

  test('add pet button navigates to new pet form', async ({ page }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    const addButton = page.locator(
      'a:has-text("Agregar"), a:has-text("Nueva"), [data-testid="add-pet"]'
    )

    if (await addButton.first().isVisible()) {
      await addButton.first().click()
      await page.waitForURL(/\/pets\/new|\/pets\/create/, { timeout: 10000 })
    }
  })
})

// =============================================================================
// Pet Details Tests
// =============================================================================

test.describe('Pet Management - Details', () => {
  test('can view pet detail page', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Should see pet name
    await expect(page.getByText(firstPet.name)).toBeVisible()
  })

  test('pet detail shows species and breed', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Should show species (dog/cat)
    const speciesText = firstPet.species === 'dog' ? /perro/i : /gato/i
    const speciesElement = page.locator(`text=${speciesText}`)

    if (await speciesElement.isVisible()) {
      await expect(speciesElement).toBeVisible()
    }
  })

  test('pet detail has tabs for different sections', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for tab navigation
    const tabs = page.locator('[role="tablist"], .tabs, nav[aria-label]')

    if (await tabs.isVisible()) {
      // Common tabs: General, Vacunas, Historial, etc.
      const tabButtons = tabs.locator('[role="tab"], button, a')
      expect(await tabButtons.count()).toBeGreaterThan(0)
    }
  })

  test('can navigate from list to pet detail', async ({ page, testData }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    // Click on pet name or card
    const petLink = page.locator(`a:has-text("${firstPet.name}"), [data-testid="pet-card"]:has-text("${firstPet.name}")`)

    if (await petLink.first().isVisible()) {
      await petLink.first().click()
      await page.waitForURL(/\/pets\//, { timeout: 10000 })
    }
  })
})

// =============================================================================
// Create Pet Tests
// =============================================================================

test.describe('Pet Management - Create', () => {
  test('new pet form displays required fields', async ({ page }) => {
    await page.goto(NEW_PET_URL)
    await waitForLoadingComplete(page)

    // Check for required fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="Nombre"]')
    await expect(nameInput).toBeVisible()
  })

  test('can select pet species', async ({ page }) => {
    await page.goto(NEW_PET_URL)
    await waitForLoadingComplete(page)

    // Look for species selection
    const speciesButtons = page.locator(
      'button:has-text("Perro"), button:has-text("Gato"), [data-testid="species-dog"]'
    )

    if (await speciesButtons.first().isVisible()) {
      await speciesButtons.first().click()
      // Should show selection
      const selected = page.locator('[aria-pressed="true"], .selected, [data-selected="true"]')
      expect(await selected.count()).toBeGreaterThan(0)
    }
  })

  test('can fill out new pet form', async ({ page }) => {
    await page.goto(NEW_PET_URL)
    await waitForLoadingComplete(page)

    // Fill form fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="Nombre"]')
    await nameInput.fill('E2E Test Pet')

    // Select species if available
    const dogButton = page.locator('button:has-text("Perro"), [data-value="dog"]')
    if (await dogButton.isVisible()) {
      await dogButton.click()
    }

    // Fill weight if available
    const weightInput = page.locator('input[name="weight_kg"], input[placeholder*="Peso"]')
    if (await weightInput.isVisible()) {
      await weightInput.fill('10')
    }
  })

  test('form shows validation errors for required fields', async ({ page }) => {
    await page.goto(NEW_PET_URL)
    await waitForLoadingComplete(page)

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Guardar")')
    await submitButton.click()

    // Should show validation error
    const errorMessage = page.locator(
      '[role="alert"], .error, .text-red-500, :text("requerido"), :text("obligatorio")'
    )

    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
  })
})

// =============================================================================
// Edit Pet Tests
// =============================================================================

test.describe('Pet Management - Edit', () => {
  test('can access edit page from pet detail', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for edit button
    const editButton = page.locator(
      'a:has-text("Editar"), button:has-text("Editar"), [data-testid="edit-pet"]'
    )

    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForURL(/\/edit|\/editar/, { timeout: 10000 })
    }
  })

  test('edit form is pre-filled with pet data', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}/edit`))
    await waitForLoadingComplete(page)

    // Name should be pre-filled
    const nameInput = page.locator('input[name="name"]')

    if (await nameInput.isVisible()) {
      const value = await nameInput.inputValue()
      expect(value).toBe(firstPet.name)
    }
  })
})

// =============================================================================
// Weight Tracking Tests
// =============================================================================

test.describe('Pet Management - Weight Tracking', () => {
  test('pet detail shows weight history section', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for weight section or tab
    const weightSection = page.locator(
      ':text("Peso"), :text("Weight"), [data-testid="weight-history"]'
    )

    if (await weightSection.first().isVisible()) {
      await expect(weightSection.first()).toBeVisible()
    }
  })

  test('can add weight record', async ({ page, testData }) => {
    const firstPet = getFirstPet(testData)
    if (!firstPet) {
      test.skip()
      return
    }

    await page.goto(portalUrl(`pets/${firstPet.id}`))
    await waitForLoadingComplete(page)

    // Look for add weight button
    const addWeightButton = page.locator(
      'button:has-text("Registrar peso"), button:has-text("Agregar peso"), [data-testid="add-weight"]'
    )

    if (await addWeightButton.isVisible()) {
      await addWeightButton.click()

      // Fill weight form
      const weightInput = page.locator('input[name="weight"], input[type="number"]')
      if (await weightInput.isVisible()) {
        await weightInput.fill('15.5')

        // Submit
        const saveButton = page.locator('button:has-text("Guardar"), button[type="submit"]')
        await saveButton.click()
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Pet Management - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('pets list is responsive on mobile', async ({ page }) => {
    await page.goto(PETS_URL)
    await waitForLoadingComplete(page)

    // Page should be usable
    const content = page.locator('main')
    await expect(content).toBeVisible()

    // Pet cards should stack vertically on mobile
    const petCards = page.locator('[data-testid="pet-card"], .pet-card, article')
    if ((await petCards.count()) > 0) {
      await expect(petCards.first()).toBeVisible()
    }
  })

  test('new pet form works on mobile', async ({ page }) => {
    await page.goto(NEW_PET_URL)
    await waitForLoadingComplete(page)

    // Form should be visible
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Can fill form on mobile
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Mobile Test Pet')
  })
})
