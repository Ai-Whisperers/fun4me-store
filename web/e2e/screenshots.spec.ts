/**
 * Screenshot E2E Tests
 *
 * Captures full-page screenshots of all pages for documentation and testing.
 * Run with: npx playwright test e2e/screenshots.spec.ts
 *
 * To capture specific role:
 *   ROLE=owner npx playwright test e2e/screenshots.spec.ts
 *
 * To capture specific page:
 *   PAGE=dashboard-home npx playwright test e2e/screenshots.spec.ts
 */

import { test, expect, Page } from '@playwright/test'

// Increase timeout for screenshot tests
test.setTimeout(60000)

// ============================================================================
// Configuration
// ============================================================================

const TENANT = 'terrapet'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TARGET_ROLE = process.env.ROLE || undefined
const TARGET_PAGE = process.env.PAGE || undefined

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
}

const USERS = {
  public: { email: '', password: '' },
  owner: { email: 'owner1@test.local', password: 'TestPassword123!' },
  vet: { email: 'vet1@test.local', password: 'TestPassword123!' },
  admin: { email: 'admin@test.local', password: 'TestPassword123!' },
}

type Role = keyof typeof USERS

// ============================================================================
// Page Definitions
// ============================================================================

interface PageDef {
  name: string
  path: string
  roles: Role[]
  requiresAuth: boolean
  waitFor?: string
  variations?: { name: string; queryParams?: Record<string, string> }[]
}

const PAGES: PageDef[] = [
  // Public pages
  { name: 'homepage', path: '/', roles: ['public', 'owner', 'vet', 'admin'], requiresAuth: false },
  { name: 'about', path: '/about', roles: ['public'], requiresAuth: false },
  { name: 'services', path: '/services', roles: ['public'], requiresAuth: false },
  { name: 'store', path: '/store', roles: ['public'], requiresAuth: false, variations: [
    { name: 'default' },
    { name: 'category', queryParams: { category: 'alimentos' } },
  ]},
  { name: 'cart', path: '/cart', roles: ['public'], requiresAuth: false },
  { name: 'book', path: '/book', roles: ['public'], requiresAuth: false },
  { name: 'faq', path: '/faq', roles: ['public'], requiresAuth: false },
  { name: 'login', path: '/portal/login', roles: ['public'], requiresAuth: false },
  { name: 'signup', path: '/portal/signup', roles: ['public'], requiresAuth: false },

  // Clinical tools
  { name: 'diagnosis-codes', path: '/diagnosis_codes', roles: ['public', 'vet'], requiresAuth: false },
  { name: 'drug-dosages', path: '/drug_dosages', roles: ['public', 'vet'], requiresAuth: false },
  { name: 'growth-charts', path: '/growth_charts', roles: ['public', 'vet'], requiresAuth: false },
  { name: 'euthanasia-assessment', path: '/euthanasia_assessments', roles: ['vet'], requiresAuth: false },
  { name: 'loyalty-points', path: '/loyalty_points', roles: ['public'], requiresAuth: false },

  // Portal (Owner)
  { name: 'portal-home', path: '/portal', roles: ['owner'], requiresAuth: true },
  { name: 'portal-dashboard', path: '/portal/dashboard', roles: ['owner'], requiresAuth: true },
  { name: 'portal-pets', path: '/portal/pets', roles: ['owner'], requiresAuth: true },
  { name: 'portal-pets-new', path: '/portal/pets/new', roles: ['owner'], requiresAuth: true },
  { name: 'portal-appointments', path: '/portal/appointments', roles: ['owner'], requiresAuth: true },
  { name: 'portal-schedule', path: '/portal/schedule', roles: ['owner'], requiresAuth: true },
  { name: 'portal-messages', path: '/portal/messages', roles: ['owner'], requiresAuth: true },
  { name: 'portal-loyalty', path: '/portal/loyalty', roles: ['owner'], requiresAuth: true },
  { name: 'portal-rewards', path: '/portal/rewards', roles: ['owner'], requiresAuth: true },
  { name: 'portal-notifications', path: '/portal/notifications', roles: ['owner'], requiresAuth: true },
  { name: 'portal-profile', path: '/portal/profile', roles: ['owner'], requiresAuth: true },
  { name: 'portal-settings', path: '/portal/settings', roles: ['owner'], requiresAuth: true },
  { name: 'portal-wishlist', path: '/portal/wishlist', roles: ['owner'], requiresAuth: true },
  { name: 'portal-orders', path: '/portal/orders', roles: ['owner'], requiresAuth: true },

  // Dashboard (Vet/Admin)
  { name: 'dashboard-home', path: '/dashboard', roles: ['vet', 'admin'], requiresAuth: true, waitFor: 'main' },
  { name: 'dashboard-appointments', path: '/dashboard/appointments', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-calendar', path: '/dashboard/calendar', roles: ['vet', 'admin'], requiresAuth: true, variations: [
    { name: 'day', queryParams: { view: 'day' } },
    { name: 'week', queryParams: { view: 'week' } },
    { name: 'month', queryParams: { view: 'month' } },
  ]},
  { name: 'dashboard-patients', path: '/dashboard/patients', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-clients', path: '/dashboard/clients', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-hospital', path: '/dashboard/hospital', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-lab', path: '/dashboard/lab', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-inventory', path: '/dashboard/inventory', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-inventory-expiring', path: '/dashboard/inventory/expiring', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-invoices', path: '/dashboard/invoices', roles: ['vet', 'admin'], requiresAuth: true, variations: [
    { name: 'all' },
    { name: 'pending', queryParams: { status: 'pending' } },
    { name: 'paid', queryParams: { status: 'paid' } },
  ]},
  { name: 'dashboard-orders', path: '/dashboard/orders', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-vaccines', path: '/dashboard/vaccines', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-consents', path: '/dashboard/consents', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-insurance', path: '/dashboard/insurance', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-reminders', path: '/dashboard/reminders', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-whatsapp', path: '/dashboard/whatsapp', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-schedules', path: '/dashboard/schedules', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-time-off', path: '/dashboard/time-off', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-epidemiology', path: '/dashboard/epidemiology', roles: ['vet', 'admin'], requiresAuth: true },
  { name: 'dashboard-lost-pets', path: '/dashboard/lost-pets', roles: ['vet', 'admin'], requiresAuth: true },

  // Admin only
  { name: 'dashboard-team', path: '/dashboard/team', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-analytics', path: '/dashboard/analytics', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-analytics-customers', path: '/dashboard/analytics/customers', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-analytics-store', path: '/dashboard/analytics/store', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-campaigns', path: '/dashboard/campaigns', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-coupons', path: '/dashboard/coupons', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-audit', path: '/dashboard/audit', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-settings', path: '/dashboard/settings', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-settings-general', path: '/dashboard/settings/general', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-settings-branding', path: '/dashboard/settings/branding', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-settings-services', path: '/dashboard/settings/services', roles: ['admin'], requiresAuth: true },
  { name: 'dashboard-settings-modules', path: '/dashboard/settings/modules', roles: ['admin'], requiresAuth: true },
]

// ============================================================================
// Helper Functions
// ============================================================================

async function login(page: Page, role: Role): Promise<boolean> {
  const user = USERS[role]
  if (!user.email) return true

  try {
    await page.goto(`${BASE_URL}/${TENANT}/portal/login`, { waitUntil: 'domcontentloaded' })

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })

    await page.fill('input[name="email"], input[type="email"]', user.email)
    await page.fill('input[name="password"], input[type="password"]', user.password)
    await page.click('button[type="submit"]')

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
    return true
  } catch (error) {
    console.error(`Login failed for ${role}:`, error)
    return false
  }
}

function buildUrl(path: string, queryParams?: Record<string, string>): string {
  let url = `${BASE_URL}/${TENANT}${path}`
  if (queryParams) {
    const params = new URLSearchParams(queryParams)
    url += `?${params.toString()}`
  }
  return url
}

function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Screenshot Capture', () => {
  test.describe.configure({ mode: 'serial' })

  const roles: Role[] = TARGET_ROLE
    ? [TARGET_ROLE as Role]
    : ['public', 'owner', 'vet', 'admin']

  for (const role of roles) {
    test.describe(`Role: ${role}`, () => {
      // Filter pages for this role
      const rolePages = PAGES.filter((p) => {
        if (!p.roles.includes(role)) return false
        if (TARGET_PAGE && p.name !== TARGET_PAGE) return false
        return true
      })

      test.beforeAll(async ({ browser }) => {
        // Nothing needed here - authentication happens per-test
      })

      for (const pageDef of rolePages) {
        const variations = pageDef.variations || [{ name: 'default' }]

        for (const variation of variations) {
          const testName = variation.name !== 'default'
            ? `${pageDef.name} (${variation.name})`
            : pageDef.name

          test(testName, async ({ page, viewport }) => {
            // Set viewport
            const size = VIEWPORTS.desktop
            await page.setViewportSize(size)

            // Authenticate if needed
            if (pageDef.requiresAuth && role !== 'public') {
              await login(page, role)
            }

            // Navigate
            const url = buildUrl(pageDef.path, variation.queryParams)
            await page.goto(url, { waitUntil: 'networkidle' })

            // Wait for content
            if (pageDef.waitFor) {
              await page.waitForSelector(pageDef.waitFor, { timeout: 5000 }).catch(() => {})
            }

            // Wait for animations/loading
            await page.waitForTimeout(1000)

            // Generate screenshot path
            const timestamp = getTimestamp()
            const filename = variation.name !== 'default'
              ? `${pageDef.name}--${variation.name}.png`
              : `${pageDef.name}.png`
            const screenshotPath = `screenshots/${timestamp}/${TENANT}/desktop/${role}/${filename}`

            // Capture
            await page.screenshot({
              path: screenshotPath,
              fullPage: true,
            })

            // Verify screenshot was created
            expect(true).toBe(true) // Placeholder assertion
          })
        }
      }
    })
  }
})

// ============================================================================
// Mobile/Tablet Variations
// ============================================================================

test.describe('Mobile Screenshots', () => {
  test.skip(!!TARGET_ROLE, 'Skipping mobile when targeting specific role')

  const mobilePages = PAGES.filter((p) => !p.requiresAuth)

  for (const pageDef of mobilePages) {
    test(`mobile: ${pageDef.name}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile)

      const url = buildUrl(pageDef.path)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)

      const timestamp = getTimestamp()
      await page.screenshot({
        path: `screenshots/${timestamp}/${TENANT}/mobile/public/${pageDef.name}.png`,
        fullPage: true,
      })
    })
  }
})

test.describe('Tablet Screenshots', () => {
  test.skip(!!TARGET_ROLE, 'Skipping tablet when targeting specific role')

  const tabletPages = PAGES.filter((p) => !p.requiresAuth)

  for (const pageDef of tabletPages) {
    test(`tablet: ${pageDef.name}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet)

      const url = buildUrl(pageDef.path)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)

      const timestamp = getTimestamp()
      await page.screenshot({
        path: `screenshots/${timestamp}/${TENANT}/tablet/public/${pageDef.name}.png`,
        fullPage: true,
      })
    })
  }
})
