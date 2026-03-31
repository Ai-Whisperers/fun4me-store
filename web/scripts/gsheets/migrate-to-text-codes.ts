/**
 * Text-Based Hierarchical Category Code Migration
 *
 * Creates codes based on category text with parent hierarchy
 * Adds numbers only if there are duplicates at the same level
 *
 * Format examples:
 * - Level 1: ALP (Alimento Perros), ALG (Alimento Gatos)
 * - Level 2: ALP-SEC (Seco under Alimento Perros), ALP-HUM (Húmedo)
 * - Level 3: ALP-SEC-PRM (Premium under Seco)
 * - If duplicates: ALP-SEC-01, ALP-SEC-02
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
// CODE GENERATION HELPERS
// ============================================================================

// Mapping from old codes to new text-based codes
const codeMapping: Map<string, string> = new Map()

// Track used codes at each parent level to detect duplicates
const usedCodes: Map<string, Set<string>> = new Map()

/**
 * Generate a 3-letter abbreviation from a name
 * Takes first letters of words, or first 3 chars if single word
 */
function abbreviate(name: string): string {
  // Remove accents and special chars
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toUpperCase()
    .trim()

  const words = clean.split(/\s+/).filter((w) => w.length > 0)

  if (words.length === 1) {
    // Single word: take first 3 characters
    return words[0].substring(0, 3)
  } else if (words.length === 2) {
    // Two words: first 2 chars of first + first char of second, or variations
    const w1 = words[0]
    const w2 = words[1]

    // Try to make a 3-letter code
    if (w1.length >= 2 && w2.length >= 1) {
      return w1.substring(0, 2) + w2.substring(0, 1)
    }
    return (w1 + w2).substring(0, 3)
  } else {
    // 3+ words: first letter of each (up to 3)
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
  }
}

/**
 * Generate a unique code within a parent context
 */
function generateUniqueCode(parentCode: string | null, name: string, level: number): string {
  const abbr = abbreviate(name)
  const baseCode = parentCode ? `${parentCode}-${abbr}` : abbr

  // Get or create the set of used codes for this parent
  const parentKey = parentCode || '__ROOT__'
  if (!usedCodes.has(parentKey)) {
    usedCodes.set(parentKey, new Set())
  }
  const used = usedCodes.get(parentKey)!

  // Check if this code is already used
  if (!used.has(baseCode)) {
    used.add(baseCode)
    return baseCode
  }

  // Code collision - add sequential number
  let counter = 1
  let numberedCode = `${baseCode}-${counter.toString().padStart(2, '0')}`
  while (used.has(numberedCode)) {
    counter++
    numberedCode = `${baseCode}-${counter.toString().padStart(2, '0')}`
  }
  used.add(numberedCode)
  return numberedCode
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

  function processCategory(cat: CategoryJson, parentCode: string | null): string {
    const oldSlug = cat.slug
    const newCode = generateUniqueCode(parentCode, cat.name, cat.level)

    // Store mapping
    codeMapping.set(oldSlug, newCode)
    totalProcessed++

    // Update the category
    cat.slug = newCode
    if (parentCode) {
      cat.parent_slug = parentCode
    } else {
      cat.parent_slug = null
    }

    const indent = '  '.repeat(cat.level)
    console.log(
      `${indent}${oldSlug.padEnd(20 - cat.level * 2)} → ${newCode.padEnd(15)} ${cat.name}`
    )

    // Process subcategories
    if (cat.subcategories && cat.subcategories.length > 0) {
      // Sort by display_order
      cat.subcategories.sort((a, b) => a.display_order - b.display_order)

      for (const subcat of cat.subcategories) {
        processCategory(subcat, newCode)
      }
    }

    return newCode
  }

  // Sort level 1 categories by display_order
  data.categories.sort((a, b) => a.display_order - b.display_order)

  // Process each level 1 category
  for (const category of data.categories) {
    processCategory(category, null)
  }

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
  const unknownCategories: Set<string> = new Set()

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
        unknownCategories.add(oldSlug)
      }
    }

    if (fileUpdated > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      filesUpdated++
      totalUpdated += fileUpdated
    }
  }

  if (unknownCategories.size > 0) {
    console.log('\n  ⚠️  Unknown categories found:')
    unknownCategories.forEach((c) => console.log(`      - ${c}`))
  }

  console.log(`\n  ✅ Updated ${totalUpdated} products in ${filesUpdated} files`)
}

// ============================================================================
// GENERATE CODE REFERENCE TABLE
// ============================================================================

function generateReferenceTable(): void {
  console.log('\n\n📋 CATEGORY CODE REFERENCE')
  console.log('═'.repeat(70))

  // Read the updated categories
  const filePath = join(DATA_DIR, 'categories.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: CategoriesFile = JSON.parse(content)

  console.log('\nCode           │ Lvl │ Name')
  console.log('───────────────┼─────┼' + '─'.repeat(50))

  function printCategory(cat: CategoryJson): void {
    const indent = '  '.repeat(cat.level - 1)
    const codeDisplay = cat.slug.padEnd(14)
    console.log(`${codeDisplay} │ L${cat.level}  │ ${indent}${cat.name}`)

    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        printCategory(sub)
      }
    }
  }

  for (const cat of data.categories) {
    printCategory(cat)
  }

  console.log('═'.repeat(70))
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 TEXT-BASED HIERARCHICAL CATEGORY CODES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nFormat: PARENT-CHILD (with numbers if duplicates)')
  console.log('Example: ALP → ALP-SEC → ALP-SEC-PRM')
  console.log('Supports up to 5 levels\n')

  processCategories()
  processProducts()
  generateReferenceTable()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ MIGRATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nNext: Run `npx tsx scripts/gsheets/index.ts` to regenerate sheets')
}

main()
