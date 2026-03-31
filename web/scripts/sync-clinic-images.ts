/**
 * Sync Clinic Images Script
 *
 * Copies images from .content_data/[clinic]/images/ to public/branding/[clinic]/images/
 * This allows clinic images to be managed alongside content while being served statically.
 *
 * Usage:
 *   npx tsx scripts/sync-clinic-images.ts           # Sync all clinics
 *   npx tsx scripts/sync-clinic-images.ts terrapet     # Sync specific clinic
 *   npx tsx scripts/sync-clinic-images.ts --watch   # Watch mode for development
 */

import fs from 'node:fs'
import path from 'node:path'

const CONTENT_DIR = path.join(process.cwd(), '.content_data')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'branding')

interface SyncResult {
  clinic: string
  copied: number
  skipped: number
  errors: string[]
}

/**
 * Get all valid clinic slugs from .content_data
 */
function getAllClinics(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return []

  return fs.readdirSync(CONTENT_DIR).filter((file) => {
    // Exclude template folders (prefixed with _ or .), hidden files
    if (file.startsWith('_') || file.startsWith('.')) return false

    const fullPath = path.join(CONTENT_DIR, file)
    if (!fs.statSync(fullPath).isDirectory()) return false

    // Verify it has config.json (valid clinic)
    const configPath = path.join(fullPath, 'config.json')
    return fs.existsSync(configPath)
  })
}

/**
 * Recursively copy directory contents
 */
function copyDirRecursive(src: string, dest: string): { copied: number; errors: string[] } {
  let copied = 0
  const errors: string[] = []

  if (!fs.existsSync(src)) {
    return { copied, errors: [`Source directory does not exist: ${src}`] }
  }

  // Create destination if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Skip markdown files, JSON files, and hidden files
    if (entry.name.startsWith('.') || entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
      continue
    }

    try {
      if (entry.isDirectory()) {
        const result = copyDirRecursive(srcPath, destPath)
        copied += result.copied
        errors.push(...result.errors)
      } else if (entry.isFile()) {
        // Check if file needs updating (newer source or doesn't exist)
        const needsCopy =
          !fs.existsSync(destPath) || fs.statSync(srcPath).mtime > fs.statSync(destPath).mtime

        if (needsCopy) {
          fs.copyFileSync(srcPath, destPath)
          copied++
          console.log(`  ✓ ${path.relative(CONTENT_DIR, srcPath)}`)
        }
      }
    } catch (err) {
      errors.push(`Failed to copy ${srcPath}: ${err}`)
    }
  }

  return { copied, errors }
}

/**
 * Sync images for a single clinic
 */
function syncClinic(clinicSlug: string): SyncResult {
  const result: SyncResult = {
    clinic: clinicSlug,
    copied: 0,
    skipped: 0,
    errors: [],
  }

  const sourceDir = path.join(CONTENT_DIR, clinicSlug, 'images')
  const destDir = path.join(PUBLIC_DIR, clinicSlug, 'images')

  // Check if images directory exists in content
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⚠ No images directory for ${clinicSlug}`)
    return result
  }

  console.log(`\n📁 Syncing ${clinicSlug}...`)

  const { copied, errors } = copyDirRecursive(sourceDir, destDir)
  result.copied = copied
  result.errors = errors

  if (copied === 0 && errors.length === 0) {
    console.log(`  ✓ All images up to date`)
  }

  return result
}

/**
 * Main sync function
 */
function syncAllClinics(specificClinic?: string): void {
  console.log('🔄 Clinic Images Sync')
  console.log('====================')

  const clinics = specificClinic ? [specificClinic] : getAllClinics()

  if (clinics.length === 0) {
    console.log('No clinics found to sync.')
    return
  }

  console.log(`Found ${clinics.length} clinic(s): ${clinics.join(', ')}`)

  const results: SyncResult[] = []

  for (const clinic of clinics) {
    results.push(syncClinic(clinic))
  }

  // Summary
  console.log('\n📊 Summary')
  console.log('----------')

  let totalCopied = 0
  let totalErrors = 0

  for (const r of results) {
    totalCopied += r.copied
    totalErrors += r.errors.length

    if (r.errors.length > 0) {
      console.log(`\n❌ Errors for ${r.clinic}:`)
      r.errors.forEach((e) => console.log(`   ${e}`))
    }
  }

  console.log(`\n✅ Copied: ${totalCopied} file(s)`)
  if (totalErrors > 0) {
    console.log(`❌ Errors: ${totalErrors}`)
    process.exit(1)
  }
}

/**
 * Watch mode for development
 */
function watchMode(): void {
  console.log('👀 Watch mode enabled. Press Ctrl+C to stop.\n')

  // Initial sync
  syncAllClinics()

  // Watch for changes
  const clinics = getAllClinics()

  for (const clinic of clinics) {
    const watchDir = path.join(CONTENT_DIR, clinic, 'images')

    if (fs.existsSync(watchDir)) {
      fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.endsWith('.md') && !filename.endsWith('.json')) {
          console.log(`\n🔄 Change detected: ${filename}`)
          syncClinic(clinic)
        }
      })
      console.log(`Watching: ${watchDir}`)
    }
  }
}

// CLI handling
const args = process.argv.slice(2)

if (args.includes('--watch') || args.includes('-w')) {
  watchMode()
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Clinic Images Sync Script

Usage:
  npx tsx scripts/sync-clinic-images.ts           # Sync all clinics
  npx tsx scripts/sync-clinic-images.ts terrapet     # Sync specific clinic
  npx tsx scripts/sync-clinic-images.ts --watch   # Watch mode for development
  npx tsx scripts/sync-clinic-images.ts --help    # Show this help

This script copies images from .content_data/[clinic]/images/ to
public/branding/[clinic]/images/ for static serving.
  `)
} else {
  const specificClinic = args.find((arg) => !arg.startsWith('-'))
  syncAllClinics(specificClinic)
}
