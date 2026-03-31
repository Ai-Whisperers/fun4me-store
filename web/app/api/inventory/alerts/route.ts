import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export const GET = withApiAuth(async ({ supabase, profile, log }) => {
  try {
    // Get low stock products
    const { data: lowStock } = await supabase
      .from('low_stock_products')
      .select('*')
      .eq('tenant_id', profile.tenant_id)

    // Get expiring products
    const { data: expiring } = await supabase
      .from('expiring_products')
      .select('*')
      .eq('tenant_id', profile.tenant_id)

    return NextResponse.json({
      lowStock: lowStock || [],
      expiring: expiring || [],
      hasAlerts: (lowStock?.length || 0) > 0 || (expiring?.length || 0) > 0,
    })
  } catch (e) {
    log.error('Error fetching inventory alerts', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar alertas de inventario' },
    })
  }
}, { roles: ['vet', 'admin'] })
