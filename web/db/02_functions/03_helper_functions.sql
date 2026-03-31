-- =============================================================================
-- 03_HELPER_FUNCTIONS.SQL
-- =============================================================================
-- Additional helper functions for business logic and API support.
-- These extend the core functions with specific business operations.
--
-- Dependencies: 02_core_functions.sql
-- =============================================================================

-- Functions use CREATE OR REPLACE to update in place without breaking dependencies

-- =============================================================================
-- A. PET MANAGEMENT FUNCTIONS
-- =============================================================================

-- Get pet by QR tag code (public lookup)
CREATE OR REPLACE FUNCTION public.get_pet_by_tag(tag_code TEXT)
RETURNS TABLE (
    pet_id UUID,
    pet_name TEXT,
    species TEXT,
    breed TEXT,
    photo_url TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    clinic_name TEXT,
    clinic_phone TEXT,
    is_lost BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.photo_url,
        pr.full_name,
        pr.phone,
        t.name,
        t.phone,
        EXISTS (SELECT 1 FROM public.lost_pets lp WHERE lp.pet_id = p.id AND lp.status = 'lost')
    FROM public.qr_tags qt
    INNER JOIN public.pets p ON qt.pet_id = p.id
    LEFT JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.tenants t ON p.tenant_id = t.id
    WHERE qt.code = tag_code
      AND qt.is_active = TRUE
      AND qt.is_registered = TRUE
      AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_by_tag IS 'Public lookup of pet info by QR tag code';

-- Assign QR tag to pet
CREATE OR REPLACE FUNCTION public.assign_tag_to_pet(
    p_tag_code TEXT,
    p_pet_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tag_id UUID;
    v_pet_tenant TEXT;
BEGIN
    -- Get pet's tenant
    SELECT tenant_id INTO v_pet_tenant
    FROM public.pets
    WHERE id = p_pet_id AND deleted_at IS NULL;

    IF v_pet_tenant IS NULL THEN
        RAISE EXCEPTION 'Pet not found';
    END IF;

    -- Check authorization
    IF NOT public.is_owner_of_pet(p_pet_id) AND NOT public.is_staff_of(v_pet_tenant) THEN
        RAISE EXCEPTION 'Not authorized to assign tag to this pet';
    END IF;

    -- Find and update tag
    UPDATE public.qr_tags
    SET pet_id = p_pet_id,
        assigned_at = NOW(),
        assigned_by = auth.uid(),
        is_registered = TRUE
    WHERE code = p_tag_code
      AND is_active = TRUE
      AND (pet_id IS NULL OR pet_id = p_pet_id)  -- Allow reassignment to same pet
      AND (tenant_id IS NULL OR tenant_id = v_pet_tenant)
    RETURNING id INTO v_tag_id;

    RETURN v_tag_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.assign_tag_to_pet IS 'Assign a QR tag to a pet';

-- Note: search_pets and get_pet_age are defined in 20_pets/01_pets.sql

-- =============================================================================
-- B. INVENTORY FUNCTIONS
-- =============================================================================

-- Process inventory transaction (updates stock and WAC)
CREATE OR REPLACE FUNCTION public.process_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty NUMERIC;
    v_current_cost NUMERIC;
    v_new_qty NUMERIC;
    v_new_cost NUMERIC;
BEGIN
    -- Get current inventory
    SELECT stock_quantity, weighted_average_cost
    INTO v_current_qty, v_current_cost
    FROM public.store_inventory
    WHERE product_id = NEW.product_id;

    IF NOT FOUND THEN
        -- Create inventory record if doesn't exist
        INSERT INTO public.store_inventory (product_id, tenant_id, stock_quantity, weighted_average_cost)
        VALUES (NEW.product_id, NEW.tenant_id, 0, 0);
        v_current_qty := 0;
        v_current_cost := 0;
    END IF;

    -- Calculate new quantity
    v_new_qty := v_current_qty + NEW.quantity;

    -- Calculate new WAC for purchases
    IF NEW.type = 'purchase' AND NEW.quantity > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_new_cost := ((v_current_qty * v_current_cost) + (NEW.quantity * NEW.unit_cost)) / NULLIF(v_new_qty, 0);
    ELSE
        v_new_cost := v_current_cost;
    END IF;

    -- Update inventory
    UPDATE public.store_inventory
    SET stock_quantity = v_new_qty,
        weighted_average_cost = COALESCE(v_new_cost, weighted_average_cost),
        updated_at = NOW()
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.process_inventory_transaction IS 'Updates stock and WAC on inventory transaction';

-- Note: track_price_change and validate_coupon are defined in 60_store/01_inventory.sql

-- =============================================================================
-- C. CLINICAL FUNCTIONS
-- =============================================================================

-- Temporarily disabled due to vaccines table issues
-- Handle new pet vaccines (auto-create from templates)
-- CREATE OR REPLACE FUNCTION public.handle_new_pet_vaccines()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     v_template RECORD;
-- BEGIN
--     -- Get vaccine templates for this species
--     FOR v_template IN
--         SELECT * FROM public.vaccine_templates
--         WHERE NEW.species = ANY(species)
--           AND is_active = TRUE
--           AND (tenant_id IS NULL OR tenant_id = NEW.tenant_id)
--         ORDER BY display_order
--     LOOP
--         -- Create scheduled vaccine record
--         INSERT INTO public.vaccines (pet_id, template_id, name, administered_date, status)
--         VALUES (
--             NEW.id,
--             v_template.id,
--             v_template.name,
--             CURRENT_DATE,  -- Placeholder date
--             'scheduled'
--         );
--     END LOOP;
--
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SET search_path = public;
--
-- COMMENT ON FUNCTION public.handle_new_pet_vaccines IS 'Auto-creates vaccine records for new pets based on templates';

-- Get pet's active insurance
CREATE OR REPLACE FUNCTION public.get_pet_active_insurance(p_pet_id UUID)
RETURNS TABLE (
    policy_id UUID,
    provider_name TEXT,
    policy_number TEXT,
    plan_name TEXT,
    annual_limit NUMERIC,
    deductible_amount NUMERIC,
    coinsurance_percentage NUMERIC,
    expiration_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ip.id,
        prov.name,
        ip.policy_number,
        ip.plan_name,
        ip.annual_limit,
        ip.deductible_amount,
        ip.coinsurance_percentage,
        ip.expiration_date
    FROM public.insurance_policies ip
    INNER JOIN public.insurance_providers prov ON ip.provider_id = prov.id
    WHERE ip.pet_id = p_pet_id
      AND ip.status = 'active'
      AND (ip.expiration_date IS NULL OR ip.expiration_date >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_active_insurance IS 'Get active insurance policy for a pet';

-- Note: check_appointment_overlap and get_available_slots are defined in 40_scheduling/02_appointments.sql

-- =============================================================================
-- D. CLIENT FUNCTIONS
-- =============================================================================

-- Get client pet counts (batch lookup)
CREATE OR REPLACE FUNCTION public.get_client_pet_counts(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (
    client_id UUID,
    pet_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.owner_id,
        COUNT(*)
    FROM public.pets p
    WHERE p.owner_id = ANY(p_client_ids)
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
    GROUP BY p.owner_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.get_client_pet_counts IS 'Get pet counts for multiple clients';

-- Get client last appointments (batch lookup)
CREATE OR REPLACE FUNCTION public.get_client_last_appointments(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (
    client_id UUID,
    last_appointment_date TIMESTAMPTZ,
    last_appointment_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.owner_id)
        p.owner_id,
        a.start_time,
        a.status
    FROM public.appointments a
    INNER JOIN public.pets p ON a.pet_id = p.id
    WHERE p.owner_id = ANY(p_client_ids)
      AND a.tenant_id = p_tenant_id
      AND a.status IN ('completed', 'confirmed', 'checked_in')
    ORDER BY p.owner_id, a.start_time DESC;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.get_client_last_appointments IS 'Get last appointment for multiple clients';

-- =============================================================================
-- F. INVITE FUNCTIONS
-- =============================================================================
-- Note: create_clinic_invite is defined in 10_core/03_invites.sql
-- Only additional invite helper functions should be here

-- Expire old invites
CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.expire_old_invites IS 'Mark expired invites as expired';

-- =============================================================================
-- G. ADDITIONAL TRIGGERS
-- =============================================================================

-- Note: These triggers should be created after their respective tables exist.
-- They are included here for reference and should be run after table creation.

-- Inventory transaction trigger (if not already created in 60_inventory.sql)
-- DROP TRIGGER IF EXISTS on_inventory_transaction ON public.store_inventory_transactions;
-- CREATE TRIGGER on_inventory_transaction
--     AFTER INSERT ON public.store_inventory_transactions
--     FOR EACH ROW EXECUTE FUNCTION public.process_inventory_transaction();

-- Price change trigger (if not already created in 60_inventory.sql)
-- DROP TRIGGER IF EXISTS on_price_change ON public.store_products;
-- CREATE TRIGGER on_price_change
--     AFTER UPDATE ON public.store_products
--     FOR EACH ROW
--     WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price OR OLD.sale_price IS DISTINCT FROM NEW.sale_price)
--     EXECUTE FUNCTION public.track_price_change();

-- =============================================================================
-- H. STANDARDIZED TENANT PROPAGATION
-- =============================================================================
-- Pattern for auto-setting tenant_id in child tables from parent tables.
-- This provides reusable lookup functions for common parent-child relationships.
--
-- USAGE: Create a trigger function that calls the appropriate lookup, then
--        attach it to the child table's BEFORE INSERT trigger.
-- =============================================================================

-- Generic parent tenant lookup functions
-- These are optimized SQL functions (not plpgsql) for maximum performance

-- Lookup tenant from pets table
CREATE OR REPLACE FUNCTION public.get_tenant_from_pet(p_pet_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.pets WHERE id = p_pet_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_pet IS 'Get tenant_id from pets table';

-- Lookup tenant from invoices table
CREATE OR REPLACE FUNCTION public.get_tenant_from_invoice(p_invoice_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.invoices WHERE id = p_invoice_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_invoice IS 'Get tenant_id from invoices table';

-- Lookup tenant from lab_orders table
CREATE OR REPLACE FUNCTION public.get_tenant_from_lab_order(p_lab_order_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.lab_orders WHERE id = p_lab_order_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_lab_order IS 'Get tenant_id from lab_orders table';

-- Lookup tenant from hospitalizations table
CREATE OR REPLACE FUNCTION public.get_tenant_from_hospitalization(p_hospitalization_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.hospitalizations WHERE id = p_hospitalization_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_hospitalization IS 'Get tenant_id from hospitalizations table';

-- Lookup tenant from store_orders table
CREATE OR REPLACE FUNCTION public.get_tenant_from_store_order(p_order_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.store_orders WHERE id = p_order_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_store_order IS 'Get tenant_id from store_orders table';

-- Lookup tenant from store_campaigns table
CREATE OR REPLACE FUNCTION public.get_tenant_from_campaign(p_campaign_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.store_campaigns WHERE id = p_campaign_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_campaign IS 'Get tenant_id from store_campaigns table';

-- Lookup tenant from conversations table
CREATE OR REPLACE FUNCTION public.get_tenant_from_conversation(p_conversation_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.conversations WHERE id = p_conversation_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_conversation IS 'Get tenant_id from conversations table';

-- Lookup tenant from insurance_claims table
CREATE OR REPLACE FUNCTION public.get_tenant_from_claim(p_claim_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.insurance_claims WHERE id = p_claim_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_claim IS 'Get tenant_id from insurance_claims table';

-- Lookup tenant from staff_schedules table
CREATE OR REPLACE FUNCTION public.get_tenant_from_schedule(p_schedule_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.staff_schedules WHERE id = p_schedule_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_schedule IS 'Get tenant_id from staff_schedules table';

-- Lookup tenant from qr_tags table
CREATE OR REPLACE FUNCTION public.get_tenant_from_qr_tag(p_tag_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.qr_tags WHERE id = p_tag_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_qr_tag IS 'Get tenant_id from qr_tags table';

-- Temporarily disabled due to vaccines table issues
-- Lookup tenant from vaccines table (for vaccine_reactions)
-- CREATE OR REPLACE FUNCTION public.get_tenant_from_vaccine(p_vaccine_id UUID)
-- RETURNS TEXT AS $$
--     SELECT tenant_id FROM public.vaccines WHERE id = p_vaccine_id;
-- $$ LANGUAGE sql STABLE SET search_path = public;
--
-- COMMENT ON FUNCTION public.get_tenant_from_vaccine IS 'Get tenant_id from vaccines table';

-- =============================================================================
-- DOCUMENTATION: How to use tenant propagation pattern
-- =============================================================================
--
-- For new child tables, follow this pattern:
--
-- 1. Create a trigger function for your specific parent-child relationship:
--
--    CREATE OR REPLACE FUNCTION public.my_child_set_tenant_id()
--    RETURNS TRIGGER AS $$
--    BEGIN
--        IF NEW.tenant_id IS NULL THEN
--            NEW.tenant_id := public.get_tenant_from_parent(NEW.parent_id);
--        END IF;
--        RETURN NEW;
--    END;
--    $$ LANGUAGE plpgsql SET search_path = public;
--
-- 2. Create the trigger on your child table:
--
--    CREATE TRIGGER my_child_auto_tenant
--        BEFORE INSERT ON public.my_child_table
--        FOR EACH ROW EXECUTE FUNCTION public.my_child_set_tenant_id();
--
-- Benefits:
-- - Consistent pattern across all modules
-- - SQL lookup functions are optimized (STABLE, no transaction overhead)
-- - Easy to trace and debug tenant propagation issues
-- - RLS policies can use direct tenant_id checks (no JOINs)
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS COMPLETE
-- =============================================================================
