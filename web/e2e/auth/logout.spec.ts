import { test, expect } from '@playwright/test';
import { loginAs, logout, isLoggedIn } from '../helpers/auth';
import { verifyUrl } from '../helpers/navigation';

/**
 * Authentication Tests - Logout and Session Management
 * 
 * Verifies that users can securely log out and that sessions are properly
 * terminated. Tests that logged-out users cannot access protected routes.
 * 
 * Test Coverage:
 * - Successful logout for all roles
 * - Session termination
 * - Protected route access after logout
 * - Logout from different pages
 */

test.describe('Authentication - Logout and Session Management', () => {
  test.describe('Logout Functionality', () => {
    test('should logout owner successfully @owner @terrapet', async ({ page }) => {
      // Arrange: Login as owner
      await loginAs(page, 'terrapet', 'owner');
      await verifyUrl(page, /\/terrapet\/portal/);

      // Verify logged in
      let loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(true);

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login page
      await verifyUrl(page, /\/login/);

      // Assert: No longer logged in
      loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(false);

      // Assert: Login form visible
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should logout vet successfully @vet @terrapet', async ({ page }) => {
      // Arrange: Login as vet
      await loginAs(page, 'terrapet', 'vet');
      await verifyUrl(page, /\/terrapet\/dashboard/);

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login page
      await verifyUrl(page, /\/login/);

      // Assert: Login form visible
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should logout admin successfully @admin @terrapet', async ({ page }) => {
      // Arrange: Login as admin
      await loginAs(page, 'terrapet', 'admin');

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login page
      await verifyUrl(page, /\/login/);

      // Assert: Login form visible
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test.describe('Session Termination', () => {
    test('should prevent access to portal after logout @owner @terrapet @security', async ({ page }) => {
      // Arrange: Login and then logout
      await loginAs(page, 'terrapet', 'owner');
      await logout(page);

      // Act: Try to access portal
      await page.goto('/terrapet/portal');

      // Assert: Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Assert: Cannot see portal content
      const portalContent = page.locator('text=Mis Mascotas');
      await expect(portalContent).not.toBeVisible();
    });

    test('should prevent access to dashboard after logout @vet @terrapet @security', async ({ page }) => {
      // Arrange: Login and then logout
      await loginAs(page, 'terrapet', 'vet');
      await logout(page);

      // Act: Try to access dashboard
      await page.goto('/terrapet/dashboard');

      // Assert: Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Assert: Cannot see dashboard content
      const dashboardContent = page.locator('text=Agenda, text=Pacientes').first();
      await expect(dashboardContent).not.toBeVisible();
    });

    test('should prevent API calls after logout @owner @terrapet @security', async ({ page }) => {
      // Arrange: Login as owner
      await loginAs(page, 'terrapet', 'owner');

      // Setup API response listener
      const apiCalls: string[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          apiCalls.push(response.url());
        }
      });

      // Act: Logout
      await logout(page);

      // Try to call a protected API endpoint
      const response = await page.request.get('/api/pets');

      // Assert: Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Logout from Different Pages', () => {
    test('should logout from portal home page @owner @terrapet', async ({ page }) => {
      // Arrange: Login and stay on portal home
      await loginAs(page, 'terrapet', 'owner');
      await page.goto('/terrapet/portal');

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login
      await verifyUrl(page, /\/login/);
    });

    test('should logout from nested portal page @owner @terrapet', async ({ page }) => {
      // Arrange: Login and navigate to nested page
      await loginAs(page, 'terrapet', 'owner');
      await page.goto('/terrapet/portal/pets');
      await expect(page).toHaveURL(/\/terrapet\/portal\/pets/, { timeout: 10000 });

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login
      await verifyUrl(page, /\/login/);
    });

    test('should logout from dashboard page @vet @terrapet', async ({ page }) => {
      // Arrange: Login and navigate to dashboard
      await loginAs(page, 'terrapet', 'vet');
      await page.goto('/terrapet/dashboard/patients');
      await expect(page).toHaveURL(/\/terrapet\/dashboard\/patients/, { timeout: 10000 });

      // Act: Logout
      await logout(page);

      // Assert: Redirected to login
      await verifyUrl(page, /\/login/);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page refreshes @owner @terrapet', async ({ page }) => {
      // Arrange: Login as owner
      await loginAs(page, 'terrapet', 'owner');
      await verifyUrl(page, /\/terrapet\/portal/);

      // Act: Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Assert: Still logged in
      await verifyUrl(page, /\/terrapet\/portal/);
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(true);
    });

    test('should maintain session across navigation @owner @terrapet', async ({ page }) => {
      // Arrange: Login as owner
      await loginAs(page, 'terrapet', 'owner');

      // Act: Navigate to different portal pages
      await page.goto('/terrapet/portal/pets');
      await page.goto('/terrapet/portal/appointments');
      await page.goto('/terrapet/portal');

      // Assert: Still logged in on all pages
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(true);
    });

    test('should not persist session after logout and refresh @owner @terrapet', async ({ page }) => {
      // Arrange: Login and logout
      await loginAs(page, 'terrapet', 'owner');
      await logout(page);

      // Act: Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Assert: Still on login page
      await verifyUrl(page, /\/login/);

      // Assert: Still logged out
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(false);
    });
  });

  test.describe('Multi-Tenant Logout', () => {
    test('should logout from one clinic and login to another @owner @multi-tenant', async ({ page }) => {
      // Arrange: Login to Adris
      await loginAs(page, 'terrapet', 'owner');
      await verifyUrl(page, /\/terrapet\/portal/);

      // Act: Logout from Adris
      await logout(page);

      // Act: Login to PetLife
      await loginAs(page, 'petlife', 'owner');

      // Assert: Now logged in to PetLife
      await verifyUrl(page, /\/petlife\/portal/);
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBe(true);
    });

    test('should not have cross-tenant session @owner @multi-tenant @security', async ({ page }) => {
      // Arrange: Login to Adris
      await loginAs(page, 'terrapet', 'owner');

      // Act: Try to access PetLife portal (without logging in there)
      await page.goto('/petlife/portal');

      // Assert: Should redirect to PetLife login
      // (Session from Adris should not work for PetLife)
      await expect(page).toHaveURL(/\/petlife\/login/, { timeout: 10000 });
    });
  });
});
