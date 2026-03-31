/**
 * Monthly Commission Invoice Generation Cron Job
 *
 * POST /api/cron/generate-commission-invoices
 *
 * Generates commission invoices for all tenants with e-commerce sales.
 * Should be triggered on the 1st of each month to invoice the previous month.
 *
 * Process:
 * 1. Get all tenants with 'calculated' commissions from previous month
 * 2. For each tenant, call generate_commission_invoice RPC
 * 3. Create notification for clinic admin
 * 4. Return summary of generated invoices
 *
 * Protected by CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for processing all tenants

// Use service role key for cron jobs to bypass RLS
// Required environment variables - app will not function without these
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface InvoiceResult {
  tenantId: string
  tenantName: string
  invoiceId: string | null
  invoiceNumber: string | null
  totalCommission: number
  orderCount: number
  success: boolean
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const results: {
    processed: number
    succeeded: number
    failed: number
    skipped: number
    invoices: InvoiceResult[]
    errors: string[]
  } = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    invoices: [],
    errors: [],
  }

  try {
    // Calculate previous month's date range
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1) // First day of previous month

    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    logger.info('Starting commission invoice generation', {
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
    })

    // Get all tenants with unpaid commissions in the period
    const { data: tenantsWithCommissions, error: queryError } = await supabase
      .from('store_commissions')
      .select(
        `
        tenant_id,
        tenants!inner(id, name)
      `
      )
      .eq('status', 'calculated')
      .gte('calculated_at', periodStart.toISOString())
      .lte('calculated_at', periodEnd.toISOString())

    if (queryError) {
      throw new Error(`Failed to query commissions: ${queryError.message}`)
    }

    if (!tenantsWithCommissions || tenantsWithCommissions.length === 0) {
      logger.info('No pending commissions found for the period')
      return NextResponse.json({
        success: true,
        message: 'No commissions to invoice',
        period: { start: periodStartStr, end: periodEndStr },
        ...results,
      })
    }

    // Get unique tenant IDs
    const uniqueTenants = new Map<string, string>()
    for (const row of tenantsWithCommissions) {
      const tenantData = row.tenants as { id: string; name: string } | { id: string; name: string }[]
      const tenant = Array.isArray(tenantData) ? tenantData[0] : tenantData
      if (!uniqueTenants.has(row.tenant_id) && tenant) {
        uniqueTenants.set(row.tenant_id, tenant.name)
      }
    }

    logger.info(`Found ${uniqueTenants.size} tenants with pending commissions`)

    // Process each tenant
    for (const [tenantId, tenantName] of uniqueTenants) {
      results.processed++

      const invoiceResult: InvoiceResult = {
        tenantId,
        tenantName,
        invoiceId: null,
        invoiceNumber: null,
        totalCommission: 0,
        orderCount: 0,
        success: false,
      }

      try {
        // Check if invoice already exists for this period
        const { data: existingInvoice } = await supabase
          .from('store_commission_invoices')
          .select('id, invoice_number')
          .eq('tenant_id', tenantId)
          .eq('period_start', periodStartStr)
          .eq('period_end', periodEndStr)
          .single()

        if (existingInvoice) {
          results.skipped++
          invoiceResult.success = true
          invoiceResult.invoiceId = existingInvoice.id
          invoiceResult.invoiceNumber = existingInvoice.invoice_number
          invoiceResult.error = 'Invoice already exists for this period'
          results.invoices.push(invoiceResult)
          continue
        }

        // Generate invoice using RPC function
        const { data: invoiceId, error: rpcError } = await supabase.rpc('generate_commission_invoice', {
          p_tenant_id: tenantId,
          p_period_start: periodStartStr,
          p_period_end: periodEndStr,
          p_due_days: 30,
        })

        if (rpcError) {
          throw new Error(rpcError.message)
        }

        if (!invoiceId) {
          // No commissions to invoice (possibly already invoiced)
          results.skipped++
          invoiceResult.success = true
          invoiceResult.error = 'No calculated commissions found'
          results.invoices.push(invoiceResult)
          continue
        }

        // Get generated invoice details
        const { data: invoice } = await supabase
          .from('store_commission_invoices')
          .select('id, invoice_number, amount_due, total_orders')
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          invoiceResult.invoiceId = invoice.id
          invoiceResult.invoiceNumber = invoice.invoice_number
          invoiceResult.totalCommission = invoice.amount_due
          invoiceResult.orderCount = invoice.total_orders
        }

        // Create notification for clinic admin
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('role', 'admin')
          .limit(5)

        if (adminProfiles && adminProfiles.length > 0) {
          const notifications = adminProfiles.map((profile) => ({
            user_id: profile.id,
            title: 'Nueva Factura de Comisiones',
            message: `Se ha generado la factura de comisiones ${invoice?.invoice_number || ''} por el período ${periodStartStr} al ${periodEndStr}.`,
            type: 'commission_invoice',
            data: {
              invoice_id: invoiceId,
              period_start: periodStartStr,
              period_end: periodEndStr,
              amount: invoice?.amount_due || 0,
            },
          }))

          await supabase.from('notifications').insert(notifications)
        }

        results.succeeded++
        invoiceResult.success = true
        results.invoices.push(invoiceResult)

        logger.info(`Generated commission invoice for tenant ${tenantId}`, {
          invoiceId,
          invoiceNumber: invoice?.invoice_number,
          amount: invoice?.amount_due,
          orders: invoice?.total_orders,
        })
      } catch (e) {
        results.failed++
        const errorMessage = e instanceof Error ? e.message : 'Unknown error'
        invoiceResult.error = errorMessage
        results.invoices.push(invoiceResult)
        results.errors.push(`Tenant ${tenantId} (${tenantName}): ${errorMessage}`)

        logger.error(`Failed to generate invoice for tenant ${tenantId}`, {
          tenantId,
          tenantName,
          error: errorMessage,
        })
      }
    }

    logger.info('Commission invoice generation complete', {
      period: { start: periodStartStr, end: periodEndStr },
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      skipped: results.skipped,
    })

    return NextResponse.json({
      success: results.failed === 0,
      message: `Generated ${results.succeeded} invoices (${results.skipped} skipped, ${results.failed} failed)`,
      period: {
        start: periodStartStr,
        end: periodEndStr,
      },
      ...results,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Fatal error in commission invoice generation', { error: message })

    return NextResponse.json(
      {
        success: false,
        error: message,
        ...results,
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for manual testing / Vercel Cron
 * Vercel Cron uses GET requests by default
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request)
}
