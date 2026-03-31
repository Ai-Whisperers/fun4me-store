import { Page, expect } from '@playwright/test';
import type { Clinic } from './auth';

/**
 * Navigation Helper Functions
 * 
 * Provides utilities for navigating the multi-tenant veterinary platform,
 * including common routes, menu interactions, and page transitions.
 */

/**
 * Common routes in the platform
 */
export const ROUTES = {
  // Public routes
  home: (clinic: Clinic) => `/${clinic}`,
  login: (clinic: Clinic) => `/${clinic}/portal/login`,
  
  // Owner portal routes
  portal: (clinic: Clinic) => `/${clinic}/portal`,
  myPets: (clinic: Clinic) => `/${clinic}/portal/pets`,
  myAppointments: (clinic: Clinic) => `/${clinic}/portal/appointments`,
  myPrescriptions: (clinic: Clinic) => `/${clinic}/portal/prescriptions`,
  myMedicalRecords: (clinic: Clinic) => `/${clinic}/portal/medical-records`,
  
  // Staff dashboard routes
  dashboard: (clinic: Clinic) => `/${clinic}/dashboard`,
  calendar: (clinic: Clinic) => `/${clinic}/dashboard/calendar`,
  patients: (clinic: Clinic) => `/${clinic}/dashboard/patients`,
  appointments: (clinic: Clinic) => `/${clinic}/dashboard/appointments`,
  medicalRecords: (clinic: Clinic) => `/${clinic}/dashboard/medical-records`,
  prescriptions: (clinic: Clinic) => `/${clinic}/dashboard/prescriptions`,
  hospitalization: (clinic: Clinic) => `/${clinic}/dashboard/hospitalization`,
  laboratory: (clinic: Clinic) => `/${clinic}/dashboard/laboratory`,
  invoices: (clinic: Clinic) => `/${clinic}/dashboard/invoices`,
  inventory: (clinic: Clinic) => `/${clinic}/dashboard/inventory`,
  
  // Admin routes
  admin: (clinic: Clinic) => `/${clinic}/admin`,
  adminSettings: (clinic: Clinic) => `/${clinic}/admin/settings`,
  adminTeam: (clinic: Clinic) => `/${clinic}/admin/team`,
  
  // Store routes
  store: (clinic: Clinic) => `/${clinic}/store`,
  cart: (clinic: Clinic) => `/${clinic}/cart`,
  checkout: (clinic: Clinic) => `/${clinic}/checkout`,
  
  // Booking routes
  book: (clinic: Clinic) => `/${clinic}/book`,
} as const;

/**
 * Navigate to a route and wait for page load
 * 
 * @param page - Playwright page object
 * @param url - URL to navigate to
 * @param options - Navigation options
 * 
 * @example
 * await navigateTo(page, '/terrapet/portal');
 * await navigateTo(page, ROUTES.myPets('terrapet'));
 */
export async function navigateTo(
  page: Page,
  url: string,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
  } = {}
): Promise<void> {
  const { waitUntil = 'networkidle', timeout = 15000 } = options;

  try {
    await page.goto(url, { waitUntil, timeout });
    
    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Failed to navigate to ${url}:`, errorMessage);
    throw new Error(`Failed to navigate to ${url}: ${errorMessage}`);
  }
}

/**
 * Click a navigation link by text and wait for navigation
 * 
 * @param page - Playwright page object
 * @param linkText - Text content of the link
 * @param options - Click options
 * 
 * @example
 * await clickNavLink(page, 'Mis Mascotas');
 * await clickNavLink(page, 'Dashboard');
 */
export async function clickNavLink(
  page: Page,
  linkText: string,
  options: { exact?: boolean; timeout?: number } = {}
): Promise<void> {
  const { exact = false, timeout = 10000 } = options;

  try {
    const selector = exact ? `nav a:has-text("${linkText}")` : `nav:has-text("${linkText}")`;
    const link = page.locator(selector).first();
    
    await link.waitFor({ state: 'visible', timeout: 5000 });
    await link.click({ timeout });
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Failed to click nav link "${linkText}":`, errorMessage);
    throw new Error(`Failed to click nav link "${linkText}": ${errorMessage}`);
  }
}

/**
 * Wait for a page heading to be visible
 * Useful for verifying page transitions
 * 
 * @param page - Playwright page object
 * @param headingText - Expected heading text
 * @param options - Wait options
 * 
 * @example
 * await waitForHeading(page, 'Mis Mascotas');
 * await waitForHeading(page, 'Dashboard');
 */
export async function waitForHeading(
  page: Page,
  headingText: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  try {
    const heading = page.locator(`h1:has-text("${headingText}"), h2:has-text("${headingText}")`).first();
    await heading.waitFor({ state: 'visible', timeout });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Heading "${headingText}" not found:`, errorMessage);
    throw new Error(`Heading "${headingText}" not found: ${errorMessage}`);
  }
}

/**
 * Wait for page to finish loading (no pending requests)
 * 
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForPageLoad(page: Page, timeout = 15000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error: unknown) {
    console.warn('[E2E/Navigation] Page load timeout, continuing anyway:', error instanceof Error ? error.message : error);
  }
}

/**
 * Click a button by text and optionally wait for navigation
 * 
 * @param page - Playwright page object
 * @param buttonText - Text content of the button
 * @param options - Click options
 * 
 * @example
 * await clickButton(page, 'Guardar');
 * await clickButton(page, 'Crear Cita', { waitForNavigation: true });
 */
export async function clickButton(
  page: Page,
  buttonText: string,
  options: {
    exact?: boolean;
    waitForNavigation?: boolean;
    timeout?: number;
  } = {}
): Promise<void> {
  const { exact = false, waitForNavigation = false, timeout = 10000 } = options;

  try {
    const selector = exact
      ? `button:has-text("${buttonText}")`
      : `button:text-is("${buttonText}")`;
    const button = page.locator(selector).first();
    
    await button.waitFor({ state: 'visible', timeout: 5000 });
    
    if (waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout }),
        button.click({ timeout: 5000 }),
      ]);
    } else {
      await button.click({ timeout: 5000 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Failed to click button "${buttonText}":`, errorMessage);
    throw new Error(`Failed to click button "${buttonText}": ${errorMessage}`);
  }
}

/**
 * Verify current URL matches expected pattern
 * 
 * @param page - Playwright page object
 * @param expectedUrl - Expected URL string or regex pattern
 * 
 * @example
 * await verifyUrl(page, '/terrapet/portal');
 * await verifyUrl(page, /\/terrapet\/dashboard/);
 */
export async function verifyUrl(page: Page, expectedUrl: string | RegExp): Promise<void> {
  try {
    await expect(page).toHaveURL(expectedUrl, { timeout: 5000 });
  } catch (error: unknown) {
    const currentUrl = page.url();
    const expected = typeof expectedUrl === 'string' ? expectedUrl : expectedUrl.toString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] URL verification failed. Current: ${currentUrl}, Expected: ${expected}`, errorMessage);
    throw error;
  }
}

/**
 * Verify page title contains expected text
 * 
 * @param page - Playwright page object
 * @param expectedTitle - Expected title text
 */
export async function verifyTitle(page: Page, expectedTitle: string): Promise<void> {
  try {
    await expect(page).toHaveTitle(new RegExp(expectedTitle, 'i'), { timeout: 5000 });
  } catch (error: unknown) {
    const actualTitle = await page.title();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Title verification failed. Actual: "${actualTitle}", Expected: "${expectedTitle}"`, errorMessage);
    throw error;
  }
}

/**
 * Open a sidebar/menu by clicking a button or link
 * 
 * @param page - Playwright page object
 * @param menuTrigger - Selector or text for menu trigger
 */
export async function openMenu(page: Page, menuTrigger: string): Promise<void> {
  try {
    const trigger = page.locator(menuTrigger).first();
    await trigger.waitFor({ state: 'visible', timeout: 5000 });
    await trigger.click();
    
    // Wait for menu to animate open
    await page.waitForTimeout(300);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[E2E/Navigation] Failed to open menu "${menuTrigger}":`, errorMessage);
    throw new Error(`Failed to open menu "${menuTrigger}": ${errorMessage}`);
  }
}

/**
 * Refresh the current page and wait for load
 * 
 * @param page - Playwright page object
 */
export async function refreshPage(page: Page): Promise<void> {
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Navigation] Page refresh failed:', errorMessage);
    throw new Error(`Page refresh failed: ${errorMessage}`);
  }
}

/**
 * Go back to previous page
 * 
 * @param page - Playwright page object
 */
export async function goBack(page: Page): Promise<void> {
  try {
    await page.goBack({ waitUntil: 'networkidle', timeout: 10000 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[E2E/Navigation] Go back failed:', errorMessage);
    throw new Error(`Go back failed: ${errorMessage}`);
  }
}
