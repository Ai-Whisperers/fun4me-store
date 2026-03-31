-- Migration: MCP Helper Functions
-- Purpose: PostgreSQL functions for MCP server operations (RLS validation, tenant discovery)
-- Created: 2026-01-17
-- Dependencies: None (standalone functions)

-- ==============================================
-- Function: check_rls_enabled
-- Purpose: Check if Row-Level Security is enabled on a table
-- Used by: vete-supabase-tenant MCP server (verify_rls_compliance tool)
-- ==============================================
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name TEXT)
RETURNS TABLE (
  rls_enabled BOOLEAN,
  table_schema TEXT,
  table_name_out TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relrowsecurity AS rls_enabled,
    n.nspname::TEXT AS table_schema,
    c.relname::TEXT AS table_name_out
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = table_name
    AND n.nspname = 'public'
    AND c.relkind = 'r';
    
  -- Return false if table not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'public'::TEXT, table_name::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_rls_enabled IS 'Check if RLS is enabled on a table (used by MCP servers)';

-- ==============================================
-- Function: list_table_policies
-- Purpose: List all RLS policies for a specific table
-- Used by: vete-supabase-tenant MCP server (verify_rls_compliance tool)
-- ==============================================
CREATE OR REPLACE FUNCTION list_table_policies(table_name TEXT)
RETURNS TABLE (
  policy_name TEXT,
  policy_command TEXT,
  policy_permissive TEXT,
  policy_roles TEXT[],
  policy_using TEXT,
  policy_check TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.polname::TEXT AS policy_name,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE 'UNKNOWN'
    END::TEXT AS policy_command,
    CASE pol.polpermissive
      WHEN 't' THEN 'PERMISSIVE'
      ELSE 'RESTRICTIVE'
    END::TEXT AS policy_permissive,
    ARRAY(
      SELECT rolname::TEXT 
      FROM pg_roles 
      WHERE oid = ANY(pol.polroles)
    ) AS policy_roles,
    pg_get_expr(pol.polqual, pol.polrelid)::TEXT AS policy_using,
    pg_get_expr(pol.polwithcheck, pol.polrelid)::TEXT AS policy_check
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  WHERE c.relname = table_name
    AND c.relnamespace = 'public'::regnamespace
  ORDER BY pol.polname;
END;
$$;

COMMENT ON FUNCTION list_table_policies IS 'List all RLS policies for a table (used by MCP servers)';

-- ==============================================
-- Function: list_tenant_tables
-- Purpose: List all tables that have a tenant_id column (multi-tenant tables)
-- Used by: vete-supabase-tenant MCP server (list_tenant_tables tool)
-- ==============================================
CREATE OR REPLACE FUNCTION list_tenant_tables()
RETURNS TABLE (
  table_name TEXT,
  has_rls BOOLEAN,
  policy_count INTEGER,
  has_tenant_fk BOOLEAN,
  tenant_column_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT AS table_name,
    c.relrowsecurity AS has_rls,
    COUNT(DISTINCT p.polname)::INTEGER AS policy_count,
    EXISTS(
      SELECT 1 
      FROM pg_constraint con
      WHERE con.conrelid = c.oid
        AND con.contype = 'f'
        AND con.confrelid = 'tenants'::regclass
    ) AS has_tenant_fk,
    pg_catalog.format_type(a.atttypid, a.atttypmod)::TEXT AS tenant_column_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind = 'r'
    AND n.nspname = 'public'
  GROUP BY c.relname, c.relrowsecurity, a.atttypid, a.atttypmod, c.oid
  ORDER BY c.relname;
END;
$$;

COMMENT ON FUNCTION list_tenant_tables IS 'List all multi-tenant tables with tenant_id column (used by MCP servers)';

-- ==============================================
-- Function: validate_tenant_isolation
-- Purpose: Comprehensive validation of multi-tenant table setup
-- Used by: Custom validation tools and MCP servers
-- ==============================================
CREATE OR REPLACE FUNCTION validate_tenant_isolation(table_name TEXT)
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  message TEXT,
  severity TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_tenant_id BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_has_fk BOOLEAN;
BEGIN
  -- Check 1: Does table exist?
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = table_name AND n.nspname = 'public' AND c.relkind = 'r'
  ) THEN
    RETURN QUERY SELECT 
      'table_exists'::TEXT,
      'FAIL'::TEXT,
      format('Table "%s" does not exist', table_name)::TEXT,
      'ERROR'::TEXT;
    RETURN;
  END IF;

  -- Check 2: Has tenant_id column?
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = table_name
      AND a.attname = 'tenant_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) INTO v_has_tenant_id;

  IF NOT v_has_tenant_id THEN
    RETURN QUERY SELECT 
      'tenant_id_column'::TEXT,
      'FAIL'::TEXT,
      'Missing tenant_id column'::TEXT,
      'ERROR'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'tenant_id_column'::TEXT,
      'PASS'::TEXT,
      'tenant_id column exists'::TEXT,
      'INFO'::TEXT;
  END IF;

  -- Check 3: RLS enabled?
  SELECT c.relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  WHERE c.relname = table_name AND c.relnamespace = 'public'::regnamespace;

  IF NOT v_rls_enabled THEN
    RETURN QUERY SELECT 
      'rls_enabled'::TEXT,
      'FAIL'::TEXT,
      'Row-Level Security is not enabled'::TEXT,
      'ERROR'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'rls_enabled'::TEXT,
      'PASS'::TEXT,
      'RLS is enabled'::TEXT,
      'INFO'::TEXT;
  END IF;

  -- Check 4: Has RLS policies?
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = table_name;

  IF v_policy_count = 0 THEN
    RETURN QUERY SELECT 
      'rls_policies'::TEXT,
      'FAIL'::TEXT,
      'No RLS policies found'::TEXT,
      'ERROR'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'rls_policies'::TEXT,
      'PASS'::TEXT,
      format('%s RLS policies found', v_policy_count)::TEXT,
      'INFO'::TEXT;
  END IF;

  -- Check 5: Has foreign key to tenants table?
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    WHERE c.relname = table_name
      AND con.contype = 'f'
      AND con.confrelid = 'tenants'::regclass
  ) INTO v_has_fk;

  IF NOT v_has_fk THEN
    RETURN QUERY SELECT 
      'tenant_fk'::TEXT,
      'WARN'::TEXT,
      'No foreign key constraint to tenants table (recommended but not required)'::TEXT,
      'WARNING'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'tenant_fk'::TEXT,
      'PASS'::TEXT,
      'Foreign key constraint to tenants table exists'::TEXT,
      'INFO'::TEXT;
  END IF;

  -- Check 6: Policies use is_staff_of() or tenant_id checks?
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = table_name
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%is_staff_of%'
        OR pg_get_expr(p.polqual, p.polrelid) LIKE '%tenant_id%'
      )
  ) THEN
    RETURN QUERY SELECT 
      'policy_tenant_check'::TEXT,
      'PASS'::TEXT,
      'At least one policy checks tenant_id or uses is_staff_of()'::TEXT,
      'INFO'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'policy_tenant_check'::TEXT,
      'WARN'::TEXT,
      'No policies appear to check tenant_id (verify manually)'::TEXT,
      'WARNING'::TEXT;
  END IF;

END;
$$;

COMMENT ON FUNCTION validate_tenant_isolation IS 'Comprehensive multi-tenant setup validation (used by MCP servers and tools)';

-- ==============================================
-- Function: get_tenant_table_stats
-- Purpose: Get statistics about multi-tenant tables (for monitoring/reporting)
-- Used by: MCP servers for analytics
-- ==============================================
CREATE OR REPLACE FUNCTION get_tenant_table_stats()
RETURNS TABLE (
  total_tables INTEGER,
  tables_with_rls INTEGER,
  tables_with_policies INTEGER,
  tables_with_fk INTEGER,
  compliance_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_with_rls INTEGER;
  v_with_policies INTEGER;
  v_with_fk INTEGER;
BEGIN
  -- Count total multi-tenant tables
  SELECT COUNT(*) INTO v_total
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind = 'r'
    AND c.relnamespace = 'public'::regnamespace;

  -- Count tables with RLS enabled
  SELECT COUNT(DISTINCT c.relname) INTO v_with_rls
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind = 'r'
    AND c.relnamespace = 'public'::regnamespace
    AND c.relrowsecurity = true;

  -- Count tables with at least one policy
  SELECT COUNT(DISTINCT c.relname) INTO v_with_policies
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  JOIN pg_policy p ON p.polrelid = c.oid
  WHERE a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind = 'r'
    AND c.relnamespace = 'public'::regnamespace;

  -- Count tables with FK to tenants
  SELECT COUNT(DISTINCT c.relname) INTO v_with_fk
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  JOIN pg_constraint con ON con.conrelid = c.oid
  WHERE a.attname = 'tenant_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind = 'r'
    AND c.relnamespace = 'public'::regnamespace
    AND con.contype = 'f'
    AND con.confrelid = 'tenants'::regclass;

  RETURN QUERY SELECT 
    v_total,
    v_with_rls,
    v_with_policies,
    v_with_fk,
    CASE 
      WHEN v_total = 0 THEN 0
      ELSE ROUND((v_with_policies::NUMERIC / v_total::NUMERIC) * 100, 2)
    END AS compliance_percentage;
END;
$$;

COMMENT ON FUNCTION get_tenant_table_stats IS 'Get statistics about multi-tenant table compliance (used by MCP analytics)';

-- ==============================================
-- Grant permissions
-- ==============================================
-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION check_rls_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION list_table_policies TO authenticated;
GRANT EXECUTE ON FUNCTION list_tenant_tables TO authenticated;
GRANT EXECUTE ON FUNCTION validate_tenant_isolation TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_table_stats TO authenticated;

-- Allow service role full access
GRANT EXECUTE ON FUNCTION check_rls_enabled TO service_role;
GRANT EXECUTE ON FUNCTION list_table_policies TO service_role;
GRANT EXECUTE ON FUNCTION list_tenant_tables TO service_role;
GRANT EXECUTE ON FUNCTION validate_tenant_isolation TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_table_stats TO service_role;

-- ==============================================
-- Verification
-- ==============================================
-- Run this to verify functions are working:
-- SELECT * FROM list_tenant_tables();
-- SELECT * FROM validate_tenant_isolation('pets');
-- SELECT * FROM get_tenant_table_stats();
