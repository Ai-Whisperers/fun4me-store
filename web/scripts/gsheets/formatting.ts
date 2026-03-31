/**
 * Google Sheets Formatting
 * Professional styling with all Google Sheets features
 */

import { batchUpdate, getGoogleSheetsClient } from './auth'
import { SPREADSHEET_ID, SHEETS, COLORS, STOCK_OPERATIONS } from './config'

// Optimal column widths per sheet (in pixels)
const COLUMN_WIDTHS: Record<string, number[]> = {
  // Full-width documentation layout (8 columns, mostly merged)
  '📖 Guía Rápida': [700, 50, 50, 50, 50, 50, 50, 50],

  // Categorías: 10 columns (A-J)
  // Código, CódigoPadre, Nivel, Nombre, Descripción, Ejemplos, Cat#, Subcat#, Total#, Activo
  '📂 Categorías': [120, 100, 60, 200, 250, 180, 80, 80, 80, 60],

  // Proveedores: 24 columns (A-X)
  '🏭 Proveedores': [
    90,
    180,
    140,
    100,
    90,
    90,
    130,
    130,
    180,
    140, // A-J (added hyperlink space)
    180,
    100,
    130,
    100,
    100,
    100,
    80,
    180, // K-R
    90,
    100,
    100,
    90,
    180,
    60, // S-X
  ],

  // Marcas: 15 columns (A-O)
  '🏷️ Marcas': [80, 160, 100, 100, 80, 120, 80, 150, 80, 140, 150, 180, 80, 220, 60],

  // Productos: 15 columns (A-O)
  '🆕 Productos': [100, 260, 140, 120, 90, 80, 90, 100, 90, 130, 100, 60, 70, 220, 60],

  // Mis Productos: 19 columns (A-S)
  // Producto, PrecioVenta, StockMín, Ubicación, Activo, Código, Descripción, Categoría,
  // Marca, Proveedor, CódigoBarras, Receta, ÚltCosto, Margen%, Stock, Valor, Estado, PróxVence, Alertas
  '📋 Mis Productos': [
    260, 100, 80, 110, 60, 100, 140, 100, 100, 100, 100, 60, 100, 80, 80, 100, 100, 100, 120,
  ],

  // Movimientos Stock: 15 columns (A-O)
  // Fecha, Producto, Operación, Cantidad, Lote, Ubicación, Responsable, CostoUnit, Vencimiento, Documento, #, Código, CostoUsado, +/-, Total
  '📦 Movimientos Stock': [100, 240, 140, 80, 100, 110, 120, 100, 100, 100, 50, 100, 100, 50, 100],

  // Configuración: 9 columns (A-I) - Two side-by-side tables
  // Ubicaciones (A-D): Código, Ubicación, Descripción, Activo
  // Separator (E): Empty
  // Responsables (F-I): ID, Responsable, Rol/Cargo, Activo
  '⚙️ Configuración': [100, 160, 280, 60, 30, 100, 160, 260, 60],

  // Control Lotes: 11 columns (A-K)
  // Producto, Lote, Código, F.Ingreso, Vencimiento, Cantidad, CostoUnit, Valor, DíasVence, Estado, OrdenFIFO
  '📊 Control Lotes': [220, 120, 100, 100, 100, 80, 100, 100, 80, 100, 80],

  // Datos helper: 7 columns
  '🔧 Datos': [160, 120, 140, 240, 240, 140, 140],
}

// Sheet tab colors
const TAB_COLORS: Record<string, (typeof COLORS)[keyof typeof COLORS]> = {
  '📖 Guía Rápida': COLORS.primary,
  '📂 Categorías': COLORS.categoryHeader,
  '🏭 Proveedores': COLORS.providerHeader,
  '🏷️ Marcas': COLORS.brandHeader,
  '🆕 Productos': COLORS.productHeader,
  '📋 Mis Productos': COLORS.quickHeader,
  '📦 Movimientos Stock': COLORS.stockHeader,
  '📊 Control Lotes': COLORS.accent,
  '⚙️ Configuración': COLORS.configHeader,
  '🔧 Datos': COLORS.darkGray,
}

// Data row heights per sheet (in pixels)
// Optimized for content type and readability
const DATA_ROW_HEIGHTS: Record<string, number> = {
  '📖 Guía Rápida': 20, // Compact for documentation
  '📂 Categorías': 26, // Standard for hierarchical data
  '🏭 Proveedores': 28, // Slightly taller for contact info
  '🏷️ Marcas': 26, // Standard
  '🆕 Productos': 24, // Compact for large catalog
  '📋 Mis Productos': 26, // Standard for inventory
  '📦 Movimientos Stock': 24, // Compact for transaction log
  '📊 Control Lotes': 24, // Standard for lot tracking
  '⚙️ Configuración': 28, // Slightly taller for config tables
  '🔧 Datos': 22, // Compact helper sheet
}

/**
 * Get optimal data row height for a sheet
 */
function getDataRowHeight(sheetName: string): number {
  return DATA_ROW_HEIGHTS[sheetName] ?? 24 // Default 24px
}

/**
 * Apply all formatting to the spreadsheet
 */
export async function applyFormatting(
  spreadsheetId: string,
  sheetMap: Record<string, number>
): Promise<void> {
  console.log('\n🎨 Applying formatting...\n')

  const requests: any[] = []

  // Format each sheet
  for (const config of SHEETS) {
    const sheetId = sheetMap[config.name]
    if (sheetId === undefined) {
      console.log(`  ⚠️ Sheet not found: ${config.name}`)
      continue
    }

    console.log(`  📝 ${config.name}`)
    const colCount = config.columns.length

    // 1. Sheet tab color
    const tabColor = TAB_COLORS[config.name]
    if (tabColor) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            tabColor: tabColor,
          },
          fields: 'tabColor',
        },
      })
    }

    // 2. Header row styling with text wrapping
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: config.headerColor,
            textFormat: {
              foregroundColor: COLORS.white,
              bold: true,
              fontSize: 11,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            padding: { top: 6, bottom: 6, left: 8, right: 8 },
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,padding)',
      },
    })

    // 3. Data rows default styling
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: config.dataRows + 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'CLIP',
            padding: { top: 4, bottom: 4, left: 6, right: 6 },
          },
        },
        fields: 'userEnteredFormat(verticalAlignment,wrapStrategy,padding)',
      },
    })

    // 4. Alternating colors banding (built-in feature - more efficient)
    requests.push({
      addBanding: {
        bandedRange: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: config.dataRows + 1,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          rowProperties: {
            headerColor: config.headerColor,
            firstBandColor: COLORS.white,
            secondBandColor: COLORS.lightGray,
          },
        },
      },
    })

    // 5. Freeze header row(s)
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: config.frozenRows ?? 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    })

    // 6. Header border (bottom)
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        bottom: {
          style: 'SOLID_MEDIUM',
          color: COLORS.black,
        },
      },
    })

    // 7. Outer border for data area
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: Math.min(config.dataRows + 1, 100),
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        top: { style: 'SOLID', color: COLORS.mediumGray },
        bottom: { style: 'SOLID', color: COLORS.mediumGray },
        left: { style: 'SOLID', color: COLORS.mediumGray },
        right: { style: 'SOLID', color: COLORS.mediumGray },
      },
    })

    // 8. Header row height - taller for readability
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 36 },
        fields: 'pixelSize',
      },
    })

    // 9. Data row height - apply to ALL rows in the sheet
    // Use sheet-specific heights for better readability
    const dataRowHeight = getDataRowHeight(config.name)
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: config.dataRows + 1, // Apply to ALL data rows, not just first 100
        },
        properties: { pixelSize: dataRowHeight },
        fields: 'pixelSize',
      },
    })

    // 10. Optimal column widths
    const widths = COLUMN_WIDTHS[config.name]
    if (widths) {
      for (let i = 0; i < Math.min(widths.length, colCount); i++) {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: i,
              endIndex: i + 1,
            },
            properties: { pixelSize: widths[i] },
            fields: 'pixelSize',
          },
        })
      }
    }
  }

  // Sheet-specific formatting
  addCategoriesFormatting(requests, sheetMap)
  addProductsFormatting(requests, sheetMap)
  addMisProductosFormatting(requests, sheetMap)
  addStockFormatting(requests, sheetMap)
  addGuideFormatting(requests, sheetMap)
  addConfigFormatting(requests, sheetMap)
  addProvidersFormatting(requests, sheetMap)
  addBrandsFormatting(requests, sheetMap)
  addDatosFormatting(requests, sheetMap)
  addControlLotesFormatting(requests, sheetMap)

  // Execute in batches
  await batchUpdate(spreadsheetId, requests, 100)

  // Add filter views (separate API call)
  await addFilterViews(spreadsheetId, sheetMap)

  // Add cell notes for help
  await addCellNotes(spreadsheetId)

  console.log('\n  ✅ Formatting applied\n')
}

/**
 * Add filter views for data sheets
 */
async function addFilterViews(
  spreadsheetId: string,
  sheetMap: Record<string, number>
): Promise<void> {
  const sheets = await getGoogleSheetsClient()
  const requests: any[] = []

  // Add basic filter for main data sheets
  const sheetsWithFilters = [
    '📂 Categorías',
    '🏭 Proveedores',
    '🏷️ Marcas',
    '🆕 Productos',
    '📋 Mis Productos',
    '📦 Movimientos Stock',
  ]

  for (const sheetName of sheetsWithFilters) {
    const sheetId = sheetMap[sheetName]
    const config = SHEETS.find((s) => s.name === sheetName)
    if (sheetId === undefined || !config) continue

    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: config.dataRows + 1,
            startColumnIndex: 0,
            endColumnIndex: config.columns.length,
          },
        },
      },
    })
  }

  if (requests.length > 0) {
    await batchUpdate(spreadsheetId, requests, 50)
  }
}

/**
 * Add cell notes for help/tooltips
 */
async function addCellNotes(spreadsheetId: string): Promise<void> {
  const sheets = await getGoogleSheetsClient()

  const notes: Record<string, Record<string, string>> = {
    '📂 Categorías': {
      A1: '🔒 CÓDIGO AUTO-GENERADO\n\nSe genera automáticamente con ARRAYFORMULA:\n• Sin padre: INICIALES(3)\n• Con padre: PADRE-INICIALES(3)\n\nEjemplos:\n• Alimentos → ALI\n• ALI + Perros → ALI-PER\n• ALI-PER + Adultos → ALI-PER-ADU\n\n✅ Solo completa: Nombre, Nivel, Padre',
      B1: '📝 Nombre de la categoría\nCampo obligatorio\nEl código se genera de las primeras 3 letras',
      C1: '📊 Nivel en la jerarquía\n1 = Raíz\n2 = Subcategoría\n3 = Sub-subcategoría',
      D1: '🔗 Código de la categoría padre\nDejar vacío para categorías raíz\nEj: ALI para subcategorías de Alimentos',
    },
    '🏭 Proveedores': {
      A1: '🔒 CÓDIGO AUTO-GENERADO\n\nSe genera automáticamente:\nPrimeras 3 letras + número secuencial\n\nEjemplos:\n• 1° entrada "Royal Canin" → ROY-001\n• 2° entrada "Distribuidora" → DIS-002\n• 7° entrada "Test" → TES-007\n\n✅ Fórmulas pre-llenadas para 100 filas',
      B1: '📝 Nombre del proveedor\nCampo obligatorio\nEl código se genera de las primeras 3 letras',
      C1: '📦 Tipo de proveedor:\n• Productos = Tienda\n• Insumos = Servicios\n• Ambos = Todo',
    },
    '🏷️ Marcas': {
      A1: '🔒 CÓDIGO AUTO-GENERADO\n\nSe genera automáticamente:\nPrimeras 2 letras + número secuencial\n\nEjemplos:\n• 1° entrada "Royal Canin" → RO-001\n• 6° entrada "Bayer" → BA-006\n• 12° entrada "Test" → TE-012\n\n✅ Fórmulas pre-llenadas para 100 filas',
      B1: '📝 Nombre de la marca\nCampo obligatorio\nEl código se genera de las primeras 2 letras',
    },
    '🆕 Productos': {
      A1: '🔒 SKU AUTO-GENERADO\n\nSe genera automáticamente:\nPrimeras 3 letras del nombre + número secuencial\n\nEjemplos:\n• "Royal Canin Adult" → ROY-001\n• "Nexgard Spectra" → NEX-002\n\n✅ Fórmulas pre-llenadas para 100 filas\n⚠️ Solo productos activos aparecen en otros dropdowns',
      B1: '📝 Nombre del producto\nCampo obligatorio',
      C1: '📁 Código de categoría\nSelecciona del dropdown ▼\n⚠️ Solo categorías ACTIVAS',
      D1: '🏷️ Código de marca\nSelecciona del dropdown ▼\n⚠️ Solo marcas ACTIVAS',
      F1: '💰 Precio de compra\nSin IVA incluido',
      G1: '💵 Precio de venta al público\nCon IVA incluido',
      H1: '📦 Stock mínimo\nAlerta cuando el stock baje de este valor',
      I1: '💊 ¿Requiere receta veterinaria?\nSí = Medicamentos controlados',
      J1: '🏭 Proveedor\nSelecciona del dropdown ▼\n⚠️ Solo proveedores ACTIVOS',
    },
    '📦 Stock Inicial': {
      A1: '📦 Selecciona el producto\nUsa el menú desplegable ▼\n⚠️ Solo productos ACTIVOS',
      B1: '📋 Tipo de movimiento:\n• Compra = Entrada (+)\n• Venta = Salida (-)\n• Ajuste = Corrección (±)\n• Daño/Vencido = Pérdida (-)',
      C1: '🔢 Cantidad del movimiento\nUsar números negativos para salidas',
      D1: '💰 Costo unitario\nSolo para compras',
      F1: '📍 Ubicación\nSelecciona del dropdown ▼\n⚠️ Solo ubicaciones ACTIVAS',
    },
    '⚡ Carga Rápida': {
      A1: '📝 Nombre del producto\nSelecciona existente o escribe nuevo\n⚠️ Solo productos ACTIVOS en dropdown',
      B1: '📁 Código de categoría\nSelecciona del dropdown ▼\n⚠️ Solo categorías ACTIVAS',
      G1: '🏷️ Código de marca\nSelecciona del dropdown ▼\n⚠️ Solo marcas ACTIVAS',
      H1: '🏭 Proveedor\nSelecciona del dropdown ▼\n⚠️ Solo proveedores ACTIVOS',
    },
  }

  for (const [sheetName, cellNotes] of Object.entries(notes)) {
    for (const [cell, note] of Object.entries(cellNotes)) {
      await sheets.spreadsheets.values
        .update({
          spreadsheetId,
          range: `'${sheetName}'!${cell}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[{ note }]],
          },
        })
        .catch(() => {
          // Notes via values.update might not work, use batchUpdate
        })
    }
  }

  // Use batchUpdate for notes (more reliable)
  const requests: any[] = []
  for (const [sheetName, cellNotes] of Object.entries(notes)) {
    for (const [cell, note] of Object.entries(cellNotes)) {
      const col = cell.charCodeAt(0) - 65 // A=0, B=1, etc.
      const row = parseInt(cell.substring(1)) - 1

      // We need sheetId but don't have it here, skip for now
    }
  }
}

/**
 * Special formatting for Categorías sheet
 * Columns (8): Código(A), CódigoPadre(B), Nivel(C), Nombre(D), Descripción(E), Ejemplos(F), #Productos(G), Activo(H)
 */
function addCategoriesFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['📂 Categorías']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '📂 Categorías')
  const MAX_ROWS = (config?.dataRows ?? 100) + 1

  // Código columns (A, B) - monospace for hierarchical codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // Nivel column (C) - centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  })

  // # Productos column (G) - gray calculated field
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 6,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
    },
  })

  // Conditional formatting for levels (column C) - 5 levels supported
  const levelColors = [
    { level: 1, color: { red: 0.851, green: 0.918, blue: 0.827 } }, // Green - root
    { level: 2, color: { red: 0.882, green: 0.922, blue: 0.961 } }, // Blue - sub
    { level: 3, color: { red: 0.988, green: 0.945, blue: 0.859 } }, // Yellow - detail
    { level: 4, color: { red: 0.957, green: 0.878, blue: 0.878 } }, // Light red - granular
    { level: 5, color: { red: 0.918, green: 0.878, blue: 0.957 } }, // Light purple - micro
  ]

  for (const { level, color } of levelColors) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: MAX_ROWS,
              startColumnIndex: 0,
              endColumnIndex: 8,
            },
          ],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: `=$C2=${level}` }],
            },
            format: { backgroundColor: color },
          },
        },
        index: 0,
      },
    })
  }

  // Strikethrough for inactive categories (H = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 8,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$H2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Productos sheet (Catálogo Master)
 * Columns (15): SKU(A), Nombre(B), Categoría(C), Marca(D), Unid.Compra(E), Cant.Contenida(F),
 *               Unid.Venta(G), PrecioCompra(H), CostoUnit(I), Proveedor(J), Especies(K),
 *               Receta(L), EnStock(M), Descripción(N), Activo(O)
 */
function addProductsFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['🆕 Productos']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '🆕 Productos')
  const MAX_ROWS = (config?.dataRows ?? 1200) + 1

  // SKU column (A) - gray "locked" appearance (auto-generated)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Required columns (B-D: Nombre, Categoría, Marca) - light teal
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 1,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.primaryLight,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // Conversion columns (E-G: Unid.Compra, Cant.Contenida, Unid.Venta) - light blue
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 4,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightBlue,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // Number format for Cant.Contenida (F - index 5)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Price columns (H-I: Precio Compra, Costo Unit) - light amber
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 7,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.accentLight,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // Number format for prices (H-I) with currency symbol
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 7,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Costo Unit column (I - index 8) - gray for calculated field
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // En Stock column (M - index 12) - gray calculated, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 12,
        endColumnIndex: 13,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
    },
  })

  // Description column (N - index 13) - text wrap
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 13,
        endColumnIndex: 14,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat.wrapStrategy',
    },
  })

  // Conditional: "En Stock" = ✓ shows green
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 12,
            endColumnIndex: 13,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$M2="✓"' }],
          },
          format: {
            backgroundColor: COLORS.successLight,
            textFormat: { foregroundColor: COLORS.success },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional: inactive products (O = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 15,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$O2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Movimientos Stock sheet
 * 15 columns (A-O):
 *   A: Fecha (date - user entry)
 *   B: Producto (dropdown - user entry)
 *   C: Operación (dropdown - user entry)
 *   D: Cantidad (number - user entry)
 *   E: Lote (text - user entry)
 *   F: Ubicación (dropdown - user entry)
 *   G: Responsable (dropdown - user entry)
 *   H: Costo Unit (currency - user entry for Compra)
 *   I: Vencimiento (date - user entry)
 *   J: Documento (text - user entry)
 *   K: # (formula - auto row number)
 *   L: Código (formula - from Mis Productos)
 *   M: Costo Usado (formula - calculated)
 *   N: +/- (formula - direction indicator)
 *   O: Total (formula - running total)
 */
function addStockFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['📦 Movimientos Stock']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '📦 Movimientos Stock')
  const MAX_ROWS = (config?.dataRows ?? 1000) + 1

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Fecha (A - index 0) - Date format, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Vencimiento (I - index 8) - Date format, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMBER COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Cantidad (D - index 3) - Integer, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 3,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENCY COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Costo Unit (H - index 7) - Currency format
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 7,
        endColumnIndex: 8,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Costo Usado (M - index 12) - Gray calculated field, currency
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 12,
        endColumnIndex: 13,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Total (O - index 14) - Gray calculated field, currency
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 14,
        endColumnIndex: 15,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CODE/MONOSPACE COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Lote (E - index 4) - Monospace for lot codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 4,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Documento (J - index 9) - Monospace for document numbers
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 9,
        endColumnIndex: 10,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // # (K - index 10) - Gray auto-increment, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 10,
        endColumnIndex: 11,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          horizontalAlignment: 'CENTER',
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
    },
  })

  // Código (L - index 11) - Gray calculated, monospace
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 11,
        endColumnIndex: 12,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  })

  // +/- (N - index 13) - Centered direction indicator
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 13,
        endColumnIndex: 14,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          horizontalAlignment: 'CENTER',
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 12,
            bold: true,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONAL FORMATTING - OPERATION TYPES (row colors based on C - Operación)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const op of STOCK_OPERATIONS) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: MAX_ROWS,
              startColumnIndex: 0,
              endColumnIndex: 15, // All 15 columns
            },
          ],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: `=$C2="${op.value}"` }], // Column C = Operación
            },
            format: { backgroundColor: op.color },
          },
        },
        index: 0,
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONAL FORMATTING - EXPIRATION (column I - Vencimiento)
  // ═══════════════════════════════════════════════════════════════════════════

  // Expired products (Vencimiento < today) - Red
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 8, // Column I
            endColumnIndex: 9,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=AND($I2<>"",ISNUMBER($I2),$I2<TODAY())' }],
          },
          format: {
            backgroundColor: COLORS.errorLight,
            textFormat: { foregroundColor: COLORS.error },
          },
        },
      },
      index: 0,
    },
  })

  // Products expiring soon (within 30 days) - Yellow
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 8, // Column I
            endColumnIndex: 9,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [
              { userEnteredValue: '=AND($I2<>"",ISNUMBER($I2),$I2>=TODAY(),$I2<TODAY()+30)' },
            ],
          },
          format: {
            backgroundColor: COLORS.warningLight,
            textFormat: { foregroundColor: COLORS.warning },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Guía Rápida sheet - Comprehensive documentation layout
 * Full-width single column with section headers, boxes, and color-coded content
 */
function addGuideFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['📖 Guía Rápida']
  if (sheetId === undefined) return

  const COLS = 8 // Total columns
  const ROWS = 220 // Total rows for comprehensive guide

  // 1. Base style for all cells - white background, wrapped text
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: ROWS,
        startColumnIndex: 0,
        endColumnIndex: COLS,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.white,
          wrapStrategy: 'CLIP',
          verticalAlignment: 'TOP',
          textFormat: {
            fontSize: 10,
            fontFamily: 'Roboto Mono',
            foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
          },
        },
      },
      fields: 'userEnteredFormat',
    },
  })

  // 2. Title row (row 1, index 0) - Teal header
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: COLS,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.primary,
          textFormat: {
            foregroundColor: COLORS.white,
            bold: true,
            fontSize: 20,
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat',
    },
  })

  // 3. Subtitle row (row 2, index 1)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: COLS,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.primaryLight,
          textFormat: {
            foregroundColor: COLORS.primaryDark,
            italic: true,
            fontSize: 12,
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat',
    },
  })

  // 4. Warning row (row 4, index 3) - Yellow/Red warning
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 4,
        startColumnIndex: 0,
        endColumnIndex: COLS,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 0.95, blue: 0.8 },
          textFormat: {
            bold: true,
            fontSize: 11,
            foregroundColor: { red: 0.8, green: 0.2, blue: 0.1 },
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat',
    },
  })

  // 5. Section divider rows (━━━ lines) - light gray with monospace
  // Find all section divider rows (they contain ━━━)
  const sectionDividerRows = [
    5, 6, 7, 18, 19, 20, 46, 47, 48, 168, 169, 170, 195, 196, 197, 212, 213, 214,
  ]
  for (const rowIndex of sectionDividerRows) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: COLS,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.95, green: 0.97, blue: 0.98 },
            textFormat: {
              foregroundColor: COLORS.primary,
              fontSize: 10,
              fontFamily: 'Roboto Mono',
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    })
  }

  // 6. Section titles (📋 1. ¿QUÉ ES...) - bold, larger, primary color
  const sectionTitleRows = [6, 19, 47, 169, 196, 213]
  for (const rowIndex of sectionTitleRows) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: COLS,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.primary,
            textFormat: {
              foregroundColor: COLORS.white,
              bold: true,
              fontSize: 13,
              fontFamily: 'Roboto',
            },
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    })
  }

  // 7. Box header rows (┌─── and │ sheet name) - light teal
  // These are rows that start with ┌ or contain sheet names like │ 📂 CATEGORÍAS
  const boxHeaderPatterns = [
    // Section 3: Sheet descriptions - box headers
    { start: 49, end: 50 }, // Categorías header
    { start: 75, end: 76 }, // Proveedores header
    { start: 97, end: 98 }, // Marcas header
    { start: 115, end: 116 }, // Productos header
    { start: 139, end: 140 }, // Mis Productos header
    { start: 161, end: 162 }, // Movimientos header (approximate)
  ]

  for (const { start, end } of boxHeaderPatterns) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: start,
          endRowIndex: end,
          startColumnIndex: 0,
          endColumnIndex: COLS,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.88, green: 0.94, blue: 0.96 },
            textFormat: {
              foregroundColor: COLORS.primaryDark,
              bold: true,
              fontSize: 11,
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    })
  }

  // 8. Checkmark items (✅) - light green tint
  // These appear in the introduction section
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 0,
            endRowIndex: ROWS,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: 'TEXT_CONTAINS',
            values: [{ userEnteredValue: '✅' }],
          },
          format: {
            backgroundColor: { red: 0.92, green: 0.97, blue: 0.92 },
          },
        },
      },
      index: 0,
    },
  })

  // 9. PASO items (1️⃣, 2️⃣, etc.) - light blue highlight
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 0,
            endRowIndex: ROWS,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: 'TEXT_CONTAINS',
            values: [{ userEnteredValue: 'PASO' }],
          },
          format: {
            backgroundColor: { red: 0.9, green: 0.95, blue: 1 },
            textFormat: { bold: true },
          },
        },
      },
      index: 0,
    },
  })

  // 10. Warning items (⚠️) - light yellow
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 0,
            endRowIndex: ROWS,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: 'TEXT_CONTAINS',
            values: [{ userEnteredValue: '⚠️' }],
          },
          format: {
            backgroundColor: { red: 1, green: 0.98, blue: 0.9 },
          },
        },
      },
      index: 0,
    },
  })

  // 11. Workflow headers (📥, 🛒, ➕, 📊) - light purple
  const workflowEmojis = ['📥', '🛒', '➕', '📊']
  for (const emoji of workflowEmojis) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 168,
              endRowIndex: 195,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_STARTS_WITH',
              values: [{ userEnteredValue: emoji }],
            },
            format: {
              backgroundColor: { red: 0.95, green: 0.93, blue: 1 },
              textFormat: { bold: true },
            },
          },
        },
        index: 0,
      },
    })
  }

  // 12. FAQ Questions (P:) - light teal
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 212,
            endRowIndex: ROWS,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: 'TEXT_STARTS_WITH',
            values: [{ userEnteredValue: 'P:' }],
          },
          format: {
            backgroundColor: { red: 0.88, green: 0.94, blue: 0.96 },
            textFormat: { bold: true },
          },
        },
      },
      index: 0,
    },
  })

  // 13. FAQ Answers (R:) - white with italic
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 212,
            endRowIndex: ROWS,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: 'TEXT_STARTS_WITH',
            values: [{ userEnteredValue: 'R:' }],
          },
          format: {
            textFormat: { italic: true },
          },
        },
      },
      index: 0,
    },
  })

  // 14. Row heights
  // Title row - tall
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 50 },
      fields: 'pixelSize',
    },
  })

  // Subtitle row
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
      properties: { pixelSize: 32 },
      fields: 'pixelSize',
    },
  })

  // Warning row
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 3, endIndex: 4 },
      properties: { pixelSize: 35 },
      fields: 'pixelSize',
    },
  })

  // Section title rows - medium height
  for (const rowIndex of sectionTitleRows) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        properties: { pixelSize: 32 },
        fields: 'pixelSize',
      },
    })
  }

  // Content rows - standard height
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 4, endIndex: ROWS },
      properties: { pixelSize: 20 },
      fields: 'pixelSize',
    },
  })

  // Footer rows - small
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: ROWS - 3, endIndex: ROWS },
      properties: { pixelSize: 25 },
      fields: 'pixelSize',
    },
  })

  // 15. Hide gridlines for cleaner look
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: { hideGridlines: true },
      },
      fields: 'gridProperties.hideGridlines',
    },
  })

  // 16. Merge all rows (full width documentation)
  for (let i = 0; i < ROWS; i++) {
    requests.push({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: i,
          endRowIndex: i + 1,
          startColumnIndex: 0,
          endColumnIndex: COLS,
        },
        mergeType: 'MERGE_ALL',
      },
    })
  }

  // 17. Footer styling (last 3 rows)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: ROWS - 3,
        endRowIndex: ROWS,
        startColumnIndex: 0,
        endColumnIndex: COLS,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
          textFormat: {
            italic: true,
            fontSize: 10,
            foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 },
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat',
    },
  })
}

/**
 * Special formatting for 📋 Mis Productos sheet (19 columns A-S)
 * Client fills: Producto(A), PrecioVenta(B), StockMín(C), Ubicación(D), Activo(E)
 * Auto-fill from catalog: Código(F), Descripción(G), Categoría(H), Marca(I), Proveedor(J), CódigoBarras(K), Receta(L)
 * Auto-calculated: ÚltCosto(M), Margen%(N), Stock(O), Valor(P), Estado(Q), PróxVence(R), Alertas(S)
 */
function addMisProductosFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['📋 Mis Productos']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '📋 Mis Productos')
  const MAX_ROWS = (config?.dataRows ?? 500) + 1

  // Light green background for client-entry columns (A-E, index 0-5)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.successLight,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // Currency format for Precio Venta (B - index 1)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
          backgroundColor: COLORS.accentLight,
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment,backgroundColor)',
    },
  })

  // Number format for Stock Mín (C - index 2)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Gray background for auto-fill columns F-L (index 5-12)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 12,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Monospace for Código column (F - index 5)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // Barcode column (K - index 10) - monospace for codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 10,
        endColumnIndex: 11,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Gray background for auto-calculated columns M-S (index 12-19)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 12,
        endColumnIndex: 19,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Currency format for Último Costo (M - index 12)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 12,
        endColumnIndex: 13,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // PERCENTAGE format for Margen % (N - index 13)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 13,
        endColumnIndex: 14,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'PERCENT', pattern: '0.0%' },
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Number format for Stock (O - index 14)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 14,
        endColumnIndex: 15,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Currency format for Valor (P - index 15)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 15,
        endColumnIndex: 16,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Estado column (Q - index 16) - centered emoji
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 16,
        endColumnIndex: 17,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          horizontalAlignment: 'CENTER',
          textFormat: {
            fontSize: 14,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
    },
  })

  // Date format for Próx.Vence (R - index 17)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 17,
        endColumnIndex: 18,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Conditional formatting for low stock - Estado column (Q shows 🔴)
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 19,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$Q2="🔴"' }],
          },
          format: {
            backgroundColor: COLORS.errorLight,
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting for low stock warning - Estado column (Q shows 🟡)
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 19,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$Q2="🟡"' }],
          },
          format: {
            backgroundColor: COLORS.warningLight,
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting for margin < 20% (low margin) - N column is now number format
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 13,
            endColumnIndex: 14,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=AND($N2<>"",ISNUMBER($N2),$N2<0.2)' }],
          },
          format: {
            backgroundColor: COLORS.warningLight,
            textFormat: { foregroundColor: COLORS.warning },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting for inactive products (E = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 19,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$E2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Configuración sheet - Two side-by-side tables
 * 9 columns (A-I):
 *   Ubicaciones table (A-D): Código, Ubicación, Descripción, Activo
 *   Separator (E): Empty column
 *   Responsables table (F-I): ID, Responsable, Rol/Cargo, Activo
 */
function addConfigFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['⚙️ Configuración']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '⚙️ Configuración')
  const MAX_ROWS = (config?.dataRows ?? 50) + 1

  // ═══════════════════════════════════════════════════════════════════════════
  // UBICACIONES TABLE (A-D) - Light amber background
  // ═══════════════════════════════════════════════════════════════════════════
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.accentLight,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // Código column (A) - monospace for DEP-xxx codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Activo column (D) - centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 3,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SEPARATOR COLUMN (E) - White/empty
  // ═══════════════════════════════════════════════════════════════════════════
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 4,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.white,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSABLES TABLE (F-I) - Light blue background
  // ═══════════════════════════════════════════════════════════════════════════
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.primaryLight,
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  })

  // ID column (F) - monospace for STAFF-xxx codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Activo column (I) - centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONAL FORMATTING - Inactive items (strikethrough)
  // ═══════════════════════════════════════════════════════════════════════════

  // Inactive Ubicaciones (D = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$D2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })

  // Inactive Responsables (I = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 5,
            endColumnIndex: 9,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$I2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for 🔧 Datos helper sheet
 * 7 columns: Categorías(A), Marcas(B), Proveedores(C), Productos Catálogo(D),
 *            Mis Productos(E), Ubicaciones(F), Responsables(G)
 * This sheet contains FILTER formulas for active items only
 */
function addDatosFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['🔧 Datos']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '🔧 Datos')
  const MAX_ROWS = (config?.dataRows ?? 1200) + 1

  // Light gray background for helper data (all 7 columns)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            fontSize: 9,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Hide the sheet (users don't need to see it)
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        hidden: true,
      },
      fields: 'hidden',
    },
  })
}

/**
 * Special formatting for Proveedores sheet
 * 24 columns: A-Código, B-Nombre, C-Razón Social, D-RUC, E-Tipo, F-Calificación, G-Teléfono, H-WhatsApp,
 *             I-Email, J-Sitio Web, K-Dirección, L-Ciudad, M-Persona Contacto, N-Cargo,
 *             O-Pedido Mín., P-Condiciones Pago, Q-Días Entrega, R-Marcas,
 *             S-#Productos, T-Total Compras, U-Última Compra, V-Verificado, W-Notas, X-Activo
 */
function addProvidersFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['🏭 Proveedores']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '🏭 Proveedores')
  const MAX_ROWS = (config?.dataRows ?? 100) + 1

  // Código column (A) - gray "locked" appearance (auto-generated)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Calificación column (F - index 5) - centered stars
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          textFormat: {
            fontSize: 12,
          },
        },
      },
      fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
    },
  })

  // Conditional formatting for provider type (column E - index 4)
  const typeColors = [
    { type: 'Productos', color: { red: 0.882, green: 0.922, blue: 0.961 } },
    { type: 'Servicios', color: { red: 0.988, green: 0.945, blue: 0.859 } },
    { type: 'Ambos', color: { red: 0.851, green: 0.918, blue: 0.827 } },
  ]

  for (const { type, color } of typeColors) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 1,
              endRowIndex: MAX_ROWS,
              startColumnIndex: 0,
              endColumnIndex: 12, // Columns A-L for visual grouping
            },
          ],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: `=$E2="${type}"` }], // Column E = Tipo
            },
            format: { backgroundColor: color },
          },
        },
        index: 0,
      },
    })
  }

  // Email column (I - index 8) - special formatting with underline
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            foregroundColor: { red: 0.067, green: 0.333, blue: 0.8 },
            underline: true,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // Website column (J - index 9) - same formatting
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 9,
        endColumnIndex: 10,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            foregroundColor: { red: 0.067, green: 0.333, blue: 0.8 },
            underline: true,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // Currency format for Pedido Mín. (O - index 14)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 14,
        endColumnIndex: 15,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Días Entrega column (Q - index 16) - centered number
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 16,
        endColumnIndex: 17,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Calculated columns (S-U: #Productos, Total Compras, Última Compra) - gray
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 18,
        endColumnIndex: 21,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // #Productos (S - index 18) - centered number
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 18,
        endColumnIndex: 19,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Total Compras (T - index 19) - currency
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 19,
        endColumnIndex: 20,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Última Compra (U - index 20) - date
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 20,
        endColumnIndex: 21,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Conditional formatting for inactive suppliers (X = "No")
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 24,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$X2="No"' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Marcas sheet
 * 15 columns: A-Código, B-Nombre, C-Tipo, D-Segmento, E-País, F-Empresa Matriz, G-Fundación,
 *             H-Especialidades, I-Solo Veterinaria, J-Distribuidor, K-Sitio Web, L-Productos Clave,
 *             M-#Productos, N-Descripción, O-Activo
 */
function addBrandsFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['🏷️ Marcas']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '🏷️ Marcas')
  const MAX_ROWS = (config?.dataRows ?? 150) + 1

  // Código column (A) - gray "locked" appearance (auto-generated)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            foregroundColor: COLORS.darkGray,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Fundación column (G - index 6) - centered year
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 6,
        endColumnIndex: 7,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '0000' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Website column (K - index 10) - link formatting
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 10,
        endColumnIndex: 11,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            foregroundColor: { red: 0.067, green: 0.333, blue: 0.8 },
            underline: true,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // #Productos column (M - index 12) - gray calculated, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 12,
        endColumnIndex: 13,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Description column (N - index 13) - text wrap
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 13,
        endColumnIndex: 14,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat.wrapStrategy',
    },
  })

  // Conditional formatting for inactive brands (Activo = column O - index 14)
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 15, // All columns A-O
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$O2="No"' }], // Column O = Activo
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}

/**
 * Special formatting for Control Lotes sheet (Lot tracking view)
 * 10 columns (all formula-based, read-only view):
 * A-Producto, B-Lote, C-Código, D-F.Ingreso, E-Vencimiento, F-Cantidad,
 * G-Costo Unit., H-Valor, I-Días Vence, J-Estado
 */
function addControlLotesFormatting(requests: any[], sheetMap: Record<string, number>): void {
  const sheetId = sheetMap['📊 Control Lotes']
  if (sheetId === undefined) return

  const config = SHEETS.find((s) => s.name === '📊 Control Lotes')
  const MAX_ROWS = (config?.dataRows ?? 500) + 1

  // All cells are formula-based - light gray background with italic text
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 10,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.lightGray,
          textFormat: {
            foregroundColor: COLORS.darkGray,
            italic: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  // Producto column (A) - regular font, left aligned (key identifier)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            italic: false,
            bold: true,
          },
        },
      },
      fields: 'userEnteredFormat.textFormat',
    },
  })

  // Lote column (B) - monospace for lot codes
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
            italic: false,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Código column (C) - monospace, centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Roboto Mono',
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
    },
  })

  // Date format for F.Ingreso (D) and Vencimiento (E)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 3,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Number format for Cantidad (F)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 5,
        endColumnIndex: 6,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Currency format for Costo Unit. (G) and Valor (H)
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 6,
        endColumnIndex: 8,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '₲ #,##0' },
          horizontalAlignment: 'RIGHT',
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
    },
  })

  // Number format for Días Vence (I) - centered
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '#,##0' },
          horizontalAlignment: 'CENTER',
          textFormat: {
            bold: true,
          },
        },
      },
      fields: 'userEnteredFormat(numberFormat,horizontalAlignment,textFormat)',
    },
  })

  // Estado column (J) - centered, larger font for emoji
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: MAX_ROWS,
        startColumnIndex: 9,
        endColumnIndex: 10,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          textFormat: {
            fontSize: 11,
            bold: true,
            italic: false,
          },
        },
      },
      fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
    },
  })

  // Conditional formatting: Estado = "Vencido" - red row
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$J2="Vencido"' }],
          },
          format: {
            backgroundColor: COLORS.errorLight,
            textFormat: { foregroundColor: COLORS.error },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Estado = "Por vencer" - yellow row
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$J2="Por vencer"' }],
          },
          format: {
            backgroundColor: COLORS.warningLight,
            textFormat: { foregroundColor: COLORS.warning },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Estado = "OK" - green row
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$J2="OK"' }],
          },
          format: {
            backgroundColor: COLORS.successLight,
            textFormat: { foregroundColor: COLORS.success },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Días Vence (I) < 0 - bold red text
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 8,
            endColumnIndex: 9,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=AND($I2<>"",ISNUMBER($I2),$I2<0)' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.error,
              bold: true,
            },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Días Vence (I) between 0-30 - warning
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 8,
            endColumnIndex: 9,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=AND($I2<>"",ISNUMBER($I2),$I2>=0,$I2<=30)' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.warning,
              bold: true,
            },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Cantidad (F) = 0 - strikethrough
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [
          {
            sheetId,
            startRowIndex: 1,
            endRowIndex: MAX_ROWS,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
        ],
        booleanRule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: '=$F2=0' }],
          },
          format: {
            textFormat: {
              foregroundColor: COLORS.darkGray,
              strikethrough: true,
            },
          },
        },
      },
      index: 0,
    },
  })
}
