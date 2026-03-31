/**
 * Analyze Page HTML
 *
 * Dumps the actual HTML structure to understand form elements.
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

  console.log('═'.repeat(60))
  console.log('🔍 PAGE ANALYSIS')
  console.log('═'.repeat(60))

  try {
    // Navigate to login
    console.log('\n1. Navigating to login page...')
    await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/portal/login`, {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    console.log(`   URL: ${page.url()}`)

    // Get page title
    const title = await page.title()
    console.log(`   Title: ${title}`)

    // Analyze form structure
    console.log('\n2. Form elements found:')

    // Find all forms
    const forms = await page.locator('form').count()
    console.log(`   Forms: ${forms}`)

    // Find all inputs
    const inputs = await page.locator('input').all()
    console.log(`   Inputs: ${inputs.length}`)
    for (const input of inputs) {
      const type = await input.getAttribute('type')
      const name = await input.getAttribute('name')
      const id = await input.getAttribute('id')
      const placeholder = await input.getAttribute('placeholder')
      console.log(`     - type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`)
    }

    // Find all buttons
    const buttons = await page.locator('button').all()
    console.log(`   Buttons: ${buttons.length}`)
    for (const button of buttons) {
      const type = await button.getAttribute('type')
      const text = await button.textContent()
      console.log(`     - type="${type}" text="${text?.trim().substring(0, 50)}"`)
    }

    // Get the HTML of the main content area
    console.log('\n3. Login form HTML structure:')
    const formHtml = await page.locator('form').first().innerHTML().catch(() => 'No form found')
    console.log(formHtml.substring(0, 1000))

    // Try to identify the email login form specifically
    console.log('\n4. Email login form analysis:')
    const emailInput = await page.locator('input#email').count()
    const passwordInput = await page.locator('input#password').count()
    const submitBtn = await page.locator('button:has-text("Iniciar Sesión")').count()
    const googleBtn = await page.locator('button:has-text("Google")').count()

    console.log(`   input#email found: ${emailInput}`)
    console.log(`   input#password found: ${passwordInput}`)
    console.log(`   "Iniciar Sesión" button found: ${submitBtn}`)
    console.log(`   "Google" button found: ${googleBtn}`)

    // Now try to fill and submit
    console.log('\n5. Attempting login...')

    if (emailInput > 0 && passwordInput > 0) {
      await page.fill('input#email', 'admin@terrapet.demo')
      await page.fill('input#password', 'demo123')

      // Verify values were filled
      const emailValue = await page.locator('input#email').inputValue()
      const passwordValue = await page.locator('input#password').inputValue()
      console.log(`   Email filled: "${emailValue}"`)
      console.log(`   Password filled: "${passwordValue.length} chars"`)

      // Take screenshot before submit
      await page.screenshot({ path: './screenshots/debug-before-submit.png' })
      console.log('   Screenshot saved: debug-before-submit.png')

      // Click submit
      console.log('   Clicking submit...')
      await page.click('button:has-text("Iniciar Sesión")')

      // Wait for response
      await page.waitForTimeout(5000)

      console.log(`   URL after submit: ${page.url()}`)

      // Check for error messages
      const errorAlert = await page.locator('[role="alert"]').textContent().catch(() => null)
      if (errorAlert) {
        console.log(`   ⚠️ Error alert: ${errorAlert}`)
      }

      // Take screenshot after submit
      await page.screenshot({ path: './screenshots/debug-after-submit.png' })
      console.log('   Screenshot saved: debug-after-submit.png')

      // Check cookies
      const cookies = await context.cookies()
      console.log(`\n6. Cookies after login: ${cookies.length}`)
      for (const cookie of cookies) {
        console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 30)}...`)
      }

      // If we're logged in, try navigating to dashboard
      if (!page.url().includes('/login')) {
        console.log('\n7. Navigating to dashboard...')
        await page.goto(`${CONFIG.baseUrl}/${CONFIG.tenant}/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        })
        await page.waitForTimeout(3000)
        console.log(`   URL: ${page.url()}`)

        // Screenshot dashboard
        await page.screenshot({ path: './screenshots/debug-dashboard.png', fullPage: true })
        console.log('   Screenshot saved: debug-dashboard.png')
      }
    } else {
      console.log('   ❌ Could not find email/password inputs')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }

  console.log('\n✓ Analysis complete')
}

main().catch(console.error)
