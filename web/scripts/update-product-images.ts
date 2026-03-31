/**
 * Update Product Images Script
 *
 * This script updates the image_url and images columns for existing products
 * in the store_products table based on the seed JSON files.
 *
 * Usage: npx tsx scripts/update-product-images.ts [--dry-run] [--verbose]
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ProductJson {
  sku: string
  image_url?: string
  images?: string[]
  variants?: Array<{
    sku_suffix?: string
    image_url?: string
    images?: string[]
  }>
}

interface ProductFile {
  brand_slug: string
  products: ProductJson[]
}

interface UpdateResult {
  sku: string
  status: 'updated' | 'skipped' | 'not_found' | 'error'
  message?: string
}

async function loadProductFiles(): Promise<ProductJson[]> {
  const productsDir = path.resolve(process.cwd(), 'db/seeds/data/03-store/products')
  const allProducts: ProductJson[] = []

  try {
    const files = await fs.readdir(productsDir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    for (const file of jsonFiles) {
      const filePath = path.join(productsDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const json = JSON.parse(content) as ProductFile

      if (json.products) {
        for (const product of json.products) {
          // If product has variants, expand them
          if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
              const variantSku = variant.sku_suffix
                ? `${product.sku}${variant.sku_suffix}`
                : product.sku

              allProducts.push({
                sku: variantSku,
                image_url: variant.image_url || product.image_url,
                images: variant.images || product.images,
              })
            }
          } else {
            allProducts.push({
              sku: product.sku,
              image_url: product.image_url,
              images: product.images,
            })
          }
        }
      }
    }
  } catch (e) {
    console.error('Error loading product files:', e)
    throw e
  }

  return allProducts
}

async function updateProductImages(
  dryRun: boolean = false,
  verbose: boolean = false
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const client = createClient(supabaseUrl, supabaseServiceKey)

  console.log('Loading product files...')
  const products = await loadProductFiles()

  // Filter only products that have images defined
  const productsWithImages = products.filter(
    (p) => p.image_url || (p.images && p.images.length > 0)
  )

  console.log(
    `Found ${products.length} total products, ${productsWithImages.length} with images`
  )

  if (dryRun) {
    console.log('\n[DRY RUN MODE - No changes will be made]\n')
  }

  const results: UpdateResult[] = []
  let updated = 0
  let skipped = 0
  let notFound = 0
  let errors = 0

  // Process in batches of 50
  const batchSize = 50
  for (let i = 0; i < productsWithImages.length; i += batchSize) {
    const batch = productsWithImages.slice(i, i + batchSize)
    const skus = batch.map((p) => p.sku)

    // Get existing products
    const { data: existingProducts, error: fetchError } = await client
      .from('store_products')
      .select('id, sku, image_url, images')
      .in('sku', skus)

    if (fetchError) {
      console.error(`Error fetching batch: ${fetchError.message}`)
      batch.forEach((p) =>
        results.push({ sku: p.sku, status: 'error', message: fetchError.message })
      )
      errors += batch.length
      continue
    }

    const productMap = new Map(existingProducts?.map((p) => [p.sku, p]) || [])

    // Update each product
    for (const product of batch) {
      const existing = productMap.get(product.sku)

      if (!existing) {
        if (verbose) {
          console.log(`  Not found: ${product.sku}`)
        }
        results.push({ sku: product.sku, status: 'not_found' })
        notFound++
        continue
      }

      // Check if update is needed
      const needsUpdate =
        (product.image_url && existing.image_url !== product.image_url) ||
        (product.images &&
          JSON.stringify(existing.images) !== JSON.stringify(product.images))

      if (!needsUpdate) {
        if (verbose) {
          console.log(`  Skipped (no change): ${product.sku}`)
        }
        results.push({ sku: product.sku, status: 'skipped' })
        skipped++
        continue
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {}
      if (product.image_url) updateData.image_url = product.image_url
      if (product.images) updateData.images = product.images

      if (dryRun) {
        console.log(`  Would update: ${product.sku}`)
        if (verbose) {
          console.log(`    image_url: ${product.image_url}`)
          console.log(`    images: ${product.images?.length || 0} images`)
        }
        results.push({ sku: product.sku, status: 'updated', message: 'dry-run' })
        updated++
        continue
      }

      // Perform update
      const { error: updateError } = await client
        .from('store_products')
        .update(updateData)
        .eq('id', existing.id)

      if (updateError) {
        console.error(`  Error updating ${product.sku}: ${updateError.message}`)
        results.push({ sku: product.sku, status: 'error', message: updateError.message })
        errors++
        continue
      }

      if (verbose) {
        console.log(`  Updated: ${product.sku}`)
      }
      results.push({ sku: product.sku, status: 'updated' })
      updated++
    }

    // Progress indicator
    const progress = Math.min(i + batchSize, productsWithImages.length)
    console.log(`Progress: ${progress}/${productsWithImages.length}`)
  }

  // Summary
  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (no change): ${skipped}`)
  console.log(`Not found in DB: ${notFound}`)
  console.log(`Errors: ${errors}`)

  if (dryRun) {
    console.log('\n[DRY RUN - Run without --dry-run to apply changes]')
  }
}

// Parse CLI arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

updateProductImages(dryRun, verbose)
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Script failed:', err)
    process.exit(1)
  })
