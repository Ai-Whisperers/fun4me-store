/**
 * Run All Screenshots
 *
 * Captures all screenshot combinations:
 * - All roles (public, owner, vet, admin)
 * - All viewports (desktop, tablet, mobile)
 * - Different data sets for varied content
 *
 * This is the main entry point for generating a complete screenshot set.
 *
 * Usage:
 *   npx tsx scripts/screenshots/run-all.ts
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import {
  ALL_PAGES,
  PageConfig,
  UserRole,
  TEST_USERS,
  SCREENSHOT_CONFIG,
  DataVariation,
} from './config'
import { setupDataSet, cleanupAllTestData, DATA_SETS } from './data-fixtures'

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  tenant: 'terrapet',
  outputDir: './screenshots',
  roles: ['public', 'owner', 'vet', 'admin'] as UserRole[],
  viewports: ['desktop', 'tablet', 'mobile'] as const,
  dataSets: ['full'] as const, // Use 'full' for rich screenshots
}

// ============================================================================
// Utilities
// ============================================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]
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

// ============================================================================
// Screenshot Capture
// ============================================================================

interface CaptureResult {
  page: string
  role: string
  viewport: string
  variation: string | null
  success: boolean
  path?: string
  error?: string
}

async function captureScreenshot(
  page: Page,
  config: {
    url: string
    outputPath: string
    pageConfig: PageConfig
    variation: DataVariation | null
  }
): Promise<CaptureResult> {
  const { url, outputPath, pageConfig, variation } = config

  try {
    // Navigate
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for content
    if (pageConfig.waitFor) {
      await page.waitForSelector(pageConfig.waitFor, { timeout: 5000 }).catch(() => {})
    }

    // Additional delay
    await page.waitForTimeout(1000)

    // Capture
    ensureDir(path.dirname(outputPath))
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    })

    return {
      page: pageConfig.name,
      role: '',
      viewport: '',
      variation: variation?.name || null,
      success: true,
      path: outputPath,
    }
  } catch (error) {
    return {
      page: pageConfig.name,
      role: '',
      viewport: '',
      variation: variation?.name || null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============================================================================
// Authentication
// ============================================================================

async function authenticate(
  page: Page,
  role: UserRole,
  tenant: string,
  baseUrl: string
): Promise<boolean> {
  if (role === 'public') return true

  const user = TEST_USERS[role]
  if (!user?.email) return false

  try {
    await page.goto(`${baseUrl}/${tenant}/portal/login`, { waitUntil: 'networkidle' })

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', user.email)
    await page.fill('input[name="password"], input[type="password"]', user.password)

    // Submit
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    return true
  } catch (error) {
    console.error(`  Auth failed for ${role}:`, error)
    return false
  }
}

// ============================================================================
// Main Capture Flow
// ============================================================================

async function captureAllScreenshots(): Promise<void> {
  const timestamp = getTimestamp()
  const results: CaptureResult[] = []

  console.log('═'.repeat(70))
  console.log('🎬 COMPLETE SCREENSHOT CAPTURE')
  console.log('═'.repeat(70))
  console.log(`
  Tenant:     ${CONFIG.tenant}
  Viewports:  ${CONFIG.viewports.join(', ')}
  Roles:      ${CONFIG.roles.join(', ')}
  Output:     ${CONFIG.outputDir}/${timestamp}
  `)

  // Setup data
  console.log('\n📦 Setting up test data...')
  try {
    await setupDataSet('full', CONFIG.tenant)
    console.log('  ✓ Test data ready\n')
  } catch (error) {
    console.warn('  ⚠️ Could not setup test data, continuing with existing data\n')
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true })

  try {
    // Process each viewport
    for (const viewport of CONFIG.viewports) {
      const viewportSize = SCREENSHOT_CONFIG.viewports[viewport]

      console.log(`\n${'─'.repeat(70)}`)
      console.log(`📱 VIEWPORT: ${viewport.toUpperCase()} (${viewportSize.width}x${viewportSize.height})`)
      console.log('─'.repeat(70))

      // Process each role
      for (const role of CONFIG.roles) {
        console.log(`\n  👤 Role: ${role.toUpperCase()}`)

        // Create context
        const context = await browser.newContext({
          viewport: viewportSize,
          locale: 'es-PY',
          timezoneId: 'America/Asuncion',
        })

        const page = await context.newPage()

        // Authenticate
        if (role !== 'public') {
          const authenticated = await authenticate(page, role, CONFIG.tenant, CONFIG.baseUrl)
          if (!authenticated) {
            console.log(`     ⚠️ Skipping ${role} - authentication failed`)
            await context.close()
            continue
          }
          console.log('     ✓ Authenticated')
        }

        // Get pages for this role
        const pages = ALL_PAGES.filter((p) => p.roles.includes(role))
        console.log(`     📄 ${pages.length} pages to capture`)

        // Capture each page
        for (const pageConfig of pages) {
          const resolvedPath = resolvePath(pageConfig.path, pageConfig.params)
          const variations = pageConfig.variations || [null]

          for (const variation of variations) {
            const variationData = variation as DataVariation | null
            const variationName = variationData?.name || 'default'

            // Build URL
            let url = `${CONFIG.baseUrl}/${CONFIG.tenant}${resolvedPath}`
            if (variationData?.queryParams) {
              const params = new URLSearchParams(variationData.queryParams)
              url += `?${params.toString()}`
            }

            // Build output path
            const filename = `${pageConfig.name}--${variationName}.png`
            const outputPath = path.join(
              CONFIG.outputDir,
              timestamp,
              CONFIG.tenant,
              viewport,
              role,
              filename
            )

            // Capture
            const result = await captureScreenshot(page, {
              url,
              outputPath,
              pageConfig,
              variation: variationData,
            })

            result.role = role
            result.viewport = viewport
            results.push(result)

            // Log progress
            const status = result.success ? '✓' : '✗'
            const displayName = variationData?.name
              ? `${pageConfig.name} (${variationData.name})`
              : pageConfig.name
            console.log(`        ${status} ${displayName}`)
          }
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test data...')
  try {
    await cleanupAllTestData(CONFIG.tenant)
    console.log('  ✓ Cleanup complete')
  } catch (error) {
    console.warn('  ⚠️ Cleanup failed:', error)
  }

  // Summary
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('\n' + '═'.repeat(70))
  console.log('📊 FINAL SUMMARY')
  console.log('═'.repeat(70))
  console.log(`
  ✓ Successful:  ${successful}
  ✗ Failed:      ${failed}
  ─────────────
  Total:         ${results.length}

  Output Directory: ${path.resolve(CONFIG.outputDir, timestamp)}
  `)

  // List failures
  if (failed > 0) {
    console.log('Failed captures:')
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.viewport}/${r.role}/${r.page}: ${r.error}`)
      })
  }

  // Generate index
  await generateIndex(results, timestamp)
}

// ============================================================================
// Index Generator
// ============================================================================

async function generateIndex(results: CaptureResult[], timestamp: string): Promise<void> {
  const indexPath = path.join(CONFIG.outputDir, timestamp, 'index.html')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screenshots - ${timestamp}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { margin-bottom: 20px; color: #333; }
    .filters { margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
    .filter { padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; background: white; }
    .filter.active { background: #2563eb; color: white; border-color: #2563eb; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: 200px; object-fit: cover; object-position: top; cursor: pointer; }
    .card-body { padding: 12px; }
    .card-title { font-weight: 600; margin-bottom: 4px; }
    .card-meta { font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; }
    .badge-public { background: #e5e7eb; color: #374151; }
    .badge-owner { background: #dbeafe; color: #1d4ed8; }
    .badge-vet { background: #dcfce7; color: #166534; }
    .badge-admin { background: #fef3c7; color: #92400e; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; }
    .modal.active { display: flex; align-items: center; justify-content: center; }
    .modal img { max-width: 95%; max-height: 95%; object-fit: contain; }
    .modal-close { position: absolute; top: 20px; right: 20px; color: white; font-size: 30px; cursor: pointer; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <h1>📸 Screenshots - ${timestamp}</h1>

  <div class="filters">
    <span>Viewport:</span>
    <button class="filter active" data-filter="viewport" data-value="all">All</button>
    ${CONFIG.viewports.map((v) => `<button class="filter" data-filter="viewport" data-value="${v}">${v}</button>`).join('')}
  </div>

  <div class="filters">
    <span>Role:</span>
    <button class="filter active" data-filter="role" data-value="all">All</button>
    ${CONFIG.roles.map((r) => `<button class="filter" data-filter="role" data-value="${r}">${r}</button>`).join('')}
  </div>

  <div class="grid">
    ${results
      .filter((r) => r.success)
      .map(
        (r) => `
      <div class="card" data-viewport="${r.viewport}" data-role="${r.role}">
        <img src="${r.path?.replace(CONFIG.outputDir + '/' + timestamp + '/', '')}" alt="${r.page}" onclick="openModal(this.src)">
        <div class="card-body">
          <div class="card-title">${r.page}${r.variation ? ` (${r.variation})` : ''}</div>
          <div class="card-meta">
            <span class="badge badge-${r.role}">${r.role}</span>
            <span class="badge">${r.viewport}</span>
          </div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="modal" id="modal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <img id="modal-img" src="">
  </div>

  <script>
    // Filtering
    document.querySelectorAll('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        const value = btn.dataset.value;

        // Update active state
        document.querySelectorAll(\`.filter[data-filter="\${filter}"]\`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter cards
        filterCards();
      });
    });

    function filterCards() {
      const viewport = document.querySelector('.filter[data-filter="viewport"].active').dataset.value;
      const role = document.querySelector('.filter[data-filter="role"].active').dataset.value;

      document.querySelectorAll('.card').forEach(card => {
        const matchViewport = viewport === 'all' || card.dataset.viewport === viewport;
        const matchRole = role === 'all' || card.dataset.role === role;
        card.classList.toggle('hidden', !(matchViewport && matchRole));
      });
    }

    // Modal
    function openModal(src) {
      document.getElementById('modal-img').src = src;
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }

    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>
`

  ensureDir(path.dirname(indexPath))
  fs.writeFileSync(indexPath, html)
  console.log(`\n  📄 Index generated: ${indexPath}`)
}

// ============================================================================
// Entry Point
// ============================================================================

captureAllScreenshots().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
