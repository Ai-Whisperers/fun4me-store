/**
 * Hospitalization Billing Utilities
 *
 * Generates invoices for hospitalization stays, including:
 * - Daily kennel fees
 * - Treatments and medications
 * - Lab tests and procedures
 * - Feeding charges
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface HospitalizationInvoice {
  id: string
  invoice_number: string
  total: number
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
}

export interface GenerateInvoiceResult {
  success: boolean
  invoice: HospitalizationInvoice | null
  error?: string
}

/**
 * Generates an invoice for a hospitalization stay.
 *
 * Uses an atomic database function to prevent race conditions and duplicate invoices.
 * The function:
 * 1. Locks the hospitalization row
 * 2. Checks for existing invoice (idempotency)
 * 3. Creates invoice atomically
 *
 * @param supabase - Supabase client
 * @param hospitalizationId - ID of the hospitalization
 * @param tenantId - Tenant ID for data isolation
 * @param userId - ID of the user generating the invoice
 * @param idempotencyKey - Optional idempotency key for retry safety
 * @returns Result with invoice data or error
 */
export async function generateHospitalizationInvoice(
  supabase: SupabaseClient,
  hospitalizationId: string,
  tenantId: string,
  userId: string,
  idempotencyKey?: string
): Promise<GenerateInvoiceResult> {
  try {
    // Use atomic database function to prevent race conditions
    const { data: result, error: rpcError } = await supabase.rpc(
      'generate_hospitalization_invoice_atomic',
      {
        p_hospitalization_id: hospitalizationId,
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_idempotency_key: idempotencyKey || null,
      }
    )

    if (rpcError) {
      return {
        success: false,
        invoice: null,
        error: `Error de base de datos: ${rpcError.message}`,
      }
    }

    if (!result?.success) {
      // Handle duplicate invoice case
      if (result?.error_code === 'duplicate' && result?.existing_invoice_id) {
        return {
          success: false,
          invoice: {
            id: result.existing_invoice_id,
            invoice_number: result.existing_invoice_number,
            total: 0,
            items: [],
          },
          error: result.error || 'Ya existe una factura para esta hospitalización',
        }
      }

      return {
        success: false,
        invoice: null,
        error: result?.error || 'Error al generar factura',
      }
    }

    // Build items array from result
    const items: Array<{
      description: string
      quantity: number
      unit_price: number
      total: number
    }> = []

    if (result.days && result.subtotal > 0) {
      const dailyRate = result.subtotal / result.days
      items.push({
        description: `Estadía en jaula (${result.days} días)`,
        quantity: result.days,
        unit_price: dailyRate,
        total: result.subtotal,
      })
    }

    return {
      success: true,
      invoice: {
        id: result.invoice_id,
        invoice_number: result.invoice_number,
        total: result.total,
        items,
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      invoice: null,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
