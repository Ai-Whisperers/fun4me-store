/**
 * Google Sheets API Authentication
 * Handles service account authentication and API client creation
 */

import { google, sheets_v4 } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

let sheetsClient: sheets_v4.Sheets | null = null

// Rate limiting: delay between API calls (ms)
// Google Sheets API limit: 60 write requests per minute per user
// 1100ms delay = ~54 requests/minute (safe margin)
const API_DELAY_MS = 1100

/**
 * Helper to add delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get authenticated Google Sheets API client
 * Uses service account credentials from config directory
 */
export async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) {
    return sheetsClient
  }

  const credPath = path.join(__dirname, '../../config/google-service-account.json')

  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Service account credentials not found at ${credPath}\n` +
        `Please create a service account and save the JSON key file there.`
    )
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'))

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

/**
 * Get sheet IDs from a spreadsheet
 * Returns a map of sheet name to sheet ID
 */
export async function getSheetIds(spreadsheetId: string): Promise<Record<string, number>> {
  const sheets = await getGoogleSheetsClient()

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  })

  const sheetMap: Record<string, number> = {}
  spreadsheet.data.sheets?.forEach((sheet) => {
    if (sheet.properties?.title && sheet.properties.sheetId !== undefined) {
      sheetMap[sheet.properties.title] = sheet.properties.sheetId
    }
  })

  return sheetMap
}

/**
 * Execute batch update with automatic chunking for large requests
 * Includes delay between batches to avoid quota limits
 */
export async function batchUpdate(
  spreadsheetId: string,
  requests: any[],
  batchSize: number = 50 // Reduced batch size for rate limiting
): Promise<void> {
  const sheets = await getGoogleSheetsClient()

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: batch },
    })
    // Add delay between batches to avoid quota limits
    if (i + batchSize < requests.length) {
      await delay(API_DELAY_MS)
    }
  }
}

/**
 * Update values in a range
 * Includes delay to avoid quota limits
 */
export async function updateValues(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const sheets = await getGoogleSheetsClient()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })

  // Add delay after each update to avoid quota limits
  await delay(API_DELAY_MS)
}

/**
 * Batch update multiple value ranges in a single API call
 * Much more efficient than individual updateValues calls
 */
export async function batchUpdateValues(
  spreadsheetId: string,
  data: Array<{ range: string; values: any[][] }>
): Promise<void> {
  if (data.length === 0) return

  const sheets = await getGoogleSheetsClient()

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: data.map((d) => ({
        range: d.range,
        values: d.values,
      })),
    },
  })

  // Add delay after batch to avoid quota limits
  await delay(API_DELAY_MS)
}
