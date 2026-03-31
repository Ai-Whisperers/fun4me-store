/**
 * Product Image Sync Script
 *
 * Downloads product images from URLs and uploads them to Supabase Storage.
 * Updates seed JSON files with the new Supabase URLs.
 *
 * Usage:
 *   npx tsx scripts/sync-product-images.ts [--dry-run] [--verbose] [--file <filename>]
 *
 * The script reads image URLs from a mapping file (image-urls.json) and:
 * 1. Downloads each image
 * 2. Uploads to Supabase Storage (store-products bucket)
 * 3. Updates the corresponding seed JSON file
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import dotenv from 'dotenv'
import https from 'https'
import http from 'http'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ImageMapping {
  sku: string
  name: string
  sourceFile: string
  imageUrl: string
  images?: string[]
}

interface ProgressState {
  processed: string[]
  failed: string[]
  lastUpdated: string
}

const PRODUCTS_DIR = 'db/seeds/data/03-store/products'
const MAPPING_FILE = 'scripts/image-urls.json'
const PROGRESS_FILE = 'scripts/.image-sync-progress.json'
const TENANT_ID = 'terrapet'

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
      timeout: 30000,
    }, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    })

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error(`Timeout: ${url}`))
    })
  })
}

function getFileExtension(url: string, contentType?: string): string {
  // Try to get from content type
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('webp')) return 'webp'
    if (contentType.includes('gif')) return 'gif'
  }

  // Try to get from URL
  const urlPath = new URL(url).pathname
  const ext = path.extname(urlPath).toLowerCase().replace('.', '')
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext
  }

  return 'jpg' // Default
}

async function uploadToSupabase(
  client: ReturnType<typeof createClient>,
  imageBuffer: Buffer,
  sku: string,
  extension: string
): Promise<string> {
  const fileName = `${TENANT_ID}/${sku.toLowerCase()}.${extension}`

  const { error } = await client.storage
    .from('store-products')
    .upload(fileName, imageBuffer, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = client.storage
    .from('store-products')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

async function loadProgress(): Promise<ProgressState> {
  try {
    const content = await fs.readFile(PROGRESS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (_error: unknown) {
    return { processed: [], failed: [], lastUpdated: new Date().toISOString() }
  }
}

async function saveProgress(progress: ProgressState): Promise<void> {
  progress.lastUpdated = new Date().toISOString()
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function loadImageMappings(): Promise<ImageMapping[]> {
  try {
    const content = await fs.readFile(MAPPING_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (_error: unknown) {
    console.log('No image-urls.json found. Creating template...')
    return []
  }
}

async function updateSeedFile(
  filePath: string,
  sku: string,
  imageUrl: string,
  images: string[]
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8')
  const json = JSON.parse(content)

  if (!json.products) return

  let updated = false
  for (const product of json.products) {
    if (product.sku === sku) {
      product.image_url = imageUrl
      product.images = images
      updated = true
      break
    }

    // Check variants
    if (product.variants) {
      for (const variant of product.variants) {
        const variantSku = variant.sku_suffix
          ? `${product.sku}${variant.sku_suffix}`
          : product.sku

        if (variantSku === sku) {
          // For variants, update at product level if no variant-specific images
          if (!variant.image_url) {
            product.image_url = imageUrl
            product.images = images
          } else {
            variant.image_url = imageUrl
            variant.images = images
          }
          updated = true
          break
        }
      }
    }
  }

  if (updated) {
    await fs.writeFile(filePath, JSON.stringify(json, null, 2) + '\n')
  }
}

async function syncImages(
  dryRun: boolean = false,
  verbose: boolean = false,
  filterFile?: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!dryRun && (!supabaseUrl || !supabaseServiceKey)) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('Run with --dry-run to test without uploading')
    process.exit(1)
  }

  const client = dryRun
    ? null
    : createClient(supabaseUrl!, supabaseServiceKey!)

  console.log('Loading image mappings...')
  const mappings = await loadImageMappings()

  if (mappings.length === 0) {
    console.log('\nNo mappings found. Create scripts/image-urls.json with format:')
    console.log(`[
  {
    "sku": "BELCAN-ADULT-25KG",
    "name": "BelCan Adult 25kg",
    "sourceFile": "products-belcan.json",
    "imageUrl": "https://example.com/image.jpg"
  }
]`)
    return
  }

  const progress = await loadProgress()
  const filteredMappings = filterFile
    ? mappings.filter((m) => m.sourceFile === filterFile)
    : mappings

  console.log(`Found ${filteredMappings.length} mappings to process`)
  if (dryRun) console.log('[DRY RUN MODE]\n')

  let processed = 0
  let failed = 0
  let skipped = 0

  for (const mapping of filteredMappings) {
    const { sku, name, sourceFile, imageUrl, images: extraImages } = mapping

    // Skip already processed
    if (progress.processed.includes(sku)) {
      if (verbose) console.log(`  Skip (done): ${sku}`)
      skipped++
      continue
    }

    console.log(`Processing: ${sku} - ${name}`)

    try {
      // Download image
      if (verbose) console.log(`  Downloading: ${imageUrl}`)
      const imageBuffer = await downloadImage(imageUrl)
      const extension = getFileExtension(imageUrl)

      if (verbose) console.log(`  Downloaded ${imageBuffer.length} bytes`)

      let publicUrl: string

      if (dryRun) {
        publicUrl = `https://supabase.co/storage/store-products/${TENANT_ID}/${sku.toLowerCase()}.${extension}`
        console.log(`  Would upload to: ${publicUrl}`)
      } else {
        // Upload to Supabase
        publicUrl = await uploadToSupabase(client!, imageBuffer, sku, extension)
        if (verbose) console.log(`  Uploaded: ${publicUrl}`)
      }

      // Create images array (main + extras)
      const allImages = [publicUrl]
      if (extraImages && extraImages.length > 0) {
        // Download and upload extra images
        for (let i = 0; i < extraImages.length && i < 4; i++) {
          try {
            const extraBuffer = await downloadImage(extraImages[i])
            const extraExt = getFileExtension(extraImages[i])

            if (dryRun) {
              allImages.push(`https://supabase.co/storage/store-products/${TENANT_ID}/${sku.toLowerCase()}_${i + 1}.${extraExt}`)
            } else {
              const extraUrl = await uploadToSupabase(
                client!,
                extraBuffer,
                `${sku}_${i + 1}`,
                extraExt
              )
              allImages.push(extraUrl)
            }
          } catch (e) {
            if (verbose) console.log(`  Warning: Failed to download extra image ${i + 1}`)
          }
        }
      }

      // Update seed file
      const seedFilePath = path.join(PRODUCTS_DIR, sourceFile)
      if (!dryRun) {
        await updateSeedFile(seedFilePath, sku, publicUrl, allImages)
        if (verbose) console.log(`  Updated: ${sourceFile}`)
      } else {
        console.log(`  Would update: ${sourceFile}`)
      }

      progress.processed.push(sku)
      processed++

      // Rate limiting - wait 500ms between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : error}`)
      progress.failed.push(sku)
      failed++
    }

    // Save progress periodically
    if ((processed + failed) % 10 === 0) {
      await saveProgress(progress)
    }
  }

  // Final progress save
  await saveProgress(progress)

  console.log('\n--- Summary ---')
  console.log(`Processed: ${processed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Skipped: ${skipped}`)

  if (failed > 0) {
    console.log('\nFailed SKUs:')
    progress.failed.forEach((sku) => console.log(`  - ${sku}`))
  }

  if (dryRun) {
    console.log('\n[DRY RUN - No actual uploads or file changes made]')
  }
}

// Parse CLI arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')
const fileIndex = args.indexOf('--file')
const filterFile = fileIndex !== -1 ? args[fileIndex + 1] : undefined

syncImages(dryRun, verbose, filterFile)
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Script failed:', err)
    process.exit(1)
  })
