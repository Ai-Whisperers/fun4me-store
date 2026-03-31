import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateInventoryTemplate,
  generateCatalogExport,
  workbookToBuffer,
  type ProductForExport,
} from '@/lib/excel'
import { inventoryExportQuerySchema } from '@/lib/schemas/inventory'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // 1. Auth check
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

  const { searchParams } = new URL(req.url)
  
  // Validate query params
  const queryValidation = inventoryExportQuerySchema.safeParse({
    type: searchParams.get('type'),
  })
  
  const type = queryValidation.success ? queryValidation.data.type : 'catalog'

  let workbook
  let filename: string

  if (type === 'template') {
    // Generate import template
    workbook = generateInventoryTemplate()
    filename = `plantilla_inventario_${profile.tenant_id}.xlsx`
  } else {
    // Export current catalog
    const { data: products, error } = await supabase
      .from('store_products')
      .select(`
        sku,
        name,
        description,
        base_price,
        barcode,
        is_active,
        store_categories(name),
        store_inventory(
          stock_quantity,
          weighted_average_cost,
          min_stock_level,
          expiry_date,
          batch_number,
          supplier_name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('name')

    if (error) {
      return new NextResponse(error.message, { status: 500 })
    }

    workbook = generateCatalogExport(products as unknown as ProductForExport[])
    filename = `inventario_${profile.tenant_id}_${new Date().toISOString().split('T')[0]}.xlsx`
  }

  const buffer = await workbookToBuffer(workbook)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
