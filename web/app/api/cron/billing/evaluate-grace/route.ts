/**
 * Grace Period Evaluation Cron Job
 *
 * POST /api/cron/billing/evaluate-grace
 *
 * Evaluates overdue invoices and determines appropriate grace periods
 * using the AI-powered grace period algorithm.
 *
 * Schedule: Daily at 08:00 UTC (04:00 Paraguay time)
 *
 * Process:
 * 1. Find invoices that just became overdue (past due date)
 * 2. Collect metrics for each tenant
 * 3. Run grace period algorithm
 * 4. Save evaluation results
 * 5. Update invoice with grace period
 * 6. Send notification to clinic admin
 *
 * Authorization: Requires CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCronHandler, CronContext } from '@/lib/cron/handler'
import { logger } from '@/lib/logger'
import {
  collectTenantMetrics,
  calculateGracePeriod,
  type GraceEvaluation,
} from '@/lib/billing/grace-period'

interface EvaluationResult {
  tenant_id: string
  invoice_id: string
  invoice_number: string
  evaluation: GraceEvaluation
  status: 'evaluated' | 'error'
  error?: string
}

async function handler(_request: NextRequest, _context: CronContext): Promise<NextResponse> {
  const supabase = await createClient('service_role')
  const results: EvaluationResult[] = []
  const today = new Date().toISOString().split('T')[0]

  logger.info('Starting grace period evaluation cron', { date: today })

  try {
    // 1. Find invoices that are overdue and haven't been evaluated yet
    // An invoice is overdue if: status is 'sent' and due_date < today
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        invoice_number,
        tenant_id,
        total,
        due_date,
        status,
        grace_period_days
      `)
      .eq('status', 'sent')
      .lt('due_date', today)
      .is('grace_period_days', null) // Not yet evaluated
      .order('due_date', { ascending: true })

    if (invoicesError) {
      throw new Error(`Error fetching overdue invoices: ${invoicesError.message}`)
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      logger.info('No overdue invoices to evaluate')
      return NextResponse.json({
        success: true,
        message: 'No overdue invoices to evaluate',
        evaluated: 0,
        results: [],
      })
    }

    logger.info(`Found ${overdueInvoices.length} overdue invoices to evaluate`)

    // 2. Process each invoice
    for (const invoice of overdueInvoices) {
      try {
        const result = await evaluateInvoice(supabase, invoice)
        results.push(result)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        results.push({
          tenant_id: invoice.tenant_id,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          evaluation: {} as GraceEvaluation,
          status: 'error',
          error: errorMsg,
        })
        logger.error('Error evaluating invoice', {
          invoiceId: invoice.id,
          error: errorMsg,
        })
      }
    }

    // 3. Summary
    const evaluated = results.filter((r) => r.status === 'evaluated').length
    const errors = results.filter((r) => r.status === 'error').length

    logger.info('Grace period evaluation completed', {
      total: results.length,
      evaluated,
      errors,
    })

    return NextResponse.json({
      success: true,
      message: 'Grace period evaluation completed',
      summary: {
        total: results.length,
        evaluated,
        errors,
      },
      results,
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Grace period evaluation cron failed', { error: message })

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

/**
 * Evaluate a single invoice for grace period
 */
async function evaluateInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
    due_date: string
  }
): Promise<EvaluationResult> {
  const now = new Date().toISOString()

  // 1. Collect tenant metrics
  const metrics = await collectTenantMetrics(supabase, invoice.tenant_id)

  // 2. Run grace period algorithm
  const evaluation = calculateGracePeriod(metrics)

  // 3. Save evaluation to database
  const { error: evalError } = await supabase
    .from('grace_period_evaluations')
    .insert({
      tenant_id: invoice.tenant_id,
      platform_invoice_id: invoice.id,
      metrics: metrics,
      economic_score: evaluation.scores.economic,
      risk_score: 1 - evaluation.totalScore, // Invert for risk
      recommended_grace_days: evaluation.recommendedGraceDays,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      evaluated_at: now,
      model_version: evaluation.modelVersion,
    })

  if (evalError) {
    logger.error('Error saving evaluation', {
      invoiceId: invoice.id,
      error: evalError.message,
    })
    // Continue anyway - we can still update the invoice
  }

  // 4. Update invoice with grace period
  // Calculate new due date = original due date + grace days
  const originalDueDate = new Date(invoice.due_date)
  const graceDueDate = new Date(originalDueDate)
  graceDueDate.setDate(graceDueDate.getDate() + evaluation.recommendedGraceDays)

  await supabase
    .from('platform_invoices')
    .update({
      status: 'overdue',
      grace_period_days: evaluation.recommendedGraceDays,
      grace_reason: evaluation.reasoning,
      // Note: We keep the original due_date, the grace is additional time
      updated_at: now,
    })
    .eq('id', invoice.id)

  // 5. Update tenant's current grace period
  await supabase
    .from('tenants')
    .update({
      current_grace_period_days: evaluation.recommendedGraceDays,
    })
    .eq('id', invoice.tenant_id)

  // 6. Notify clinic admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', invoice.tenant_id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (adminProfile) {
    await supabase.from('notifications').insert({
      user_id: adminProfile.id,
      title: 'Factura vencida - Periodo de gracia aplicado',
      message: `La factura ${invoice.invoice_number} ha vencido. Se ha aplicado un periodo de gracia de ${evaluation.recommendedGraceDays} dias basado en su historial.`,
    })
  }

  // 7. Create grace period warning reminder
  await supabase.from('billing_reminders').insert({
    tenant_id: invoice.tenant_id,
    platform_invoice_id: invoice.id,
    reminder_type: 'grace_period_warning',
    channel: 'email',
    subject: `Factura vencida con periodo de gracia - ${invoice.invoice_number}`,
    content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} ha vencido. ` +
      `Basado en su historial, hemos aplicado un periodo de gracia de ${evaluation.recommendedGraceDays} dias. ` +
      `Por favor realice el pago antes del ${graceDueDate.toLocaleDateString('es-PY')} para evitar interrupciones.`,
  })

  logger.info('Grace period evaluation completed', {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    tenantId: invoice.tenant_id,
    recommendedDays: evaluation.recommendedGraceDays,
    score: evaluation.totalScore,
    riskLevel: evaluation.riskLevel,
  })

  return {
    tenant_id: invoice.tenant_id,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    evaluation,
    status: 'evaluated',
  }
}

export const POST = createCronHandler(handler)
