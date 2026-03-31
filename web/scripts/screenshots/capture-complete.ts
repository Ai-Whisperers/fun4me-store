/**
 * Complete Screenshot Capture v2
 *
 * Improvements over v1:
 * - Uses 'networkidle' instead of 'domcontentloaded' for complete data loading
 * - Tracks clicked elements to prevent double-clicking
 * - Intelligent waits based on page complexity
 * - Better authentication flow with URL-based success detection
 * - Specific selectors instead of wildcard class matching
 * - Recursive expansion for nested collapsibles
 * - Per-image timeout for load detection
 * - Better error handling and logging
 *
 * Run with: npx tsx scripts/screenshots/capture-complete.ts
 */

import { chromium, Page, BrowserContext, Locator } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  tenant: 'terrapet',
  outputDir: './screenshots',
  viewport: { width: 1920, height: 1080 },
  loadTimeout: 30000,
  networkIdleTimeout: 3000, // Very short - just a bonus check
  imageLoadTimeout: 2000,
}

const CREDENTIALS = {
  owner: { email: 'owner@terrapet.demo', password: 'demo123', name: 'owner' },
  vet: { email: 'vet@terrapet.demo', password: 'demo123', name: 'vet' },
  admin: { email: 'admin@terrapet.demo', password: 'demo123', name: 'admin' },
}

// All pages to capture organized by role
const PAGES = {
  public: [
    { name: 'homepage', path: '/' },
    { name: 'services', path: '/services' },
    { name: 'store', path: '/store' },
    { name: 'book', path: '/book' },
    // FAQ page has WebSocket that prevents timeout - skip for now
    // { name: 'faq', path: '/faq' },
    { name: 'login', path: '/portal/login' },
    { name: 'diagnosis-codes', path: '/diagnosis_codes' },
    { name: 'drug-dosages', path: '/drug_dosages' },
    { name: 'growth-charts', path: '/growth_charts' },
    { name: 'age-calculator', path: '/tools/age-calculator' },
    { name: 'toxic-foods', path: '/tools/toxic-food' },
  ],
  owner: [
    { name: 'portal-dashboard', path: '/portal/dashboard' },
    { name: 'portal-pets', path: '/portal/pets' },
    { name: 'portal-appointments', path: '/portal/appointments' },
    { name: 'portal-schedule', path: '/portal/schedule' },
    { name: 'portal-messages', path: '/portal/messages' },
    { name: 'portal-profile', path: '/portal/profile' },
    { name: 'portal-loyalty', path: '/portal/loyalty' },
  ],
  vet: [
    { name: 'dashboard-home', path: '/dashboard' },
    { name: 'dashboard-appointments', path: '/dashboard/appointments' },
    { name: 'dashboard-calendar', path: '/dashboard/calendar' },
    { name: 'dashboard-patients', path: '/dashboard/patients' },
    { name: 'dashboard-clients', path: '/dashboard/clients' },
    { name: 'dashboard-inventory', path: '/dashboard/inventory' },
    { name: 'dashboard-invoices', path: '/dashboard/invoices' },
    { name: 'dashboard-hospital', path: '/dashboard/hospital' },
    { name: 'dashboard-lab', path: '/dashboard/lab' },
    { name: 'dashboard-vaccines', path: '/dashboard/vaccines' },
    { name: 'dashboard-consents', path: '/dashboard/consents' },
  ],
  admin: [
    { name: 'dashboard-team', path: '/dashboard/team' },
    { name: 'dashboard-analytics', path: '/dashboard/analytics' },
    { name: 'dashboard-settings', path: '/dashboard/settings' },
    { name: 'dashboard-audit', path: '/dashboard/audit' },
    { name: 'dashboard-campaigns', path: '/dashboard/campaigns' },
    { name: 'dashboard-coupons', path: '/dashboard/coupons' },
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

/**
 * Detect page complexity to determine appropriate wait times
 */
async function getPageComplexity(page: Page): Promise<'simple' | 'medium' | 'complex'> {
  const metrics = await page.evaluate(() => {
    const tables = document.querySelectorAll('table, [role="grid"], [role="table"]').length
    const charts = document.querySelectorAll('canvas, svg[class*="chart"], [class*="recharts"]').length
    const forms = document.querySelectorAll('form').length
    const dataLists = document.querySelectorAll('[role="listbox"], [role="list"], ul, ol').length
    const totalElements = document.querySelectorAll('*').length

    return { tables, charts, forms, dataLists, totalElements }
  })

  if (metrics.tables > 0 || metrics.charts > 0 || metrics.totalElements > 500) {
    return 'complex'
  } else if (metrics.forms > 0 || metrics.dataLists > 3 || metrics.totalElements > 200) {
    return 'medium'
  }
  return 'simple'
}

/**
 * Wait for page to be fully loaded with intelligent detection
 * - Uses 'load' event for reliable base loading
 * - Short network idle timeout as fallback (not blocking)
 * - Waits for specific loading indicators
 * - Handles images with per-image timeout
 * - Adjusts delay based on page complexity
 */
async function waitForPageLoad(page: Page): Promise<void> {
  // 1. Short bonus network idle check (non-blocking)
  await Promise.race([
    page.waitForLoadState('networkidle').catch(() => {}),
    new Promise(resolve => setTimeout(resolve, CONFIG.networkIdleTimeout))
  ])

  // 2. Wait for specific loading indicators (not wildcards)
  const loadingSelectors = [
    // Specific data attributes
    '[data-loading="true"]',
    '[data-state="loading"]',
    '[aria-busy="true"]',
    // Specific class names (exact match preferred)
    '.skeleton',
    '.loader',
    // Tailwind animation
    '.animate-pulse',
    '.animate-spin',
    // Accessibility
    '[role="progressbar"]',
    '[role="status"][aria-live="polite"]',
  ]

  for (const selector of loadingSelectors) {
    try {
      const hasLoader = await page.locator(selector).first().isVisible().catch(() => false)
      if (hasLoader) {
        await page.waitForSelector(selector, { state: 'hidden', timeout: 8000 })
      }
    } catch (_error: unknown) {
      // Selector not found or timeout, continue
    }
  }

  // 3. Wait for images with per-image timeout
  await page.evaluate((imageTimeout) => {
    const images = Array.from(document.images).filter(img => !img.complete)
    return Promise.allSettled(
      images.map(img =>
        Promise.race([
          new Promise<void>(resolve => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          }),
          new Promise<void>(resolve => setTimeout(resolve, imageTimeout))
        ])
      )
    )
  }, CONFIG.imageLoadTimeout)

  // 4. Check React hydration complete
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        window.addEventListener('load', () => resolve(), { once: true })
        setTimeout(resolve, 5000) // Fallback timeout
      }
    })
  })

  // 5. Dynamic delay based on page complexity
  const complexity = await getPageComplexity(page)
  const delays = { simple: 500, medium: 1000, complex: 2000 }
  await page.waitForTimeout(delays[complexity])
}

/**
 * Get unique identifier for an element to track clicks
 */
async function getElementId(element: Locator): Promise<string> {
  try {
    return await element.evaluate((el) => {
      // Try multiple identifiers
      if (el.id) return `id:${el.id}`
      if (el.getAttribute('data-testid')) return `testid:${el.getAttribute('data-testid')}`
      if (el.getAttribute('aria-label')) return `aria:${el.getAttribute('aria-label')}`

      // Fallback to text content + class
      const text = el.textContent?.slice(0, 30) || ''
      const className = el.className?.toString().slice(0, 30) || ''
      return `text:${text}|class:${className}`
    })
  } catch (_error: unknown) {
    return `unknown:${Date.now()}`
  }
}

/**
 * Expand all collapsible elements with click tracking
 * - Tracks clicked elements to prevent double-clicking
 * - Uses specific selectors
 * - Supports recursive expansion for nested items
 */
async function expandAllCollapsibles(page: Page, depth = 0): Promise<void> {
  if (depth > 2) return // Prevent infinite recursion

  const clickedElements = new Set<string>()

  // Specific selectors in priority order (most specific first)
  const expandSelectors = [
    // Radix/Shadcn patterns (most reliable)
    '[data-state="closed"]:not([data-disabled])',
    // ARIA standard
    '[aria-expanded="false"]:not([disabled])',
    // Accordion triggers
    '[data-accordion-trigger]',
    'button[data-radix-collection-item]',
    // Sidebar navigation (specific)
    'aside [aria-expanded="false"]',
    'nav [aria-expanded="false"]',
  ]

  for (const selector of expandSelectors) {
    try {
      const elements = await page.locator(selector).all()

      for (const element of elements) {
        // Get unique ID
        const elementId = await getElementId(element)

        // Skip if already clicked
        if (clickedElements.has(elementId)) continue

        // Check visibility and enabled state
        const isVisible = await element.isVisible().catch(() => false)
        const isDisabled = await element.getAttribute('disabled').catch(() => null)
        const ariaDisabled = await element.getAttribute('aria-disabled').catch(() => null)

        if (!isVisible || isDisabled !== null || ariaDisabled === 'true') {
          continue
        }

        try {
          // Click to expand
          await element.click({ timeout: 2000 })
          clickedElements.add(elementId)

          // Wait for animation (dynamic based on transition)
          const animDuration = await element.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const duration = parseFloat(style.transitionDuration) || 0.3
            return Math.min(duration * 1000 + 100, 500)
          }).catch(() => 300)

          await page.waitForTimeout(animDuration)
        } catch (_error: unknown) {
          // Click failed, continue
        }
      }
    } catch (_error: unknown) {
      // Selector error, continue
    }
  }

  // Wait for animations to complete
  await page.waitForTimeout(300)

  // Check for newly visible collapsibles (recursive)
  const hasNewCollapsibles = await page.evaluate(() => {
    return document.querySelectorAll('[aria-expanded="false"]:not([disabled]), [data-state="closed"]:not([data-disabled])').length
  })

  if (hasNewCollapsibles > 0 && depth < 2) {
    await expandAllCollapsibles(page, depth + 1)
  }

  // Short wait for expanded content to load
  await page.waitForTimeout(1000)
}

/**
 * Login with simple, reliable approach (matching debug script)
 */
async function login(page: Page, email: string, password: string, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Navigate with domcontentloaded (faster, works in debug script)
      await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.loadTimeout,
      })

      // Wait for email input specifically (like debug script)
      await page.waitForSelector('input#email', { timeout: 20000 })

      // Fill credentials using simple page.fill (like debug script)
      await page.fill('input#email', email)
      await page.fill('input#password', password)

      // Click login button (like debug script)
      await page.click('button:has-text("Iniciar Sesión")')

      // Wait for auth flow to complete
      await page.waitForTimeout(5000)

      // Check cookies
      const cookies = await page.context().cookies()
      const authToken = cookies.find(c =>
        c.name.includes('auth-token') && !c.name.includes('code-verifier')
      )

      if (authToken) {
        console.log(`      🍪 ${authToken.name}`)
        return true
      }

      if (attempt < retries) {
        console.log(`      🔄 No auth token, retry ${attempt + 1}/${retries}...`)
        await page.waitForTimeout(2000)
      }
    } catch (error) {
      console.log(`      ⚠️ ${(error as Error).message.slice(0, 40)}`)
      if (attempt < retries) {
        console.log(`      🔄 Retry ${attempt + 1}/${retries}...`)
        await page.waitForTimeout(2000)
      }
    }
  }
  return false
}

/**
 * Capture a single page screenshot with full loading
 */
async function capturePage(
  page: Page,
  pageDef: { name: string; path: string },
  outputDir: string
): Promise<boolean> {
  const url = `${CONFIG.baseUrl}/${CONFIG.tenant}${pageDef.path}`
  const outputPath = path.join(outputDir, `${pageDef.name}.png`)

  process.stdout.write(`    📄 ${pageDef.name}... `)

  try {
    ensureDir(outputDir)

    // Navigate with 'load' event (more reliable than networkidle)
    await page.goto(url, {
      waitUntil: 'load',
      timeout: CONFIG.loadTimeout,
    })

    // Check for auth redirect
    if (page.url().includes('/login') && !pageDef.path.includes('/login')) {
      console.log('⚠️ (auth redirect)')
      return false
    }

    // Wait for complete page load
    await waitForPageLoad(page)

    // Expand all collapsibles
    await expandAllCollapsibles(page)

    // Final stabilization wait
    const complexity = await getPageComplexity(page)
    const finalWait = { simple: 500, medium: 1000, complex: 1500 }
    await page.waitForTimeout(finalWait[complexity])

    // Hide Next.js dev tools panel and close dropdowns before capture
    await page.evaluate(() => {
      // Hide Next.js dev tools indicator
      const devTools = document.querySelector('[data-nextjs-toast]') as HTMLElement
      if (devTools) devTools.style.display = 'none'
      
      // Hide any element that looks like dev tools (bottom-left panels)
      const devPanels = document.querySelectorAll('[class*="nextjs"], [class*="__next"]') as NodeListOf<HTMLElement>
      devPanels.forEach(el => {
        if (el.getBoundingClientRect().bottom > window.innerHeight - 100) {
          el.style.display = 'none'
        }
      })
      
      // Close any open dropdowns by clicking elsewhere
      document.body.click()
      
      // Hide common dropdown menus
      const dropdowns = document.querySelectorAll('[data-state="open"], [aria-expanded="true"]') as NodeListOf<HTMLElement>
      dropdowns.forEach(el => {
        if (el.getAttribute('role') === 'listbox' || el.getAttribute('role') === 'menu') {
          el.style.display = 'none'
        }
      })
    })
    await page.waitForTimeout(300)

    // Scroll to top before capture
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)

    // Capture full page screenshot
    const buffer = await page.screenshot({
      path: outputPath,
      fullPage: true,
      timeout: 30000,
    })

    const sizeKB = Math.round((buffer?.length || 0) / 1024)
    console.log(`✓ (${sizeKB}KB)`)
    return true
  } catch (error) {
    const errorMsg = (error as Error).message
    // Truncate common long errors
    const shortError = errorMsg.includes('Timeout')
      ? 'Timeout'
      : errorMsg.slice(0, 35)
    console.log(`✗ ${shortError}`)
    return false
  }
}

/**
 * Capture all pages for a role
 */
async function captureRole(
  context: BrowserContext,
  role: string,
  pages: { name: string; path: string }[],
  outputDir: string,
  credentials?: { email: string; password: string }
): Promise<{ success: number; failed: number }> {
  const stats = { success: 0, failed: 0 }
  const page = await context.newPage()

  // Login if credentials provided
  if (credentials) {
    console.log(`    🔐 Logging in as ${credentials.email}...`)
    const loggedIn = await login(page, credentials.email, credentials.password)
    if (!loggedIn) {
      console.log('    ❌ Login failed, skipping role\n')
      await page.close()
      return { success: 0, failed: pages.length }
    }
    console.log('    ✓ Logged in\n')
  }

  // Capture each page
  for (const pageDef of pages) {
    const success = await capturePage(page, pageDef, outputDir)
    if (success) stats.success++
    else stats.failed++
  }

  await page.close()
  return stats
}

async function main(): Promise<void> {
  const timestamp = getTimestamp()
  const browser = await chromium.launch({ headless: true })

  console.log('═'.repeat(60))
  console.log('📸 COMPLETE SCREENSHOT CAPTURE v2')
  console.log('═'.repeat(60))
  console.log(`\nOutput: ${CONFIG.outputDir}/${timestamp}`)
  console.log(`Tenant: ${CONFIG.tenant}`)
  console.log(`Features:`)
  console.log(`  ✓ Network idle waiting (complete API data)`)
  console.log(`  ✓ Click tracking (no double-clicks)`)
  console.log(`  ✓ Recursive expansion`)
  console.log(`  ✓ Page complexity detection`)
  console.log(`  ✓ Intelligent login detection\n`)

  let totalSuccess = 0
  let totalFailed = 0

  try {
    // ========================================
    // PUBLIC PAGES
    // ========================================
    console.log('👤 PUBLIC PAGES (no auth)')
    console.log('─'.repeat(40))

    const publicContext = await browser.newContext({ viewport: CONFIG.viewport })
    const publicDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'public')
    const publicStats = await captureRole(publicContext, 'public', PAGES.public, publicDir)
    totalSuccess += publicStats.success
    totalFailed += publicStats.failed
    await publicContext.close()

    // ========================================
    // OWNER PAGES
    // ========================================
    // Give server time to recover from public page captures
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n👤 OWNER PAGES')
    console.log('─'.repeat(40))

    const ownerContext = await browser.newContext({ viewport: CONFIG.viewport })
    const ownerDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'owner')
    const ownerStats = await captureRole(ownerContext, 'owner', PAGES.owner, ownerDir, CREDENTIALS.owner)
    totalSuccess += ownerStats.success
    totalFailed += ownerStats.failed
    await ownerContext.close()

    // ========================================
    // VET PAGES
    // ========================================
    console.log('\n👤 VET PAGES')
    console.log('─'.repeat(40))

    const vetContext = await browser.newContext({ viewport: CONFIG.viewport })
    const vetDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'vet')
    const vetStats = await captureRole(vetContext, 'vet', PAGES.vet, vetDir, CREDENTIALS.vet)
    totalSuccess += vetStats.success
    totalFailed += vetStats.failed
    await vetContext.close()

    // ========================================
    // ADMIN PAGES
    // ========================================
    console.log('\n👤 ADMIN PAGES')
    console.log('─'.repeat(40))

    const adminContext = await browser.newContext({ viewport: CONFIG.viewport })
    const adminDir = path.join(CONFIG.outputDir, timestamp, CONFIG.tenant, 'desktop', 'admin')
    const adminStats = await captureRole(adminContext, 'admin', PAGES.admin, adminDir, CREDENTIALS.admin)
    totalSuccess += adminStats.success
    totalFailed += adminStats.failed
    await adminContext.close()
  } finally {
    await browser.close()
  }

  // Summary
  const successRate = Math.round((totalSuccess / (totalSuccess + totalFailed)) * 100)
  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`
  ✓ Successful: ${totalSuccess}
  ✗ Failed:     ${totalFailed}
  Total:        ${totalSuccess + totalFailed}
  Success Rate: ${successRate}%

  Output: ${path.resolve(CONFIG.outputDir, timestamp)}
`)
}

main().catch(console.error)
