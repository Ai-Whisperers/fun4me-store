import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface TransactionRecord {
  id: string
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage' | 'theft' | 'expired' | 'transfer'
  quantity: number
  unit_cost: number | null
  notes: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
  performed_by: {
    id: string
    full_name: string
  } | null
}

interface HistoryResponse {
  transactions: TransactionRecord[]
  summary: {
    total_in: number
    total_out: number
    current_stock: number
    wac: number
  }
  product: {
    id: string
    name: string
    sku: string | null
  }
}

/**
 * GET /api/inventory/[productId]/history
 * Get stock movement history for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get user profile and verify staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  if (profile.role !== 'admin' && profile.role !== 'vet') {
    return NextResponse.json({ error: 'Solo personal autorizado' }, { status: 403 })
  }

  const tenantId = profile.tenant_id

  // Get query params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')
  const type = searchParams.get('type') // Filter by transaction type

  try {
    // Get product info
    const { data: product, error: productError } = await supabase
      .from('store_products')
      .select('id, name, sku')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Get current inventory
    const { data: inventory } = await supabase
      .from('store_inventory')
      .select('stock_quantity, weighted_average_cost')
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .single()

    // Build query for transactions
    let query = supabase
      .from('store_inventory_transactions')
      .select(`
        id,
        type,
        quantity,
        unit_cost,
        notes,
        reference_type,
        reference_id,
        created_at,
        performed_by:profiles!store_inventory_transactions_performed_by_fkey (
          id,
          full_name
        )
      `)
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add type filter if specified
    if (type) {
      query = query.eq('type', type)
    }

    const { data: transactions, error: transError } = await query

    if (transError) {
      logger.error('Error fetching transaction history', { error: transError })
      return NextResponse.json({ error: 'Error al cargar historial' }, { status: 500 })
    }

    // Calculate summary from all transactions (not just paginated)
    const { data: allTransactions } = await supabase
      .from('store_inventory_transactions')
      .select('type, quantity')
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)

    let totalIn = 0
    let totalOut = 0

    if (allTransactions) {
      for (const t of allTransactions) {
        if (t.quantity > 0) {
          totalIn += t.quantity
        } else {
          totalOut += Math.abs(t.quantity)
        }
      }
    }

    const response: HistoryResponse = {
      transactions: (transactions || []) as unknown as TransactionRecord[],
      summary: {
        total_in: totalIn,
        total_out: totalOut,
        current_stock: inventory?.stock_quantity || 0,
        wac: inventory?.weighted_average_cost || 0,
      },
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('Exception in inventory history', { error: error.message })
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
