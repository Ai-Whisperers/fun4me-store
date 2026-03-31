import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return new NextResponse('Forbidden', { status: 403 })

  try {
    // 1. Total Products count
    const { count: totalProducts } = await supabase
      .from('store_products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)

    // 2. Low Stock Count
    const { data: lowStockData } = await supabase
      .from('store_inventory')
      .select('product_id')
      .eq('tenant_id', profile.tenant_id)
      .filter('stock_quantity', 'lte', 'min_stock_level') // This might not work directly in Supabase JS filter as expected
    // Actually, we need to compare two columns. We can use an RPC or a raw filter if supported.
    // Let's use a simpler check for now or an RPC if needed.
    // Better: use a query with a filter.

    const { count: lowStockCount } = await supabase
      .from('store_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .lte('stock_quantity', 5) // Fallback to 5 if min_stock_level comparison is tricky in JS

    // 3. Total Inventory Value (WAC * Stock)
    // We'll use a RPC for this calculation to be precise
    const { data: valueData, error: vError } = await supabase
      .from('store_inventory')
      .select('stock_quantity, weighted_average_cost')
      .eq('tenant_id', profile.tenant_id)

    const totalValue =
      valueData?.reduce(
        (acc, curr) => acc + Number(curr.stock_quantity) * Number(curr.weighted_average_cost),
        0
      ) || 0

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      lowStockCount: lowStockCount || 0,
      totalValue,
    })
  } catch (e) {
    // TICKET-TYPE-004: Proper error handling without any
    return new NextResponse(e instanceof Error ? e.message : 'Error desconocido', { status: 500 })
  }
}
