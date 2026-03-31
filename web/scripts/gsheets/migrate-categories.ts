/**
 * Category Migration Script
 * Updates categories.json and all product files with new hierarchical codes
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { LEVEL1_CODES, LEVEL2_CODES, SLUG_TO_CODE } from './category-migration'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../../db/99_seed/data')
const PRODUCTS_DIR = join(DATA_DIR, 'products')

// ============================================================================
// UPDATE CATEGORIES.JSON
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

function migrateCategories(): void {
  console.log('\n📂 Migrating categories.json...')

  const filePath = join(DATA_DIR, 'categories.json')
  const content = readFileSync(filePath, 'utf-8')
  const data: CategoriesFile = JSON.parse(content)

  let migratedCount = 0

  function processCategory(cat: CategoryJson, parentCode?: string): void {
    const oldSlug = cat.slug
    const newCode = SLUG_TO_CODE[oldSlug]

    if (newCode && newCode !== oldSlug) {
      cat.slug = newCode
      migratedCount++
      console.log(`  ${oldSlug} → ${newCode}`)
    }

    // Update parent reference if it exists
    if (cat.parent_slug && SLUG_TO_CODE[cat.parent_slug]) {
      cat.parent_slug = SLUG_TO_CODE[cat.parent_slug]
    }

    // Process subcategories
    if (cat.subcategories) {
      for (const subcat of cat.subcategories) {
        processCategory(subcat, newCode || oldSlug)
      }
    }
  }

  for (const category of data.categories) {
    processCategory(category)
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`  ✅ Migrated ${migratedCount} categories`)
}

// ============================================================================
// UPDATE PRODUCT FILES
// ============================================================================

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

function migrateProducts(): void {
  console.log('\n🆕 Migrating product files...')

  const files = readdirSync(PRODUCTS_DIR).filter(
    (f) => f.startsWith('products-') && f.endsWith('.json')
  )

  let totalMigrated = 0

  for (const file of files) {
    const filePath = join(PRODUCTS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    const data: ProductsFile = JSON.parse(content)

    let fileMigrated = 0

    for (const product of data.products) {
      const oldSlug = product.category_slug
      const newCode = SLUG_TO_CODE[oldSlug]

      if (newCode && newCode !== oldSlug) {
        product.category_slug = newCode
        fileMigrated++
      }
    }

    if (fileMigrated > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      console.log(`  ${file}: ${fileMigrated} products migrated`)
      totalMigrated += fileMigrated
    }
  }

  console.log(`  ✅ Total products migrated: ${totalMigrated}`)
}

// ============================================================================
// MAIN
// ============================================================================

function main(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 CATEGORY CODE MIGRATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Level 1 codes: ${Object.keys(LEVEL1_CODES).length}`)
  console.log(`Level 2 codes: ${Object.keys(LEVEL2_CODES).length}`)

  migrateCategories()
  migrateProducts()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ MIGRATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nNext step: Run `npx tsx scripts/gsheets/index.ts` to regenerate sheets')
}

main()
