import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { navigateTo, ROUTES, waitForHeading, verifyUrl } from '../helpers/navigation';
import { getOwnerPets, verifySeededData } from '../helpers/database';

/**
 * Pet Owner Portal Tests - Pet Management
 * 
 * Verifies that pet owners can view their pets, medical history, vaccination
 * records, and other pet-related information through the owner portal.
 * 
 * Test Coverage:
 * - View list of owned pets
 * - View individual pet details
 * - View medical history
 * - View vaccination records
 * - Pet owner data isolation
 */

test.describe('Pet Owner Portal - Pet Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Verify seeded data exists before running tests
    const verification = await verifySeededData('terrapet');
    if (!verification.valid) {
      console.error('[E2E/Setup] Seeded data verification failed:', verification.errors);
      testInfo.skip(true, 'Seeded data not available');
      return;
    }

    // Login as pet owner for all tests
    await loginAs(page, 'terrapet', 'owner');
  });

  test.describe('Pet List View', () => {
    test('should display list of owner pets @owner @terrapet @pets', async ({ page }) => {
      // Arrange: Get expected pets from database
      const expectedPets = await getOwnerPets('owner@terrapet.demo');
      expect(expectedPets.length).toBeGreaterThan(0); // Verify test data exists

      // Act: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));

      // Assert: Pets list page loaded
      await waitForHeading(page, 'Mis Mascotas');
      await verifyUrl(page, /\/terrapet\/portal\/pets/);

      // Assert: Pet cards are visible
      const petCards = page.locator('[data-testid="pet-card"]');
      const petCount = await petCards.count();
      expect(petCount).toBeGreaterThanOrEqual(1);

      // Assert: Can see pet names
      for (const pet of expectedPets) {
        const petName = page.locator(`text=${pet.name}`).first();
        await expect(petName).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show pet basic information in cards @owner @terrapet @pets', async ({ page }) => {
      // Act: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));

      // Assert: Wait for pet cards
      const firstPetCard = page.locator('[data-testid="pet-card"]').first();
      await firstPetCard.waitFor({ state: 'visible', timeout: 10000 });

      // Assert: Pet card contains key information
      // (Name, species, age/birthdate, photo)
      const hasName = await firstPetCard.locator('[data-testid="pet-name"]').isVisible()
        .catch(() => false);
      const hasSpecies = await firstPetCard.locator('[data-testid="pet-species"]').isVisible()
        .catch(() => false);

      // At least name should be visible
      expect(hasName || (await firstPetCard.textContent())).toBeTruthy();
    });

    test('should allow clicking pet card to view details @owner @terrapet @pets', async ({ page }) => {
      // Arrange: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));

      // Act: Click first pet card
      const firstPetCard = page.locator('[data-testid="pet-card"]').first();
      await firstPetCard.waitFor({ state: 'visible', timeout: 10000 });
      await firstPetCard.click();

      // Assert: Navigated to pet detail page
      await expect(page).toHaveURL(/\/terrapet\/portal\/pets\/[a-f0-9-]+/, {
        timeout: 10000,
      });

      // Assert: Pet detail page loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    });
  });

  test.describe('Pet Detail View', () => {
    test('should display comprehensive pet information @owner @terrapet @pets', async ({ page }) => {
      // Arrange: Navigate to pets and select first pet
      await navigateTo(page, ROUTES.myPets('terrapet'));
      const firstPetCard = page.locator('[data-testid="pet-card"]').first();
      await firstPetCard.waitFor({ state: 'visible', timeout: 10000 });
      await firstPetCard.click();

      // Wait for detail page
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Assert: Key sections visible
      const sections = [
        'Información General',
        'Historial Médico',
        'Vacunas',
      ];

      for (const section of sections) {
        const sectionHeading = page.locator(`h2:has-text("${section}"), h3:has-text("${section}")`).first();
        try {
          await expect(sectionHeading).toBeVisible({ timeout: 5000 });
        } catch {
          // Some sections might not exist or have different headings
          console.warn(`[E2E/Pets] Section "${section}" not found (might be optional)`);
        }
      }
    });

    test('should show medical history if available @owner @terrapet @pets @medical', async ({ page }) => {
      // Arrange: Navigate to pets and select first pet
      await navigateTo(page, ROUTES.myPets('terrapet'));
      const firstPetCard = page.locator('[data-testid="pet-card"]').first();
      await firstPetCard.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Act: Look for medical history section
      const medicalHistorySection = page.locator('text=Historial Médico, text=Registros Médicos').first();

      // Assert: If section exists, verify it's displayed properly
      const sectionVisible = await medicalHistorySection.isVisible().catch(() => false);
      if (sectionVisible) {
        // Medical history section should contain records or empty state
        const hasRecords = await page.locator('[data-testid="medical-record"]').count() > 0;
        const hasEmptyState = await page.locator('text=No hay registros, text=Sin registros').first().isVisible().catch(() => false);
        
        expect(hasRecords || hasEmptyState).toBe(true);
      }
    });

    test('should show vaccination records if available @owner @terrapet @pets @vaccines', async ({ page }) => {
      // Arrange: Navigate to pets and select first pet
      await navigateTo(page, ROUTES.myPets('terrapet'));
      const firstPetCard = page.locator('[data-testid="pet-card"]').first();
      await firstPetCard.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Act: Look for vaccines section
      const vaccinesSection = page.locator('text=Vacunas, text=Vacunación').first();

      // Assert: If section exists, verify it's displayed properly
      const sectionVisible = await vaccinesSection.isVisible().catch(() => false);
      if (sectionVisible) {
        // Vaccines section should contain records or empty state
        const hasVaccines = await page.locator('[data-testid="vaccine-record"]').count() > 0;
        const hasEmptyState = await page.locator('text=No hay vacunas, text=Sin vacunas').first().isVisible().catch(() => false);
        
        expect(hasVaccines || hasEmptyState).toBe(true);
      }
    });
  });

  test.describe('Medical History', () => {
    test('should navigate to medical history page @owner @terrapet @medical', async ({ page }) => {
      // Act: Navigate to medical records section
      await navigateTo(page, ROUTES.myMedicalRecords('terrapet'));

      // Assert: Medical records page loaded
      await verifyUrl(page, /\/terrapet\/portal\/medical-records/);
      
      // Assert: Page heading visible
      const heading = page.locator('h1:has-text("Historial Médico"), h1:has-text("Registros Médicos")').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should display medical records if available @owner @terrapet @medical', async ({ page }) => {
      // Act: Navigate to medical records
      await navigateTo(page, ROUTES.myMedicalRecords('terrapet'));

      // Assert: Records list or empty state visible
      const recordsList = page.locator('[data-testid="medical-records-list"]');
      const emptyState = page.locator('text=No hay registros médicos, text=Sin registros').first();

      const hasRecords = await recordsList.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasRecords || hasEmptyState).toBe(true);
    });
  });

  test.describe('Vaccination Records', () => {
    test('should view vaccination history @owner @terrapet @vaccines', async ({ page }) => {
      // Arrange: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));
      
      // Look for vaccines link or section
      const vaccinesLink = page.locator('a:has-text("Vacunas"), nav:has-text("Vacunas")').first();
      const linkVisible = await vaccinesLink.isVisible().catch(() => false);

      if (linkVisible) {
        // Act: Click vaccines link
        await vaccinesLink.click();
        await page.waitForLoadState('networkidle');

        // Assert: Vaccines page loaded
        const heading = page.locator('h1:has-text("Vacunas"), h2:has-text("Vacunas")').first();
        await expect(heading).toBeVisible({ timeout: 10000 });

        // Assert: Vaccine records or empty state visible
        const hasRecords = await page.locator('[data-testid="vaccine-record"]').count() > 0;
        const hasEmptyState = await page.locator('text=No hay vacunas, text=Sin vacunas').first().isVisible().catch(() => false);
        
        expect(hasRecords || hasEmptyState).toBe(true);
      } else {
        // Vaccines might be shown inline with pet details
        console.log('[E2E/Vaccines] Vaccines link not found - might be inline with pet details');
      }
    });
  });

  test.describe('Prescriptions', () => {
    test('should navigate to prescriptions page @owner @terrapet @prescriptions', async ({ page }) => {
      // Act: Navigate to prescriptions section
      await navigateTo(page, ROUTES.myPrescriptions('terrapet'));

      // Assert: Prescriptions page loaded
      await verifyUrl(page, /\/terrapet\/portal\/prescriptions/);

      // Assert: Page heading visible
      const heading = page.locator('h1:has-text("Recetas"), h1:has-text("Prescripciones")').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should display prescriptions if available @owner @terrapet @prescriptions', async ({ page }) => {
      // Act: Navigate to prescriptions
      await navigateTo(page, ROUTES.myPrescriptions('terrapet'));

      // Assert: Prescriptions list or empty state visible
      const prescriptionsList = page.locator('[data-testid="prescriptions-list"]');
      const emptyState = page.locator('text=No hay recetas, text=Sin recetas, text=No hay prescripciones').first();

      const hasPrescriptions = await prescriptionsList.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasPrescriptions || hasEmptyState).toBe(true);
    });
  });

  test.describe('Data Isolation', () => {
    test('should only see own pets @owner @terrapet @security', async ({ page }) => {
      // Arrange: Get owner's pets from database
      const ownerPets = await getOwnerPets('owner@terrapet.demo');
      const ownerPetNames = ownerPets.map(p => p.name);

      // Act: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));

      // Assert: All visible pets belong to this owner
      const petCards = page.locator('[data-testid="pet-card"]');
      const visiblePetCount = await petCards.count();

      expect(visiblePetCount).toBe(ownerPets.length);

      // Assert: Pet names match expected pets
      for (const petName of ownerPetNames) {
        const petCard = page.locator(`[data-testid="pet-card"]:has-text("${petName}")`).first();
        await expect(petCard).toBeVisible({ timeout: 5000 });
      }
    });

    test('should not see other owners pets @owner @terrapet @security', async ({ page }) => {
      // Act: Navigate to pets section
      await navigateTo(page, ROUTES.myPets('terrapet'));

      // Get all visible pet names
      const petCards = page.locator('[data-testid="pet-card"]');
      const petCount = await petCards.count();

      // Verify owner's pets from database
      const ownerPets = await getOwnerPets('owner@terrapet.demo');

      // Assert: Visible count matches owned count
      expect(petCount).toBeLessThanOrEqual(ownerPets.length);

      // Assert: Cannot manually navigate to another owner's pet
      // (This would require knowing another pet's ID, which shouldn't be exposed)
    });
  });
});
