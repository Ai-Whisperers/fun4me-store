/**
 * Platform Invoices API - Clinic View
 *
 * GET /api/billing/invoices - List clinic's platform invoices
 *
 * Query params:
 * - clinic: string (optional) - Tenant ID (defaults to user's tenant)
 * - status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'waived'
 * - from: ISO date string (filter by period_start)
 * - to: ISO date string
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { AUTH_ERRORS, DATABASE_ERRORS } from '@/lib/i18n/errors'
import type { PlatformInvoiceStatus } from '@/lib/billing/types'

const VALID_STATUSES: PlatformInvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'void', 'waived']

export const GET = withApiAuth(
  async ({ request, profile, user, supabase, log }: ApiHandlerContext) => {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const clinic = searchParams.get('clinic')
    const status = searchParams.get('status') as PlatformInvoiceStatus | null
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Validate clinic matches user's tenant
    if (clinic && clinic !== profile.tenant_id) {
      log.warn('Tenant access denied for platform invoices', {
        requestedTenant: clinic,
        userTenant: profile.tenant_id,
      })
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: AUTH_ERRORS.FORBIDDEN_TENANT },
      })
    }

    const tenantId = clinic || profile.tenant_id

    try {
      // Build query
      let query = supabase
        .from('platform_invoices')
        .select(
          `
          id,
          invoice_number,
          period_start,
          period_end,
          subscription_amount,
          store_commission_amount,
          service_commission_amount,
          subtotal,
          tax_rate,
          tax_amount,
          total,
          status,
          issued_at,
          due_date,
          paid_at,
          payment_method,
          grace_period_days,
          reminder_count,
          last_reminder_at,
          created_at
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', tenantId)
        .order('period_end', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (status && VALID_STATUSES.includes(status)) {
        query = query.eq('status', status)
      }

      if (fromDate) {
        query = query.gte('period_start', fromDate)
      }

      if (toDate) {
        query = query.lte('period_end', toDate)
      }

      const { data: invoices, error, count } = await query

      if (error) throw error

      // Calculate summary stats
      const stats = {
        total_outstanding: 0,
        total_paid: 0,
        overdue_count: 0,
      }

      if (invoices) {
        for (const invoice of invoices) {
          if (invoice.status === 'paid') {
            stats.total_paid += Number(invoice.total)
          } else if (invoice.status !== 'void' && invoice.status !== 'waived') {
            stats.total_outstanding += Number(invoice.total)
          }
          if (invoice.status === 'overdue') {
            stats.overdue_count++
          }
        }
      }

      return NextResponse.json({
        invoices: invoices || [],
        stats,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      })
    } catch (e) {
      log.error('Error fetching platform invoices', {
        tenantId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: DATABASE_ERRORS.QUERY_FAILED },
      })
    }
  },
  { roles: ['admin'] }
)
