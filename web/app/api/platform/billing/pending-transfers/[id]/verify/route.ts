/**
 * Platform Admin - Verify Transfer API
 *
 * POST /api/platform/billing/pending-transfers/[id]/verify
 *
 * Approves or rejects a pending bank transfer payment.
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject'
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface VerifyRequest {
  action: 'approve' | 'reject'
  notes?: string
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Check platform admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_platform_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_platform_admin) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Solo administradores de plataforma pueden verificar transferencias' },
    })
  }

  try {
    // 3. Parse request
    const body: VerifyRequest = await request.json()

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'action debe ser "approve" o "reject"' },
      })
    }

    // 4. Get transaction
    const { data: transaction, error: txError } = await supabase
      .from('billing_payment_transactions')
      .select(`
        *,
        platform_invoices (
          id,
          invoice_number,
          total,
          tenant_id
        )
      `)
      .eq('id', id)
      .single()

    if (txError || !transaction) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'transaction' },
      })
    }

    if (transaction.status !== 'pending') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: `La transaccion ya fue procesada (status: ${transaction.status})` },
      })
    }

    if (transaction.payment_method_type !== 'bank_transfer') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta transaccion no es una transferencia bancaria' },
      })
    }

    const now = new Date().toISOString()
    const invoice = transaction.platform_invoices

    if (body.action === 'approve') {
      // 5a. Approve transfer
      // Update transaction
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'succeeded',
          completed_at: now,
        })
        .eq('id', id)

      // Update invoice
      await supabase
        .from('platform_invoices')
        .update({
          status: 'paid',
          paid_at: now,
          payment_method: 'Transferencia Bancaria',
          payment_reference: transaction.bank_transfer_reference,
          updated_at: now,
        })
        .eq('id', invoice.id)

      // Mark commissions as paid
      await supabase
        .from('store_commissions')
        .update({ status: 'paid', paid_at: now })
        .eq('platform_invoice_id', invoice.id)

      await supabase
        .from('service_commissions')
        .update({ status: 'paid', paid_at: now })
        .eq('platform_invoice_id', invoice.id)

      // Notify clinic admin
      const { data: clinicAdmin } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', invoice.tenant_id)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (clinicAdmin) {
        await supabase.from('notifications').insert({
          user_id: clinicAdmin.id,
          title: 'Pago verificado',
          message: `Su transferencia bancaria para la factura ${invoice.invoice_number} ha sido verificada y acreditada.`,
        })
      }

      // Create confirmation reminder
      await supabase.from('billing_reminders').insert({
        tenant_id: invoice.tenant_id,
        platform_invoice_id: invoice.id,
        reminder_type: 'payment_confirmation',
        channel: 'email',
        sent_at: now,
        subject: `Pago verificado - Factura ${invoice.invoice_number}`,
        content: `Su transferencia bancaria de ₲${Number(invoice.total).toLocaleString('es-PY')} ha sido verificada exitosamente.`,
      })

      logger.info('Bank transfer approved', {
        transactionId: id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        verifiedBy: profile.full_name,
        amount: transaction.amount,
      })

      return NextResponse.json({
        success: true,
        message: 'Transferencia aprobada exitosamente',
        transaction: {
          id,
          status: 'succeeded',
          invoice_number: invoice.invoice_number,
        },
      })

    } else {
      // 5b. Reject transfer
      const rejectionReason = body.notes || 'Transferencia rechazada - datos no coinciden'

      // Update transaction
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: rejectionReason,
          completed_at: now,
        })
        .eq('id', id)

      // Notify clinic admin
      const { data: clinicAdmin } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', invoice.tenant_id)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (clinicAdmin) {
        await supabase.from('notifications').insert({
          user_id: clinicAdmin.id,
          title: 'Transferencia rechazada',
          message: `Su transferencia para la factura ${invoice.invoice_number} no pudo ser verificada. Motivo: ${rejectionReason}`,
        })
      }

      // Create rejection reminder
      await supabase.from('billing_reminders').insert({
        tenant_id: invoice.tenant_id,
        platform_invoice_id: invoice.id,
        reminder_type: 'overdue_gentle',
        channel: 'email',
        sent_at: now,
        subject: `Transferencia no verificada - Factura ${invoice.invoice_number}`,
        content: `Su transferencia bancaria no pudo ser verificada. Motivo: ${rejectionReason}. Por favor contactenos si tiene dudas.`,
      })

      logger.info('Bank transfer rejected', {
        transactionId: id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        verifiedBy: profile.full_name,
        reason: rejectionReason,
      })

      return NextResponse.json({
        success: true,
        message: 'Transferencia rechazada',
        transaction: {
          id,
          status: 'failed',
          invoice_number: invoice.invoice_number,
          rejection_reason: rejectionReason,
        },
      })
    }

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error verifying bank transfer', {
      transactionId: id,
      userId: user.id,
      error: message,
    })

    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al verificar la transferencia' },
    })
  }
}
