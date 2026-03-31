-- =============================================================================
-- 042_ATOMIC_HOSPITALIZATION_INVOICE.SQL
-- =============================================================================
-- Makes hospitalization invoice generation transactional to prevent duplicate invoices.
--
-- PROBLEM: The current flow checks for existing invoice, then creates one separately.
-- Between check and creation, another transaction could create a duplicate invoice.
--
-- SOLUTION: Use a database function with row locking to ensure atomicity.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_hospitalization_invoice_atomic(
    p_hospitalization_id UUID,
    p_tenant_id TEXT,
    p_user_id UUID,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_hospitalization RECORD;
    v_existing_invoice RECORD;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_admitted_at TIMESTAMPTZ;
    v_discharged_at TIMESTAMPTZ;
    v_days INTEGER;
    v_daily_rate NUMERIC;
    v_subtotal NUMERIC;
    v_tax_rate NUMERIC := 0.10;
    v_tax_amount NUMERIC;
    v_total NUMERIC;
BEGIN
    -- Lock the hospitalization row to prevent concurrent invoice generation
    SELECT 
        h.id,
        h.pet_id,
        h.admitted_at,
        h.actual_discharge_at,
        h.status,
        k.daily_rate
    INTO v_hospitalization
    FROM public.hospitalizations h
    LEFT JOIN public.kennels k ON h.kennel_id = k.id
    WHERE h.id = p_hospitalization_id
    AND h.tenant_id = p_tenant_id
    FOR UPDATE;

    IF v_hospitalization.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Hospitalización no encontrada',
            'error_code', 'not_found'
        );
    END IF;

    -- Check for idempotency key if provided
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, invoice_number, total_amount
        INTO v_existing_invoice
        FROM public.invoices
        WHERE tenant_id = p_tenant_id
        AND idempotency_key = p_idempotency_key;

        IF v_existing_invoice.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'invoice_id', v_existing_invoice.id,
                'invoice_number', v_existing_invoice.invoice_number,
                'total', v_existing_invoice.total_amount,
                'idempotent', true
            );
        END IF;
    END IF;

    -- Check for existing invoice for this hospitalization
    SELECT id, invoice_number, total_amount
    INTO v_existing_invoice
    FROM public.invoices
    WHERE hospitalization_id = p_hospitalization_id
    AND tenant_id = p_tenant_id
    LIMIT 1;

    IF v_existing_invoice.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ya existe una factura para esta hospitalización',
            'error_code', 'duplicate',
            'existing_invoice_id', v_existing_invoice.id,
            'existing_invoice_number', v_existing_invoice.invoice_number
        );
    END IF;

    -- Calculate billing
    v_admitted_at := v_hospitalization.admitted_at;
    v_discharged_at := COALESCE(v_hospitalization.actual_discharge_at, NOW());
    v_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_discharged_at - v_admitted_at)) / 86400));
    v_daily_rate := COALESCE(v_hospitalization.daily_rate, 0);

    v_subtotal := v_days * v_daily_rate;
    v_tax_amount := ROUND(v_subtotal * v_tax_rate);
    v_total := v_subtotal + v_tax_amount;

    -- Generate invoice number
    v_invoice_number := 'HOS-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                        UPPER(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT));

    -- Create invoice atomically
    INSERT INTO public.invoices (
        tenant_id,
        hospitalization_id,
        pet_id,
        invoice_number,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        balance_due,
        status,
        created_by,
        idempotency_key
    ) VALUES (
        p_tenant_id,
        p_hospitalization_id,
        v_hospitalization.pet_id,
        v_invoice_number,
        v_subtotal,
        v_tax_rate,
        v_tax_amount,
        v_total,
        v_total,
        'pending',
        p_user_id,
        p_idempotency_key
    )
    RETURNING id INTO v_invoice_id;

    -- Create invoice item for kennel stay
    IF v_daily_rate > 0 AND v_days > 0 THEN
        INSERT INTO public.invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            total,
            item_type
        ) VALUES (
            v_invoice_id,
            'Estadía en jaula (' || v_days || ' días)',
            v_days,
            v_daily_rate,
            v_days * v_daily_rate,
            'service'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'total', v_total,
        'days', v_days,
        'subtotal', v_subtotal,
        'tax_amount', v_tax_amount
    );

EXCEPTION
    WHEN unique_violation THEN
        -- Another transaction won the race - return the existing invoice
        SELECT id, invoice_number, total_amount
        INTO v_existing_invoice
        FROM public.invoices
        WHERE hospitalization_id = p_hospitalization_id
        AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ya existe una factura para esta hospitalización',
            'error_code', 'duplicate',
            'existing_invoice_id', v_existing_invoice.id,
            'existing_invoice_number', v_existing_invoice.invoice_number
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.generate_hospitalization_invoice_atomic IS
'Atomically generates an invoice for a hospitalization, preventing duplicates via row locking';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_hospitalization_invoice_atomic(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Add unique constraint on hospitalization_id to prevent duplicates at DB level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'invoices_hospitalization_id_unique'
    ) THEN
        CREATE UNIQUE INDEX invoices_hospitalization_id_unique 
        ON public.invoices(hospitalization_id) 
        WHERE hospitalization_id IS NOT NULL;
    END IF;
END $$;
