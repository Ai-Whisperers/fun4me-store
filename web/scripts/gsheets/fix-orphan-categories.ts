/**
 * Fix Orphan Category References in Products
 * Maps unknown category slugs to the correct existing category codes
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../../db/99_seed/data')
const PRODUCTS_DIR = join(DATA_DIR, 'products')

// Mapping from orphan/old slugs to correct new codes
const ORPHAN_MAPPING: Record<string, string> = {
  // Anestesia subcategories → AYS (Anestesia y Sedación)
  'maquinas-anestesia': 'AYS-EDA', // → Equipos de Anestesia
  'monitores-anestesia': 'AYS-EDA', // → Equipos de Anestesia
  'circuitos-anestesia': 'AYS-EDA', // → Equipos de Anestesia

  // Consumibles → COM (Consumibles Médicos)
  cateteres: 'COM-CYS', // → Catéteres y Sondas
  'tubos-recoleccion': 'COM-TDM', // → Tubos de Muestras
  guantes: 'COM-GYM', // → Guantes y Mascarillas
  'apositos-vendajes': 'COM-VYG', // → Vendajes y Gasas
  'ropa-desechable': 'COM-GYM', // → Guantes y Mascarillas (EPP)
  antisepticos: 'COM-VYG', // → Vendajes y Gasas (includes antiseptics)

  // Laboratorio → LAV (Laboratorio Veterinario)
  analizadores: 'LAV-HEM', // → Hematología (analyzers)
  'reactivos-laboratorio': 'LAV-BIO', // → Bioquímica

  // Farmacia → FAV (Farmacia Veterinaria)
  'analgesicos-aines': 'FAV-ANT-01', // → Antiinflamatorios
  'farmacos-especiales': 'FAV-DER', // → Dermatológicos (misc pharma)
  'dermatologicos-oticos': 'FAV-OYO', // → Oftálmicos y Óticos

  // Suplementos → SUP
  'suplementos-nutricionales': 'SUP-VIT', // → Vitaminas

  // Odontología → ODV
  odontologia: 'ODV-IND', // → Instrumental Dental

  // Instrumental Quirúrgico → INQ
  'suturas-absorbibles': 'INQ-PAY', // → Porta Agujas y Suturas
  'suturas-no-absorbibles': 'INQ-PAY', // → Porta Agujas y Suturas
  grapadoras: 'INQ-SEQ', // → Sets Quirúrgicos

  // Vacunas - different naming conventions
  'vacunas-caninas': 'VYB-VAP', // → Vacunas Perros
  'vacunas-felinas': 'VYB-VAG', // → Vacunas Gatos
}

interface ProductJson {
  sku: string
  name: string
  category_slug: string
  [key: string]: any
}

interface ProductsFile {
  $schema: string
  brand_slug: string
  products: ProductJson[]
}

function fixProducts(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 FIXING ORPHAN CATEGORY REFERENCES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const files = readdirSync(PRODUCTS_DIR).filter(
    (f) => f.startsWith('products-') && f.endsWith('.json')
  )

  let totalFixed = 0
  let filesModified = 0

  for (const file of files) {
    const filePath = join(PRODUCTS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    const data: ProductsFile = JSON.parse(content)

    let fileFixed = 0

    for (const product of data.products) {
      const oldSlug = product.category_slug
      const newCode = ORPHAN_MAPPING[oldSlug]

      if (newCode) {
        console.log(`  ${file}: ${oldSlug} → ${newCode} (${product.sku})`)
        product.category_slug = newCode
        fileFixed++
      }
    }

    if (fileFixed > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      filesModified++
      totalFixed += fileFixed
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Fixed ${totalFixed} products in ${filesModified} files`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

fixProducts()
