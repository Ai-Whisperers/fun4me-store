'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { RecordPaymentData } from '@/lib/types/invoicing'

/**
 * Record a payment for an invoice using atomic database function
 * Staff only
 *
 * SECURITY: Uses atomic RPC function to prevent race conditions (TOCTOU vulnerability)
 * See migration 075_atomic_payment_recording.sql
 *
 * @param paymentData - Payment data including invoice_id
 */
export const recordPayment = withActionAuth(
  async ({ profile, supabase, user }, paymentData: RecordPaymentData) => {
    const invoiceId = paymentData.invoice_id

    // Validate amount locally first (fast fail)
    if (!paymentData.amount || paymentData.amount <= 0) {
      return actionError('El monto debe ser mayor a 0')
    }

    try {
      // Use atomic RPC function to prevent race condition
      // This function uses SELECT FOR UPDATE to lock the invoice row
      const { data, error } = await supabase.rpc('record_invoice_payment', {
        p_invoice_id: invoiceId,
        p_tenant_id: profile.tenant_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method || 'cash',
        p_reference_number: paymentData.reference_number || null,
        p_notes: paymentData.notes || null,
        p_received_by: user.id,
      })

      if (error) {
        logger.error('Atomic payment recording error', {
          tenantId: profile.tenant_id,
          invoiceId,
          error: error.message,
          code: error.code,
        })
        
        // Provide specific error messages based on error code
        if (error.code === '42883') {
          // Function doesn't exist - database not migrated
          return actionError('Sistema no actualizado. Contacte al administrador.')
        }
        
        if (error.code === '23505') {
          // Unique violation - duplicate payment attempt
          return actionError('Este pago ya fue registrado')
        }
        
        return actionError('Error al registrar el pago en la base de datos')
      }

      // Parse result from JSONB response
      const result = data as { success: boolean; error?: string; message?: string }

      if (!result.success) {
        // Business logic errors from the database function
        const errorMessage = result.message || 'Error desconocido'
        
        logger.warn('Payment recording rejected', {
          tenantId: profile.tenant_id,
          invoiceId,
          reason: result.error,
          message: errorMessage,
        })

        return actionError(errorMessage)
      }

      // Success - revalidate cached pages
      revalidatePath('/[clinic]/dashboard/invoices')
      revalidatePath(`/[clinic]/dashboard/invoices/${invoiceId}`)

      logger.info('Payment recorded successfully', {
        tenantId: profile.tenant_id,
        invoiceId,
        amount: paymentData.amount,
      })

      return actionSuccess()
    } catch (e) {
      logger.error('Record payment exception', {
        tenantId: profile.tenant_id,
        invoiceId,
        error: e instanceof Error ? e.message : 'Unknown',
        stack: e instanceof Error ? e.stack : undefined,
      })
      return actionError('Error inesperado al registrar pago')
    }
  },
  { requireStaff: true }
)
