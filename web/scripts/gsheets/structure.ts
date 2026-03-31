/**
 * Google Sheets Structure Management
 * Handles complete clearing and sheet creation
 */

import { getGoogleSheetsClient, getSheetIds, batchUpdate, updateValues } from './auth'
import { SPREADSHEET_ID, SHEETS, COLORS } from './config'

/**
 * Completely clear the spreadsheet - removes all sheets, formatting, validations
 * Creates a temporary sheet, deletes all others, then recreates structure
 */
export async function clearSpreadsheet(spreadsheetId: string = SPREADSHEET_ID): Promise<void> {
  console.log('  🗑️  Clearing entire spreadsheet...')

  const sheets = await getGoogleSheetsClient()
  const sheetMap = await getSheetIds(spreadsheetId)
  const existingSheetIds = Object.values(sheetMap)

  if (existingSheetIds.length === 0) {
    return
  }

  const requests: any[] = []

  // Create a temporary sheet (we need at least one sheet to delete others)
  requests.push({
    addSheet: {
      properties: {
        title: '__TEMP__',
        index: 0,
      },
    },
  })

  await batchUpdate(spreadsheetId, requests)

  // Delete all original sheets
  const deleteRequests = existingSheetIds.map((sheetId) => ({
    deleteSheet: { sheetId },
  }))

  if (deleteRequests.length > 0) {
    await batchUpdate(spreadsheetId, deleteRequests)
  }

  // Temp sheet will be deleted later when real sheets are created
  console.log('  ✓ Spreadsheet cleared')
}

/**
 * Create all sheets with headers
 */
export async function createSheets(
  spreadsheetId: string = SPREADSHEET_ID
): Promise<Record<string, number>> {
  console.log('  📝 Creating sheets...')

  const sheets = await getGoogleSheetsClient()

  // First clear everything
  await clearSpreadsheet(spreadsheetId)

  // Create all sheets
  const addRequests = SHEETS.map((sheet, index) => ({
    addSheet: {
      properties: {
        title: sheet.name,
        index: index + 1, // After temp sheet
        gridProperties: {
          rowCount: sheet.dataRows + 10,
          columnCount: sheet.columns.length + 5,
        },
      },
    },
  }))

  await batchUpdate(spreadsheetId, addRequests)

  // Get new sheet IDs
  const sheetMap = await getSheetIds(spreadsheetId)

  // Delete temp sheet now that we have real sheets
  if (sheetMap['__TEMP__'] !== undefined) {
    await batchUpdate(spreadsheetId, [
      {
        deleteSheet: { sheetId: sheetMap['__TEMP__'] },
      },
    ])
    delete sheetMap['__TEMP__']
  }

  // Add headers to each sheet
  for (const sheet of SHEETS) {
    console.log(`    → ${sheet.name}`)
    await updateValues(spreadsheetId, `'${sheet.name}'!A1`, [sheet.columns])
  }

  return sheetMap
}

/**
 * Build the complete structure (clear + create + basic setup)
 */
export async function buildStructure(
  spreadsheetId: string = SPREADSHEET_ID
): Promise<Record<string, number>> {
  console.log('\n🔄 Building spreadsheet structure...\n')

  const sheetMap = await createSheets(spreadsheetId)

  console.log('\n  ✅ Structure created\n')

  return sheetMap
}
