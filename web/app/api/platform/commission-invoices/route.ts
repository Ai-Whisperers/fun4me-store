/**
 * Platform Admin - Commission Invoices API
 *
 * GET /api/platform/commission-invoices - List all commission invoices
 * POST /api/platform/commission-invoices - Generate invoices for a period
 *
 * Query params (GET):
 * - tenant_id: string (filter by tenant)
 * - status: 'draft' | 'sent' | 'paid' | 'overdue' | 'waived'
 * - page: number
 * - limit: number
 *
 * Body (POST):
 * {
 *   period_start: ISO date string
 *   period_end: ISO date string
 *   due_days: number (days until due, default 15)
 *   tenant_id?: string (optional, generates for all tenants if not specified)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'waived'] as const
type InvoiceStatus = (typeof VALID_STATUSES)[number]

const generateInvoicesSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  due_days: z.number().int().min(1).max(90).default(15),
  tenant_id: z.string().optional(),
})

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
  const status = searchParams.get('status') as InvoiceStatus | null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit

  try {
    // Build query
    let query = supabase
      .from('store_commission_invoices')
      .select(
        `
        *,
        tenants!inner(id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status)
    }

    const { data: invoices, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      invoices: invoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (e) {
    logger.error('Platform admin: Error fetching commission invoices', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar facturas de comisiones' },
    })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    // Parse and validate body
    const body = await request.json()
    const validation = generateInvoicesSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      })
    }

    const { period_start, period_end, due_days, tenant_id } = validation.data

    // Get tenants to generate invoices for
    let tenantsToProcess: string[] = []

    if (tenant_id) {
      // Single tenant
      tenantsToProcess = [tenant_id]
    } else {
      // All tenants with commissions in the period
      const { data: tenantData } = await supabase
        .from('store_commissions')
        .select('tenant_id')
        .eq('status', 'calculated')
        .gte('calculated_at', period_start)
        .lte('calculated_at', period_end + 'T23:59:59')

      if (tenantData) {
        tenantsToProcess = [...new Set(tenantData.map((t) => t.tenant_id))]
      }
    }

    if (tenantsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        invoices_created: 0,
        message: 'No hay comisiones pendientes para facturar en el período especificado',
      })
    }

    // Generate invoices using the database function
    const invoicesCreated: Array<{ id: string; tenant_id: string; invoice_number: string; amount_due: number }> = []
    const errors: Array<{ tenant_id: string; error: string }> = []

    for (const tid of tenantsToProcess) {
      const { data: result, error: genError } = await supabase.rpc('generate_commission_invoice', {
        p_tenant_id: tid,
        p_period_start: period_start,
        p_period_end: period_end,
        p_due_days: due_days,
      })

      if (genError) {
        errors.push({ tenant_id: tid, error: genError.message })
        logger.warn('Failed to generate commission invoice', { tenantId: tid, error: genError.message })
      } else if (result) {
        invoicesCreated.push(result)
      }
    }

    logger.info('Commission invoices generated', {
      adminId: user.id,
      period: { start: period_start, end: period_end },
      tenantCount: tenantsToProcess.length,
      invoicesCreated: invoicesCreated.length,
      errors: errors.length,
    })

    return NextResponse.json({
      success: true,
      invoices_created: invoicesCreated.length,
      invoices: invoicesCreated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${invoicesCreated.length} factura(s) generada(s) exitosamente`,
    })
  } catch (e) {
    logger.error('Platform admin: Error generating commission invoices', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al generar facturas de comisiones' },
    })
  }
}
