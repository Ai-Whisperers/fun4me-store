/**
 * Monthly Platform Invoice Generation Cron Job
 *
 * POST /api/cron/billing/generate-platform-invoices
 *
 * Generates unified platform invoices for all paid tenants.
 * Each invoice combines:
 * - Subscription fee (based on tier)
 * - Store commissions (from e-commerce orders)
 * - Service commissions (from appointment invoices)
 *
 * Should be triggered on the 1st of each month to invoice the previous month.
 *
 * Process:
 * 1. Get all paid tenants (profesional)
 * 2. For each tenant, call generate_platform_invoice SQL function
 * 3. Create notification for clinic admin
 * 4. Update tenant's next_invoice_date
 * 5. Return summary of generated invoices
 *
 * Protected by CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for processing all tenants

// Use service role key for cron jobs to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface InvoiceResult {
  tenantId: string
  tenantName: string
  tier: string
  invoiceId: string | null
  invoiceNumber: string | null
  subscriptionAmount: number
  storeCommission: number
  serviceCommission: number
  total: number
  success: boolean
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret - CRITICAL: fail closed if not configured
  const envCronSecret = process.env.CRON_SECRET

  if (!envCronSecret) {
    logger.error('CRON_SECRET not configured for generate-platform-invoices - blocking request')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const cronSecret =
    request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (cronSecret !== envCronSecret) {
    logger.warn('Unauthorized platform invoice cron attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    logger.info('Starting platform invoice generation', {
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
    })

    // Get all paid tenants (not gratis tier) that are active
    const { data: paidTenants, error: queryError } = await supabase
      .from('tenants')
      .select('id, name, subscription_tier, trial_ends_at')
      .neq('subscription_tier', 'gratis')
      .eq('is_active', true)

    if (queryError) {
      throw new Error(`Failed to query tenants: ${queryError.message}`)
    }

    if (!paidTenants || paidTenants.length === 0) {
      logger.info('No paid tenants found')
      return NextResponse.json({
        success: true,
        message: 'No paid tenants to invoice',
        period: { start: periodStartStr, end: periodEndStr },
        ...results,
      })
    }

    logger.info(`Found ${paidTenants.length} paid tenants`)

    // Process each tenant
    for (const tenant of paidTenants) {
      results.processed++

      const invoiceResult: InvoiceResult = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tier: tenant.subscription_tier,
        invoiceId: null,
        invoiceNumber: null,
        subscriptionAmount: 0,
        storeCommission: 0,
        serviceCommission: 0,
        total: 0,
        success: false,
      }

      try {
        // Skip if tenant is still on trial
        if (tenant.trial_ends_at) {
          const trialEndsAt = new Date(tenant.trial_ends_at)
          if (trialEndsAt > now) {
            results.skipped++
            invoiceResult.success = true
            invoiceResult.error = `Still on trial until ${trialEndsAt.toISOString().split('T')[0]}`
            results.invoices.push(invoiceResult)
            continue
          }
        }

        // Check if invoice already exists for this period
        const { data: existingInvoice } = await supabase
          .from('platform_invoices')
          .select('id, invoice_number')
          .eq('tenant_id', tenant.id)
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
        const { data: invoiceId, error: rpcError } = await supabase.rpc('generate_platform_invoice', {
          p_tenant_id: tenant.id,
          p_period_start: periodStartStr,
          p_period_end: periodEndStr,
        })

        if (rpcError) {
          throw new Error(rpcError.message)
        }

        if (!invoiceId) {
          // No amounts to invoice (free tier with no commissions)
          results.skipped++
          invoiceResult.success = true
          invoiceResult.error = 'No amounts to invoice'
          results.invoices.push(invoiceResult)
          continue
        }

        // Get generated invoice details
        const { data: invoice } = await supabase
          .from('platform_invoices')
          .select(`
            id,
            invoice_number,
            subscription_amount,
            store_commission_amount,
            service_commission_amount,
            total,
            due_date
          `)
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          invoiceResult.invoiceId = invoice.id
          invoiceResult.invoiceNumber = invoice.invoice_number
          invoiceResult.subscriptionAmount = Number(invoice.subscription_amount)
          invoiceResult.storeCommission = Number(invoice.store_commission_amount)
          invoiceResult.serviceCommission = Number(invoice.service_commission_amount)
          invoiceResult.total = Number(invoice.total)
        }

        // Update tenant's next_invoice_date (1st of next month)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        await supabase
          .from('tenants')
          .update({
            last_invoice_date: periodEndStr,
            next_invoice_date: nextMonth.toISOString().split('T')[0],
          })
          .eq('id', tenant.id)

        // Create notification for clinic admin
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('role', 'admin')
          .limit(5)

        if (adminProfiles && adminProfiles.length > 0) {
          const formattedTotal = new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            maximumFractionDigits: 0,
          }).format(invoiceResult.total)

          const notifications = adminProfiles.map((profile) => ({
            user_id: profile.id,
            title: 'Nueva Factura de Plataforma',
            message: `Se ha generado la factura ${invoice?.invoice_number || ''} por ${formattedTotal} para el período ${periodStartStr} al ${periodEndStr}.`,
            type: 'platform_invoice',
            data: {
              invoice_id: invoiceId,
              invoice_number: invoice?.invoice_number,
              period_start: periodStartStr,
              period_end: periodEndStr,
              amount: invoiceResult.total,
              due_date: invoice?.due_date,
            },
          }))

          await supabase.from('notifications').insert(notifications)
        }

        results.succeeded++
        invoiceResult.success = true
        results.invoices.push(invoiceResult)

        logger.info(`Generated platform invoice for tenant ${tenant.id}`, {
          tenantId: tenant.id,
          tenantName: tenant.name,
          invoiceId,
          invoiceNumber: invoice?.invoice_number,
          subscription: invoiceResult.subscriptionAmount,
          storeCommission: invoiceResult.storeCommission,
          serviceCommission: invoiceResult.serviceCommission,
          total: invoiceResult.total,
        })
      } catch (e) {
        results.failed++
        const errorMessage = e instanceof Error ? e.message : 'Unknown error'
        invoiceResult.error = errorMessage
        results.invoices.push(invoiceResult)
        results.errors.push(`Tenant ${tenant.id} (${tenant.name}): ${errorMessage}`)

        logger.error(`Failed to generate platform invoice for tenant ${tenant.id}`, {
          tenantId: tenant.id,
          tenantName: tenant.name,
          error: errorMessage,
        })
      }
    }

    logger.info('Platform invoice generation complete', {
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
    logger.error('Fatal error in platform invoice generation', { error: message })

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
