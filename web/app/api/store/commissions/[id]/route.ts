/**
 * Single Commission Detail API - Clinic View
 *
 * GET /api/store/commissions/[id] - Get single commission detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
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

  // 2. Get profile and verify staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  // Only staff can view commission details
  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  try {
    // Get commission with order details (tenant-scoped via RLS + explicit filter)
    const { data: commission, error } = await supabase
      .from('store_commissions')
      .select(
        `
        id,
        order_id,
        tenant_id,
        order_total,
        shipping_amount,
        tax_amount,
        commissionable_amount,
        commission_rate,
        commission_amount,
        rate_type,
        months_active,
        status,
        original_commission,
        refund_amount,
        refund_date,
        refund_reason,
        adjustment_amount,
        adjustment_reason,
        adjusted_at,
        invoice_id,
        calculated_at,
        created_at,
        updated_at,
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
          profiles!store_orders_customer_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        ),
        store_commission_invoices(
          id,
          invoice_number,
          period_start,
          period_end,
          status,
          due_date
        )
      `
      )
      .eq('id', commissionId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !commission) {
      logger.warn('Commission not found', {
        commissionId,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'commission', message: 'Comisión no encontrada' },
      })
    }

    // Get adjuster info if adjusted
    let adjuster = null
    if (commission.adjusted_at) {
      const { data: adjusterData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('tenant_id', profile.tenant_id)
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
    logger.error('Error fetching commission detail', {
      commissionId,
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar detalle de comisión' },
    })
  }
}
