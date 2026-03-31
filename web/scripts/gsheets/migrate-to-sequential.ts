/**
 * Sequential Category Code Migration
 * Converts category codes to sequential numbering system supporting 5 levels
 *
 * Format:
 * - Level 1: 01, 02, 03...
 * - Level 2: 01.01, 01.02, 02.01...
 * - Level 3: 01.01.01, 01.01.02...
 * - Level 4: 01.01.01.01...
 * - Level 5: 01.01.01.01.01...
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../../db/99_seed/data')
const PRODUCTS_DIR = join(DATA_DIR, 'products')

// ============================================================================
// TYPES
// ============================================================================

interface CategoryJson {
  slug: string
  name: string
  description: string
  level: number
  display_order: number
  parent_slug?: string | null
  image_url: string
  subcategories?: CategoryJson[]
}

interface CategoriesFile {
  $schema: string
  categories: CategoryJson[]
}

interface ProductJson {
  sku: string
  name: string
  description: string
  category_slug: string
  target_species: string[]
  requires_prescription?: boolean
  variants: any[]
  image_url: string
  attributes: Record<string, any>
}

interface ProductsFile {
  $schema: string
  brand_slug: string
  products: ProductJson[]
}

// ============================================================================
// CODE GENERATION
// ============================================================================

// Mapping from old codes to new sequential codes
const codeMapping: Map<string, string> = new Map()

// Pad number to 2 digits
function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

// Generate sequential code based on parent code and order
function generateCode(parentCode: string | null, order: number): string {
  if (!parentCode) {
    return pad(order)
  }
  return `${parentCode}.${pad(order)}`
}

// ============================================================================
// PROCESS CATEGORIES
// ============================================================================

function processCategories(): void {
  console.log('\n📂 Processing categories.json...')

  const filePath = join(DATA_DIR, 'categories.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: CategoriesFile = JSON.parse(content)

  let totalProcessed = 0

  function processCategory(
    cat: CategoryJson,
    parentCode: string | null,
    orderInParent: number
  ): void {
    const oldSlug = cat.slug
    const newCode = generateCode(parentCode, orderInParent)

    // Store mapping
    codeMapping.set(oldSlug, newCode)
    totalProcessed++

    // Update the category
    cat.slug = newCode
    if (parentCode) {
      cat.parent_slug = parentCode
    }

    console.log(`  ${oldSlug.padEnd(12)} → ${newCode.padEnd(14)} (L${cat.level}) ${cat.name}`)

    // Process subcategories
    if (cat.subcategories && cat.subcategories.length > 0) {
      // Sort by display_order to ensure consistent ordering
      const sorted = [...cat.subcategories].sort((a, b) => a.display_order - b.display_order)

      sorted.forEach((subcat, idx) => {
        processCategory(subcat, newCode, idx + 1)
      })

      // Update the array with sorted order
      cat.subcategories = sorted
    }
  }

  // Sort level 1 categories by display_order
  const sortedCategories = [...data.categories].sort((a, b) => a.display_order - b.display_order)

  // Process each level 1 category
  sortedCategories.forEach((category, idx) => {
    processCategory(category, null, idx + 1)
  })

  // Update the categories array with sorted order
  data.categories = sortedCategories

  // Write back
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`\n  ✅ Processed ${totalProcessed} categories`)
}

// ============================================================================
// PROCESS PRODUCTS
// ============================================================================

function processProducts(): void {
  console.log('\n🆕 Updating product files...')

  const files = readdirSync(PRODUCTS_DIR).filter(
    (f) => f.startsWith('products-') && f.endsWith('.json')
  )

  let totalUpdated = 0
  let filesUpdated = 0

  for (const file of files) {
    const filePath = join(PRODUCTS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    const data: ProductsFile = JSON.parse(content)

    let fileUpdated = 0

    for (const product of data.products) {
      const oldSlug = product.category_slug
      const newCode = codeMapping.get(oldSlug)

      if (newCode && newCode !== oldSlug) {
        product.category_slug = newCode
        fileUpdated++
      } else if (!newCode) {
        console.log(`  ⚠️  Unknown category: ${oldSlug} in ${file}`)
      }
    }

    if (fileUpdated > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      filesUpdated++
      totalUpdated += fileUpdated
    }
  }

  console.log(`\n  ✅ Updated ${totalUpdated} products in ${filesUpdated} files`)
}

// ============================================================================
// GENERATE CODE REFERENCE
// ============================================================================

function generateCodeReference(): void {
  console.log('\n📋 Category Code Reference:\n')
  console.log('Code'.padEnd(14) + ' | Level | Name')
  console.log('-'.repeat(50))

  // Sort by code for nice output
  const sorted = [...codeMapping.entries()].sort((a, b) => {
    // Sort by new code numerically
    const aParts = a[1].split('.').map(Number)
    const bParts = b[1].split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      if (aVal !== bVal) return aVal - bVal
    }
    return 0
  })

  // Read categories to get names
  const filePath = join(DATA_DIR, 'categories.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: CategoriesFile = JSON.parse(content)

  // Build code to name map
  const codeToName: Map<string, string> = new Map()

  function extractNames(cat: CategoryJson): void {
    codeToName.set(cat.slug, cat.name)
    if (cat.subcategories) {
      cat.subcategories.forEach(extractNames)
    }
  }

  data.categories.forEach(extractNames)

  // Print reference
  for (const [_, newCode] of sorted) {
    const level = newCode.split('.').length
    const indent = '  '.repeat(level - 1)
    const name = codeToName.get(newCode) || '?'
    console.log(`${newCode.padEnd(14)} | L${level}    | ${indent}${name}`)
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔢 SEQUENTIAL CATEGORY CODE MIGRATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nFormat: 01 → 01.01 → 01.01.01 → 01.01.01.01 → 01.01.01.01.01')
  console.log('Supports up to 5 levels of hierarchy\n')

  processCategories()
  processProducts()
  generateCodeReference()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ MIGRATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nNext: Run `npx tsx scripts/gsheets/index.ts` to regenerate sheets')
}

main()
