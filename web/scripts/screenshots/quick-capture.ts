/**
 * Quick Screenshot Capture
 *
 * Simple script to capture screenshots without test framework overhead.
 * Run with: npx tsx scripts/screenshots/quick-capture.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  tenant: 'terrapet',
  outputDir: './screenshots',
  viewport: { width: 1920, height: 1080 },
}

const USERS = {
  owner: { email: 'owner1@test.local', password: 'TestPassword123!' },
  vet: { email: 'vet1@test.local', password: 'TestPassword123!' },
  admin: { email: 'admin@test.local', password: 'TestPassword123!' },
}

// Define pages to capture
const PAGES = {
  public: [
    { name: 'homepage', path: '/' },
    { name: 'services', path: '/services' },
    { name: 'store', path: '/store' },
    { name: 'book', path: '/book' },
    { name: 'login', path: '/portal/login' },
  ],
  owner: [
    { name: 'portal-dashboard', path: '/portal/dashboard' },
    { name: 'portal-pets', path: '/portal/pets' },
    { name: 'portal-appointments', path: '/portal/appointments' },
    { name: 'portal-messages', path: '/portal/messages' },
    { name: 'portal-profile', path: '/portal/profile' },
  ],
  vet: [
    { name: 'dashboard-home', path: '/dashboard' },
    { name: 'dashboard-appointments', path: '/dashboard/appointments' },
    { name: 'dashboard-patients', path: '/dashboard/patients' },
    { name: 'dashboard-calendar', path: '/dashboard/calendar' },
    { name: 'dashboard-inventory', path: '/dashboard/inventory' },
    { name: 'dashboard-invoices', path: '/dashboard/invoices' },
    { name: 'dashboard-hospital', path: '/dashboard/hospital' },
    { name: 'dashboard-lab', path: '/dashboard/lab' },
  ],
  admin: [
    { name: 'dashboard-team', path: '/dashboard/team' },
    { name: 'dashboard-analytics', path: '/dashboard/analytics' },
    { name: 'dashboard-settings', path: '/dashboard/settings' },
    { name: 'dashboard-audit', path: '/dashboard/audit' },
  ],
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]
}

async function main(): Promise<void> {
  const timestamp = getTimestamp()
  const browser = await chromium.launch({ headless: true })

  console.log('═'.repeat(60))
  console.log('📸 QUICK SCREENSHOT CAPTURE')
  console.log('═'.repeat(60))
  console.log(`\nOutput: ${CONFIG.outputDir}/${timestamp}\n`)

  const stats = { success: 0, failed: 0 }

  try {
    // ========================================
    // PUBLIC PAGES (no auth)
    // ========================================
    console.log('\n👤 PUBLIC PAGES')
    console.log('─'.repeat(40))

    const publicContext = await browser.newContext({ viewport: CONFIG.viewport })
    const publicPage = await publicContext.newPage()

    for (const pageDef of PAGES.public) {
      const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
      const outputDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'public')
      const outputPath = path.join(outputDir, `${pageDef.name}.png`)

      process.stdout.write(`  📄 ${pageDef.name}... `)

      try {
        ensureDir(outputDir)
        await publicPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
        await publicPage.waitForTimeout(1000)
        await publicPage.screenshot({ path: outputPath, fullPage: true })
        console.log('✓')
        stats.success++
      } catch (error) {
        console.log('✗', (error as Error).message?.slice(0, 50))
        stats.failed++
      }
    }

    await publicContext.close()

    // ========================================
    // OWNER PAGES
    // ========================================
    console.log('\n👤 OWNER PAGES')
    console.log('─'.repeat(40))

    const ownerContext = await browser.newContext({ viewport: CONFIG.viewport })
    const ownerPage = await ownerContext.newPage()

    // Login as owner
    console.log('  🔐 Logging in as owner...')
    try {
      await ownerPage.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'domcontentloaded' })
      await ownerPage.waitForSelector('input[type="email"]', { timeout: 10000 })
      await ownerPage.fill('input[type="email"]', USERS.owner.email)
      await ownerPage.fill('input[type="password"]', USERS.owner.password)
      await ownerPage.click('button[type="submit"]')
      await ownerPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
      console.log('  ✓ Logged in\n')

      for (const pageDef of PAGES.owner) {
        const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
        const outputDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'owner')
        const outputPath = path.join(outputDir, `${pageDef.name}.png`)

        process.stdout.write(`  📄 ${pageDef.name}... `)

        try {
          ensureDir(outputDir)
          await ownerPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
          await ownerPage.waitForTimeout(1000)
          await ownerPage.screenshot({ path: outputPath, fullPage: true })
          console.log('✓')
          stats.success++
        } catch (error) {
          console.log('✗', (error as Error).message?.slice(0, 50))
          stats.failed++
        }
      }
    } catch (error) {
      console.log('  ✗ Login failed:', (error as Error).message?.slice(0, 50))
    }

    await ownerContext.close()

    // ========================================
    // VET PAGES
    // ========================================
    console.log('\n👤 VET PAGES')
    console.log('─'.repeat(40))

    const vetContext = await browser.newContext({ viewport: CONFIG.viewport })
    const vetPage = await vetContext.newPage()

    // Login as vet
    console.log('  🔐 Logging in as vet...')
    try {
      await vetPage.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'domcontentloaded' })
      await vetPage.waitForSelector('input[type="email"]', { timeout: 10000 })
      await vetPage.fill('input[type="email"]', USERS.vet.email)
      await vetPage.fill('input[type="password"]', USERS.vet.password)
      await vetPage.click('button[type="submit"]')
      await vetPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
      console.log('  ✓ Logged in\n')

      for (const pageDef of PAGES.vet) {
        const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
        const outputDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'vet')
        const outputPath = path.join(outputDir, `${pageDef.name}.png`)

        process.stdout.write(`  📄 ${pageDef.name}... `)

        try {
          ensureDir(outputDir)
          await vetPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
          await vetPage.waitForTimeout(1000)
          await vetPage.screenshot({ path: outputPath, fullPage: true })
          console.log('✓')
          stats.success++
        } catch (error) {
          console.log('✗', (error as Error).message?.slice(0, 50))
          stats.failed++
        }
      }
    } catch (error) {
      console.log('  ✗ Login failed:', (error as Error).message?.slice(0, 50))
    }

    await vetContext.close()

    // ========================================
    // ADMIN PAGES
    // ========================================
    console.log('\n👤 ADMIN PAGES')
    console.log('─'.repeat(40))

    const adminContext = await browser.newContext({ viewport: CONFIG.viewport })
    const adminPage = await adminContext.newPage()

    // Login as admin
    console.log('  🔐 Logging in as admin...')
    try {
      await adminPage.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'domcontentloaded' })
      await adminPage.waitForSelector('input[type="email"]', { timeout: 10000 })
      await adminPage.fill('input[type="email"]', USERS.admin.email)
      await adminPage.fill('input[type="password"]', USERS.admin.password)
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
      console.log('  ✓ Logged in\n')

      for (const pageDef of PAGES.admin) {
        const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
        const outputDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'admin')
        const outputPath = path.join(outputDir, `${pageDef.name}.png`)

        process.stdout.write(`  📄 ${pageDef.name}... `)

        try {
          ensureDir(outputDir)
          await adminPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
          await adminPage.waitForTimeout(1000)
          await adminPage.screenshot({ path: outputPath, fullPage: true })
          console.log('✓')
          stats.success++
        } catch (error) {
          console.log('✗', (error as Error).message?.slice(0, 50))
          stats.failed++
        }
      }
    } catch (error) {
      console.log('  ✗ Login failed:', (error as Error).message?.slice(0, 50))
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
`)
}

main().catch(console.error)
