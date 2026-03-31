/**
 * Screenshot Capture Script
 *
 * Captures full-page screenshots of all pages for each user role.
 * Uses Playwright for browser automation.
 *
 * Usage:
 *   npx tsx scripts/screenshots/capture.ts [options]
 *
 * Options:
 *   --role <role>       Only capture for specific role (owner|vet|admin|public)
 *   --page <name>       Only capture specific page by name
 *   --viewport <size>   Viewport size (desktop|tablet|mobile)
 *   --data-set <name>   Data set to use (empty|full|busyDay|alerts)
 *   --tenant <id>       Tenant to use (default: terrapet)
 *   --parallel          Run captures in parallel (faster but more resource intensive)
 *   --skip-auth         Skip pages requiring authentication
 *   --cleanup           Clean up test data after capture
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import {
  ALL_PAGES,
  PUBLIC_PAGES,
  PORTAL_PAGES,
  DASHBOARD_PAGES,
  PageConfig,
  UserRole,
  TEST_USERS,
  SCREENSHOT_CONFIG,
  DataVariation,
} from './config'
import { setupDataSet, cleanupAllTestData, DATA_SETS } from './data-fixtures'

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliOptions {
  role?: UserRole
  page?: string
  viewport: keyof typeof SCREENSHOT_CONFIG.viewports
  dataSet: string
  tenant: string
  parallel: boolean
  skipAuth: boolean
  cleanup: boolean
  baseUrl: string
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    viewport: 'desktop',
    dataSet: 'full',
    tenant: 'terrapet',
    parallel: false,
    skipAuth: false,
    cleanup: false,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--role':
        options.role = next as UserRole
        i++
        break
      case '--page':
        options.page = next
        i++
        break
      case '--viewport':
        options.viewport = next as keyof typeof SCREENSHOT_CONFIG.viewports
        i++
        break
      case '--data-set':
        options.dataSet = next
        i++
        break
      case '--tenant':
        options.tenant = next
        i++
        break
      case '--parallel':
        options.parallel = true
        break
      case '--skip-auth':
        options.skipAuth = true
        break
      case '--cleanup':
        options.cleanup = true
        break
      case '--base-url':
        options.baseUrl = next
        i++
        break
      case '--help':
        printHelp()
        process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Screenshot Capture Script

Captures full-page screenshots of all pages for each user role.

Usage:
  npx tsx scripts/screenshots/capture.ts [options]

Options:
  --role <role>       Only capture for specific role (owner|vet|admin|public)
  --page <name>       Only capture specific page by name
  --viewport <size>   Viewport size (desktop|tablet|mobile) [default: desktop]
  --data-set <name>   Data set to use (${Object.keys(DATA_SETS).join('|')}) [default: full]
  --tenant <id>       Tenant to use [default: terrapet]
  --parallel          Run captures in parallel
  --skip-auth         Skip pages requiring authentication
  --cleanup           Clean up test data after capture
  --base-url <url>    Base URL [default: http://localhost:3000]
  --help              Show this help message

Examples:
  # Capture all pages for all roles
  npx tsx scripts/screenshots/capture.ts

  # Capture only owner pages
  npx tsx scripts/screenshots/capture.ts --role owner

  # Capture dashboard with busy day data
  npx tsx scripts/screenshots/capture.ts --role vet --data-set busyDay

  # Capture mobile viewport
  npx tsx scripts/screenshots/capture.ts --viewport mobile

  # Capture specific page
  npx tsx scripts/screenshots/capture.ts --page dashboard-home
`)
}

// ============================================================================
// Screenshot Utilities
// ============================================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getScreenshotPath(
  role: UserRole,
  pageName: string,
  variation: string | null,
  viewport: string,
  tenant: string
): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const dir = path.join(
    SCREENSHOT_CONFIG.outputDir,
    timestamp,
    tenant,
    role,
    viewport
  )
  ensureDir(dir)

  const filename = variation ? `${pageName}--${variation}.png` : `${pageName}.png`
  return path.join(dir, filename)
}

function resolvePath(pagePath: string, params?: Record<string, string>): string {
  let resolved = pagePath
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      resolved = resolved.replace(`:${key}`, value)
    }
  }
  return resolved
}

function buildUrl(
  baseUrl: string,
  tenant: string,
  pagePath: string,
  queryParams?: Record<string, string>
): string {
  const resolvedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`
  let url = `${baseUrl}/${tenant}${resolvedPath}`

  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams)
    url += `?${params.toString()}`
  }

  return url
}

// ============================================================================
// Authentication
// ============================================================================

async function login(
  page: Page,
  baseUrl: string,
  tenant: string,
  email: string,
  password: string
): Promise<boolean> {
  try {
    const loginUrl = `${baseUrl}/${tenant}/portal/login`
    await page.goto(loginUrl, { waitUntil: 'networkidle' })

    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', email)
    await page.fill('input[name="password"], input[type="password"]', password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    })

    console.log(`  ✓ Logged in as ${email}`)
    return true
  } catch (error) {
    console.error(`  ✗ Failed to login as ${email}:`, error)
    return false
  }
}

// ============================================================================
// Screenshot Capture
// ============================================================================

async function captureScreenshot(
  page: Page,
  url: string,
  outputPath: string,
  config: PageConfig
): Promise<boolean> {
  try {
    // Navigate
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: SCREENSHOT_CONFIG.timeout,
    })

    // Wait for specific selector if configured
    if (config.waitFor) {
      await page.waitForSelector(config.waitFor, { timeout: 5000 }).catch(() => {})
    }

    // Execute before-screenshot actions
    if (config.beforeScreenshot) {
      for (const action of config.beforeScreenshot) {
        switch (action.type) {
          case 'click':
            if (action.selector) await page.click(action.selector)
            break
          case 'fill':
            if (action.selector && action.value) {
              await page.fill(action.selector, action.value)
            }
            break
          case 'scroll':
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
            break
          case 'wait':
            await page.waitForTimeout(action.delay || 1000)
            break
          case 'hover':
            if (action.selector) await page.hover(action.selector)
            break
        }
      }
    }

    // Additional delay for dynamic content
    await page.waitForTimeout(SCREENSHOT_CONFIG.loadDelay)

    // Capture screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: SCREENSHOT_CONFIG.fullPage,
    })

    return true
  } catch (error) {
    console.error(`  ✗ Failed to capture ${url}:`, error)
    return false
  }
}

// ============================================================================
// Main Capture Function
// ============================================================================

async function captureRole(
  browser: Browser,
  role: UserRole,
  options: CliOptions
): Promise<{ success: number; failed: number }> {
  console.log(`\n📸 Capturing screenshots for role: ${role.toUpperCase()}`)
  console.log('─'.repeat(50))

  const stats = { success: 0, failed: 0 }

  // Create context with viewport
  const viewport = SCREENSHOT_CONFIG.viewports[options.viewport]
  const context = await browser.newContext({
    viewport,
    locale: 'es-PY',
    timezoneId: 'America/Asuncion',
  })

  const page = await context.newPage()

  // Authenticate if not public
  if (role !== 'public') {
    const user = TEST_USERS[role]
    if (!user.email) {
      console.log(`  ⚠️ No credentials for role: ${role}`)
      await context.close()
      return stats
    }

    const loggedIn = await login(page, options.baseUrl, options.tenant, user.email, user.password)
    if (!loggedIn) {
      console.log(`  ⚠️ Could not authenticate as ${role}`)
      await context.close()
      return stats
    }
  }

  // Get pages for this role
  const pages = ALL_PAGES.filter((p) => {
    // Filter by role
    if (!p.roles.includes(role)) return false
    // Filter by auth requirement
    if (options.skipAuth && p.requiresAuth) return false
    // Filter by specific page name
    if (options.page && p.name !== options.page) return false
    return true
  })

  console.log(`  Found ${pages.length} pages to capture\n`)

  // Capture each page
  for (const pageConfig of pages) {
    const resolvedPath = resolvePath(pageConfig.path, pageConfig.params)
    const variations = pageConfig.variations || [null]

    for (const variation of variations) {
      const variationData = variation as DataVariation | null
      const variationName = variationData?.name || null

      // Build URL with query params
      const url = buildUrl(
        options.baseUrl,
        options.tenant,
        resolvedPath,
        variationData?.queryParams
      )

      const screenshotPath = getScreenshotPath(
        role,
        pageConfig.name,
        variationName,
        options.viewport,
        options.tenant
      )

      const displayName = variationName
        ? `${pageConfig.name} (${variationName})`
        : pageConfig.name

      process.stdout.write(`  📄 ${displayName}... `)

      // Execute variation-specific actions if any
      if (variationData?.actions) {
        pageConfig.beforeScreenshot = [
          ...(pageConfig.beforeScreenshot || []),
          ...variationData.actions,
        ]
      }

      const success = await captureScreenshot(page, url, screenshotPath, pageConfig)

      if (success) {
        console.log('✓')
        stats.success++
      } else {
        console.log('✗')
        stats.failed++
      }
    }
  }

  await context.close()
  return stats
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs()

  console.log('═'.repeat(60))
  console.log('🎬 SCREENSHOT CAPTURE SCRIPT')
  console.log('═'.repeat(60))
  console.log(`
Configuration:
  Tenant:     ${options.tenant}
  Viewport:   ${options.viewport}
  Data Set:   ${options.dataSet}
  Base URL:   ${options.baseUrl}
  Role:       ${options.role || 'all'}
  Page:       ${options.page || 'all'}
  Parallel:   ${options.parallel}
  Skip Auth:  ${options.skipAuth}
`)

  // Setup test data
  if (options.dataSet !== 'empty') {
    console.log(`\n📦 Setting up data set: ${options.dataSet}`)
    try {
      await setupDataSet(options.dataSet, options.tenant)
    } catch (error) {
      console.warn('⚠️ Could not setup data set:', error)
    }
  }

  // Launch browser
  console.log('\n🌐 Launching browser...')
  const browser = await chromium.launch({
    headless: true,
  })

  const totalStats = { success: 0, failed: 0 }

  try {
    // Determine which roles to capture
    const roles: UserRole[] = options.role
      ? [options.role]
      : ['public', 'owner', 'vet', 'admin']

    // Capture for each role
    for (const role of roles) {
      const stats = await captureRole(browser, role, options)
      totalStats.success += stats.success
      totalStats.failed += stats.failed
    }
  } finally {
    await browser.close()
  }

  // Cleanup if requested
  if (options.cleanup) {
    console.log('\n🧹 Cleaning up test data...')
    try {
      await cleanupAllTestData(options.tenant)
    } catch (error) {
      console.warn('⚠️ Could not cleanup test data:', error)
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`
  ✓ Successful: ${totalStats.success}
  ✗ Failed:     ${totalStats.failed}
  Total:        ${totalStats.success + totalStats.failed}

  Screenshots saved to: ${path.resolve(SCREENSHOT_CONFIG.outputDir)}
`)

  process.exit(totalStats.failed > 0 ? 1 : 0)
}

// Run
main().catch(console.error)
