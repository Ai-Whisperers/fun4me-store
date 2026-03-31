-- =====================================================
-- QUICK MIGRATION SCRIPT FOR SUPABASE SQL EDITOR
-- =====================================================
-- Copy this entire file and paste into Supabase Dashboard SQL Editor
-- Then click "Run" to apply all MCP helper functions
-- =====================================================

-- Include the actual migration
\i web/db/064_mcp_helper_functions.sql

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After migration completes, run these to verify:

-- Test 1: List all tenant tables
SELECT * FROM list_tenant_tables();

-- Test 2: Check RLS on appointments
SELECT * FROM check_rls_enabled('appointments');

-- Test 3: Get tenant table statistics
SELECT * FROM get_tenant_table_stats();

-- Test 4: Validate invoices table
SELECT * FROM validate_tenant_isolation('invoices');

-- =====================================================
-- SUCCESS INDICATORS
-- =====================================================
-- If all queries above return results without errors:
-- ✅ Migration 064 applied successfully
-- ✅ MCP servers ready to use
-- ✅ Proceed to test MCP servers
-- =====================================================
