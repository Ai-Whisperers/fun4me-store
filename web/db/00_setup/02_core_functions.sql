-- =============================================================================
-- 02_CORE_FUNCTIONS.SQL
-- =============================================================================
-- Core utility functions needed BEFORE tables are created.
-- These include stub versions of authorization functions that RLS policies reference.
-- The real implementations are created in 02_functions/ AFTER tables exist.
--
-- DEPENDENCIES: 01_extensions.sql, 01_types/01_enums_and_domains.sql
-- =============================================================================

-- =============================================================================
-- A. UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- This function is used by nearly all tables to auto-update the updated_at column.
-- Attached via: CREATE TRIGGER handle_updated_at BEFORE UPDATE ... EXECUTE FUNCTION handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.handle_updated_at() IS
'Trigger function to automatically update updated_at timestamp on row modification.
Usage: CREATE TRIGGER handle_updated_at BEFORE UPDATE ON table FOR EACH ROW EXECUTE FUNCTION handle_updated_at();';

-- =============================================================================
-- B. AUTHORIZATION STUB FUNCTIONS
-- =============================================================================
-- These are STUB versions that return FALSE initially.
-- They are replaced with real implementations AFTER profiles/pets tables exist.
-- RLS policies reference these functions, so they must exist before table creation.

-- Check if user is staff (vet/admin) of a tenant
-- STUB: Always returns FALSE until replaced with real function
CREATE OR REPLACE FUNCTION public.is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    -- Real implementation checks: profiles.role IN ('vet', 'admin') AND profiles.tenant_id = in_tenant_id
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_staff_of(TEXT) IS
'Check if current user is staff (vet/admin) of the specified tenant.
STUB VERSION - replaced by 02_functions/02_core_functions.sql after profiles table exists.
Used extensively in RLS policies for tenant data isolation.';

-- Check if user owns a specific pet
-- STUB: Always returns FALSE until replaced with real function
CREATE OR REPLACE FUNCTION public.is_owner_of_pet(pet_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Stub implementation - will be replaced after pets table exists
    -- Real implementation checks: pets.owner_id = auth.uid() AND pets.deleted_at IS NULL
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_owner_of_pet(UUID) IS
'Check if current user owns the specified pet.
STUB VERSION - replaced by 02_functions/02_core_functions.sql after pets table exists.
Used in RLS policies for owner access to pet data.';

-- Get user's tenant_id
-- STUB: Returns NULL until replaced with real function
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TEXT AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_user_tenant() IS
'Get the tenant_id for the current authenticated user.
STUB VERSION - replaced after profiles table exists.';

-- Get user's role
-- STUB: Returns NULL until replaced with real function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_user_role() IS
'Get the role for the current authenticated user.
STUB VERSION - replaced after profiles table exists.';

-- =============================================================================
-- C. GENERIC SOFT DELETE TRIGGER FUNCTION
-- =============================================================================
-- Converts DELETE to soft delete by setting deleted_at instead.
-- Can be used on any table with deleted_at and deleted_by columns.

CREATE OR REPLACE FUNCTION public.handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, update the soft delete columns
    EXECUTE format(
        'UPDATE %I.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME
    ) USING auth.uid(), OLD.id;

    RETURN NULL; -- Prevent the actual DELETE
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_soft_delete() IS
'Generic trigger function to convert DELETE operations to soft deletes.
Sets deleted_at = NOW() and deleted_by = auth.uid() instead of removing the row.
Usage: CREATE TRIGGER soft_delete BEFORE DELETE ON table FOR EACH ROW EXECUTE FUNCTION handle_soft_delete();
Requires table to have: id UUID PRIMARY KEY, deleted_at TIMESTAMPTZ, deleted_by UUID';

-- =============================================================================
-- D. PROTECT CRITICAL COLUMNS (Security Trigger)
-- =============================================================================
-- Prevents users from modifying their own role or tenant.

CREATE OR REPLACE FUNCTION public.protect_critical_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service role to do anything
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Prevent users from modifying their own role/tenant
    IF OLD.id = auth.uid() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Cannot modify your own role'
                USING ERRCODE = 'insufficient_privilege',
                      HINT = 'Role changes must be made by an administrator';
        END IF;
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Cannot modify your own tenant'
                USING ERRCODE = 'insufficient_privilege',
                      HINT = 'Tenant changes must be made by an administrator';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.protect_critical_profile_columns() IS
'Security trigger to prevent users from modifying their own role or tenant_id.
Allows service_role to bypass for administrative operations.';

-- =============================================================================
-- E. GENERIC DOCUMENT NUMBER GENERATOR (Thread-Safe)
-- =============================================================================
-- Uses document_sequences table with advisory locks to prevent race conditions.
-- Generates numbers like: FAC-2024-00001, ADM-00001, LAB-2024-00001

CREATE OR REPLACE FUNCTION public.next_document_number(
    p_tenant_id TEXT,
    p_document_type TEXT,
    p_prefix TEXT DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_prefix TEXT;
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Validate inputs
    IF p_tenant_id IS NULL OR p_document_type IS NULL THEN
        RAISE EXCEPTION 'tenant_id and document_type are required'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Default year to current (use 0 for non-yearly sequences like admissions)
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

    -- Default prefix based on document type
    v_prefix := COALESCE(p_prefix, CASE p_document_type
        WHEN 'invoice' THEN 'FAC'
        WHEN 'admission' THEN 'ADM'
        WHEN 'lab_order' THEN 'LAB'
        WHEN 'payment' THEN 'PAG'
        WHEN 'refund' THEN 'REE'
        WHEN 'claim' THEN 'CLM'
        WHEN 'prescription' THEN 'REC'
        WHEN 'order' THEN 'ORD'
        ELSE UPPER(LEFT(p_document_type, 3))
    END);

    -- Generate unique lock key from tenant + type + year
    v_lock_key := hashtext(p_tenant_id || ':' || p_document_type || ':' || v_year::TEXT);

    -- Acquire advisory lock for this specific sequence
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert and get next sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, p_document_type, v_year, 1, v_prefix)
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    -- Return formatted number (with or without year based on year value)
    IF v_year = 0 THEN
        -- Non-yearly format: ADM-000001
        RETURN v_prefix || '-' || LPAD(v_seq::TEXT, 6, '0');
    ELSE
        -- Yearly format: FAC-2024-00001
        RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.next_document_number(TEXT, TEXT, TEXT, INTEGER) IS
'Thread-safe document number generator using advisory locks.
Parameters:
  - p_tenant_id: Tenant identifier (required)
  - p_document_type: Type of document (invoice, admission, lab_order, etc.)
  - p_prefix: Optional custom prefix (defaults based on type)
  - p_year: Optional year (defaults to current, use 0 for non-yearly sequences)
Returns: Formatted document number (e.g., FAC-2024-00001 or ADM-000001)';

-- =============================================================================
-- F. INVOICE NUMBER GENERATOR (Convenience Wrapper)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'invoice', 'FAC');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_invoice_number(TEXT) IS
'Generate sequential invoice number for a tenant. Format: FAC-YYYY-NNNNN';

-- =============================================================================
-- G. WEIGHTED AVERAGE COST CALCULATOR
-- =============================================================================
-- Calculates new weighted average cost when inventory is received.

CREATE OR REPLACE FUNCTION public.calculate_weighted_average_cost(
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_new_cost NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_current_qty INTEGER;
    v_current_cost NUMERIC;
    v_new_avg NUMERIC;
BEGIN
    -- Validate inputs
    IF p_new_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_new_cost < 0 THEN
        RAISE EXCEPTION 'Cost cannot be negative'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Get current inventory
    SELECT stock_quantity, weighted_average_cost
    INTO v_current_qty, v_current_cost
    FROM public.store_inventory
    WHERE product_id = p_product_id;

    -- If no existing inventory, return the new cost
    IF v_current_qty IS NULL OR v_current_qty = 0 THEN
        RETURN p_new_cost;
    END IF;

    -- Calculate weighted average
    v_new_avg := (
        (v_current_qty * COALESCE(v_current_cost, 0)) +
        (p_new_quantity * p_new_cost)
    ) / (v_current_qty + p_new_quantity);

    RETURN ROUND(v_new_avg, 2);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.calculate_weighted_average_cost(UUID, INTEGER, NUMERIC) IS
'Calculate new weighted average cost when receiving inventory.
Parameters:
  - p_product_id: Product to calculate WAC for
  - p_new_quantity: Quantity being received
  - p_new_cost: Unit cost of new inventory
Returns: New weighted average cost rounded to 2 decimal places';

-- =============================================================================
-- H. ARRAY VALIDATION HELPERS
-- =============================================================================

-- Validate array is not empty
CREATE OR REPLACE FUNCTION public.array_not_empty(arr ANYARRAY)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN arr IS NOT NULL AND array_length(arr, 1) > 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.array_not_empty(ANYARRAY) IS
'Check if an array is not null and has at least one element';

-- Validate array length within bounds
CREATE OR REPLACE FUNCTION public.array_length_between(arr ANYARRAY, min_len INTEGER, max_len INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    len INTEGER;
BEGIN
    len := COALESCE(array_length(arr, 1), 0);
    RETURN len >= min_len AND len <= max_len;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.array_length_between(ANYARRAY, INTEGER, INTEGER) IS
'Check if array length is between min and max (inclusive)';

-- =============================================================================
-- I. JSON VALIDATION HELPERS
-- =============================================================================

-- Validate JSONB is an object (not array or scalar)
CREATE OR REPLACE FUNCTION public.jsonb_is_object(val JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN val IS NOT NULL AND jsonb_typeof(val) = 'object';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.jsonb_is_object(JSONB) IS
'Check if JSONB value is an object (not array or scalar)';

-- Validate JSONB is an array
CREATE OR REPLACE FUNCTION public.jsonb_is_array(val JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN val IS NOT NULL AND jsonb_typeof(val) = 'array';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.jsonb_is_array(JSONB) IS
'Check if JSONB value is an array';

-- =============================================================================
-- J. GRANT EXECUTE PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_soft_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_critical_profile_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weighted_average_cost(UUID, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.array_not_empty(ANYARRAY) TO authenticated;
GRANT EXECUTE ON FUNCTION public.array_length_between(ANYARRAY, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_is_object(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_is_array(JSONB) TO authenticated;
