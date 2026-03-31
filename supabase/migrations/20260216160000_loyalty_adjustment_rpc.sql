-- Loyalty points adjustment RPC
-- Atomic operation to adjust loyalty points and create a transaction record

CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
    p_tenant_id TEXT,
    p_client_id UUID,
    p_points INTEGER,
    p_description TEXT,
    p_type TEXT,
    p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get current balance with row locking
    SELECT balance INTO v_current_balance
    FROM public.loyalty_points
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id
    FOR UPDATE;

    -- Default balance to 0 if record doesn't exist
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_points;

    -- BIZ-007: Check for negative balance
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Saldo de puntos insuficiente. Balance actual: %', v_current_balance
            USING ERRCODE = 'P0001'; -- Custom error code for application handling
    END IF;

    -- Insert transaction
    -- The trigger public.update_loyalty_balance() will handle updating public.loyalty_points
    -- and calculating the tier.
    INSERT INTO public.loyalty_transactions (
        tenant_id,
        client_id,
        points,
        type,
        description,
        created_by
    ) VALUES (
        p_tenant_id,
        p_client_id,
        p_points,
        p_type,
        p_description,
        p_created_by
    ) RETURNING id INTO v_transaction_id;

    -- Get the updated balance (calculated by trigger)
    SELECT balance INTO v_new_balance
    FROM public.loyalty_points
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.adjust_loyalty_points IS 'Atomic adjustment of loyalty points with balance validation and transaction recording.';
