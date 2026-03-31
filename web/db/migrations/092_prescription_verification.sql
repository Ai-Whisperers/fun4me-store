-- =============================================================================
-- 063_PRESCRIPTION_VERIFICATION.SQL
-- =============================================================================
-- Adds pet_id to store orders for prescription product verification
-- Implements product-specific prescription matching
--
-- DEPENDENCIES: 60_store/orders/01_orders.sql, 30_clinical/02_medical_records.sql
-- =============================================================================

-- =============================================================================
-- ADD PET_ID TO STORE_ORDERS
-- =============================================================================
-- For orders containing prescription items, we need to know which pet
-- the products are for, so we can verify prescriptions.

ALTER TABLE public.store_orders
    ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id);

COMMENT ON COLUMN public.store_orders.pet_id IS
    'Pet for which prescription products are ordered. Required when order contains prescription items.';

-- Index for finding orders by pet
CREATE INDEX IF NOT EXISTS idx_store_orders_pet
    ON public.store_orders(pet_id)
    WHERE pet_id IS NOT NULL;

-- =============================================================================
-- PRESCRIPTION VERIFICATION FUNCTION
-- =============================================================================
-- Validates that a pet has valid prescriptions for requested products
-- Returns details about matched/unmatched products

CREATE OR REPLACE FUNCTION verify_prescription_products(
    p_pet_id UUID,
    p_product_ids UUID[],
    p_tenant_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product RECORD;
    v_results JSONB := '[]'::JSONB;
    v_prescription RECORD;
    v_medication JSONB;
    v_matched BOOLEAN;
    v_product_name_lower TEXT;
    v_medication_name_lower TEXT;
BEGIN
    -- For each product that requires prescription
    FOR v_product IN
        SELECT sp.id, sp.name, sp.requires_prescription
        FROM store_products sp
        WHERE sp.id = ANY(p_product_ids)
        AND sp.requires_prescription = true
        AND (sp.tenant_id = p_tenant_id OR sp.tenant_id IS NULL)
    LOOP
        v_matched := false;
        v_product_name_lower := lower(v_product.name);

        -- Look for matching prescription
        FOR v_prescription IN
            SELECT p.id, p.medications, p.valid_until, p.status
            FROM prescriptions p
            WHERE p.pet_id = p_pet_id
            AND p.deleted_at IS NULL
            AND p.status = 'active'
            AND (p.valid_until IS NULL OR p.valid_until >= CURRENT_DATE)
        LOOP
            -- Check each medication in the prescription
            FOR v_medication IN SELECT * FROM jsonb_array_elements(v_prescription.medications)
            LOOP
                v_medication_name_lower := lower(v_medication->>'name');

                -- Check if medication name matches product name
                -- Uses partial matching (product name contains medication name or vice versa)
                IF v_medication_name_lower LIKE '%' || v_product_name_lower || '%'
                   OR v_product_name_lower LIKE '%' || v_medication_name_lower || '%' THEN
                    v_matched := true;
                    EXIT; -- Found match, exit medication loop
                END IF;
            END LOOP;

            IF v_matched THEN
                EXIT; -- Found match, exit prescription loop
            END IF;
        END LOOP;

        -- Add result for this product
        v_results := v_results || jsonb_build_object(
            'product_id', v_product.id,
            'product_name', v_product.name,
            'has_valid_prescription', v_matched
        );
    END LOOP;

    RETURN v_results;
END;
$$;

COMMENT ON FUNCTION verify_prescription_products(UUID, UUID[], TEXT) IS
    'Verifies if a pet has valid prescriptions for the given products. Returns match status for each product.';

-- =============================================================================
-- STAFF PRESCRIPTION OVERRIDE FUNCTION
-- =============================================================================
-- Allows staff to approve prescription orders with audit logging

CREATE OR REPLACE FUNCTION override_prescription_requirement(
    p_order_id UUID,
    p_staff_id UUID,
    p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_staff RECORD;
BEGIN
    -- Verify order exists and is pending prescription
    SELECT * INTO v_order
    FROM store_orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
    END IF;

    IF v_order.status != 'pending_prescription' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El pedido no está pendiente de receta');
    END IF;

    -- Verify staff is vet or admin for this tenant
    SELECT * INTO v_staff
    FROM profiles
    WHERE id = p_staff_id
    AND tenant_id = v_order.tenant_id
    AND role IN ('vet', 'admin')
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado para aprobar recetas');
    END IF;

    -- Update order status
    UPDATE store_orders
    SET status = 'confirmed',
        prescription_reviewed_by = p_staff_id,
        prescription_reviewed_at = NOW(),
        prescription_notes = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Log to audit
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource,
        resource_id,
        details,
        created_at
    ) VALUES (
        v_order.tenant_id,
        p_staff_id,
        'prescription_override',
        'store_orders',
        p_order_id::TEXT,
        jsonb_build_object(
            'order_number', v_order.order_number,
            'reason', p_reason,
            'original_status', 'pending_prescription',
            'new_status', 'confirmed'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'message', 'Receta aprobada exitosamente'
    );
END;
$$;

COMMENT ON FUNCTION override_prescription_requirement(UUID, UUID, TEXT) IS
    'Allows staff (vet/admin) to approve a prescription order with reason. Logs to audit trail.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_prescription_products(UUID, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION override_prescription_requirement(UUID, UUID, TEXT) TO authenticated;
