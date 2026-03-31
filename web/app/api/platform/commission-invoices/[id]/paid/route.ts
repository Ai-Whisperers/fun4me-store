/**
 * Platform Admin - Record Commission Invoice Payment
 *
 * POST /api/platform/commission-invoices/[id]/paid
 *
 * Body:
 * {
 *   paid_amount: number (required)
 *   payment_reference: string (optional - transfer ID, check number, etc.)
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const paymentSchema = z.object({
  paid_amount: z.number().positive('El monto debe ser positivo'),
  payment_reference: z.string().optional(),
  notes: z.string().optional(),
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

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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
    // Parse and validate body
    const body = await request.json()
    const validation = paymentSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      })
    }

    const { paid_amount, payment_reference, notes } = validation.data

    // Get invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('store_commission_invoices')
      .select('id, status, tenant_id, invoice_number, amount_due, notes')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'invoice', message: 'Factura no encontrada' },
      })
    }

    // Check status
    if (invoice.status === 'paid') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta factura ya fue pagada' },
      })
    }

    if (invoice.status === 'waived') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se puede registrar pago en una factura exonerada' },
      })
    }

    const now = new Date().toISOString()

    // Update invoice status to paid
    const { data: updated, error: updateError } = await supabase
      .from('store_commission_invoices')
      .update({
        status: 'paid',
        paid_at: now,
        paid_amount,
        payment_reference: payment_reference || null,
        notes: notes || invoice.notes || null,
        updated_at: now,
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) throw updateError

    // Update all associated commissions to 'paid'
    const { error: commissionsError } = await supabase
      .from('store_commissions')
      .update({
        status: 'paid',
        updated_at: now,
      })
      .eq('invoice_id', invoiceId)

    if (commissionsError) {
      logger.warn('Failed to update commission statuses', {
        invoiceId,
        error: commissionsError.message,
      })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      tenant_id: invoice.tenant_id,
      user_id: user.id,
      action: 'commission_invoice_paid',
      resource: 'store_commission_invoices',
      resource_id: invoiceId,
      details: {
        invoice_number: invoice.invoice_number,
        amount_due: invoice.amount_due,
        paid_amount,
        payment_reference,
        notes,
      },
    })

    logger.info('Commission invoice payment recorded', {
      invoiceId,
      tenantId: invoice.tenant_id,
      adminId: user.id,
      invoiceNumber: invoice.invoice_number,
      amountDue: invoice.amount_due,
      paidAmount: paid_amount,
      paymentReference: payment_reference,
    })

    return NextResponse.json({
      success: true,
      invoice: updated,
      message: 'Pago registrado exitosamente',
    })
  } catch (e) {
    logger.error('Platform admin: Error recording invoice payment', {
      invoiceId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al registrar pago' },
    })
  }
}
