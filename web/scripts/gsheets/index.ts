/**
 * Google Sheets Inventory Template Generator
 * Main orchestrator - completely rebuilds the template from scratch
 *
 * Usage:
 *   npx tsx scripts/gsheets/index.ts
 *
 * Environment variables:
 *   GSHEET_ID - Override default spreadsheet ID
 *
 * This script:
 *   1. Completely clears the spreadsheet (removes all previous formatting/data)
 *   2. Creates all sheets with proper structure
 *   3. Applies professional formatting
 *   4. Adds data validations (dropdowns)
 *   5. Populates with sample data
 */

import { getGoogleSheetsClient, getSheetIds } from './auth'
import { buildStructure } from './structure'
import { applyFormatting } from './formatting'
import { applyValidations } from './validations'
import { addSampleData } from './sample-data'
import { SPREADSHEET_ID, SHEETS } from './config'

async function main(): Promise<void> {
  const startTime = Date.now()

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏥 VETERINARY INVENTORY TEMPLATE GENERATOR')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(`📄 Spreadsheet ID: ${SPREADSHEET_ID}`)
  console.log('')

  try {
    // Test connection
    await getGoogleSheetsClient()
    console.log('✅ Connected to Google Sheets API')

    // Step 1: Build structure (clear + create sheets)
    const sheetMap = await buildStructure(SPREADSHEET_ID)

    // Step 2: Apply formatting
    await applyFormatting(SPREADSHEET_ID, sheetMap)

    // Step 3: Apply validations
    await applyValidations(SPREADSHEET_ID, sheetMap)

    // Step 4: Add sample data
    await addSampleData(SPREADSHEET_ID)

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ TEMPLATE GENERATION COMPLETE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('📋 SHEETS CREATED:')
    for (const sheet of SHEETS) {
      console.log(`   ${sheet.name}`)
    }
    console.log('')
    console.log('✨ FEATURES:')
    console.log('   • Professional header colors per sheet')
    console.log('   • Alternating row backgrounds')
    console.log('   • Frozen header rows')
    console.log('   • Dropdown validations for common fields')
    console.log('   • Number formatting for prices/quantities')
    console.log('   • Date formatting for dates')
    console.log('   • Conditional formatting for stock operations')
    console.log('   • Visual category tree structure')
    console.log('   • Sample data for reference')
    console.log('')
    console.log(`⏱️  Completed in ${elapsed}s`)
    console.log('')
    console.log(`🔗 View: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`)
    console.log('')
  } catch (error) {
    console.error('')
    console.error('❌ ERROR:', error instanceof Error ? error.message : error)
    console.error('')
    process.exit(1)
  }
}

// Export for programmatic use
export { buildStructure, applyFormatting, applyValidations, addSampleData }
export * from './config'
export * from './auth'

// Run if executed directly
main().catch(console.error)
