/**
 * Platform Admin - Commissions API
 *
 * GET /api/platform/commissions - List all commissions across tenants
 *
 * Query params:
 * - tenant_id: string (filter by tenant)
 * - status: 'calculated' | 'invoiced' | 'paid' | 'waived' | 'adjusted'
 * - from: ISO date string (filter by calculated_at)
 * - to: ISO date string
 * - page: number (default 1)
 * - limit: number (default 50)
 *
 * Note: Platform admin role required (role = 'platform_admin' in profiles)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

const VALID_STATUSES = ['calculated', 'invoiced', 'paid', 'waived', 'adjusted'] as const
type CommissionStatus = (typeof VALID_STATUSES)[number]

/**
 * Check if user is a platform admin
 */
async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  // Platform admin check - adjust based on your actual role structure
  // Option 1: Dedicated platform_admin role
  // Option 2: Check against a list of admin emails
  // Option 3: Check a separate platform_admins table
  return profile?.role === 'platform_admin'
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  // 3. Parse query params
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')
  const status = searchParams.get('status') as CommissionStatus | null
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit

  try {
    // Build query - no tenant filter by default (platform admin sees all)
    let query = supabase
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
        refund_amount,
        adjustment_amount,
        invoice_id,
        calculated_at,
        created_at,
        tenants!inner(id, name),
        store_orders!inner(order_number)
      `,
        { count: 'exact' }
      )
      .order('calculated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('calculated_at', fromDate)
    }

    if (toDate) {
      query = query.lte('calculated_at', toDate)
    }

    const { data: commissions, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      commissions: commissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (e) {
    logger.error('Platform admin: Error fetching commissions', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar comisiones' },
    })
  }
}
