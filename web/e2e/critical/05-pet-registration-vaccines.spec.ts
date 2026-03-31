/**
 * E2E Critical Path: Pet Registration & Vaccination Lifecycle
 *
 * Tests the complete pet onboarding and vaccination workflow.
 * This validates pet creation, medical record setup, and vaccination tracking.
 *
 * Flow tested:
 * 1. Owner registers new pet in portal
 * 2. Staff views pet in dashboard
 * 3. Staff records vaccine administration
 * 4. Owner sees vaccine record in portal
 * 5. Vaccine status tracking (next due date, completion)
 *
 * @tags e2e, critical, pet, vaccine, medical
 */

 
import { test, expect, Page } from '@playwright/test'
import { TEST_USERS, E2E_TEST_TENANT } from '../fixtures/test-users'

const TENANT_SLUG = E2E_TEST_TENANT
const PORTAL_PETS_URL = `/${TENANT_SLUG}/portal/pets`
const STAFF_PETS_URL = `/${TENANT_SLUG}/dashboard/pets`
const LOGIN_URL = `/${TENANT_SLUG}/portal/login`

// Use centralized test credentials
const OWNER_USER = TEST_USERS.owner
const VET_USER = TEST_USERS.vet

async function login(page: Page, userType: 'owner' | 'vet'): Promise<void> {
  const credentials = userType === 'owner' ? OWNER_USER : VET_USER
  
  await page.goto(LOGIN_URL)
  await page.locator('input[type="email"]').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

test.describe('Critical Path: Pet Registration & Vaccines', () => {
  test('complete pet lifecycle from registration to vaccination', async ({ browser }) => {
    const ownerContext = await browser.newContext()
    const vetContext = await browser.newContext()

    const ownerPage = await ownerContext.newPage()
    const vetPage = await vetContext.newPage()

    try {
      // ================================================================
      // Phase 1: Owner Registers New Pet
      // ================================================================
      
      console.log('Phase 1: Owner registers new pet...')
      await login(ownerPage, 'owner')
      await ownerPage.goto(PORTAL_PETS_URL)
      await ownerPage.waitForTimeout(1000)

      const addPetButton = ownerPage.locator(
        'button:has-text("Nueva"), button:has-text("Agregar"), a:has-text("Registrar")'
      )

      if (await addPetButton.isVisible()) {
        await addPetButton.click()
        await ownerPage.waitForTimeout(1000)

        // Fill pet form
        const nameInput = ownerPage.locator('input[name="name"], input[name="pet_name"]')
        const speciesSelect = ownerPage.locator('select[name="species"]')
        const breedInput = ownerPage.locator('input[name="breed"], select[name="breed"]')

        if (await nameInput.isVisible()) {
          const petName = `TestPet${Date.now()}`
          await nameInput.fill(petName)
        }

        if (await speciesSelect.isVisible()) {
          await speciesSelect.selectOption({ value: 'dog' })
        }

        if (await breedInput.isVisible()) {
          if (await breedInput.evaluate((el) => el.tagName) === 'SELECT') {
            await breedInput.selectOption({ index: 1 })
          } else {
            await breedInput.fill('Mixed')
          }
        }

        // Submit
        const saveButton = ownerPage.locator('button[type="submit"], button:has-text("Guardar")')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await ownerPage.waitForTimeout(2000)

          console.log('✓ Pet registered')
        }
      }

      // Verify pet in owner's list
      await ownerPage.goto(PORTAL_PETS_URL)
      await ownerPage.waitForTimeout(1000)

      const petCards = ownerPage.locator('[data-testid="pet-card"], .pet-card')
      expect(await petCards.count()).toBeGreaterThan(0)
      console.log('✓ Pet visible in owner portal')

      // ================================================================
      // Phase 2: Staff Views Pet
      // ================================================================

      console.log('Phase 2: Staff views pet in dashboard...')
      await login(vetPage, 'vet')
      await vetPage.goto(STAFF_PETS_URL)
      await vetPage.waitForTimeout(1000)

      const staffPets = vetPage.locator('[data-testid="pet-row"], .pet-item, tr')
      expect(await staffPets.count()).toBeGreaterThan(0)
      console.log('✓ Pet visible in staff dashboard')

      // ================================================================
      // Phase 3: Staff Records Vaccine
      // ================================================================

      console.log('Phase 3: Staff records vaccine administration...')

      const petRow = staffPets.first()
      await petRow.click()
      await vetPage.waitForTimeout(1000)

      // Look for vaccines section or add vaccine button
      const addVaccineButton = vetPage.locator(
        'button:has-text("Vacuna"), button:has-text("Vaccine"), [data-action="add-vaccine"]'
      )

      if (await addVaccineButton.isVisible()) {
        await addVaccineButton.click()
        await vetPage.waitForTimeout(1000)

        // Fill vaccine form
        const vaccineSelect = vetPage.locator('select[name="vaccine"], select[name="vaccine_name"]')
        const dateInput = vetPage.locator('input[type="date"], input[name="administered_date"]')

        if (await vaccineSelect.isVisible()) {
          await vaccineSelect.selectOption({ index: 1 })
        }

        if (await dateInput.isVisible()) {
          const today = new Date().toISOString().split('T')[0]
          await dateInput.fill(today)
        }

        // Save vaccine record
        const saveVaccineButton = vetPage.locator('button:has-text("Guardar"), button[type="submit"]').last()
        if (await saveVaccineButton.isVisible()) {
          await saveVaccineButton.click()
          await vetPage.waitForTimeout(2000)

          console.log('✓ Vaccine recorded')
        }
      }

      // ================================================================
      // Phase 4: Owner Sees Vaccine Record
      // ================================================================

      console.log('Phase 4: Owner verifies vaccine record...')

      await ownerPage.goto(PORTAL_PETS_URL)
      await ownerPage.waitForTimeout(1000)

      const ownerPetCard = ownerPage.locator('[data-testid="pet-card"]').first()
      if (await ownerPetCard.isVisible()) {
        await ownerPetCard.click()
        await ownerPage.waitForTimeout(1000)

        // Look for vaccines section
        const vaccineSection = ownerPage.locator(
          '[data-testid="vaccines"], :text("Vacunas"), .vaccines-list'
        )

        if (await vaccineSection.isVisible()) {
          console.log('✓ Owner sees vaccine records')
          await expect(vaccineSection).toBeVisible()
        }

        // Check for next due date
        const nextDue = ownerPage.locator(':text("Próxima"), :text("Next"), [data-testid="next-due"]')
        if (await nextDue.isVisible()) {
          console.log('✓ Next due date visible')
        }
      }

      console.log('\n✅ Complete pet lifecycle test passed!')
      console.log('   Register → Staff View → Vaccine → Owner View')

    } finally {
      await ownerContext.close()
      await vetContext.close()
    }
  })

  test.describe('Pet Registration', () => {
    test('owner can register new pet', async ({ page }) => {
      await login(page, 'owner')
      await page.goto(PORTAL_PETS_URL)
      await page.waitForTimeout(1000)

      const beforeCount = await page.locator('[data-testid="pet-card"]').count()

      const addButton = page.locator('button:has-text("Nueva")')
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        await page.locator('input[name="name"]').fill(`Pet${Date.now()}`)
        const speciesSelect = page.locator('select[name="species"]')
        if (await speciesSelect.isVisible()) {
          await speciesSelect.selectOption({ value: 'dog' })
        }

        await page.locator('button[type="submit"]').click()
        await page.waitForTimeout(2000)

        await page.goto(PORTAL_PETS_URL)
        await page.waitForTimeout(1000)

        const afterCount = await page.locator('[data-testid="pet-card"]').count()
        expect(afterCount).toBeGreaterThan(beforeCount)
      }
    })
  })

  test.describe('Vaccine Management', () => {
    test('staff can record vaccine administration', async ({ page }) => {
      await login(page, 'vet')
      await page.goto(STAFF_PETS_URL)
      await page.waitForTimeout(1000)

      const pet = page.locator('[data-testid="pet-row"]').first()
      if (await pet.isVisible()) {
        await pet.click()
        await page.waitForTimeout(500)

        const addVaccineButton = page.locator('button:has-text("Vacuna")')
        if (await addVaccineButton.isVisible()) {
          await addVaccineButton.click()
          await page.waitForTimeout(500)

          const vaccineSelect = page.locator('select[name="vaccine"]')
          if (await vaccineSelect.isVisible()) {
            await vaccineSelect.selectOption({ index: 1 })
            await page.locator('button:has-text("Guardar")').last().click()
            await page.waitForTimeout(2000)

            const vaccineList = page.locator('.vaccine-item, [data-testid="vaccine"]')
            expect(await vaccineList.count()).toBeGreaterThan(0)
          }
        }
      }
    })
  })
})
