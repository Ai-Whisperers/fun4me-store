/**
 * Inventory Export Excel Generator
 *
 * Generates Excel workbooks for inventory template and catalog export.
 * Extracted from the API route for better separation of concerns.
 */

import * as ExcelJS from 'exceljs'

// =============================================================================
// TYPES
// =============================================================================

export interface ProductForExport {
  sku: string
  name: string
  description: string | null
  base_price: number
  barcode: string | null
  is_active: boolean
  store_categories: { name: string } | null
  store_inventory: {
    stock_quantity: number
    weighted_average_cost: number | null
    min_stock_level: number | null
    expiry_date: string | null
    batch_number: string | null
    supplier_name: string | null
  } | null
}

// =============================================================================
// HELPERS
// =============================================================================

interface DataValidation {
  cells: string  // e.g., 'B8:B100'
  values: string[]  // e.g., ['Purchase', 'Sale', ...]
}

function addStyledSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: unknown[][],
  colWidths: number[],
  validation?: DataValidation
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet(sheetName)

  // Add data row by row
  data.forEach((row) => {
    worksheet.addRow(row)
  })

  // Set column widths
  colWidths.forEach((width, index) => {
    const column = worksheet.getColumn(index + 1)
    column.width = width
  })

  // Add data validation if provided
  if (validation) {
    // Parse cell range (e.g., 'B8:B100' -> column B, rows 8-100)
    const match = validation.cells.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
    if (match) {
      const [, col, startRow, , endRow] = match
      const formula = `"${validation.values.join(',')}"`
      
      // Apply validation to each cell in the range
      for (let row = parseInt(startRow); row <= parseInt(endRow); row++) {
        const cell = worksheet.getCell(`${col}${row}`)
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [formula]
        }
      }
    }
  }

  return worksheet
}

// =============================================================================
// TEMPLATE SHEETS
// =============================================================================

function createInstructionsSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const data = [
    ['', '', '', ''],
    ['', '📦 PLANTILLA DE INVENTARIO', '', ''],
    ['', 'Sistema de Gestión Veterinaria', '', ''],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', '📋 HOJAS DISPONIBLES', '', ''],
    ['', '', '', ''],
    ['', '   1️⃣  Instrucciones', 'Esta guía de uso (no importar)', ''],
    ['', '   2️⃣  Nuevos Productos', 'Agregar productos nuevos al catálogo', ''],
    ['', '   3️⃣  Movimientos', 'Compras, ventas, ajustes de stock', ''],
    ['', '   4️⃣  Ejemplos', 'Ejemplos completos de cada operación', ''],
    ['', '   5️⃣  Categorías', 'Lista de categorías disponibles', ''],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', '⚡ OPERACIONES DISPONIBLES', '', ''],
    ['', '', '', ''],
    ['', 'OPERACIÓN', 'DESCRIPCIÓN', 'CANTIDAD'],
    ['', 'New Product', 'Crear un producto nuevo', 'Stock inicial (opcional)'],
    ['', 'Purchase', 'Registrar compra de stock', 'Positiva (+)'],
    ['', 'Sale', 'Registrar venta', 'Negativa (-)'],
    ['', 'Adjustment', 'Ajuste de inventario físico', '+/- según diferencia'],
    ['', 'Damage', 'Productos dañados', 'Negativa (-)'],
    ['', 'Theft', 'Productos robados/perdidos', 'Negativa (-)'],
    ['', 'Price Update', 'Solo actualizar precio', 'No aplica (0)'],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', '✅ CAMPOS OBLIGATORIOS', '', ''],
    ['', '', '', ''],
    ['', 'New Product:', 'Nombre, Categoría, Precio Venta', ''],
    ['', 'Purchase:', 'SKU, Cantidad (+), Costo Unitario', ''],
    ['', 'Sale:', 'SKU, Cantidad (-)', ''],
    ['', 'Adjustment:', 'SKU, Cantidad (+/-)', ''],
    ['', 'Price Update:', 'SKU, Precio Venta (nuevo)', ''],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', '💡 NOTAS IMPORTANTES', '', ''],
    ['', '', '', ''],
    ['', '   •', 'El SKU es único. Si lo deja vacío, se genera automáticamente.', ''],
    ['', '   •', 'Las compras actualizan el Costo Promedio Ponderado.', ''],
    ['', '   •', 'Las categorías se crean automáticamente si no existen.', ''],
    ['', '   •', 'Máximo 1000 filas por importación.', ''],
    ['', '   •', 'Formato de fecha: YYYY-MM-DD (ej: 2025-06-30)', ''],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
  ]
  return { data, widths: [5, 25, 45, 20] }
}

function createNewProductsSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const header = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '🆕 NUEVOS PRODUCTOS', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Complete los campos para agregar productos al catálogo', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]

  const columns = [
    '', 'OPERACIÓN', 'SKU', 'CÓDIGO BARRAS', 'NOMBRE ⭐', 'CATEGORÍA ⭐',
    'DESCRIPCIÓN', 'PRECIO VENTA ⭐', 'STOCK INICIAL', 'COSTO UNITARIO',
    'STOCK MÍNIMO', 'FECHA VENC.', 'LOTE', 'PROVEEDOR', 'ACTIVO',
  ]

  const example = [
    '', 'New Product', '', '', '(Nombre del producto)', '(Ej: Alimentos)',
    '(Descripción opcional)', 0, 0, 0, 0, '(YYYY-MM-DD)', '', '', 'SI',
  ]

  const emptyRows = Array(20).fill(null).map(() =>
    ['', 'New Product', '', '', '', '', '', 0, 0, 0, 0, '', '', '', 'SI']
  )

  const data = [...header, columns, example, ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], ...emptyRows]

  return { data, widths: [3, 14, 15, 16, 30, 18, 35, 15, 14, 15, 14, 14, 12, 18, 10] }
}

function createMovementsSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const header = [
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '📦 MOVIMIENTOS DE STOCK', '', '', '', '', '', '', '', ''],
    ['', 'Registre compras, ventas, ajustes y pérdidas', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
  ]

  const columns = [
    '', 'OPERACIÓN ⭐', 'SKU ⭐', 'CANTIDAD', 'COSTO UNIT.',
    'NUEVO PRECIO', 'FECHA VENC.', 'LOTE', 'PROVEEDOR', 'NOTAS',
  ]

  const guide = [
    '', '▼ Seleccione', '(SKU existente)', '(+/-)', '(Solo compras)',
    '(Solo precios)', '(YYYY-MM-DD)', '', '', '(Opcional)',
  ]

  const emptyRows = Array(25).fill(null).map(() => ['', '', '', 0, 0, 0, '', '', '', ''])

  const data = [...header, columns, guide, ['', '', '', '', '', '', '', '', '', ''], ...emptyRows]

  return {
    data,
    widths: [3, 16, 18, 14, 14, 14, 14, 14, 18, 35],
    validation: {
      cells: 'B8:B100',
      values: ['Purchase', 'Sale', 'Adjustment', 'Damage', 'Theft', 'Price Update', 'Expired', 'Return']
    }
  }
}

function createExamplesSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const data = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '📚 EJEMPLOS COMPLETOS', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Use estos ejemplos como referencia para sus importaciones', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '🆕 EJEMPLOS DE NUEVOS PRODUCTOS', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Operación', 'SKU', 'Código Barras', 'Nombre', 'Categoría', 'Descripción', 'Precio', 'Stock', 'Costo', 'Mín.', 'Vencimiento', 'Lote', 'Proveedor', 'Activo'],
    ['', 'New Product', 'ALI-DOG-001', '7891234567890', 'Royal Canin Adult 15kg', 'Alimento Perros', 'Alimento premium para perros adultos', 185000, 10, 145000, 3, '2025-12-31', 'RC2024-A1', 'Distribuidora PetFood', 'SI'],
    ['', 'New Product', 'ALI-CAT-001', '', 'Whiskas Adulto Atún 1kg', 'Alimento Gatos', '', 25000, 20, 18000, 5, '', '', '', 'SI'],
    ['', 'New Product', 'MED-ANTI-001', '', 'Frontline Plus Perro M', 'Antiparasitarios', 'Pipeta para perros 10-20kg', 85000, 15, 62000, 5, '2025-06-30', 'FL2024-123', 'Merial Paraguay', 'SI'],
    ['', 'New Product', 'ACC-COL-001', '7897654321098', 'Collar Nylon Mediano', 'Accesorios', 'Collar ajustable rojo', 35000, 8, 22000, 2, '', '', 'Pet Accesorios SA', 'SI'],
    ['', 'New Product', 'HIG-SHA-001', '', 'Shampoo Antipulgas 500ml', 'Higiene', 'Shampoo medicado', 45000, 12, 28000, 4, '2026-03-15', 'SH2025-001', 'Laboratorio VetCare', 'SI'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '📦 EJEMPLOS DE MOVIMIENTOS DE STOCK', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Operación', 'SKU', 'Cantidad', 'Costo Unit.', 'Nuevo Precio', 'Vencimiento', 'Lote', 'Proveedor', 'Notas', '', '', '', '', ''],
    ['', 'Purchase', 'ALI-DOG-001', 20, 142000, '', '2026-01-15', 'RC2025-B2', 'Distribuidora PetFood', '✅ Compra mensual enero', '', '', '', '', ''],
    ['', 'Sale', 'ALI-DOG-001', -1, '', '', '', '', '', '💰 Venta mostrador', '', '', '', '', ''],
    ['', 'Adjustment', 'ACC-COL-001', -2, '', '', '', '', '', '📋 Diferencia inventario 15/01', '', '', '', '', ''],
    ['', 'Damage', 'HIG-SHA-001', -1, '', '', '', '', '', '⚠️ Envase roto en almacén', '', '', '', '', ''],
    ['', 'Theft', 'MED-ANTI-001', -3, '', '', '', '', '', '🚨 Faltante detectado 20/01', '', '', '', '', ''],
    ['', 'Price Update', 'ALI-DOG-001', 0, '', 195000, '', '', '', '💲 Actualización precio 2025', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '💡 RECORDATORIO', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '   ✓', 'Cantidades positivas (+) = Aumentan el stock', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '   ✓', 'Cantidades negativas (-) = Disminuyen el stock', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '   ✓', 'Costo Unitario es OBLIGATORIO solo para "Purchase"', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '   ✓', 'Nuevo Precio solo aplica para "Price Update"', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]

  return { data, widths: [3, 14, 16, 16, 25, 18, 35, 12, 10, 12, 8, 14, 14, 20, 8] }
}

function createCategoriesSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const data = [
    ['', '', '', ''],
    ['', '🏷️ CATEGORÍAS DISPONIBLES', '', ''],
    ['', 'Use estos nombres o cree nuevas categorías', '', ''],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', 'CATEGORÍA', 'SLUG (Auto)', 'DESCRIPCIÓN'],
    ['', '', '', ''],
    ['', '🐕 Alimento Perros', 'alimento-perros', 'Alimentos balanceados para perros'],
    ['', '🐱 Alimento Gatos', 'alimento-gatos', 'Alimentos balanceados para gatos'],
    ['', '🦠 Antiparasitarios', 'antiparasitarios', 'Productos contra pulgas, garrapatas y parásitos'],
    ['', '🎾 Accesorios', 'accesorios', 'Collares, correas, juguetes y más'],
    ['', '🧴 Higiene', 'higiene', 'Shampoos, cepillos y productos de limpieza'],
    ['', '💊 Medicamentos', 'medicamentos', 'Medicamentos veterinarios con receta'],
    ['', '💪 Suplementos', 'suplementos', 'Vitaminas, minerales y suplementos nutricionales'],
    ['', '🛏️ Camas y Casas', 'camas-casas', 'Camas, cuchas y casas para mascotas'],
    ['', '✈️ Transportadoras', 'transportadoras', 'Jaulas y transportadoras para viajes'],
    ['', '🦴 Snacks y Premios', 'snacks-premios', 'Golosinas y premios para entrenamiento'],
    ['', '🐦 Alimento Aves', 'alimento-aves', 'Semillas y alimentos para aves'],
    ['', '🐹 Alimento Roedores', 'alimento-roedores', 'Alimentos para hamsters, conejos y más'],
    ['', '🐠 Acuarios', 'acuarios', 'Productos para acuarios y peces'],
    ['', '🏥 Material Clínico', 'material-clinico', 'Jeringas, gasas, guantes y más'],
    ['', '🧬 Laboratorio', 'laboratorio', 'Reactivos y materiales de laboratorio'],
    ['', '', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', ''],
    ['', '', '', ''],
    ['', '💡 NOTA:', 'Puede crear categorías nuevas simplemente', ''],
    ['', '', 'escribiéndolas en la columna Categoría', ''],
    ['', '', 'al importar productos.', ''],
    ['', '', '', ''],
  ]

  return { data, widths: [3, 25, 22, 45] }
}

function createQuickImportSheet(): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const data = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '⚡ IMPORTACIÓN RÁPIDA', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Formato simplificado - todas las operaciones en una hoja', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 'Operation', 'SKU', 'Name', 'Category', 'Description', 'Base Price', 'Quantity', 'Unit Cost', 'Min Stock', 'Expiry Date', 'Batch', 'Supplier', 'Barcode'],
    ['', '(Required)', '', '', '', '', '(Sell)', '(+/-)', '(Buy)', '(Alert)', '(YYYY-MM-DD)', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]

  // Add 30 empty rows
  for (let i = 0; i < 30; i++) {
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  }

  return {
    data,
    widths: [3, 15, 16, 28, 20, 35, 14, 12, 14, 12, 14, 14, 20, 16],
    validation: {
      cells: 'B8:B100',
      values: ['New Product', 'Purchase', 'Sale', 'Adjustment', 'Damage', 'Theft', 'Price Update', 'Expired', 'Return']
    }
  }
}

// =============================================================================
// CATALOG EXPORT
// =============================================================================

function createSummarySheet(
  totalProducts: number,
  activeCount: number,
  lowStockCount: number,
  totalValue: number
): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const data = [
    ['', '', ''],
    ['', '📊 RESUMEN DE INVENTARIO', ''],
    ['', new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), ''],
    ['', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''],
    ['', '', ''],
    ['', '📦 Total de Productos', totalProducts],
    ['', '✅ Productos Activos', activeCount],
    ['', '⚠️ Bajo Stock Mínimo', lowStockCount],
    ['', '💰 Valor del Inventario', `Gs. ${totalValue.toLocaleString('es-PY')}`],
    ['', '', ''],
    ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''],
    ['', '', ''],
    ['', '📝 INSTRUCCIONES PARA ACTUALIZAR', ''],
    ['', '', ''],
    ['', '1.', 'En "Catálogo", complete la columna "Operation"'],
    ['', '2.', 'Purchase: cantidad positiva + costo unitario'],
    ['', '3.', 'Adjustment: cantidad +/- según diferencia'],
    ['', '4.', 'Price Update: modifique "Base Price"'],
    ['', '5.', 'Columnas READ ONLY son solo de referencia'],
    ['', '6.', 'Guarde y suba el archivo al sistema'],
    ['', '', ''],
  ]

  return { data, widths: [3, 30, 25] }
}

function createCatalogSheet(products: ProductForExport[]): { data: unknown[][], widths: number[], validation?: DataValidation } {
  const totalProducts = products.length

  const header = [
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '📋 CATÁLOGO DE PRODUCTOS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', `${totalProducts} productos | Exportado: ${new Date().toLocaleString('es-PY')}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]

  const columns = [
    '', 'Operation', 'SKU', 'Barcode', 'Name', 'Category', 'Description', 'Base Price',
    'Quantity (+/-)', 'Unit Cost', 'Min Stock', 'Expiry Date', 'Batch', 'Supplier', 'Active',
    '│', 'Current Stock', 'Avg Cost', 'Value',
  ]

  const guideRow = [
    '', '▼', '', '', '', '', '', '', '', '', '', '', '', '', '', '│', '(READ ONLY)', '(READ ONLY)', '(READ ONLY)',
  ]

  const productRows = products.map((p) => [
    '',
    '',
    p.sku || '',
    p.barcode || '',
    p.name,
    p.store_categories?.name || '',
    p.description || '',
    p.base_price,
    0,
    0,
    p.store_inventory?.min_stock_level || 0,
    p.store_inventory?.expiry_date || '',
    p.store_inventory?.batch_number || '',
    p.store_inventory?.supplier_name || '',
    p.is_active ? 'SI' : 'NO',
    '│',
    p.store_inventory?.stock_quantity || 0,
    p.store_inventory?.weighted_average_cost || 0,
    (p.store_inventory?.stock_quantity || 0) * (p.store_inventory?.weighted_average_cost || 0),
  ])

  const data = [...header, columns, guideRow, ...productRows]

  return {
    data,
    widths: [3, 14, 16, 16, 30, 18, 35, 14, 14, 12, 12, 14, 14, 18, 8, 3, 14, 14, 16],
    validation: {
      cells: 'B7:B1000',
      values: ['Purchase', 'Sale', 'Adjustment', 'Damage', 'Theft', 'Price Update', 'Expired', 'Return']
    }
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate the inventory template workbook (for new imports)
 */
export function generateInventoryTemplate(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()

  const instructions = createInstructionsSheet()
  addStyledSheet(workbook, '📖 Instrucciones', instructions.data, instructions.widths, instructions.validation)

  const newProducts = createNewProductsSheet()
  addStyledSheet(workbook, '🆕 Nuevos Productos', newProducts.data, newProducts.widths, newProducts.validation)

  const movements = createMovementsSheet()
  addStyledSheet(workbook, '📦 Movimientos', movements.data, movements.widths, movements.validation)

  const examples = createExamplesSheet()
  addStyledSheet(workbook, '📚 Ejemplos', examples.data, examples.widths, examples.validation)

  const categories = createCategoriesSheet()
  addStyledSheet(workbook, '🏷️ Categorías', categories.data, categories.widths, categories.validation)

  const quickImport = createQuickImportSheet()
  addStyledSheet(workbook, '⚡ Importación Rápida', quickImport.data, quickImport.widths, quickImport.validation)

  return workbook
}

/**
 * Generate the catalog export workbook (current inventory)
 */
export function generateCatalogExport(products: ProductForExport[]): ExcelJS.Workbook {
  // Calculate statistics
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => {
    const qty = p.store_inventory?.stock_quantity || 0
    const cost = p.store_inventory?.weighted_average_cost || 0
    return sum + qty * cost
  }, 0)
  const lowStockCount = products.filter(
    (p) =>
      (p.store_inventory?.stock_quantity || 0) <= (p.store_inventory?.min_stock_level || 0) &&
      (p.store_inventory?.min_stock_level || 0) > 0
  ).length
  const activeCount = products.filter((p) => p.is_active).length

  const workbook = new ExcelJS.Workbook()

  const summary = createSummarySheet(totalProducts, activeCount, lowStockCount, totalValue)
  addStyledSheet(workbook, '📊 Resumen', summary.data, summary.widths, summary.validation)

  const catalog = createCatalogSheet(products)
  addStyledSheet(workbook, '📋 Catálogo', catalog.data, catalog.widths, catalog.validation)

  return workbook
}

/**
 * Write workbook to buffer
 */
export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
