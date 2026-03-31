-- =============================================================================
-- 063_ATOMIC_PAYMENT_RECORDING.SQL
-- =============================================================================
-- Fixes payment race condition vulnerability (DATA INTEGRITY CRITICAL).
--
-- PROBLEM:
--   Thread A: Check invoice -> Record payment -> Update invoice
--   Thread B: Check invoice -> Record payment -> Update invoice
--   RESULT: Double payment recorded, incorrect amounts
--
-- SOLUTION:
--   1. SELECT FOR UPDATE (row-level lock)
--   2. Atomic transaction
--   3. Proper validation before processing
--   4. Returns JSONB with success/error information
--
-- DEPENDENCIES:
--   50_finance/01_invoicing.sql (invoices, payments tables)
-- =============================================================================

BEGIN;

-- =============================================================================
-- REPLACE EXISTING record_invoice_payment WITH ATOMIC VERSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_invoice_id UUID,
    p_tenant_id TEXT,
    p_amount NUMERIC,
    p_payment_method TEXT DEFAULT 'cash',
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_received_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
    v_payment_id UUID;
    v_new_paid_amount NUMERIC;
    v_new_status TEXT;
    v_amount_due NUMERIC;
BEGIN
    -- =================================================================
    -- STEP 1: Lock the invoice row to prevent concurrent updates
    -- =================================================================
    -- FOR UPDATE locks the row until transaction commits
    -- Other transactions will WAIT here (no race condition)
    
    SELECT 
        id,
        tenant_id,
        total,
        COALESCE(amount_paid, 0) as amount_paid,
        status
    INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE; -- 🔒 ROW LOCK - Prevents race condition
    
    -- =================================================================
    -- STEP 2: Validation checks
    -- =================================================================
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVOICE_NOT_FOUND',
            'message', 'Factura no encontrada'
        );
    END IF;
    
    -- Verify tenant ownership
    IF v_invoice.tenant_id != p_tenant_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN',
            'message', 'La factura no pertenece a esta clínica'
        );
    END IF;
    
    -- Check if invoice is already fully paid
    IF v_invoice.status = 'paid' AND v_invoice.amount_paid >= v_invoice.total THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_PAID',
            'message', 'Esta factura ya está completamente pagada',
            'current_paid', v_invoice.amount_paid,
            'total', v_invoice.total
        );
    END IF;
    
    -- Validate payment amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_AMOUNT',
            'message', 'El monto del pago debe ser positivo'
        );
    END IF;
    
    -- Check for overpayment
    v_new_paid_amount := v_invoice.amount_paid + p_amount;
    IF v_new_paid_amount > v_invoice.total THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'OVERPAYMENT',
            'message', 'El monto excede el total de la factura',
            'amount_due', v_invoice.total - v_invoice.amount_paid,
            'attempted_payment', p_amount
        );
    END IF;
    
    -- =================================================================
    -- STEP 3: Record payment (atomic with invoice update)
    -- =================================================================
    
    INSERT INTO public.payments (
        tenant_id,
        invoice_id,
        amount,
        payment_method,
        reference_number,
        notes,
        received_by,
        paid_at,
        status
    )
    VALUES (
        p_tenant_id,
        p_invoice_id,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_notes,
        COALESCE(p_received_by, auth.uid()),
        NOW(),
        'completed'
    )
    RETURNING id INTO v_payment_id;
    
    -- =================================================================
    -- STEP 4: Update invoice status atomically
    -- =================================================================
    -- This update is atomic with the INSERT above
    -- Row is still locked from SELECT FOR UPDATE
    
    -- Determine new status
    IF v_new_paid_amount >= v_invoice.total THEN
        v_new_status := 'paid';
    ELSIF v_new_paid_amount > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := v_invoice.status;
    END IF;
    
    v_amount_due := v_invoice.total - v_new_paid_amount;
    
    UPDATE public.invoices
    SET 
        amount_paid = v_new_paid_amount,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- =================================================================
    -- STEP 5: Return success with full details
    -- =================================================================
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'amount_paid', v_new_paid_amount,
        'amount_due', v_amount_due,
        'status', v_new_status,
        'message', 'Pago registrado exitosamente'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Catch any unexpected errors
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATABASE_ERROR',
            'message', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.record_invoice_payment IS 
'Atomically records a payment and updates invoice status. Uses row-level locking to prevent race conditions. Returns JSONB with success flag and details.';

-- =============================================================================
-- CREATE ATOMIC PLATFORM INVOICE PAYMENT FUNCTION
-- =============================================================================
-- Similar to above but for platform_invoices (Stripe payments)

CREATE OR REPLACE FUNCTION public.record_platform_invoice_payment(
    p_invoice_id UUID,
    p_tenant_id TEXT,
    p_payment_method TEXT,
    p_payment_reference TEXT,
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- =================================================================
    -- STEP 1: Lock the platform invoice row
    -- =================================================================
    
    SELECT 
        id,
        tenant_id,
        total,
        status
    INTO v_invoice
    FROM public.platform_invoices
    WHERE id = p_invoice_id
    FOR UPDATE; -- 🔒 ROW LOCK
    
    -- =================================================================
    -- STEP 2: Validation
    -- =================================================================
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVOICE_NOT_FOUND'
        );
    END IF;
    
    IF v_invoice.tenant_id != p_tenant_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN'
        );
    END IF;
    
    -- Check if already paid (race condition check)
    IF v_invoice.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_PAID',
            'message', 'Esta factura ya fue pagada'
        );
    END IF;
    
    IF v_invoice.status = 'void' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'VOIDED',
            'message', 'Esta factura ha sido anulada'
        );
    END IF;
    
    -- =================================================================
    -- STEP 3: Update invoice and related records atomically
    -- =================================================================
    
    -- Update invoice
    UPDATE public.platform_invoices
    SET
        status = 'paid',
        paid_at = v_now,
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_amount = total,
        updated_at = v_now
    WHERE id = p_invoice_id;
    
    -- Update transaction status
    IF p_transaction_id IS NOT NULL THEN
        UPDATE public.billing_payment_transactions
        SET
            status = 'succeeded',
            completed_at = v_now
        WHERE id = p_transaction_id;
    END IF;
    
    -- Mark store commissions as paid
    UPDATE public.store_commissions
    SET
        status = 'paid',
        paid_at = v_now,
        updated_at = v_now
    WHERE platform_invoice_id = p_invoice_id
    AND status = 'invoiced';
    
    -- Mark service commissions as paid
    UPDATE public.service_commissions
    SET
        status = 'paid',
        paid_at = v_now,
        updated_at = v_now
    WHERE platform_invoice_id = p_invoice_id
    AND status = 'invoiced';
    
    -- =================================================================
    -- STEP 4: Return success
    -- =================================================================
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'status', 'paid',
        'paid_at', v_now
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATABASE_ERROR',
            'message', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.record_platform_invoice_payment IS 
'Atomically marks a platform invoice as paid and updates all linked commissions. Uses row-level locking to prevent double payments.';

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================
--
-- Test the function:
--   SELECT record_invoice_payment(
--     p_invoice_id := '<uuid>',
--     p_tenant_id := 'adris',
--     p_amount := 50000,
--     p_payment_method := 'cash'
--   );
--
-- Expected result:
--   {"success": true, "payment_id": "<uuid>", ...}
--
-- =============================================================================
