/**
 * Debug Portal Redirect
 * Check what happens after owner login - where does the portal redirect?
 */
import { chromium } from 'playwright'

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  tenant: 'terrapet',
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()

  console.log('='.repeat(60))
  console.log('🔍 PORTAL REDIRECT DEBUG')
  console.log('='.repeat(60))

  try {
    // 1. Login
    console.log('\n1. Logging in as owner@terrapet.demo...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'networkidle' })
    await page.waitForSelector('input#email', { timeout: 10000 })
    await page.fill('input#email', 'owner@terrapet.demo')
    await page.fill('input#password', 'demo123')
    await page.click('button:has-text("Iniciar Sesión")')
    await page.waitForTimeout(8000)

    console.log(`   URL after login: ${page.url()}`)

    // 2. Check cookies
    const cookies = await context.cookies()
    const authCookie = cookies.find(c => c.name.includes('auth-token'))
    console.log(`   Auth cookie: ${authCookie ? 'YES' : 'NO'}`)

    // 3. Try navigating to portal/dashboard directly
    console.log('\n2. Navigating to /portal/dashboard...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(5000)
    console.log(`   URL: ${page.url()}`)

    // 4. Take screenshot
    await page.screenshot({ path: './screenshots/debug-portal-dashboard.png', fullPage: true })
    console.log('   Screenshot: debug-portal-dashboard.png')

    // 5. Check page content
    const bodyText = await page.locator('body').innerText().catch(() => '')
    console.log(`   Body text (first 200 chars): ${bodyText.slice(0, 200).replace(/\n/g, ' ')}`)

    // 6. Try portal/pets
    console.log('\n3. Navigating to /portal/pets...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/pets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(5000)
    console.log(`   URL: ${page.url()}`)
    await page.screenshot({ path: './screenshots/debug-portal-pets.png', fullPage: true })
    console.log('   Screenshot: debug-portal-pets.png')

    // 7. Check if still authenticated
    const cookiesAfter = await context.cookies()
    const authAfter = cookiesAfter.find(c => c.name.includes('auth-token'))
    console.log(`   Auth cookie still present: ${authAfter ? 'YES' : 'NO'}`)

  } finally {
    await browser.close()
  }

  console.log('\n✓ Debug complete')
}

main().catch(console.error)
