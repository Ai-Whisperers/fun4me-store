-- =============================================================================
-- 009_FIX_INVOICE_TOTALS.SQL
-- =============================================================================
-- Fixes the invoice totals calculation trigger to properly handle:
--   - Line item discounts
--   - Discount-type rows (negative amounts)
--   - Tax calculations
--   - Proper total computation
--
-- Previous Issue:
--   The update_invoice_totals() function was potentially double-counting
--   discounts by adding both line-item discount_amount AND discount-type rows.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. DROP OLD TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS invoice_items_update_totals ON public.invoice_items;

-- =============================================================================
-- B. IMPROVED INVOICE TOTALS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(12,2);
    v_line_discounts NUMERIC(12,2);
    v_discount_rows NUMERIC(12,2);
    v_total_discount NUMERIC(12,2);
    v_tax_amount NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    -- Get the invoice ID from the affected row
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate components
    SELECT
        -- Subtotal: sum of all non-discount items (qty * unit_price)
        COALESCE(SUM(
            CASE
                WHEN item_type != 'discount' THEN quantity * unit_price
                ELSE 0
            END
        ), 0),

        -- Line-level discounts from discount_amount column
        COALESCE(SUM(COALESCE(discount_amount, 0)), 0),

        -- Discount rows (item_type = 'discount', typically negative total)
        -- These are stored as positive values but represent reductions
        ABS(COALESCE(SUM(
            CASE
                WHEN item_type = 'discount' THEN total
                ELSE 0
            END
        ), 0))
    INTO v_subtotal, v_line_discounts, v_discount_rows
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Total discount is the sum of both discount types
    v_total_discount := v_line_discounts + v_discount_rows;

    -- Calculate tax on (subtotal - discounts)
    -- Note: This assumes tax is calculated AFTER discounts
    SELECT COALESCE(SUM(
        CASE
            WHEN item_type != 'discount' THEN
                (quantity * unit_price - COALESCE(discount_amount, 0)) * COALESCE(tax_rate, 0) / 100
            ELSE 0
        END
    ), 0)
    INTO v_tax_amount
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Calculate final total
    v_total := v_subtotal - v_total_discount + v_tax_amount;

    -- Update the invoice
    UPDATE public.invoices
    SET
        subtotal = v_subtotal,
        discount_amount = v_total_discount,
        tax_amount = v_tax_amount,
        total = GREATEST(v_total, 0)  -- Ensure total is never negative
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- C. RECREATE TRIGGER
-- =============================================================================

CREATE TRIGGER invoice_items_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

-- =============================================================================
-- D. HELPER FUNCTION: Calculate Invoice Item Total
-- =============================================================================
-- Automatically calculates the total for each invoice item

CREATE OR REPLACE FUNCTION public.calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate item total: (qty * price - discount) * (1 + tax_rate/100)
    -- For discount items, use the provided total directly
    IF NEW.item_type = 'discount' THEN
        -- Discount items should have negative total
        NEW.total := -ABS(COALESCE(NEW.total, NEW.quantity * NEW.unit_price));
    ELSE
        NEW.total := (
            NEW.quantity * NEW.unit_price
            - COALESCE(NEW.discount_amount, 0)
        ) * (1 + COALESCE(NEW.tax_rate, 0) / 100);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_items_calc_total ON public.invoice_items;
CREATE TRIGGER invoice_items_calc_total
    BEFORE INSERT OR UPDATE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_item_total();

-- =============================================================================
-- E. RECALCULATE ALL EXISTING INVOICES
-- =============================================================================
-- This ensures all existing invoices have correct totals

DO $$
DECLARE
    inv RECORD;
BEGIN
    FOR inv IN SELECT DISTINCT invoice_id FROM public.invoice_items
    LOOP
        -- Touch each invoice to trigger recalculation
        UPDATE public.invoice_items
        SET updated_at = NOW()
        WHERE invoice_id = inv.invoice_id
        AND id = (
            SELECT id FROM public.invoice_items
            WHERE invoice_id = inv.invoice_id
            LIMIT 1
        );
    END LOOP;

    RAISE NOTICE 'Recalculated totals for all invoices';
END $$;

-- =============================================================================
-- F. HELPER FUNCTION: Add Invoice Item
-- =============================================================================
-- Convenience function to add items with proper calculation

CREATE OR REPLACE FUNCTION public.add_invoice_item(
    p_invoice_id UUID,
    p_item_type TEXT,
    p_description TEXT,
    p_quantity NUMERIC DEFAULT 1,
    p_unit_price NUMERIC DEFAULT 0,
    p_tax_rate NUMERIC DEFAULT 0,
    p_discount_amount NUMERIC DEFAULT 0,
    p_service_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item_id UUID;
    v_tenant_id TEXT;
BEGIN
    -- Get tenant from invoice
    SELECT tenant_id INTO v_tenant_id FROM public.invoices WHERE id = p_invoice_id;

    INSERT INTO public.invoice_items (
        invoice_id,
        tenant_id,
        item_type,
        description,
        quantity,
        unit_price,
        tax_rate,
        discount_amount,
        service_id,
        product_id,
        display_order
    ) VALUES (
        p_invoice_id,
        v_tenant_id,
        p_item_type,
        p_description,
        p_quantity,
        p_unit_price,
        p_tax_rate,
        p_discount_amount,
        p_service_id,
        p_product_id,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.invoice_items WHERE invoice_id = p_invoice_id)
    )
    RETURNING id INTO v_item_id;

    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- G. HELPER FUNCTION: Add Invoice Discount
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_invoice_discount(
    p_invoice_id UUID,
    p_description TEXT,
    p_discount_amount NUMERIC
)
RETURNS UUID AS $$
BEGIN
    RETURN public.add_invoice_item(
        p_invoice_id,
        'discount',
        p_description,
        1,
        p_discount_amount,  -- unit_price = discount amount
        0,                  -- no tax on discounts
        0                   -- no line discount (this IS the discount)
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================================================
-- VALIDATION
-- =============================================================================
-- Run these queries to verify the fix:
--
-- -- Check invoice totals match item sums
-- SELECT
--     i.id,
--     i.invoice_number,
--     i.subtotal,
--     i.discount_amount,
--     i.tax_amount,
--     i.total,
--     (SELECT SUM(CASE WHEN item_type != 'discount' THEN quantity * unit_price ELSE 0 END) FROM invoice_items WHERE invoice_id = i.id) as calc_subtotal,
--     (SELECT SUM(COALESCE(discount_amount, 0)) + ABS(SUM(CASE WHEN item_type = 'discount' THEN total ELSE 0 END)) FROM invoice_items WHERE invoice_id = i.id) as calc_discount
-- FROM invoices i
-- WHERE i.deleted_at IS NULL
-- LIMIT 10;
