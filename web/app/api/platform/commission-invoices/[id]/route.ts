/**
 * Platform Admin - Single Commission Invoice
 *
 * GET /api/platform/commission-invoices/[id] - Get invoice detail with line items
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
  const { id: invoiceId } = await params
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
    // Get invoice with tenant info
    const { data: invoice, error: invoiceError } = await supabase
      .from('store_commission_invoices')
      .select(
        `
        *,
        tenants!inner(id, name, ecommerce_start_date, commission_tier)
      `
      )
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'invoice', message: 'Factura no encontrada' },
      })
    }

    // Get line items (commissions included in this invoice)
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('store_commissions')
      .select(
        `
        id,
        order_id,
        order_total,
        commissionable_amount,
        commission_rate,
        commission_amount,
        rate_type,
        calculated_at,
        store_orders!inner(order_number, created_at)
      `
      )
      .eq('invoice_id', invoiceId)
      .order('calculated_at', { ascending: false })

    if (lineItemsError) throw lineItemsError

    return NextResponse.json({
      invoice,
      line_items: lineItems || [],
    })
  } catch (e) {
    logger.error('Platform admin: Error fetching commission invoice detail', {
      invoiceId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar detalle de factura' },
    })
  }
}
