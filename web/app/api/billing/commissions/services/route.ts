/**
 * Service Commissions API - Clinic View
 *
 * GET /api/billing/commissions/services - List clinic's service commissions
 *
 * Query params:
 * - clinic: string (optional) - Tenant ID (defaults to user's tenant)
 * - status: 'pending' | 'invoiced' | 'paid' | 'waived' | 'adjusted'
 * - from: ISO date string (filter by calculated_at)
 * - to: ISO date string
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

const VALID_STATUSES = ['pending', 'invoiced', 'paid', 'waived', 'adjusted'] as const
type CommissionStatus = (typeof VALID_STATUSES)[number]

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

  // Only staff (vet/admin) can view commissions
  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  // 3. Parse query params
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const status = searchParams.get('status') as CommissionStatus | null
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  // Validate clinic matches user's tenant
  if (clinic && clinic !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'No puede acceder a comisiones de otra clínica' },
    })
  }

  const tenantId = clinic || profile.tenant_id

  try {
    // Build query
    let query = supabase
      .from('service_commissions')
      .select(
        `
        id,
        appointment_id,
        invoice_id,
        service_total,
        tax_amount,
        commissionable_amount,
        commission_rate,
        commission_amount,
        rate_type,
        months_active,
        status,
        platform_invoice_id,
        original_commission,
        adjustment_amount,
        adjustment_reason,
        calculated_at,
        invoiced_at,
        paid_at,
        created_at,
        appointments!inner(
          start_time,
          services(name),
          pets(name),
          profiles!appointments_client_id_fkey(full_name, email)
        ),
        invoices(invoice_number, total, paid_at)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('calculated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
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
    logger.error('Error fetching service commissions', {
      tenantId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar comisiones de servicios' },
    })
  }
}
