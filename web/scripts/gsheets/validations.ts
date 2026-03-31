/**
 * Google Sheets Data Validations
 * Dropdowns, constraints, and input validation rules
 */

import { batchUpdate } from './auth'
import { SPREADSHEET_ID, DROPDOWN_OPTIONS } from './config'

/**
 * Helper to create a dropdown validation rule with static options
 */
function createDropdown(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  options: readonly string[],
  strict: boolean = true
): any {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: startRow,
        endRowIndex: endRow,
        startColumnIndex: startCol,
        endColumnIndex: endCol,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: options.map((v) => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict,
      },
    },
  }
}

/**
 * Helper to create a dropdown from another sheet's range (dynamic options)
 * @param sourceRange - Range formula like "='📂 Categorías'!$A$2:$A$101"
 */
function createDropdownFromRange(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  sourceRange: string,
  strict: boolean = false
): any {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: startRow,
        endRowIndex: endRow,
        startColumnIndex: startCol,
        endColumnIndex: endCol,
      },
      rule: {
        condition: {
          type: 'ONE_OF_RANGE',
          values: [{ userEnteredValue: sourceRange }],
        },
        showCustomUi: true,
        strict,
      },
    },
  }
}

/**
 * Apply all data validations to the spreadsheet
 */
export async function applyValidations(
  spreadsheetId: string,
  sheetMap: Record<string, number>
): Promise<void> {
  console.log('\n📋 Applying data validations...\n')

  const requests: any[] = []

  // ========================
  // 📂 Categorías (10 columns)
  // A-Código, B-Código Padre, C-Nivel(calc), D-Nombre, E-Descripción, F-Ejemplos,
  // G-Categoría#(calc), H-Subcategoría#(calc), I-#Productos(calc), J-Activo
  // ========================
  const catSheetId = sheetMap['📂 Categorías']
  if (catSheetId !== undefined) {
    console.log('  📂 Categorías...')

    // Activo dropdown (J - index 9)
    requests.push(createDropdown(catSheetId, 1, 101, 9, 10, DROPDOWN_OPTIONS.yesNo))
  }

  // ========================
  // 🏭 Proveedores (24 columns)
  // A-Código, B-Nombre, C-Razón Social, D-RUC, E-Tipo, F-Calificación, G-Teléfono, H-WhatsApp,
  // I-Email, J-Sitio Web, K-Dirección, L-Ciudad, M-Persona Contacto, N-Cargo,
  // O-Pedido Mín., P-Condiciones Pago, Q-Días Entrega, R-Marcas,
  // S-#Productos, T-Total Compras, U-Última Compra, V-Verificado, W-Notas, X-Activo
  // ========================
  const provSheetId = sheetMap['🏭 Proveedores']
  if (provSheetId !== undefined) {
    console.log('  🏭 Proveedores...')

    // Tipo dropdown (E - index 4: Productos, Servicios, Ambos)
    requests.push(createDropdown(provSheetId, 1, 101, 4, 5, DROPDOWN_OPTIONS.providerTypes))

    // Calificación dropdown (F - index 5: stars)
    requests.push(createDropdown(provSheetId, 1, 101, 5, 6, DROPDOWN_OPTIONS.ratings))

    // Condiciones Pago dropdown (P - index 15)
    requests.push(createDropdown(provSheetId, 1, 101, 15, 16, DROPDOWN_OPTIONS.paymentTerms))

    // Verificado dropdown (V - index 21)
    requests.push(createDropdown(provSheetId, 1, 101, 21, 22, DROPDOWN_OPTIONS.verificationStatus))

    // Activo dropdown (X - index 23)
    requests.push(createDropdown(provSheetId, 1, 101, 23, 24, DROPDOWN_OPTIONS.yesNo))
  }

  // ========================
  // 🏷️ Marcas (15 columns)
  // A-Código, B-Nombre, C-Tipo, D-Segmento, E-País, F-Empresa Matriz, G-Fundación,
  // H-Especialidades, I-Solo Veterinaria, J-Distribuidor, K-Sitio Web, L-Productos Clave,
  // M-#Productos, N-Descripción, O-Activo
  // ========================
  const brandSheetId = sheetMap['🏷️ Marcas']
  if (brandSheetId !== undefined) {
    console.log('  🏷️ Marcas...')

    // Tipo dropdown (C - index 2)
    requests.push(createDropdown(brandSheetId, 1, 151, 2, 3, DROPDOWN_OPTIONS.brandTypes, false))

    // Segmento dropdown (D - index 3)
    requests.push(
      createDropdown(brandSheetId, 1, 151, 3, 4, DROPDOWN_OPTIONS.marketSegments, false)
    )

    // Solo Veterinaria dropdown (I - index 8)
    requests.push(createDropdown(brandSheetId, 1, 151, 8, 9, DROPDOWN_OPTIONS.yesNo))

    // Activo dropdown (O - index 14)
    requests.push(createDropdown(brandSheetId, 1, 151, 14, 15, DROPDOWN_OPTIONS.yesNo))
  }

  // ========================
  // ⚙️ Configuración (4 columns: Parámetro, Valor, Descripción, Activo)
  // ========================
  const configSheetId = sheetMap['⚙️ Configuración']
  if (configSheetId !== undefined) {
    console.log('  ⚙️ Configuración...')

    // Activo dropdown (D - index 3)
    requests.push(createDropdown(configSheetId, 1, 51, 3, 4, DROPDOWN_OPTIONS.yesNo))
  }

  // ========================
  // 🆕 Productos (CATÁLOGO MASTER - 15 columns)
  // A-SKU, B-Nombre, C-Categoría, D-Marca, E-Unid.Compra, F-Cant.Contenida, G-Unid.Venta,
  // H-PrecioCompra, I-CostoUnit(calc), J-Proveedor, K-Especies, L-Receta, M-EnStock(calc), N-Descripción, O-Activo
  // ========================
  const prodSheetId = sheetMap['🆕 Productos']
  if (prodSheetId !== undefined) {
    console.log('  🆕 Productos (Catálogo Master)...')

    // Categoría dropdown (C - col 2) - from 🔧 Datos
    requests.push(createDropdownFromRange(prodSheetId, 1, 1201, 2, 3, "='🔧 Datos'!$A$2:$A$1200"))

    // Marca dropdown (D - col 3) - from 🔧 Datos
    requests.push(createDropdownFromRange(prodSheetId, 1, 1201, 3, 4, "='🔧 Datos'!$B$2:$B$1200"))

    // Unid. Compra dropdown (E - col 4)
    requests.push(createDropdown(prodSheetId, 1, 1201, 4, 5, DROPDOWN_OPTIONS.unitsBuy, false))

    // Unid. Venta dropdown (G - col 6)
    requests.push(createDropdown(prodSheetId, 1, 1201, 6, 7, DROPDOWN_OPTIONS.unitsSell, false))

    // Proveedor dropdown (J - col 9) - from 🔧 Datos
    requests.push(createDropdownFromRange(prodSheetId, 1, 1201, 9, 10, "='🔧 Datos'!$C$2:$C$1200"))

    // Especies dropdown (K - col 10)
    requests.push(createDropdown(prodSheetId, 1, 1201, 10, 11, DROPDOWN_OPTIONS.species, false))

    // Receta dropdown (L - col 11)
    requests.push(createDropdown(prodSheetId, 1, 1201, 11, 12, DROPDOWN_OPTIONS.yesNo))

    // Activo dropdown (O - col 14)
    requests.push(createDropdown(prodSheetId, 1, 1201, 14, 15, DROPDOWN_OPTIONS.yesNo))
  }

  // ========================
  // 📋 Mis Productos - SIMPLIFIED (18 columns)
  // Client enters (4 cols): A-Producto, B-PrecioVenta, C-StockMín, D-Ubicación
  // Auto-fill (7 cols): E-Código, F-Descripción, G-Categoría, H-Marca, I-Proveedor, J-CódigoBarras, K-Receta
  // Calculated (7 cols): L-Últ.Costo, M-Margen%, N-Stock, O-Valor, P-Estado, Q-Próx.Vence, R-Alertas
  // ========================
  const myProdSheetId = sheetMap['📋 Mis Productos']
  if (myProdSheetId !== undefined) {
    console.log('  📋 Mis Productos...')

    // Producto dropdown (A - col 0) - from 🔧 Datos (productos del catálogo activos)
    // NOTE: Range extended to $D$2100 to accommodate 2080+ products in catalog
    requests.push(createDropdownFromRange(myProdSheetId, 1, 501, 0, 1, "='🔧 Datos'!$D$2:$D$2100"))

    // Ubicación dropdown (D - col 3) - from 🔧 Datos (ubicaciones activas)
    requests.push(createDropdownFromRange(myProdSheetId, 1, 501, 3, 4, "='🔧 Datos'!$F$2:$F$1200"))

    // Note: Other columns (E-R) are auto-filled or calculated, no dropdowns needed
  }

  // ========================
  // 📦 Movimientos Stock - 15 columns (A-O)
  // Client enters (10 cols): A-Fecha, B-Producto, C-Operación, D-Cantidad, E-Lote, F-Ubicación, G-Responsable, H-CostoUnit, I-Vencimiento, J-Documento
  // Calculated (5 cols): K-#, L-Código, M-CostoUsado, N-+/-, O-Total
  // ========================
  const stockSheetId = sheetMap['📦 Movimientos Stock']
  if (stockSheetId !== undefined) {
    console.log('  📦 Movimientos Stock...')

    // Producto dropdown (B - col 1) - from 🔧 Datos (Mis Productos activos)
    requests.push(createDropdownFromRange(stockSheetId, 1, 1001, 1, 2, "='🔧 Datos'!$E$2:$E$1200"))

    // Operación dropdown (C - col 2)
    requests.push(createDropdown(stockSheetId, 1, 1001, 2, 3, DROPDOWN_OPTIONS.operations))

    // Ubicación dropdown (F - col 5) - from 🔧 Datos (ubicaciones activas)
    requests.push(createDropdownFromRange(stockSheetId, 1, 1001, 5, 6, "='🔧 Datos'!$F$2:$F$50"))

    // Responsable dropdown (G - col 6) - from 🔧 Datos (responsables activos)
    requests.push(createDropdownFromRange(stockSheetId, 1, 1001, 6, 7, "='🔧 Datos'!$G$2:$G$50"))

    // Note: Lote (E), Vencimiento (I), Documento (J) are free text/date fields
  }

  // Execute validations
  await batchUpdate(spreadsheetId, requests, 50)

  console.log('\n  ✅ Validations applied\n')
}
