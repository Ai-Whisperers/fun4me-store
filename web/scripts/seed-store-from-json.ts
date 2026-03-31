import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Helper to slugify text
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

// Helper to extract brand from description
// "Mordillo de la marca Nerf Dog. Excelente..." -> "Nerf Dog"
function extractBrand(description: string): string {
  const match = description.match(/marca\s+([^.]+)(\.|$)/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return 'Generico'
}

async function main() {
  console.log('Seeding store from JSON...')

  const databaseUrl = process.env.DATABASE_URL
  const dbPassword = process.env.DB_PASSWORD
  const dbHost = process.env.DB_HOST || 'db.okddppczckbjdotrxiev.supabase.co'
  const dbUser = process.env.DB_USER || 'postgres'
  const dbName = process.env.DB_NAME || 'postgres'

  const client = dbPassword
    ? new Client({
        host: dbHost,
        port: 5432,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('Connected to DB')

    // Read JSON
    const jsonPath = path.resolve(__dirname, '../.content_data/terrapet/store/products.json')
    const rawData = fs.readFileSync(jsonPath, 'utf-8')
    const products = JSON.parse(rawData)

    console.log(`Found ${products.length} products in JSON.`)

    // Cache for IDs to avoid excessive SELECTs
    const categoryCache = new Map<string, string>() // slug -> id
    const brandCache = new Map<string, string>() // slug -> id

    for (const p of products) {
      // 1. Handle Category
      const catName = p.category || 'Sin Categoría'
      const catSlug = slugify(catName)
      let catId = categoryCache.get(catSlug)

      if (!catId) {
        // Try selecting
        const catRes = await client.query(
          "SELECT id FROM store_categories WHERE slug = $1 AND tenant_id = 'terrapet'",
          [catSlug]
        )
        if (catRes.rows.length > 0) {
          catId = catRes.rows[0].id
        } else {
          // Insert
          const insertRes = await client.query(
            `
            INSERT INTO store_categories (tenant_id, name, slug, is_active)
            VALUES ('terrapet', $1, $2, true)
            RETURNING id
          `,
            [catName, catSlug]
          )
          catId = insertRes.rows[0].id
          console.log(`Created Category: ${catName}`)
        }
        categoryCache.set(catSlug, catId!)
      }

      // 2. Handle Brand
      const brandName = extractBrand(p.description || '')
      const brandSlug = slugify(brandName)
      let brandId = brandCache.get(brandSlug)

      if (!brandId) {
        const brandRes = await client.query(
          "SELECT id FROM store_brands WHERE slug = $1 AND tenant_id = 'terrapet'",
          [brandSlug]
        )
        if (brandRes.rows.length > 0) {
          brandId = brandRes.rows[0].id
        } else {
          const insertRes = await client.query(
            `
            INSERT INTO store_brands (tenant_id, name, slug, is_active)
            VALUES ('terrapet', $1, $2, true)
            RETURNING id
          `,
            [brandName, brandSlug]
          )
          brandId = insertRes.rows[0].id
          console.log(`Created Brand: ${brandName}`)
        }
        brandCache.set(brandSlug, brandId!)
      }

      // 3. Upsert Product
      // Using SKU as unique identifier (assuming p.id from JSON is unique enough or we use it as SKU)
      const sku = p.id

      // Determine species from name/description
      const targetSpecies = []
      const lowerText = (p.name + ' ' + p.description).toLowerCase()
      if (lowerText.includes('perro')) targetSpecies.push('perro')
      if (lowerText.includes('gato')) targetSpecies.push('gato')

      const prodRes = await client.query(
        `
        INSERT INTO store_products (
            tenant_id, sku, name, description, short_description, 
            base_price, image_url, images, target_species, 
            category_id, brand_id, is_active
        )
        VALUES (
            'terrapet', $1, $2, $3, $4, 
            $5, $6, $7, $8, 
            $9, $10, true
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            name = EXCLUDED.name,
            base_price = EXCLUDED.base_price,
            updated_at = NOW()
        RETURNING id
      `,
        [
          sku,
          p.name,
          p.description,
          p.description ? p.description.substring(0, 150) : '',
          p.price,
          p.image,
          [p.image],
          targetSpecies,
          catId,
          brandId,
        ]
      )

      const productId = prodRes.rows[0].id

      // 4. Ensure Inventory
      await client.query(
        `
        INSERT INTO store_inventory (product_id, tenant_id, stock_quantity, min_stock_level)
        VALUES ($1, 'terrapet', 100, 5)
        ON CONFLICT (product_id) DO NOTHING
      `,
        [productId]
      )

      // 5. Ensure Assignment
      await client.query(
        `
        INSERT INTO clinic_product_assignments (
            tenant_id, catalog_product_id, sale_price, min_stock_level, is_active
        )
        VALUES ('terrapet', $1, $2, 5, true)
        ON CONFLICT (tenant_id, catalog_product_id) DO NOTHING
      `,
        [productId, p.price]
      )

      // process.stdout.write('.');
    }

    console.log('\nSeeding completed successfully!')
  } catch (err) {
    console.error('Error seeding store:', err)
  } finally {
    await client.end()
  }
}

main()
