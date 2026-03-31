/**
 * Auto-Charge Cron Job (Refactored with PaymentService)
 *
 * POST /api/cron/billing/auto-charge
 *
 * Automatically charges invoices that are due using saved payment methods.
 * Now uses the provider-agnostic PaymentService instead of direct Stripe calls.
 *
 * Schedule: Daily at 10:00 UTC (06:00 Paraguay time)
 *
 * Process:
 * 1. Find invoices due today or overdue with unpaid status
 * 2. Filter to tenants with a default payment method
 * 3. Attempt payment via tenant's configured provider
 * 4. Update invoice status and send notifications
 *
 * Authorization: Requires CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCronHandler, CronContext } from '@/lib/cron/handler'
import { logger } from '@/lib/logger'
import { getPaymentService } from '@/lib/payments/service'
import { getSystemConfigs } from '@/app/actions/system-configs'
import { withRetry, isTimeoutError, TIMEOUT_PRESETS } from '@/lib/utils/timeout'
import type { PaymentIntent } from '@/lib/payments/types'

interface ChargeResult {
  invoice_id: string
  invoice_number: string
  tenant_id: string
  amount: number
  status: 'succeeded' | 'failed' | 'requires_action' | 'skipped' | 'timeout'
  error?: string
  timedOut?: boolean
  provider?: string
}

async function handler(_request: NextRequest, _context: CronContext): Promise<NextResponse> {
  const supabase = await createClient('service_role')
  const results: ChargeResult[] = []
  const today = new Date().toISOString().split('T')[0]

  logger.info('Starting auto-charge cron job', { date: today })

  try {
    const { data: invoices, error: invoicesError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        invoice_number,
        tenant_id,
        total,
        due_date,
        status
      `)
      .in('status', ['sent', 'overdue'])
      .lte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(50)

    if (invoicesError) {
      throw new Error(`Error fetching invoices: ${invoicesError.message}`)
    }

    if (!invoices || invoices.length === 0) {
      logger.info('No invoices to process')
      return NextResponse.json({
        success: true,
        message: 'No invoices to process',
        processed: 0,
        results: [],
      })
    }

    logger.info(`Found ${invoices.length} invoices to process`)

    for (const invoice of invoices) {
      const result = await processInvoice(supabase, invoice)
      results.push(result)

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const succeeded = results.filter((r) => r.status === 'succeeded').length
    const failed = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const needsAction = results.filter((r) => r.status === 'requires_action').length
    const timedOut = results.filter((r) => r.status === 'timeout').length

    logger.info('Auto-charge cron completed', {
      total: results.length,
      succeeded,
      failed,
      skipped,
      needsAction,
      timedOut,
    })

    if (failed > 0 || timedOut > 0) {
      await sendFailureSummaryEmail(supabase, results, { failed, timedOut, succeeded, total: results.length })
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-charge completed',
      summary: {
        total: results.length,
        succeeded,
        failed,
        skipped,
        requires_action: needsAction,
        timed_out: timedOut,
      },
      results,
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Auto-charge cron failed', { error: message })

    return NextResponse.json(
      {
        success: false,
        error: message,
        results,
      },
      { status: 500 }
    )
  }
}

async function processInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
    due_date: string
    status: string
  }
): Promise<ChargeResult> {
  try {
    const configResult = await getSystemConfigs(invoice.tenant_id)
    
    if (!configResult.success) {
      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id,
        amount: invoice.total,
        status: 'skipped',
        error: 'Failed to load tenant configuration',
      }
    }

    const configs = configResult.data || []
    const paymentProvider = configs.find(c => c.key === 'payment_provider')?.value || 'stripe'

    const providerConfig = {
      stripe: {
        enabled: configs.find(c => c.key === 'stripe_enabled')?.value === 'true',
      },
      bancard: {
        enabled: configs.find(c => c.key === 'bancard_enabled')?.value === 'true',
      },
      tigo_money: {
        enabled: configs.find(c => c.key === 'tigo_money_enabled')?.value === 'true',
      },
    }

    const isProviderEnabled = (providerConfig as Record<string, { enabled: boolean }>)[paymentProvider]?.enabled
    if (!isProviderEnabled) {
      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id,
        amount: invoice.total,
        status: 'skipped',
        error: `Payment provider ${paymentProvider} is not enabled`,
        provider: paymentProvider,
      }
    }

    const paymentService = getPaymentService(paymentProvider)

    const paymentIntent = await withRetry<PaymentIntent>(
      async () => {
        const result = await paymentService.createPaymentIntent({
          amount: invoice.total,
          currency: 'PYG',
          invoiceId: invoice.id,
          tenantId: invoice.tenant_id,
          description: `Factura Vete - ${invoice.invoice_number}`,
          metadata: {
            platform_invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            auto_charge: 'true',
          },
        })

        if (!result.success || !result.data) {
          throw new Error(result.error?.message || 'Payment failed')
        }

        return result.data
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        timeoutMs: TIMEOUT_PRESETS.PAYMENT,
        operationName: 'auto-charge-payment'
      }
    )

    if (isTimeoutError(paymentIntent)) {
      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id,
        amount: invoice.total,
        status: 'timeout',
        error: 'Payment timeout',
        timedOut: true,
        provider: paymentProvider,
      }
    }

    const now = new Date().toISOString()

    await supabase
      .from('billing_payment_transactions')
      .insert({
        tenant_id: invoice.tenant_id,
        platform_invoice_id: invoice.id,
        amount: invoice.total,
        currency: 'PYG',
        payment_method: paymentProvider,
        status: 'succeeded',
        payment_reference: paymentIntent?.id || '',
        created_at: now,
        completed_at: now,
        metadata: {
          auto_charge: 'true',
          provider: paymentProvider,
        },
      })

    await supabase
      .from('platform_invoices')
      .update({
        status: 'paid',
        paid_at: now,
        updated_at: now,
      })
      .eq('id', invoice.id)

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      tenant_id: invoice.tenant_id,
      amount: invoice.total,
      status: 'succeeded',
      provider: paymentProvider,
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to process invoice', {
      invoiceId: invoice.id,
      tenantId: invoice.tenant_id,
      error: message,
    })

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      tenant_id: invoice.tenant_id,
      amount: invoice.total,
      status: 'failed',
      error: message,
    }
  }
}

async function sendFailureSummaryEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  results: ChargeResult[],
  summary: { failed: number; timedOut: number; succeeded: number; total: number }
): Promise<void> {
  try {
    const failedResults = results.filter(r => r.status === 'failed' || r.status === 'timeout')
    
    if (failedResults.length === 0) {
      return
    }

    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .in('tenant_id', failedResults.map(r => r.tenant_id))

    if (!adminProfiles || adminProfiles.length === 0) {
      return
    }

    const failureDetails = failedResults.map(r => 
      `Factura ${r.invoice_number}: ${r.error}${r.provider ? ` (${r.provider})` : ''}`
    ).join('\n')

    const emailContent = `
      Resumen de cargos automáticos fallidos
      
      Total procesados: ${summary.total}
      Exitosos: ${summary.succeeded}
      Fallidos: ${summary.failed}
      Timeout: ${summary.timedOut}
      
      Detalles de fallas:
      ${failureDetails}
    `

    logger.info('Auto-charge failure summary prepared', {
      adminEmails: adminProfiles.map(p => p.email),
      failureCount: failedResults.length,
    })

  } catch (error) {
    logger.error('Failed to send failure summary email', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

export const POST = createCronHandler(handler)
