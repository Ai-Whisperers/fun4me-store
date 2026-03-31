import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LIMITS } from '@/lib/constants'
import * as ExcelJS from 'exceljs'
import { inventoryImportPreviewBodySchema } from '@/lib/schemas/inventory'

interface PreviewRow {
  rowNumber: number
  operation: string
  sku: string
  name: string
  category: string
  price: number
  quantity: number
  cost: number
  expiryDate: string | null
  batchNumber: string | null
  status: 'new' | 'update' | 'adjustment' | 'error' | 'skip'
  message: string
  currentStock?: number
  newStock?: number
  priceChange?: { old: number; new: number }
  existingProduct?: {
    id: string
    name: string
    sku: string
    base_price: number
  }
}

interface PreviewSummary {
  totalRows: number
  newProducts: number
  updates: number
  adjustments: number
  errors: number
  skipped: number
}

/**
 * POST /api/inventory/import/preview
 * Preview what will happen when importing a file (dry-run)
 *
 * Supports two modes:
 * 1. File upload with FormData - parses Excel/CSV file
 * 2. JSON body with { rows: [...] } - accepts pre-mapped row data
 *
 * Query params:
 * - parseOnly=true - Just return headers and raw rows without preview analysis
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Auth & Role check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'vet')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const ALLOWED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]

  // Check if this is a parseOnly request or JSON body request
  const parseOnly = req.nextUrl.searchParams.get('parseOnly') === 'true'
  const contentType = req.headers.get('content-type') || ''
  const isJsonRequest = contentType.includes('application/json')

  try {
    // Handle JSON body request (pre-mapped rows from wizard)
    if (isJsonRequest) {
      const rawBody = await req.json()
      
      // Validate with Zod
      const validation = inventoryImportPreviewBodySchema.safeParse(rawBody)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', issues: validation.error.issues },
          { status: 400 }
        )
      }

      const { rows } = validation.data

      if (rows.length > LIMITS.MAX_IMPORT_ROWS) {
        return NextResponse.json({ error: `Máximo ${LIMITS.MAX_IMPORT_ROWS} filas permitidas` }, { status: 400 })
      }

      // Process the pre-mapped rows (skip to the preview analysis section)
      return await processPreview(rows as Record<string, unknown>[], profile, supabase)
    }

    // Handle FormData file upload
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Archivo faltante' }, { status: 400 })
    }

    if (file.size > LIMITS.MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 5MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use Excel (.xlsx) o CSV' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(bytes)
    const worksheet = workbook.worksheets[0]

    // For parseOnly mode, return raw headers and rows for column mapping
    if (parseOnly) {
      // Get all rows including headers (row 1 = headers, row 2+ = data)
      const rawData: string[][] = []
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowData: string[] = []
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowData.push(cell.value?.toString() || '')
        })
        rawData.push(rowData)
      })

      if (rawData.length < 2) {
        return NextResponse.json(
          { error: 'El archivo debe tener al menos una fila de encabezados y una de datos' },
          { status: 400 }
        )
      }

      const headers = rawData[0].map((h, i) => (h ? String(h).trim() : `Columna ${i + 1}`))
      const rows = rawData
        .slice(1)
        .filter((row) =>
          row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
        )

      if (rows.length > LIMITS.MAX_IMPORT_ROWS) {
        return NextResponse.json({ error: `Máximo ${LIMITS.MAX_IMPORT_ROWS} filas permitidas` }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        headers,
        rows: rows.map((row) =>
          row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
        ),
        totalRows: rows.length,
      })
    }

    // Full preview mode - parse as objects and analyze
    const headers: string[] = []
    const firstRow = worksheet.getRow(1)
    firstRow.eachCell({ includeEmpty: true }, (cell) => {
      headers.push(cell.value?.toString() || '')
    })

    const rows: Record<string, unknown>[] = []
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row
      const rowData: Record<string, unknown> = {}
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) {
          rowData[header] = cell.value
        }
      })
      rows.push(rowData)
    })

    if (rows.length > LIMITS.MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Máximo ${LIMITS.MAX_IMPORT_ROWS} filas permitidas` }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    return await processPreview(rows, profile, supabase)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Process preview for rows (shared between file upload and JSON body modes)
 */
async function processPreview(
  rows: Record<string, unknown>[],
  profile: { tenant_id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<NextResponse> {
  try {
    // Get all existing products for this tenant
    const { data: existingProducts } = await supabase
      .from('store_products')
      .select(
        `
        id,
        sku,
        name,
        base_price,
        store_inventory (stock_quantity)
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)

    // Create lookup maps
    const productsBySku = new Map((existingProducts || []).map((p) => [p.sku?.toLowerCase(), p]))
    const productsByName = new Map((existingProducts || []).map((p) => [p.name?.toLowerCase(), p]))

    // Get categories
    const { data: categories } = await supabase
      .from('store_categories')
      .select('id, name, slug')
      .eq('tenant_id', profile.tenant_id)

    const categoryMap = new Map((categories || []).map((c) => [c.name.toLowerCase(), c]))
    const categorySlugMap = new Map((categories || []).map((c) => [c.slug.toLowerCase(), c]))

    // Preview each row
    const previewRows: PreviewRow[] = []
    const summary: PreviewSummary = {
      totalRows: rows.length,
      newProducts: 0,
      updates: 0,
      adjustments: 0,
      errors: 0,
      skipped: 0,
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // Excel rows start at 1, plus header

      // Parse row data - supports both Excel column headers and standardized wizard field names
      const operation = String(
        row['operation'] || // Wizard standard field
          row['Operation (Required)'] ||
          row['Operation (Optional)'] ||
          row['Operación'] ||
          row['Operación (Requerido)'] ||
          ''
      )
        .trim()
        .toLowerCase()

      const sku = String(
        row['sku'] || // Wizard standard field
          row['SKU'] ||
          row['SKU (Opcional)'] ||
          row['SKU (Requerido)'] ||
          ''
      ).trim()

      const name = String(
        row['name'] || // Wizard standard field
          row['Name'] ||
          row['Nombre (Requerido)'] ||
          row['Nombre'] ||
          ''
      ).trim()

      const category = String(
        row['category'] || // Wizard standard field
          row['Category'] ||
          row['Categoría (Requerido)'] ||
          row['Categoría'] ||
          ''
      ).trim()

      const price =
        Number.parseFloat(
          String(
            row['price'] || // Wizard standard field
              row['Base Price (Sell)'] ||
              row['Precio Venta (Requerido)'] ||
              row['Nuevo Precio Venta'] ||
              row['Precio Venta'] ||
              '0'
          )
        ) || 0

      const quantity =
        Number.parseFloat(
          String(
            row['quantity'] || // Wizard standard field
              row['Quantity (Add/Remove)'] ||
              row['Stock Inicial'] ||
              row['Cantidad (+/-)'] ||
              row['Cantidad'] ||
              '0'
          )
        ) || 0

      const cost =
        Number.parseFloat(
          String(
            row['unit_cost'] || // Wizard standard field
              row['Unit Cost (Buy)'] ||
              row['Costo Unitario'] ||
              row['Costo Unitario (Compras)'] ||
              '0'
          )
        ) || 0

      const expiryDate =
        String(
          row['expiry_date'] || // Wizard standard field
            row['Expiry Date (YYYY-MM-DD)'] ||
            row['Expiry Date'] ||
            row['Fecha Vencimiento (YYYY-MM-DD)'] ||
            row['Fecha Vencimiento'] ||
            row['Fecha Venc.'] ||
            ''
        ).trim() || null

      const batchNumber =
        String(
          row['batch_number'] || // Wizard standard field
            row['Batch Number'] ||
            row['Número de Lote'] ||
            row['Lote'] ||
            ''
        ).trim() || null

      const previewRow: PreviewRow = {
        rowNumber,
        operation,
        sku,
        name,
        category,
        price,
        quantity,
        cost,
        expiryDate,
        batchNumber,
        status: 'skip',
        message: '',
      }

      // Validate and determine action
      const normalizedOp = operation.replace(/\s+/g, ' ').toLowerCase()
      const isNewProduct = ['new product', 'new', 'nuevo', 'nuevo producto', 'crear'].includes(
        normalizedOp
      )
      const isBuy = ['buy', 'purchase', 'compra', 'comprar'].includes(normalizedOp)
      const isAdjustment = ['adj', 'adjustment', 'ajuste', 'ajustar', 'adjust'].includes(
        normalizedOp
      )
      const isUpdate = ['update', 'actualizar', 'modificar'].includes(normalizedOp)

      // Find existing product
      const existingBySku = sku ? productsBySku.get(sku.toLowerCase()) : null
      const existingByName = name ? productsByName.get(name.toLowerCase()) : null
      const existing = existingBySku || existingByName

      if (isNewProduct) {
        if (!name) {
          previewRow.status = 'error'
          previewRow.message = 'Nombre requerido para nuevo producto'
          summary.errors++
        } else if (existing) {
          previewRow.status = 'error'
          previewRow.message = `Producto ya existe: ${existing.sku || existing.name}`
          previewRow.existingProduct = {
            id: existing.id,
            name: existing.name,
            sku: existing.sku,
            base_price: existing.base_price,
          }
          summary.errors++
        } else if (
          category &&
          !categoryMap.has(category.toLowerCase()) &&
          !categorySlugMap.has(category.toLowerCase())
        ) {
          previewRow.status = 'error'
          previewRow.message = `Categoría no encontrada: ${category}`
          summary.errors++
        } else if (price <= 0) {
          previewRow.status = 'error'
          previewRow.message = 'Precio debe ser mayor a 0'
          summary.errors++
        } else {
          previewRow.status = 'new'
          previewRow.message = 'Se creará nuevo producto'
          previewRow.newStock = quantity
          summary.newProducts++
        }
      } else if (isBuy || isAdjustment) {
        if (!existing) {
          previewRow.status = 'error'
          previewRow.message = `Producto no encontrado: ${sku || name}`
          summary.errors++
        } else {
          const currentStock = existing.store_inventory?.[0]?.stock_quantity || 0
          const newStock = isBuy ? currentStock + Math.abs(quantity) : currentStock + quantity

          if (newStock < 0) {
            previewRow.status = 'error'
            previewRow.message = `Stock resultante negativo: ${newStock}`
            summary.errors++
          } else {
            previewRow.status = 'adjustment'
            previewRow.message = isBuy
              ? `Compra: +${Math.abs(quantity)} unidades`
              : `Ajuste: ${quantity >= 0 ? '+' : ''}${quantity} unidades`
            previewRow.currentStock = currentStock
            previewRow.newStock = newStock
            previewRow.existingProduct = {
              id: existing.id,
              name: existing.name,
              sku: existing.sku,
              base_price: existing.base_price,
            }

            if (price > 0 && price !== existing.base_price) {
              previewRow.priceChange = { old: existing.base_price, new: price }
            }

            summary.adjustments++
          }
        }
      } else if (isUpdate) {
        if (!existing) {
          previewRow.status = 'error'
          previewRow.message = `Producto no encontrado: ${sku || name}`
          summary.errors++
        } else {
          previewRow.status = 'update'
          previewRow.message = 'Se actualizará producto'
          previewRow.existingProduct = {
            id: existing.id,
            name: existing.name,
            sku: existing.sku,
            base_price: existing.base_price,
          }

          if (price > 0 && price !== existing.base_price) {
            previewRow.priceChange = { old: existing.base_price, new: price }
          }

          summary.updates++
        }
      } else if (operation) {
        previewRow.status = 'error'
        previewRow.message = `Operación no reconocida: "${operation}"`
        summary.errors++
      } else {
        // Empty row or no operation - skip
        previewRow.status = 'skip'
        previewRow.message = 'Fila vacía o sin operación'
        summary.skipped++
      }

      previewRows.push(previewRow)
    }

    return NextResponse.json({
      success: true,
      preview: previewRows,
      summary,
      columns: Object.keys(rows[0] || {}),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
