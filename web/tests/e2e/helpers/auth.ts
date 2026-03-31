import { Page, expect } from '@playwright/test';

/**
 * Authentication Helper Functions
 * 
 * Provides utilities for logging in, logging out, and managing user sessions
 * across different roles and clinics in the multi-tenant veterinary platform.
 */

export type Clinic = 'terrapet' | 'petlife';
export type Role = 'admin' | 'vet' | 'owner';

interface Credentials {
  email: string;
  password: string;
}

/**
 * Demo account credentials from seed data
 * Located in: web/db/seeds/data/00-core/demo-accounts.json
 */
const DEMO_CREDENTIALS: Record<Clinic, Record<Role, Credentials>> = {
  terrapet: {
    admin: { email: 'admin@terrapet.demo', password: 'demo123' },
    vet: { email: 'vet@terrapet.demo', password: 'demo123' },
    owner: { email: 'owner@terrapet.demo', password: 'demo123' },
  },
  petlife: {
    admin: { email: 'admin@petlife.demo', password: 'demo123' },
    vet: { email: 'vet@petlife.demo', password: 'demo123' },
    owner: { email: 'owner@petlife.demo', password: 'demo123' },
  },
};

/**
 * Expected redirect paths after login for each role
 */
const ROLE_HOME_PATHS: Record<Role, string> = {
  admin: '/dashboard',
  vet: '/dashboard',
  owner: '/portal',
};

/**
 * Log in as a specific role at a specific clinic
 * 
 * @param page - Playwright page object
 * @param clinic - Clinic slug ('terrapet' or 'petlife')
 * @param role - User role ('admin', 'vet', or 'owner')
 * @param options - Optional settings for login behavior
 * 
 * @example
 * await loginAs(page, 'terrapet', 'owner');
 * await loginAs(page, 'petlife', 'vet', { waitForRedirect: false });
 */
export async function loginAs(
  page: Page,
  clinic: Clinic,
  role: Role,
  options: { waitForRedirect?: boolean } = {}
): Promise<void> {
  const { waitForRedirect = true } = options;
  const credentials = DEMO_CREDENTIALS[clinic][role];

  try {
    // Navigate to login page
    await page.goto(`/${clinic}/portal/login`);

    // Wait for login form to be visible
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Fill in credentials
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');

    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to complete
    if (waitForRedirect) {
      const expectedPath = ROLE_HOME_PATHS[role];
      await page.waitForURL(`**/${clinic}${expectedPath}/**`, {
        timeout: 15000,
        waitUntil: 'networkidle',
      });

      // Verify successful login by checking for user menu or navigation
      const successIndicators = [
        page.locator('[data-testid="user-menu"]'),
        page.locator('nav'),
        page.locator('text=Cerrar sesión'),
      ];

      let foundIndicator = false;
      for (const indicator of successIndicators) {
        try {
          await indicator.waitFor({ state: 'visible', timeout: 3000 });
          foundIndicator = true;
          break;
        } catch {
          // Try next indicator
        }
      }

      if (!foundIndicator) {
        throw new Error(`Login succeeded but no success indicators found for ${role} at ${clinic}`);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Auth] Login failed for ${role} at ${clinic}:`, errorMessage);
    throw new Error(`Failed to login as ${role} at ${clinic}: ${errorMessage}`);
  }
}

/**
 * Log out the current user
 * 
 * @param page - Playwright page object
 * @param options - Optional settings for logout behavior
 * 
 * @example
 * await logout(page);
 * await logout(page, { waitForRedirect: false });
 */
export async function logout(
  page: Page,
  options: { waitForRedirect?: boolean } = {}
): Promise<void> {
  const { waitForRedirect = true } = options;

  try {
    // Try to find and click user menu first
    const userMenu = page.locator('[data-testid="user-menu"]');
    try {
      await userMenu.click({ timeout: 3000 });
      // Wait for dropdown to appear
      await page.waitForTimeout(500);
    } catch {
      // User menu not found, try alternate methods
    }

    // Find and click logout button/link
    const logoutSelectors = [
      'button:has-text("Cerrar sesión")',
      'a:has-text("Cerrar sesión")',
      '[data-testid="logout-button"]',
      'text=Cerrar sesión',
    ];

    let loggedOut = false;
    for (const selector of logoutSelectors) {
      try {
        const logoutButton = page.locator(selector).first();
        await logoutButton.waitFor({ state: 'visible', timeout: 2000 });
        await logoutButton.click();
        loggedOut = true;
        break;
      } catch {
        // Try next selector
      }
    }

    if (!loggedOut) {
      throw new Error('Could not find logout button');
    }

    // Wait for redirect to login page
    if (waitForRedirect) {
      await page.waitForURL('**/login', {
        timeout: 10000,
        waitUntil: 'networkidle',
      });

      // Verify we're on login page
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Auth] Logout failed:', errorMessage);
    throw new Error(`Failed to logout: ${errorMessage}`);
  }
}

/**
 * Verify user cannot access a protected route
 * 
 * @param page - Playwright page object
 * @param protectedUrl - The URL that should be protected
 * @param expectedRedirect - Expected redirect pattern (default: login page)
 * 
 * @example
 * await verifyUnauthorizedAccess(page, '/terrapet/dashboard');
 * await verifyUnauthorizedAccess(page, '/terrapet/admin', '/terrapet/dashboard');
 */
export async function verifyUnauthorizedAccess(
  page: Page,
  protectedUrl: string,
  expectedRedirect: string | RegExp = /\/login/
): Promise<void> {
  try {
    await page.goto(protectedUrl);

    // Should redirect to login or unauthorized page
    await page.waitForURL(expectedRedirect, {
      timeout: 10000,
      waitUntil: 'networkidle',
    });

    // Verify we're not on the protected page
    const currentUrl = page.url();
    if (currentUrl.includes(protectedUrl) && !currentUrl.includes('login')) {
      throw new Error(`User was able to access protected route: ${protectedUrl}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Auth] Unauthorized access verification failed:', errorMessage);
    throw error;
  }
}

/**
 * Get the expected home path for a role
 * 
 * @param role - User role
 * @returns Expected home path after login
 */
export function getRoleHomePath(role: Role): string {
  return ROLE_HOME_PATHS[role];
}

/**
 * Get credentials for a specific role and clinic
 * Useful for direct API calls or custom login flows
 * 
 * @param clinic - Clinic slug
 * @param role - User role
 * @returns Credentials object
 */
export function getCredentials(clinic: Clinic, role: Role): Credentials {
  return DEMO_CREDENTIALS[clinic][role];
}

/**
 * Verify user is logged in by checking for session indicators
 * 
 * @param page - Playwright page object
 * @returns True if user appears to be logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for common logged-in indicators
    const indicators = [
      page.locator('[data-testid="user-menu"]'),
      page.locator('text=Cerrar sesión'),
      page.locator('nav a:has-text("Portal")'),
      page.locator('nav a:has-text("Dashboard")'),
    ];

    for (const indicator of indicators) {
      try {
        await indicator.waitFor({ state: 'visible', timeout: 2000 });
        return true;
      } catch {
        // Try next indicator
      }
    }

    return false;
  } catch (error: unknown) {
    console.warn('[E2E/Auth] Error checking login status:', error instanceof Error ? error.message : error);
    return false;
  }
}
