/**
 * Quick Screenshot Capture v2
 *
 * Uses storage state for persistent authentication.
 * Run with: npx tsx scripts/screenshots/quick-capture-v2.ts
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  tenant: 'terrapet',
  outputDir: './screenshots',
  viewport: { width: 1920, height: 1080 },
}

// Real user credentials - update these with actual users from your database
const USERS = {
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'owner1@test.local',
    password: process.env.TEST_OWNER_PASSWORD || 'TestPassword123!'
  },
  vet: {
    email: process.env.TEST_VET_EMAIL || 'vet1@test.local',
    password: process.env.TEST_VET_PASSWORD || 'TestPassword123!'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!'
  },
}

// Pages organized by role
const PUBLIC_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'services', path: '/services' },
  { name: 'store', path: '/store' },
  { name: 'book', path: '/book' },
  { name: 'faq', path: '/faq' },
  { name: 'login', path: '/portal/login' },
  { name: 'signup', path: '/portal/signup' },
  { name: 'diagnosis-codes', path: '/diagnosis_codes' },
  { name: 'drug-dosages', path: '/drug_dosages' },
  { name: 'growth-charts', path: '/growth_charts' },
]

const OWNER_PAGES = [
  { name: 'portal-dashboard', path: '/portal/dashboard' },
  { name: 'portal-pets', path: '/portal/pets' },
  { name: 'portal-appointments', path: '/portal/appointments' },
  { name: 'portal-schedule', path: '/portal/schedule' },
  { name: 'portal-messages', path: '/portal/messages' },
  { name: 'portal-loyalty', path: '/portal/loyalty' },
  { name: 'portal-profile', path: '/portal/profile' },
  { name: 'portal-notifications', path: '/portal/notifications' },
]

const VET_PAGES = [
  { name: 'dashboard-home', path: '/dashboard' },
  { name: 'dashboard-appointments', path: '/dashboard/appointments' },
  { name: 'dashboard-patients', path: '/dashboard/patients' },
  { name: 'dashboard-clients', path: '/dashboard/clients' },
  { name: 'dashboard-calendar', path: '/dashboard/calendar' },
  { name: 'dashboard-inventory', path: '/dashboard/inventory' },
  { name: 'dashboard-invoices', path: '/dashboard/invoices' },
  { name: 'dashboard-hospital', path: '/dashboard/hospital' },
  { name: 'dashboard-lab', path: '/dashboard/lab' },
  { name: 'dashboard-vaccines', path: '/dashboard/vaccines' },
  { name: 'dashboard-consents', path: '/dashboard/consents' },
]

const ADMIN_PAGES = [
  { name: 'dashboard-team', path: '/dashboard/team' },
  { name: 'dashboard-analytics', path: '/dashboard/analytics' },
  { name: 'dashboard-settings', path: '/dashboard/settings' },
  { name: 'dashboard-audit', path: '/dashboard/audit' },
  { name: 'dashboard-campaigns', path: '/dashboard/campaigns' },
  { name: 'dashboard-coupons', path: '/dashboard/coupons' },
]

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    })

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 })

    // Clear and fill email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    await emailInput.clear()
    await emailInput.fill(email)

    // Clear and fill password
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    await passwordInput.clear()
    await passwordInput.fill(password)

    // Click submit
    await page.click('button[type="submit"]')

    // Wait for navigation away from login
    await page.waitForURL(
      (url) => !url.pathname.includes('/login'),
      { timeout: 20000 }
    )

    // Additional wait for page to stabilize
    await page.waitForTimeout(2000)

    return true
  } catch (error) {
    console.error(`    Login error: ${(error as Error).message}`)
    return false
  }
}

async function capturePages(
  context: BrowserContext,
  pages: { name: string; path: string }[],
  outputDir: string,
  stats: { success: number; failed: number }
): Promise<void> {
  const page = await context.newPage()

  for (const pageDef of pages) {
    const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
    const outputPath = path.join(outputDir, `${pageDef.name}.png`)

    process.stdout.write(`  📄 ${pageDef.name}... `)

    try {
      ensureDir(outputDir)

      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Check if we got redirected to login (auth failed)
      if (page.url().includes('/login') && !pageDef.path.includes('/login')) {
        console.log('⚠️ (redirected to login)')
        stats.failed++
        continue
      }

      await page.waitForTimeout(1500)
      await page.screenshot({ path: outputPath, fullPage: true })
      console.log('✓')
      stats.success++
    } catch (error) {
      console.log('✗', (error as Error).message?.slice(0, 40))
      stats.failed++
    }
  }

  await page.close()
}

async function main(): Promise<void> {
  const timestamp = getTimestamp()
  const browser = await chromium.launch({ headless: true })

  console.log('═'.repeat(60))
  console.log('📸 SCREENSHOT CAPTURE v2')
  console.log('═'.repeat(60))
  console.log(`\nOutput: ${CONFIG.outputDir}/${timestamp}`)
  console.log(`Tenant: ${CONFIG.tenant}\n`)

  const stats = { success: 0, failed: 0 }

  try {
    // ========================================
    // PUBLIC PAGES (no auth)
    // ========================================
    console.log('\n👤 PUBLIC PAGES (no authentication)')
    console.log('─'.repeat(40))

    const publicContext = await browser.newContext({ viewport: CONFIG.viewport })
    const outputDirPublic = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'public')
    await capturePages(publicContext, PUBLIC_PAGES, outputDirPublic, stats)
    await publicContext.close()

    // ========================================
    // OWNER PAGES
    // ========================================
    console.log('\n👤 OWNER PAGES')
    console.log('─'.repeat(40))
    console.log(`  🔐 Logging in as ${USERS.owner.email}...`)

    const ownerContext = await browser.newContext({ viewport: CONFIG.viewport })
    const ownerPage = await ownerContext.newPage()

    const ownerLoggedIn = await login(ownerPage, USERS.owner.email, USERS.owner.password)
    await ownerPage.close()

    if (ownerLoggedIn) {
      console.log('  ✓ Logged in successfully\n')
      const outputDirOwner = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'owner')
      await capturePages(ownerContext, OWNER_PAGES, outputDirOwner, stats)
    } else {
      console.log('  ✗ Login failed - skipping owner pages\n')
      console.log('    Tip: Set TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD env vars')
      stats.failed += OWNER_PAGES.length
    }

    await ownerContext.close()

    // ========================================
    // VET PAGES
    // ========================================
    console.log('\n👤 VET PAGES')
    console.log('─'.repeat(40))
    console.log(`  🔐 Logging in as ${USERS.vet.email}...`)

    const vetContext = await browser.newContext({ viewport: CONFIG.viewport })
    const vetPage = await vetContext.newPage()

    const vetLoggedIn = await login(vetPage, USERS.vet.email, USERS.vet.password)
    await vetPage.close()

    if (vetLoggedIn) {
      console.log('  ✓ Logged in successfully\n')
      const outputDirVet = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'vet')
      await capturePages(vetContext, VET_PAGES, outputDirVet, stats)
    } else {
      console.log('  ✗ Login failed - skipping vet pages\n')
      console.log('    Tip: Set TEST_VET_EMAIL and TEST_VET_PASSWORD env vars')
      stats.failed += VET_PAGES.length
    }

    await vetContext.close()

    // ========================================
    // ADMIN PAGES
    // ========================================
    console.log('\n👤 ADMIN PAGES')
    console.log('─'.repeat(40))
    console.log(`  🔐 Logging in as ${USERS.admin.email}...`)

    const adminContext = await browser.newContext({ viewport: CONFIG.viewport })
    const adminPage = await adminContext.newPage()

    const adminLoggedIn = await login(adminPage, USERS.admin.email, USERS.admin.password)
    await adminPage.close()

    if (adminLoggedIn) {
      console.log('  ✓ Logged in successfully\n')
      const outputDirAdmin = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'admin')
      await capturePages(adminContext, ADMIN_PAGES, outputDirAdmin, stats)
    } else {
      console.log('  ✗ Login failed - skipping admin pages\n')
      console.log('    Tip: Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars')
      stats.failed += ADMIN_PAGES.length
    }

    await adminContext.close()

  } finally {
    await browser.close()
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`
  ✓ Successful: ${stats.success}
  ✗ Failed:     ${stats.failed}
  Total:        ${stats.success + stats.failed}

  Output: ${path.resolve(CONFIG.outputDir, timestamp)}

Note: If authenticated pages failed, ensure test users exist in the database
or provide credentials via environment variables:
  TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD
  TEST_VET_EMAIL, TEST_VET_PASSWORD
  TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
`)
}

main().catch(console.error)
