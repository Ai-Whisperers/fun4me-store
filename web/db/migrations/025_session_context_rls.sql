-- =============================================================================
-- 025_SESSION_CONTEXT_RLS.SQL
-- =============================================================================
-- Implements session-based tenant context for optimized RLS performance.
--
-- PROBLEM:
-- Current RLS policies use is_staff_of(tenant_id) which executes a subquery
-- on every row, causing O(n²) complexity for large result sets.
--
-- SOLUTION:
-- Use PostgreSQL session variables (SET app.current_tenant_id = 'X') to cache
-- the user's tenant context, eliminating repeated profile lookups.
--
-- USAGE (in API routes):
-- Before any query, set the context:
--   await supabase.rpc('set_tenant_context', { tenant_id: 'adris', user_role: 'vet' })
-- OR via raw SQL:
--   SET LOCAL app.current_tenant_id = 'adris';
--   SET LOCAL app.current_user_role = 'vet';
--
-- This migration is IDEMPOTENT - safe to run multiple times.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. CREATE SESSION CONTEXT HELPER FUNCTIONS
-- =============================================================================

-- Function to set tenant context for the current session
CREATE OR REPLACE FUNCTION public.set_tenant_context(
    p_tenant_id TEXT,
    p_user_role TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Set tenant context
    PERFORM set_config('app.current_tenant_id', p_tenant_id, true);  -- true = LOCAL (transaction-scoped)

    -- Set role context if provided
    IF p_user_role IS NOT NULL THEN
        PERFORM set_config('app.current_user_role', p_user_role, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.set_tenant_context(TEXT, TEXT) IS
'Sets the tenant context for the current transaction. Call at start of each request.
Usage: SELECT set_tenant_context(''adris'', ''vet'');';

-- Function to get current tenant from session (with fallback)
CREATE OR REPLACE FUNCTION public.get_session_tenant()
RETURNS TEXT AS $$
DECLARE
    v_tenant TEXT;
BEGIN
    -- Try to get from session variable
    v_tenant := current_setting('app.current_tenant_id', true);

    -- Fallback to profile lookup if not set
    IF v_tenant IS NULL OR v_tenant = '' THEN
        SELECT tenant_id INTO v_tenant
        FROM public.profiles
        WHERE id = auth.uid()
        AND deleted_at IS NULL;
    END IF;

    RETURN v_tenant;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_session_tenant() IS
'Returns the current tenant ID from session context, with fallback to profile lookup.';

-- Function to get current user role from session (with fallback)
CREATE OR REPLACE FUNCTION public.get_session_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Try to get from session variable
    v_role := current_setting('app.current_user_role', true);

    -- Fallback to profile lookup if not set
    IF v_role IS NULL OR v_role = '' THEN
        SELECT role INTO v_role
        FROM public.profiles
        WHERE id = auth.uid()
        AND deleted_at IS NULL;
    END IF;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_session_role() IS
'Returns the current user role from session context, with fallback to profile lookup.';

-- =============================================================================
-- B. CREATE OPTIMIZED STAFF CHECK FUNCTION
-- =============================================================================
-- This function uses session context when available, otherwise falls back
-- to the original implementation for backwards compatibility.

CREATE OR REPLACE FUNCTION public.is_staff_of_fast(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_tenant TEXT;
    v_session_role TEXT;
BEGIN
    -- Try session context first (FAST path)
    v_session_tenant := current_setting('app.current_tenant_id', true);
    v_session_role := current_setting('app.current_user_role', true);

    -- If session context is set, use it (O(1) check)
    IF v_session_tenant IS NOT NULL AND v_session_tenant != '' THEN
        RETURN v_session_tenant = in_tenant_id
           AND v_session_role IN ('vet', 'admin');
    END IF;

    -- Fallback to original implementation (O(n) - profile lookup)
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND role IN ('vet', 'admin')
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_staff_of_fast(TEXT) IS
'Optimized staff check using session context. Use set_tenant_context() first for best performance.';

-- =============================================================================
-- C. CREATE OPTIMIZED TENANT CHECK FUNCTION
-- =============================================================================
-- For simple tenant equality checks (most common pattern)

CREATE OR REPLACE FUNCTION public.is_my_tenant(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_tenant TEXT;
BEGIN
    -- Try session context first
    v_session_tenant := current_setting('app.current_tenant_id', true);

    IF v_session_tenant IS NOT NULL AND v_session_tenant != '' THEN
        RETURN v_session_tenant = in_tenant_id;
    END IF;

    -- Fallback to profile lookup
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_my_tenant(TEXT) IS
'Checks if the given tenant_id matches the current user tenant (any role).';

-- =============================================================================
-- D. AUTO-SET CONTEXT TRIGGER (OPTIONAL)
-- =============================================================================
-- This function can be called from the application to auto-set context
-- based on the authenticated user.

CREATE OR REPLACE FUNCTION public.auto_set_tenant_context()
RETURNS VOID AS $$
DECLARE
    v_profile RECORD;
BEGIN
    -- Get user profile
    SELECT tenant_id, role INTO v_profile
    FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL;

    IF FOUND THEN
        PERFORM set_config('app.current_tenant_id', v_profile.tenant_id, true);
        PERFORM set_config('app.current_user_role', v_profile.role, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.auto_set_tenant_context() IS
'Automatically sets tenant context from the authenticated user profile.
Call once at the start of a request to enable optimized RLS checks.';

-- =============================================================================
-- E. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.set_tenant_context(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_of_fast(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_tenant(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_context() TO authenticated;

-- =============================================================================
-- F. UPDATE HIGH-TRAFFIC TABLES TO USE OPTIMIZED FUNCTION
-- =============================================================================
-- Note: We update a few key tables. Full migration to session-only context
-- requires application code changes to call set_tenant_context() on each request.

-- Example: Update medical_records (high volume table)
DROP POLICY IF EXISTS "Staff manage medical records" ON public.medical_records;
CREATE POLICY "Staff manage medical records" ON public.medical_records
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Example: Update invoices (high volume table)
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Example: Update appointments (high volume table)
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
CREATE POLICY "Staff manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

COMMIT;

-- =============================================================================
-- USAGE GUIDE
-- =============================================================================
--
-- 1. IN YOUR API MIDDLEWARE (recommended):
--
--    // At the start of each authenticated request
--    const { data: profile } = await supabase
--      .from('profiles')
--      .select('tenant_id, role')
--      .eq('id', user.id)
--      .single()
--
--    if (profile) {
--      await supabase.rpc('set_tenant_context', {
--        p_tenant_id: profile.tenant_id,
--        p_user_role: profile.role
--      })
--    }
--
-- 2. OR USE AUTO_SET (simpler but one extra query):
--
--    await supabase.rpc('auto_set_tenant_context')
--
-- 3. BACKWARDS COMPATIBILITY:
--
--    - is_staff_of() still works (unchanged)
--    - is_staff_of_fast() uses session when available, falls back otherwise
--    - No application changes required for basic functionality
--    - Add set_tenant_context() calls for performance improvement
--
-- =============================================================================
-- PERFORMANCE COMPARISON
-- =============================================================================
--
-- WITHOUT session context (current):
--   Each RLS check: ~0.1-0.5ms (profile table lookup)
--   1000 row result: 100-500ms overhead
--
-- WITH session context:
--   Each RLS check: ~0.001ms (memory comparison)
--   1000 row result: ~1ms overhead
--
-- Expected improvement: 100-500x faster for large result sets
--
-- =============================================================================
-- FUTURE MIGRATION (Phase 2)
-- =============================================================================
-- Once all API routes call set_tenant_context(), you can:
--
-- 1. Replace is_staff_of() entirely:
--    ALTER FUNCTION public.is_staff_of(TEXT) RENAME TO is_staff_of_legacy;
--    ALTER FUNCTION public.is_staff_of_fast(TEXT) RENAME TO is_staff_of;
--
-- 2. Simplify all RLS policies to use direct comparison:
--    CREATE POLICY "Staff manage X" ON X
--        USING (tenant_id = current_setting('app.current_tenant_id', true))
--
-- =============================================================================
