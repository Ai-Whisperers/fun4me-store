import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LIMITS, formatFileSize } from '@/lib/constants'
import * as ExcelJS from 'exceljs'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

// Set max duration to 60 seconds to prevent server hangs on large imports
// This protects against DoS via large files that take too long to process
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Auth & Role check
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

  // TICKET-SEC-009: File validation constants (sizes from LIMITS)
  const ALLOWED_EXCEL_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  // SEC-004: Extension whitelists
  const ALLOWED_EXCEL_EXTENSIONS = ['xlsx', 'xls', 'csv']
  const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

  /**
   * Validates file extension against whitelist
   */
  function validateExtension(filename: string, allowedExtensions: string[]): string | null {
    const extension = filename.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      return null
    }
    return extension
  }

  try {
    let rpcData: Record<string, unknown>[] = []
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      rpcData = body.rows || []

      // TICKET-SEC-009: Validate row count for JSON import
      if (rpcData.length > LIMITS.MAX_IMPORT_ROWS) {
        return NextResponse.json({ error: `Máximo ${LIMITS.MAX_IMPORT_ROWS} filas permitidas` }, { status: 400 })
      }
    } else {
      const formData = await req.formData()
      const type = formData.get('type') as string

      if (type === 'image') {
        const file = formData.get('file') as File
        const sku = formData.get('sku') as string
        if (!file || !sku) return NextResponse.json({ error: 'Datos faltantes' }, { status: 400 })

        // TICKET-SEC-009: Validate image file
        if (file.size > LIMITS.MAX_IMPORT_FILE_SIZE) {
          return NextResponse.json({ error: `Archivo demasiado grande (máx ${formatFileSize(LIMITS.MAX_IMPORT_FILE_SIZE)})` }, { status: 400 })
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: 'Tipo de imagen no permitido. Use JPG, PNG o WebP' },
            { status: 400 }
          )
        }
        // SEC-004: Validate image extension
        const imageExt = validateExtension(file.name, ALLOWED_IMAGE_EXTENSIONS)
        if (!imageExt) {
          return NextResponse.json(
            { error: 'Extensión de imagen no permitida. Use .jpg, .jpeg, .png o .webp' },
            { status: 400 }
          )
        }

        const bytes = await file.arrayBuffer()
        // Use validated extension from SEC-004 check
        const fileName = `${profile.tenant_id}/${sku}_${Date.now()}.${imageExt}`

        // Upload to Storage
        const { data: storageData, error: sError } = await supabase.storage
          .from('store-products')
          .upload(fileName, bytes, { contentType: file.type, upsert: true })

        if (sError) throw new Error(`Storage Error: ${sError.message}`)

        // Get Public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('store-products').getPublicUrl(fileName)

        // Update Product
        const { error: pError } = await supabase
          .from('store_products')
          .update({ image_url: publicUrl })
          .eq('tenant_id', profile.tenant_id)
          .eq('sku', sku)

        if (pError) throw new Error(`Product Update Error: ${pError.message}`)

        return NextResponse.json({ success: 1, url: publicUrl })
      }

      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'Archivo faltante' }, { status: 400 })

      // TICKET-SEC-009: Validate spreadsheet file
      if (file.size > LIMITS.MAX_IMPORT_FILE_SIZE) {
        return NextResponse.json({ error: `Archivo demasiado grande (máx ${formatFileSize(LIMITS.MAX_IMPORT_FILE_SIZE)})` }, { status: 400 })
      }
      if (!ALLOWED_EXCEL_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Tipo de archivo no permitido. Use Excel (.xlsx) o CSV' },
          { status: 400 }
        )
      }
      // SEC-004: Validate spreadsheet extension
      const spreadsheetExt = validateExtension(file.name, ALLOWED_EXCEL_EXTENSIONS)
      if (!spreadsheetExt) {
        return NextResponse.json(
          { error: 'Extensión de archivo no permitida. Use .xlsx, .xls o .csv' },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(bytes)
      const worksheet = workbook.worksheets[0]

      // Parse worksheet to array of objects (like XLSX.utils.sheet_to_json)
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

      // TICKET-SEC-009: Validate row count
      if (rows.length > LIMITS.MAX_IMPORT_ROWS) {
        return NextResponse.json({ error: `Máximo ${LIMITS.MAX_IMPORT_ROWS} filas permitidas` }, { status: 400 })
      }

      // Map rows to RPC format - supports both English and Spanish column names
      rpcData = rows.map((row) => ({
        operation: String(
          row['Operation (Required)'] ||
            row['Operation (Optional)'] ||
            row['Operación'] ||
            row['Operación (Requerido)'] ||
            ''
        )
          .trim()
          .toLowerCase(),
        sku: String(row['SKU'] || row['SKU (Opcional)'] || row['SKU (Requerido)'] || '').trim(),
        name: String(row['Name'] || row['Nombre (Requerido)'] || row['Nombre'] || '').trim(),
        category: String(
          row['Category'] || row['Categoría (Requerido)'] || row['Categoría'] || ''
        ).trim(),
        price: Number.parseFloat(
          String(
            row['Base Price (Sell)'] ||
              row['Precio Venta (Requerido)'] ||
              row['Nuevo Precio Venta'] ||
              row['Precio Venta'] ||
              '0'
          )
        ),
        quantity: Number.parseFloat(
          String(
            row['Quantity (Add/Remove)'] ||
              row['Stock Inicial'] ||
              row['Cantidad (+/-)'] ||
              row['Cantidad'] ||
              '0'
          )
        ),
        cost: Number.parseFloat(
          String(
            row['Unit Cost (Buy)'] ||
              row['Costo Unitario'] ||
              row['Costo Unitario (Compras)'] ||
              '0'
          )
        ),
        description: String(row['Description'] || row['Descripción'] || ''),
        // Additional fields for comprehensive inventory management
        barcode: String(row['Barcode'] || row['Código de Barras'] || '').trim() || null,
        min_stock_level: Number.parseFloat(
          String(
            row['Min Stock Level'] || row['Stock Mínimo (Alerta)'] || row['Stock Mínimo'] || '0'
          )
        ),
        expiry_date:
          String(
            row['Expiry Date (YYYY-MM-DD)'] ||
              row['Expiry Date'] ||
              row['Fecha Vencimiento (YYYY-MM-DD)'] ||
              row['Fecha Vencimiento'] ||
              row['Fecha Venc.'] ||
              ''
          ).trim() || null,
        batch_number:
          String(row['Batch Number'] || row['Número de Lote'] || row['Lote'] || '').trim() || null,
        supplier_name: String(row['Supplier'] || row['Proveedor'] || '').trim() || null,
        is_active:
          String(row['Active'] || row['Activo (SI/NO)'] || row['Activo'] || 'SI').toUpperCase() !==
          'NO',
      }))
    }

    // 3. Call Atomic RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('import_inventory_batch', {
      p_tenant_id: profile.tenant_id,
      p_performer_id: user.id,
      p_rows: rpcData,
    })

    if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`)

    return NextResponse.json({
      success: rpcResult.success_count,
      errors: rpcResult.errors,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
