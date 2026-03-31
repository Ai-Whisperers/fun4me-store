/**
 * Debug Auth Script
 *
 * Debugs authentication flow to understand why session isn't persisting.
 */

import { chromium } from 'playwright'

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  tenant: 'terrapet',
}

const CREDENTIALS = {
  email: 'admin@terrapet.demo',
  password: 'demo123',
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true }) // Run headless
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()

  console.log('═'.repeat(60))
  console.log('🔍 AUTH DEBUG')
  console.log('═'.repeat(60))

  try {
    // Step 1: Go to login
    console.log('\n1. Navigating to login page...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'networkidle' })
    console.log(`   Current URL: ${page.url()}`)

    // Step 2: Check initial cookies
    console.log('\n2. Initial cookies:')
    let cookies = await context.cookies()
    console.log(`   Found ${cookies.length} cookies:`)
    cookies.forEach(c => console.log(`   - ${c.name}: ${c.value.substring(0, 30)}...`))

    // Step 3: Fill and submit login form
    console.log('\n3. Filling login form...')
    await page.fill('input#email', CREDENTIALS.email)
    await page.fill('input#password', CREDENTIALS.password)

    console.log('   Submitting email login form...')
    // Click the submit button that contains "Iniciar Sesión" text
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth') || resp.status() !== 0),
      page.click('button:has-text("Iniciar Sesión")')
    ]).catch(() => {})

    // Step 4: Wait for navigation
    console.log('\n4. Waiting for redirect...')
    await page.waitForTimeout(5000) // Wait for Supabase to set cookies
    console.log(`   Current URL: ${page.url()}`)

    // Check for any error message
    const errorText = await page.locator('[role="alert"]').textContent().catch(() => null)
    if (errorText) {
      console.log(`   ⚠️ Error message: ${errorText}`)
    }

    // Step 5: Check cookies after login
    console.log('\n5. Cookies after login:')
    cookies = await context.cookies()
    console.log(`   Found ${cookies.length} cookies:`)
    cookies.forEach(c => console.log(`   - ${c.name}: ${c.value.substring(0, 50)}...`))

    // Step 6: Check localStorage
    console.log('\n6. LocalStorage:')
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) {
          items[key] = window.localStorage.getItem(key)?.substring(0, 100) + '...'
        }
      }
      return items
    })
    Object.entries(localStorage).forEach(([k, v]) => console.log(`   - ${k}: ${v}`))

    // Step 7: Try navigating to dashboard
    console.log('\n7. Navigating to dashboard...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/dashboard`, { waitUntil: 'networkidle' })
    console.log(`   Current URL: ${page.url()}`)

    // Step 8: Final cookie check
    console.log('\n8. Cookies after dashboard navigation:')
    cookies = await context.cookies()
    console.log(`   Found ${cookies.length} cookies:`)
    cookies.forEach(c => console.log(`   - ${c.name}: ${c.value.substring(0, 50)}...`))

    // Step 9: Screenshot
    console.log('\n9. Taking screenshot...')
    await page.screenshot({ path: './screenshots/debug-auth.png', fullPage: true })
    console.log('   Saved to ./screenshots/debug-auth.png')

    console.log('\n✓ Debug complete.')

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
