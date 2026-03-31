import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { generateHospitalizationInvoice } from '@/lib/billing/hospitalization'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/hospitalizations/[id]/discharge
 * Atomic operations: Generate Invoice -> Discharge Patient -> Free Kennel
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const hospitalizationId = params.id

    try {
      // Generate Invoice First (The Money Fix)
      const invoiceResult = await generateHospitalizationInvoice(
        supabase,
        hospitalizationId,
        profile.tenant_id,
        user.id
      )

      let finalInvoice = invoiceResult.invoice

      if (!invoiceResult.success) {
        // If error is NOT "already exists", we abort discharge to prevent revenue loss
        if (invoiceResult.error && !invoiceResult.error.includes('Ya existe una factura')) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { reason: 'invoice_generation_failed', message: invoiceResult.error },
          })
        }

        // If invoice exists, use it
        if (invoiceResult.invoice) {
          finalInvoice = invoiceResult.invoice
        }
      }

      // Update Hospitalization Status (Discharge)
      const { data: hosp, error: updateError } = await supabase
        .from('hospitalizations')
        .update({
          status: 'discharged',
          discharge_date: new Date().toISOString(),
          discharged_by: user.id,
        })
        .eq('id', hospitalizationId)
        .eq('pet.tenant_id', profile.tenant_id)
        .select('kennel_id')
        .single()

      if (updateError) {
        logger.error('Error updating hospitalization for discharge', {
          tenantId: profile.tenant_id,
          hospitalizationId,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Free up the Kennel
      if (hosp?.kennel_id) {
        await supabase.from('kennels').update({ status: 'available' }).eq('id', hosp.kennel_id)
      }

      // Log Audit
      const { logAudit } = await import('@/lib/audit')
      await logAudit('DISCHARGE_PATIENT', `hospitalizations/${hospitalizationId}`, {
        invoice_id: finalInvoice?.id,
        invoice_number: finalInvoice?.invoice_number,
      })

      return NextResponse.json({
        success: true,
        message: 'Paciente dado de alta y factura generada correctamente',
        invoice: finalInvoice,
      })
    } catch (e) {
      logger.error('Error during hospitalization discharge', {
        tenantId: profile.tenant_id,
        hospitalizationId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
