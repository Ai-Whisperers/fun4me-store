/**
 * Migrate Products to New Category Structure
 *
 * Maps old category codes to the new 4-group hierarchy:
 * - NUT: Nutrición
 * - ACC: Accesorios y Confort
 * - FAR: Farmacia (Venta Libre)
 * - CLI: Clínica (Uso Interno)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../../db/99_seed/data')
const PRODUCTS_DIR = join(DATA_DIR, 'products')

// ============================================================================
// MAPPING: Old codes → New codes
// ============================================================================

const CODE_MAPPING: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NUTRICIÓN (NUT)
  // ═══════════════════════════════════════════════════════════════════════════

  // Alimento Perros → NUT-CAN
  ALP: 'NUT-CAN',
  'ALP-ALS': 'NUT-CAN-SEC',
  'ALP-ALH': 'NUT-CAN-HUM',
  'ALP-DIV': 'NUT-CAN-PRE',
  'ALP-CAC': 'NUT-CAN-SEC', // Cachorros → Alimento Seco
  'ALP-SE7': 'NUT-CAN-SEC', // Senior → Alimento Seco

  // Alimento Gatos → NUT-FEL
  ALG: 'NUT-FEL',
  'ALG-ADU': 'NUT-FEL-SEC',
  'ALG-ALH': 'NUT-FEL-HUM',
  'ALG-DIV': 'NUT-FEL-PRE',
  'ALG-GAT': 'NUT-FEL-SEC', // Gatitos → Alimento Seco
  'ALG-CAS': 'NUT-FEL-SEC', // Castrados → Alimento Seco

  // Snacks → NUT-CAN-SNA / NUT-FEL-SNA
  SYP: 'NUT-CAN-SNA',
  'SYP-SNP': 'NUT-CAN-SNA',
  'SYP-SNG': 'NUT-FEL-SNA',
  'SYP-HUN': 'NUT-CAN-SNA', // Huesos naturales → Snacks perros
  'SYP-SND': 'NUT-CAN-SNA', // Snacks dentales → Snacks perros

  // Exóticos → NUT-EXO
  AVE: 'NUT-EXO-AVE',
  'AVE-ALI': 'NUT-EXO-AVE',
  PEC: 'NUT-EXO-PEC',
  'PEC-ALI': 'NUT-EXO-PEC',
  ROE: 'NUT-EXO-ROE',
  'ROE-ALI': 'NUT-EXO-ROE',

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESORIOS Y CONFORT (ACC)
  // ═══════════════════════════════════════════════════════════════════════════

  // Higiene → ACC-HIG
  HYC: 'ACC-HIG',
  'HYC-HIG': 'ACC-HIG-SHA',
  'HYC-SHA': 'ACC-HIG-SHA',
  'HYC-CUD': 'ACC-HIG-DEN',
  'HYC-OYO': 'ACC-HIG-OJO',
  'HYC-CYP': 'ACC-HIG-CEP',

  // Arena Sanitaria → ACC-HIG-ARE
  ARS: 'ACC-HIG-ARE',
  'ARS-AGL': 'ACC-HIG-ARE',
  'ARS-ABS': 'ACC-HIG-ARE',
  'ARS-SIL': 'ACC-HIG-ARE',
  'ARS-AYB': 'ACC-HIG-BAN',

  // Accesorios generales → ACC-PAS
  ACC: 'ACC-PAS',
  'ACC-CYC': 'ACC-PAS-COL',
  'ACC-CYB': 'ACC-COM-PER',
  'ACC-TRA': 'ACC-PAS-TRA',
  'ACC-ROP': 'ACC-PAS-ROP',
  'ACC-ACG': 'ACC-EXO-AVE', // Accesorios gatos genéricos
  'ACC-ACP': 'ACC-PAS-COL', // Accesorios perros → Collares
  'ACC-COG': 'ACC-COM-GAT',
  'ACC-COP': 'ACC-COM-PER',

  // Camas y Casas → ACC-DES
  CYC: 'ACC-DES',
  'CYC-CAP': 'ACC-DES-CAM',
  'CYC-CAG': 'ACC-DES-CAM',
  'CYC-RAS': 'ACC-DES-RAS',
  'CYC-RPG': 'ACC-DES-RAS',
  'CYC-CUE': 'ACC-DES-CUC',

  // Juguetes → ACC-JUG
  JUG: 'ACC-JUG',
  'JUG-JUP': 'ACC-JUG-PEL',
  'JUG-JUG': 'ACC-JUG-GAT',
  'JUG-REL': 'ACC-JUG-INT',
  'JUG-PEL': 'ACC-JUG-PEL',

  // Exóticos accesorios
  'AVE-JAU': 'ACC-EXO-AVE',
  'AVE-ACC': 'ACC-EXO-AVE',
  'PEC-ACU': 'ACC-EXO-PEC',
  'PEC-FYB': 'ACC-EXO-PEC',
  'PEC-DEC': 'ACC-EXO-PEC',
  'ROE-JAU': 'ACC-EXO-ROE',
  'ROE-ACC': 'ACC-EXO-ROE',
  'ROE-SUS': 'ACC-EXO-ROE',

  // ═══════════════════════════════════════════════════════════════════════════
  // FARMACIA VENTA LIBRE (FAR)
  // ═══════════════════════════════════════════════════════════════════════════

  // Antiparasitarios → FAR-ANT
  ANT: 'FAR-ANT',
  'ANT-ANP': 'FAR-ANT-EXT',
  'ANT-ANG': 'FAR-ANT-EXT',
  'ANT-COA': 'FAR-ANT-EXT',
  'ANT-DEI': 'FAR-ANT-INT',

  // Suplementos → FAR-SUP
  SUP: 'FAR-SUP',
  'SUP-VIT': 'FAR-SUP-VIT',
  'SUP-OYP': 'FAR-SUP-DER',
  'SUP-ART': 'FAR-SUP-ART',
  'SUP-PRO': 'FAR-SUP-DIG',

  // Farmacia Veterinaria → FAR-DER (productos de venta libre)
  FAV: 'FAR-DER',
  'FAV-ANT': 'CLI-FAR-ANB', // Antibióticos → Clínica
  'FAV-ANT-01': 'CLI-FAR-AIN', // Antiinflamatorios → Clínica
  'FAV-DER': 'FAR-DER-TOP',
  'FAV-OYO': 'FAR-DER-OTI',

  // ═══════════════════════════════════════════════════════════════════════════
  // CLÍNICA USO INTERNO (CLI)
  // ═══════════════════════════════════════════════════════════════════════════

  // Anestesia y Sedación → CLI-FAR-ANE
  AYS: 'CLI-FAR-ANE',
  'AYS-ANI': 'CLI-FAR-ANE',
  'AYS-ANI-01': 'CLI-FAR-ANE',
  'AYS-EDA': 'CLI-EQU-ANE', // Equipos de anestesia
  'AYS-TUE': 'CLI-INS-QUI', // Tubos endotraqueales → Quirúrgicos

  // Vacunas → CLI-FAR-VAC
  VYB: 'CLI-FAR-VAC',
  'VYB-VAP': 'CLI-FAR-VAC',
  'VYB-VAG': 'CLI-FAR-VAC',
  'VYB-OTE': 'CLI-FAR-VAC',

  // Consumibles Médicos → CLI-INS
  COM: 'CLI-INS',
  'COM-JYA': 'CLI-INS-AGU',
  'COM-CYS': 'CLI-INS-AGU',
  'COM-VYG': 'CLI-INS-VEN',
  'COM-GYM': 'CLI-INS-EPP',
  'COM-TDM': 'CLI-INS-LAB',

  // Instrumental Quirúrgico → CLI-EQU-INS
  INQ: 'CLI-EQU-INS',
  'INQ-BYT': 'CLI-EQU-INS',
  'INQ-PYC': 'CLI-EQU-INS',
  'INQ-PAY': 'CLI-INS-QUI', // Suturas → Insumos quirúrgicos
  'INQ-RYS': 'CLI-EQU-INS',
  'INQ-SEQ': 'CLI-EQU-INS',

  // Equipos Veterinarios → CLI-EQU
  EQV: 'CLI-EQU-DIA',
  'EQV-DIA': 'CLI-EQU-DIA',
  'EQV-MON': 'CLI-EQU-DIA',
  'EQV-TYB': 'CLI-EQU-DIA',
  'EQV-ILM': 'CLI-EQU-DIA',

  // Laboratorio → CLI-EQU-DIA / CLI-INS-LAB
  LAV: 'CLI-EQU-DIA',
  'LAV-TER': 'CLI-INS-LAB',
  'LAV-HEM': 'CLI-EQU-DIA',
  'LAV-BIO': 'CLI-INS-LAB',
  'LAV-MIC': 'CLI-EQU-DIA',
  'LAV-CEN': 'CLI-EQU-DIA',

  // Odontología → CLI-EQU-DEN
  ODV: 'CLI-EQU-DEN',
  'ODV-IND': 'CLI-EQU-DEN',
  'ODV-EQD': 'CLI-EQU-DEN',
  'ODV-PRO': 'CLI-EQU-DEN',

  // Fluidoterapia → CLI-FAR-FLU
  FLU: 'CLI-FAR-FLU',
  'FLU-SOI': 'CLI-FAR-FLU',
  'FLU-EDI': 'CLI-INS-AGU',
  'FLU-CAI': 'CLI-INS-AGU',

  // Mobiliario Clínico → CLI-EQU-MOB
  MOC: 'CLI-EQU-MOB',
  'MOC-MDE': 'CLI-EQU-MOB',
  'MOC-MDC': 'CLI-EQU-MOB',
  'MOC-JDH': 'CLI-EQU-MOB',
  'MOC-CDI': 'CLI-EQU-MOB',

  // Esterilización → CLI-EQU-EST
  EST: 'CLI-EQU-EST',
  'EST-AUT': 'CLI-EQU-EST',
  'EST-IND': 'CLI-EQU-EST',
  'EST-BYR': 'CLI-EQU-EST',

  // Uniformes → CLI-INS-EPP
  UYE: 'CLI-INS-EPP',
  'UYE-BYS': 'CLI-INS-EPP',
}

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// MIGRATION
// ============================================================================

function migrateProducts(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 MIGRATING PRODUCTS TO NEW CATEGORY STRUCTURE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nNew structure: NUT, ACC, FAR, CLI\n')

  const files = readdirSync(PRODUCTS_DIR).filter(
    (f) => f.startsWith('products-') && f.endsWith('.json')
  )

  let totalMigrated = 0
  let filesModified = 0
  const unknownCategories: Map<string, number> = new Map()

  for (const file of files) {
    const filePath = join(PRODUCTS_DIR, file)
    const content = readFileSync(filePath, 'utf-8')
    const data: ProductsFile = JSON.parse(content)

    let fileMigrated = 0

    for (const product of data.products) {
      const oldSlug = product.category_slug
      const newCode = CODE_MAPPING[oldSlug]

      if (newCode) {
        if (newCode !== oldSlug) {
          product.category_slug = newCode
          fileMigrated++
        }
      } else {
        // Track unknown categories
        unknownCategories.set(oldSlug, (unknownCategories.get(oldSlug) || 0) + 1)
      }
    }

    if (fileMigrated > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      filesModified++
      totalMigrated += fileMigrated
      console.log(`  ✅ ${file}: ${fileMigrated} products migrated`)
    }
  }

  if (unknownCategories.size > 0) {
    console.log('\n⚠️  Unknown categories (not mapped):')
    unknownCategories.forEach((count, cat) => {
      console.log(`    - ${cat}: ${count} products`)
    })
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Migrated ${totalMigrated} products in ${filesModified} files`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

// Run migration
migrateProducts()
