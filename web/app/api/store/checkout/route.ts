import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { requireFeature } from '@/lib/features/server'
import { checkoutRequestSchema } from '@/lib/schemas/store'
import type { PostgrestError } from '@supabase/supabase-js'
import { getPaymentService } from '@/lib/payments/service'

// TICKET-BIZ-003: Checkout API that validates stock and decrements inventory
// TICKET-BIZ-004: Server-side stock validation
// FEAT-013: Prescription verification with pet-specific validation
// Uses atomic process_checkout function for consistency
//
// SEC-024: Client-supplied prices are IGNORED by process_checkout().
// The RPC function looks up actual prices from store_products/services tables.
// Price mismatches are logged to financial_audit_logs for security monitoring.
// See migration 069_fix_checkout_price_validation.sql

interface StockError {
  id: string
  name: string
  requested: number
  available: number
}

interface PrescriptionError {
  id: string
  name: string
  error: string
}

interface PrescriptionValidationResult {
  product_id: string
  product_name: string
  has_valid_prescription: boolean
}

// POST /api/store/checkout - Process checkout (atomic)
// Rate limited: 5 requests per minute (checkout operations - strict for fraud prevention)
export const POST = withApiAuth(
  async ({ user, profile, supabase, request, log }: ApiHandlerContext) => {
    // Parse and validate request body with Zod schema
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'JSON inválido' },
      })
    }

    const validationResult = checkoutRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          message: 'Datos de checkout inválidos',
          errors: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      })
    }

    const { items, clinic, notes, pet_id } = validationResult.data

    // AUDIT-106: Get idempotency key from header or body
    const idempotencyKey = request.headers.get('Idempotency-Key')
      || (rawBody as Record<string, unknown>).idempotencyKey as string | undefined
      || null

    // AUDIT-106: If idempotency key provided, check for existing invoice
    if (idempotencyKey) {
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status')
        .eq('tenant_id', profile.tenant_id)
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (existingInvoice) {
        log.info('Idempotent checkout - returning existing invoice', {
          action: 'checkout.idempotent',
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoice_number,
        })

        // For idempotent requests, we might still need a payment intent if the previous one wasn't finished
        // For now, returning existing invoice as before
        return NextResponse.json({
          success: true,
          invoice: {
            id: existingInvoice.id,
            invoice_number: existingInvoice.invoice_number,
            total: existingInvoice.total,
            status: existingInvoice.status,
          },
          message: 'Pedido existente (respuesta idempotente)',
        })
      }
    }

    // Validate clinic matches user's tenant
    if (clinic !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'Clínica no válida' },
      })
    }

    // Check if tenant has ecommerce feature enabled
    const featureCheck = await requireFeature(profile.tenant_id, 'ecommerce')
    if (featureCheck) return featureCheck

    // Separate products and services for logging/metrics
    const productItems = items.filter((item) => item.type === 'product')
    const serviceItems = items.filter((item) => item.type === 'service')

    // Check for prescription items
    const prescriptionItems = items.filter((item) => item.requires_prescription)

    log.info('Processing checkout', {
      action: 'checkout.start',
      itemCount: items.length,
      productCount: productItems.length,
      serviceCount: serviceItems.length,
      prescriptionItemCount: prescriptionItems.length,
    })

    // FEAT-013: Prescription verification for products requiring prescription
    if (prescriptionItems.length > 0) {
      // Require pet_id for prescription items
      if (!pet_id) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: {
            message: 'Debe seleccionar una mascota para productos que requieren receta médica',
            code: 'PET_REQUIRED_FOR_PRESCRIPTION',
          },
        })
      }

      // Verify the pet belongs to this user
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id, name, owner_id')
        .eq('id', pet_id)
        .eq('owner_id', user.id)
        .single()

      if (petError || !pet) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: {
            message: 'Mascota no encontrada o no pertenece a su cuenta',
            code: 'INVALID_PET',
          },
        })
      }

      // Get prescription product IDs
      const prescriptionProductIds = prescriptionItems.map((item) => item.id)

      // Verify prescriptions using database function
      const { data: prescriptionCheck, error: prescriptionError } = await supabase.rpc(
        'verify_prescription_products',
        {
          p_pet_id: pet_id,
          p_product_ids: prescriptionProductIds,
          p_tenant_id: clinic,
        }
      )

      if (prescriptionError) {
        // Epic 3.1: Distinguish between real database errors vs "no data" responses
        // Real database errors (connection failures, timeouts, function errors) should FAIL the checkout
        // Only allow "no data" scenarios where the function succeeded but returned empty results

        // Type the error as PostgrestError for proper access to code/details
        const pgError = prescriptionError as PostgrestError

        log.error('Prescription verification failed', {
          action: 'checkout.prescription_error',
          error: prescriptionError instanceof Error ? prescriptionError : new Error(String(prescriptionError)),
          errorCode: pgError.code,
          errorDetails: pgError.details,
        })

        // Check if this is a real database error (not just "no results")
        // PostgrestError codes: https://postgrest.org/en/stable/references/errors.html
        // Common real errors: PGRST000 (connection), PGRST301 (function error), etc.
        const errorCode = pgError.code
        const isRealDatabaseError = errorCode && !errorCode.startsWith('PGRST116') // PGRST116 is "no rows returned" which is OK
        
        if (isRealDatabaseError) {
          // Real database error - FAIL the checkout for security
          return NextResponse.json(
            {
              error: 'PRESCRIPTION_VERIFICATION_FAILED',
              message: 'No pudimos verificar las recetas. Por favor, intenta nuevamente o contacta al soporte.',
              details: 'Database error during prescription verification',
            },
            { status: 500 }
          )
        }
        
        // If no real error, fall through to allow order with pending_prescription status
        // This handles cases where the RPC returned successfully but with no data
      } else if (prescriptionCheck) {
        const results = prescriptionCheck as PrescriptionValidationResult[]
        const missingPrescriptions = results.filter((r) => !r.has_valid_prescription)

        if (missingPrescriptions.length > 0) {
          // Log which items are missing prescriptions but continue with pending_prescription status
          log.info('Products missing valid prescription', {
            action: 'checkout.prescription_missing',
            products: missingPrescriptions.map((p) => p.product_name),
            petId: pet_id,
          })
        }
      }
    }

    // Attempt atomic checkout using database function
    // This ensures all operations (validation, invoice creation, stock decrement) happen atomically
    try {
      const { data: checkoutResult, error: checkoutError } = await supabase.rpc(
        'process_checkout',
        {
          p_tenant_id: clinic,
          p_user_id: user.id,
          p_items: JSON.stringify(
            items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              type: item.type,
              requires_prescription: item.requires_prescription,
              prescription_file_url: item.prescription_file_url,
            }))
          ),
          p_notes: notes || 'Pedido desde tienda online',
          // AUDIT-106: Pass idempotency key to store in invoice
          p_idempotency_key: idempotencyKey,
        }
      )

      if (checkoutError) {
        log.error('Atomic checkout failed', {
          action: 'checkout.error',
          itemCount: items.length,
          error: checkoutError instanceof Error ? checkoutError : new Error(String(checkoutError)),
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: checkoutError.message },
        })
      }

      // Parse the result from the database function
      const result = checkoutResult as {
        success: boolean
        error?: string
        stock_errors?: StockError[]
        prescription_errors?: PrescriptionError[]
        invoice?: {
          id: string
          invoice_number: string
          total: number
          status: string
        }
      }

      // Handle stock errors returned by the function
      if (!result.success) {
        if (result.stock_errors && result.stock_errors.length > 0) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: {
              message: result.error || 'Stock insuficiente para algunos productos',
              stockErrors: result.stock_errors,
            },
          })
        }

        if (result.prescription_errors && result.prescription_errors.length > 0) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: {
              message: result.error || 'Falta receta médica para algunos productos',
              prescriptionErrors: result.prescription_errors,
            },
          })
        }

        return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: result.error || 'Error al procesar el pedido' },
        })
      }

      // Success - cart clearing and reservation conversion now handled atomically
      // in the process_checkout database function (migration 021)

      // PHASE 1: Initiate payment intent for the checkout
      let paymentIntent = null
      if (result.invoice) {
        try {
          const paymentService = getPaymentService()
          const intentResult = await paymentService.createPaymentIntent({
            amount: result.invoice.total,
            currency: 'PYG', // Default for Paraguay
            invoiceId: result.invoice.id,
            tenantId: clinic,
            customerEmail: user.email,
            description: `Store Order ${result.invoice.invoice_number}`,
            metadata: {
              order_type: 'store',
              client_id: user.id,
            }
          })

          if (intentResult.success) {
            paymentIntent = {
              id: intentResult.data?.id,
              clientSecret: intentResult.data?.clientSecret,
              provider: paymentService.providerName,
            }
          } else {
            log.error('Failed to create payment intent', {
              action: 'checkout.payment_intent_error',
              invoiceId: result.invoice.id,
              error: intentResult.error,
            })
            // We continue anyway, the invoice was created successfully
            // The client might need to pay later or through another method
          }
        } catch (paymentError) {
          log.error('Payment service error during checkout', {
            action: 'checkout.payment_service_error',
            error: paymentError instanceof Error ? paymentError : new Error(String(paymentError)),
          })
        }
      }

      // Log the transaction
      const { logAudit } = await import('@/lib/audit')
      await logAudit('CHECKOUT', `invoices/${result.invoice?.id}`, {
        total: result.invoice?.total,
        item_count: items.length,
        product_count: productItems.length,
        service_count: serviceItems.length,
      })

      log.info('Checkout completed successfully', {
        action: 'checkout.success',
        resourceType: 'invoice',
        resourceId: result.invoice?.id,
        total: result.invoice?.total,
        itemCount: items.length,
        paymentIntentId: paymentIntent?.id,
      })

      return NextResponse.json(
        {
          success: true,
          invoice: result.invoice,
          paymentIntent,
        },
        { status: 201 }
      )
    } catch (e: unknown) {
      log.error('Checkout error', {
        action: 'checkout.error',
        itemCount: items.length,
        error: e instanceof Error ? e : new Error(String(e)),
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: e instanceof Error ? e.message : 'Error al procesar el pedido' },
      })
    }
  },
  { rateLimit: 'checkout' }
)
