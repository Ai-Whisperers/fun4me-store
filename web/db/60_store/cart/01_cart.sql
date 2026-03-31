-- =============================================================================
-- 01_CART.SQL
-- =============================================================================
-- Persistent shopping cart for logged-in users
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STORE CARTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Cart contents stored as JSONB array
    -- Structure: [{ id, type, name, price, quantity, pet_id?, image_url? }]
    items JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One cart per customer per tenant
    CONSTRAINT store_carts_unique_customer UNIQUE(customer_id, tenant_id)
);

COMMENT ON TABLE public.store_carts IS 'Persistent shopping cart for logged-in customers';
COMMENT ON COLUMN public.store_carts.items IS 'Cart items as JSONB: [{id, type, name, price, quantity, pet_id?, image_url?}]';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_store_carts_tenant
    ON public.store_carts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_carts_customer
    ON public.store_carts(customer_id);

CREATE INDEX IF NOT EXISTS idx_store_carts_updated
    ON public.store_carts(updated_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;

-- Customers can only access their own cart
CREATE POLICY "Customers manage own cart" ON public.store_carts
    FOR ALL
    USING (customer_id = auth.uid());

-- Staff can view all carts in their tenant
CREATE POLICY "Staff view tenant carts" ON public.store_carts
    FOR SELECT
    USING (is_staff_of(tenant_id));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER handle_store_carts_updated_at
    BEFORE UPDATE ON public.store_carts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to merge cart items (for login merge scenario)
CREATE OR REPLACE FUNCTION merge_cart_items(
    existing_items JSONB,
    new_items JSONB
) RETURNS JSONB AS $$
DECLARE
    merged JSONB := existing_items;
    item JSONB;
    existing_idx INTEGER;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(new_items)
    LOOP
        -- Find if item already exists
        SELECT ordinality - 1 INTO existing_idx
        FROM jsonb_array_elements(merged) WITH ORDINALITY
        WHERE value->>'id' = item->>'id'
          AND value->>'type' = item->>'type'
        LIMIT 1;

        IF existing_idx IS NOT NULL THEN
            -- Update quantity (take higher value)
            merged := jsonb_set(
                merged,
                ARRAY[existing_idx::text, 'quantity'],
                to_jsonb(GREATEST(
                    (merged->existing_idx->>'quantity')::integer,
                    (item->>'quantity')::integer
                ))
            );
        ELSE
            -- Add new item
            merged := merged || jsonb_build_array(item);
        END IF;
    END LOOP;

    RETURN merged;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION merge_cart_items IS 'Merges two cart item arrays, preferring higher quantities for duplicates';
