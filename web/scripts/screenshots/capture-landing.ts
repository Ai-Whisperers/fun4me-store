/**
 * Capture Landing Page Screenshots
 *
 * Captures screenshots of all public marketing/landing pages
 * across multiple viewports.
 *
 * Usage:
 *   npx tsx scripts/screenshots/capture-landing.ts
 *   npx tsx scripts/screenshots/capture-landing.ts --viewport desktop
 *   npx tsx scripts/screenshots/capture-landing.ts --page precios
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import {
  LANDING_PAGES,
  LandingPageConfig,
  VIEWPORTS,
  ViewportName,
  LANDING_SCREENSHOT_CONFIG,
} from './landing-config'

// ============================================================================
// CLI Arguments
// ============================================================================

function parseArgs(): { viewport?: ViewportName; page?: string } {
  const args: { viewport?: ViewportName; page?: string } = {}
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--viewport' && argv[i + 1]) {
      args.viewport = argv[i + 1] as ViewportName
      i++
    }
    if (argv[i] === '--page' && argv[i + 1]) {
      args.page = argv[i + 1]
      i++
    }
  }

  return args
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

// ============================================================================
// Screenshot Capture
// ============================================================================

interface CaptureResult {
  page: string
  viewport: string
  scrollPosition?: string
  success: boolean
  path?: string
  error?: string
}

async function capturePageScreenshot(
  page: Page,
  pageConfig: LandingPageConfig,
  viewport: ViewportName,
  outputDir: string
): Promise<CaptureResult[]> {
  const results: CaptureResult[] = []
  const url = `${LANDING_SCREENSHOT_CONFIG.baseUrl}${pageConfig.path}`

  try {
    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: LANDING_SCREENSHOT_CONFIG.timeout,
    })

    // Wait for content
    if (pageConfig.waitFor) {
      await page.waitForSelector(pageConfig.waitFor, { timeout: 5000 }).catch(() => {})
    }

    // Additional delay for any animations
    await page.waitForTimeout(LANDING_SCREENSHOT_CONFIG.loadDelay)

    // Full page screenshot
    const filename = `${pageConfig.name}--${viewport}--full.png`
    const outputPath = path.join(outputDir, viewport, filename)

    ensureDir(path.dirname(outputPath))
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    })

    results.push({
      page: pageConfig.name,
      viewport,
      success: true,
      path: outputPath,
    })

    // Scroll position screenshots if configured
    if (pageConfig.scrollPositions && pageConfig.scrollPositions.length > 0) {
      for (const scrollPos of pageConfig.scrollPositions) {
        const scrollFilename = `${pageConfig.name}--${viewport}--${scrollPos}.png`
        const scrollOutputPath = path.join(outputDir, viewport, scrollFilename)

        // Scroll to position
        if (scrollPos === 'top') {
          await page.evaluate(() => window.scrollTo(0, 0))
        } else if (scrollPos === 'middle') {
          await page.evaluate(() => {
            const docHeight = document.documentElement.scrollHeight
            const viewHeight = window.innerHeight
            window.scrollTo(0, (docHeight - viewHeight) / 2)
          })
        } else if (scrollPos === 'bottom') {
          await page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight)
          })
        }

        await page.waitForTimeout(500) // Wait for scroll

        await page.screenshot({
          path: scrollOutputPath,
          fullPage: false, // Viewport only for scroll shots
        })

        results.push({
          page: pageConfig.name,
          viewport,
          scrollPosition: scrollPos,
          success: true,
          path: scrollOutputPath,
        })
      }
    }

    return results
  } catch (error) {
    return [
      {
        page: pageConfig.name,
        viewport,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    ]
  }
}

// ============================================================================
// Main Capture Flow
// ============================================================================

async function captureLandingScreenshots(): Promise<void> {
  const args = parseArgs()
  const timestamp = getTimestamp()
  const outputDir = path.join(LANDING_SCREENSHOT_CONFIG.outputDir, timestamp)
  const allResults: CaptureResult[] = []

  // Determine viewports
  const viewports = args.viewport
    ? [args.viewport]
    : LANDING_SCREENSHOT_CONFIG.defaultViewports

  // Determine pages
  const pages = args.page
    ? LANDING_PAGES.filter((p) => p.name === args.page || p.path === args.page)
    : LANDING_PAGES

  if (pages.length === 0) {
    console.error('No pages found matching the filter')
    process.exit(1)
  }

  console.log('═'.repeat(70))
  console.log('🎬 LANDING PAGE SCREENSHOT CAPTURE')
  console.log('═'.repeat(70))
  console.log(`
  Pages:      ${pages.length} (${pages.map((p) => p.name).join(', ')})
  Viewports:  ${viewports.join(', ')}
  Output:     ${outputDir}
  Base URL:   ${LANDING_SCREENSHOT_CONFIG.baseUrl}
  `)

  // Launch browser
  const browser = await chromium.launch({ headless: true })

  try {
    for (const viewport of viewports) {
      const viewportSize = VIEWPORTS[viewport]

      console.log(`\n${'─'.repeat(70)}`)
      console.log(`📱 VIEWPORT: ${viewport.toUpperCase()} (${viewportSize.width}x${viewportSize.height})`)
      console.log('─'.repeat(70))

      // Create context with viewport
      const context = await browser.newContext({
        viewport: viewportSize,
        locale: 'es-PY',
        timezoneId: 'America/Asuncion',
      })

      const page = await context.newPage()

      for (const pageConfig of pages) {
        console.log(`\n  📄 ${pageConfig.name} (${pageConfig.path})`)
        console.log(`     ${pageConfig.description}`)

        const results = await capturePageScreenshot(page, pageConfig, viewport, outputDir)
        allResults.push(...results)

        // Log results
        for (const result of results) {
          const status = result.success ? '✓' : '✗'
          const label = result.scrollPosition
            ? `${result.page} (${result.scrollPosition})`
            : `${result.page} (full page)`
          console.log(`     ${status} ${label}`)
          if (!result.success && result.error) {
            console.log(`       Error: ${result.error}`)
          }
        }
      }

      await context.close()
    }
  } finally {
    await browser.close()
  }

  // Summary
  const successful = allResults.filter((r) => r.success).length
  const failed = allResults.filter((r) => !r.success).length

  console.log('\n' + '═'.repeat(70))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(70))
  console.log(`
  ✓ Successful:  ${successful}
  ✗ Failed:      ${failed}
  ─────────────
  Total:         ${allResults.length}

  Output Directory: ${path.resolve(outputDir)}
  `)

  // Generate index
  await generateLandingIndex(allResults, outputDir, viewports)

  // List failures
  if (failed > 0) {
    console.log('\nFailed captures:')
    allResults
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.viewport}/${r.page}: ${r.error}`)
      })
  }
}

// ============================================================================
// Index Generator
// ============================================================================

async function generateLandingIndex(
  results: CaptureResult[],
  outputDir: string,
  viewports: ViewportName[]
): Promise<void> {
  const indexPath = path.join(outputDir, 'index.html')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page Screenshots</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { margin-bottom: 10px; color: #333; }
    .subtitle { color: #666; margin-bottom: 20px; }
    .filters { margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
    .filter { padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; background: white; }
    .filter.active { background: #0d9488; color: white; border-color: #0d9488; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: 250px; object-fit: cover; object-position: top; cursor: pointer; transition: transform 0.2s; }
    .card img:hover { transform: scale(1.02); }
    .card-body { padding: 16px; }
    .card-title { font-weight: 600; font-size: 18px; margin-bottom: 4px; }
    .card-meta { font-size: 13px; color: #666; display: flex; gap: 8px; align-items: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-desktop { background: #dbeafe; color: #1d4ed8; }
    .badge-tablet { background: #dcfce7; color: #166534; }
    .badge-mobile { background: #fef3c7; color: #92400e; }
    .badge-full { background: #f3e8ff; color: #7c3aed; }
    .badge-scroll { background: #e0e7ff; color: #4338ca; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; }
    .modal.active { display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .modal img { max-width: 95%; max-height: 90%; object-fit: contain; }
    .modal-info { color: white; margin-top: 10px; font-size: 14px; }
    .modal-close { position: absolute; top: 20px; right: 20px; color: white; font-size: 40px; cursor: pointer; }
    .hidden { display: none !important; }
    .page-section { margin-bottom: 40px; }
    .page-section h2 { margin-bottom: 15px; color: #333; font-size: 20px; border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
  </style>
</head>
<body>
  <h1>📸 Vetic Landing Page Screenshots</h1>
  <p class="subtitle">Generated: ${new Date().toLocaleString('es-PY')}</p>

  <div class="filters">
    <span style="padding: 8px 0;">Viewport:</span>
    <button class="filter active" data-filter="viewport" data-value="all">All</button>
    ${viewports.map((v) => `<button class="filter" data-filter="viewport" data-value="${v}">${v}</button>`).join('')}
  </div>

  <div class="filters">
    <span style="padding: 8px 0;">Type:</span>
    <button class="filter active" data-filter="type" data-value="all">All</button>
    <button class="filter" data-filter="type" data-value="full">Full Page</button>
    <button class="filter" data-filter="type" data-value="scroll">Scroll Positions</button>
  </div>

  ${LANDING_PAGES.map(
    (pageConfig) => `
    <div class="page-section" data-page="${pageConfig.name}">
      <h2>${pageConfig.name} (${pageConfig.path})</h2>
      <p style="color: #666; margin-bottom: 15px; font-size: 14px;">${pageConfig.description}</p>
      <div class="grid">
        ${results
          .filter((r) => r.success && r.page === pageConfig.name)
          .map(
            (r) => `
          <div class="card"
               data-viewport="${r.viewport}"
               data-type="${r.scrollPosition ? 'scroll' : 'full'}">
            <img src="${r.path?.replace(outputDir + '/', '')}"
                 alt="${r.page}"
                 onclick="openModal(this.src, '${r.page} - ${r.viewport}${r.scrollPosition ? ` (${r.scrollPosition})` : ''}')">
            <div class="card-body">
              <div class="card-title">${r.scrollPosition ? r.scrollPosition : 'Full Page'}</div>
              <div class="card-meta">
                <span class="badge badge-${r.viewport}">${r.viewport}</span>
                <span class="badge ${r.scrollPosition ? 'badge-scroll' : 'badge-full'}">${r.scrollPosition ? 'viewport' : 'full'}</span>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
  ).join('')}

  <div class="modal" id="modal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <img id="modal-img" src="">
    <div class="modal-info" id="modal-info"></div>
  </div>

  <script>
    // Filtering
    document.querySelectorAll('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        document.querySelectorAll('.filter[data-filter="' + filter + '"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterCards();
      });
    });

    function filterCards() {
      const viewport = document.querySelector('.filter[data-filter="viewport"].active').dataset.value;
      const type = document.querySelector('.filter[data-filter="type"].active').dataset.value;

      document.querySelectorAll('.card').forEach(card => {
        const matchViewport = viewport === 'all' || card.dataset.viewport === viewport;
        const matchType = type === 'all' || card.dataset.type === type;
        card.classList.toggle('hidden', !(matchViewport && matchType));
      });
    }

    // Modal
    function openModal(src, info) {
      document.getElementById('modal-img').src = src;
      document.getElementById('modal-info').textContent = info;
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
  console.log(`\n📄 Index generated: ${indexPath}`)
}

// ============================================================================
// Entry Point
// ============================================================================

captureLandingScreenshots().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
