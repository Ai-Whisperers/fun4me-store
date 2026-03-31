/**
 * Debug Owner Login
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

  console.log('Testing owner@terrapet.demo login...\n')

  try {
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, { waitUntil: 'domcontentloaded' })
    console.log(`URL: ${page.url()}`)

    await page.waitForSelector('input#email', { timeout: 10000 })
    await page.fill('input#email', 'owner@terrapet.demo')
    await page.fill('input#password', 'demo123')

    console.log('Clicking submit...')
    await page.click('button:has-text("Iniciar Sesión")')

    await page.waitForTimeout(5000)
    console.log(`URL after: ${page.url()}`)

    // Check for error
    const errorText = await page.locator('[role="alert"]').textContent().catch(() => null)
    if (errorText) {
      console.log(`Error: ${errorText}`)
    }

    // Check cookies
    const cookies = await context.cookies()
    console.log(`Cookies: ${cookies.length}`)
    cookies.forEach(c => console.log(`  - ${c.name}`))

    await page.screenshot({ path: './screenshots/debug-owner-login.png' })
    console.log('Screenshot saved')

  } finally {
    await browser.close()
  }
}

main().catch(console.error)
