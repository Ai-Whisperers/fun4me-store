/**
 * Platform Admin - Single Commission Detail
 *
 * GET /api/platform/commissions/[id] - Get commission detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'platform_admin'
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id: commissionId } = await params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Platform admin check
  const isAdmin = await isPlatformAdmin(supabase, user.id)
  if (!isAdmin) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Acceso restringido a administradores de plataforma' },
    })
  }

  try {
    // Get full commission detail (no tenant filter for platform admin)
    const { data: commission, error } = await supabase
      .from('store_commissions')
      .select(
        `
        *,
        tenants!inner(id, name, ecommerce_start_date, commission_tier),
        store_orders!inner(
          id,
          order_number,
          status,
          subtotal,
          discount_amount,
          shipping_cost,
          tax_amount,
          total,
          payment_method,
          payment_status,
          created_at,
          customer_id,
          profiles!store_orders_customer_id_fkey(full_name, email, phone)
        ),
        store_commission_invoices(
          id,
          invoice_number,
          period_start,
          period_end,
          status,
          due_date,
          paid_at
        )
      `
      )
      .eq('id', commissionId)
      .single()

    if (error || !commission) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'commission', message: 'Comisión no encontrada' },
      })
    }

    // Get adjuster info if adjusted
    let adjuster = null
    if (commission.adjusted_by) {
      const { data: adjusterData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', commission.adjusted_by)
        .single()
      adjuster = adjusterData
    }

    return NextResponse.json({
      commission: {
        ...commission,
        adjuster,
      },
    })
  } catch (e) {
    logger.error('Platform admin: Error fetching commission detail', {
      commissionId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar detalle de comisión' },
    })
  }
}
