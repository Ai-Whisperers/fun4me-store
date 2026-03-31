/**
 * Confirm Bank Transfer API
 *
 * POST /api/billing/confirm-transfer
 *
 * Allows clinic admins to report a bank transfer payment.
 * Creates a pending transaction that platform admin will verify.
 *
 * Request body:
 * {
 *   invoice_id: string (required)
 *   transfer_date: string (required, ISO date)
 *   bank_name: string (required)
 *   reference_number?: string
 *   amount: number (required)
 *   proof_url?: string (uploaded receipt image URL)
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface ConfirmTransferRequest {
  invoice_id: string
  transfer_date: string
  bank_name: string
  reference_number?: string
  amount: number
  proof_url?: string
  notes?: string
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

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Parse request
    const body: ConfirmTransferRequest = await request.json()

    // Validation
    if (!body.invoice_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'invoice_id es requerido' },
      })
    }

    if (!body.transfer_date) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'transfer_date es requerido' },
      })
    }

    if (!body.bank_name) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'bank_name es requerido' },
      })
    }

    if (!body.amount || body.amount <= 0) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'amount debe ser mayor a 0' },
      })
    }

    // 4. Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('platform_invoices')
      .select('*')
      .eq('id', body.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'platform_invoice' },
      })
    }

    // Verify ownership
    if (invoice.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No puede reportar pagos para facturas de otra clinica' },
      })
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta factura ya esta pagada' },
      })
    }

    if (invoice.status === 'void') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta factura ha sido anulada' },
      })
    }

    // Validate amount matches (with small tolerance for fees)
    const invoiceTotal = Number(invoice.total)
    const tolerance = invoiceTotal * 0.02 // 2% tolerance
    if (Math.abs(body.amount - invoiceTotal) > tolerance) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          message: `El monto reportado (₲${body.amount.toLocaleString('es-PY')}) no coincide con el total de la factura (₲${invoiceTotal.toLocaleString('es-PY')})`,
        },
      })
    }

    // 5. Check for existing pending transfer
    const { data: existingTransfer } = await supabase
      .from('billing_payment_transactions')
      .select('id')
      .eq('platform_invoice_id', invoice.id)
      .eq('payment_method_type', 'bank_transfer')
      .eq('status', 'pending')
      .single()

    if (existingTransfer) {
      return apiError('ALREADY_EXISTS', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya existe una transferencia pendiente de verificacion para esta factura' },
      })
    }

    // 6. Get or create bank transfer payment method for tenant
    let bankMethodId: string | null = null

    const { data: existingMethod } = await supabase
      .from('tenant_payment_methods')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('method_type', 'bank_transfer')
      .eq('is_active', true)
      .single()

    if (existingMethod) {
      bankMethodId = existingMethod.id
    } else {
      // Create bank transfer method for tenant
      const { data: newMethod } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: profile.tenant_id,
          method_type: 'bank_transfer',
          display_name: 'Transferencia Bancaria',
          bank_name: body.bank_name,
          is_default: false,
          is_verified: false,
          is_active: true,
        })
        .select()
        .single()

      bankMethodId = newMethod?.id || null
    }

    // 7. Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('billing_payment_transactions')
      .insert({
        tenant_id: profile.tenant_id,
        platform_invoice_id: invoice.id,
        amount: body.amount,
        currency: 'PYG',
        payment_method_type: 'bank_transfer',
        payment_method_id: bankMethodId,
        bank_transfer_reference: body.reference_number || null,
        status: 'pending', // Awaiting verification
      })
      .select()
      .single()

    if (txError) {
      throw new Error(`Error creating transaction: ${txError.message}`)
    }

    // 8. Store transfer details in a separate record (for admin review)
    // Using billing_reminders table with special type
    await supabase.from('billing_reminders').insert({
      tenant_id: profile.tenant_id,
      platform_invoice_id: invoice.id,
      reminder_type: 'payment_confirmation', // Reusing for now
      channel: 'internal',
      subject: `Transferencia reportada - ${invoice.invoice_number}`,
      content: JSON.stringify({
        type: 'pending_transfer_verification',
        transfer_date: body.transfer_date,
        bank_name: body.bank_name,
        reference_number: body.reference_number,
        amount: body.amount,
        proof_url: body.proof_url,
        notes: body.notes,
        reported_by: profile.full_name,
        reported_by_id: user.id,
        transaction_id: transaction.id,
      }),
    })

    // 9. Notify platform admin (create notification for admin review)
    // In a real system, this would notify platform admins via email/slack
    logger.info('Bank transfer reported', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      tenantId: profile.tenant_id,
      amount: body.amount,
      transactionId: transaction.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Transferencia reportada exitosamente. Sera verificada en un plazo de 48 horas.',
      transaction: {
        id: transaction.id,
        status: 'pending_verification',
        amount: body.amount,
        bank_name: body.bank_name,
        reference_number: body.reference_number,
        invoice_number: invoice.invoice_number,
      },
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error confirming bank transfer', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: message,
    })

    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al reportar la transferencia' },
    })
  }
}
