-- =============================================================================
-- Migration: 095_fix_profiles_rls_service_role
-- =============================================================================
-- Description: Fix profiles table RLS policies to ensure service_role has
--              full access for test operations and admin tasks.
-- 
-- Issue: Security tests failing because service_role queries are being blocked
--        by RLS policies. The service_role policy exists but may not be taking
--        precedence over other policies.
--
-- Solution: Recreate service_role policy with explicit precedence and ensure
--           it covers all operations (SELECT, INSERT, UPDATE, DELETE).
-- =============================================================================

-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Recreate service role policy with explicit ALL operations
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON POLICY "Service role full access" ON public.profiles IS 
'Allows service_role to bypass all RLS restrictions. Required for:
- Test suite operations (factories, cleanup)
- Admin backend operations
- Background jobs and cron tasks
- Data migrations and seeding';

-- Verify RLS is still enabled
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on profiles table';
    ELSE
        RAISE NOTICE 'RLS already enabled on profiles table';
    END IF;
END $$;

-- =============================================================================
-- Verification Query (run separately to test)
-- =============================================================================
-- Run this as service_role to verify the policy works:
--
-- SELECT 
--     tablename,
--     policyname,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies 
-- WHERE tablename = 'profiles' 
-- AND policyname = 'Service role full access';
--
-- Expected: Should show policy with roles = {service_role}, cmd = ALL
-- =============================================================================
