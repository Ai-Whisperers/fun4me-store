@echo off
REM Test MCP Servers - Quick Validation Script
REM Run after applying database migration 064

echo.
echo ========================================
echo MCP Server Testing Suite
echo ========================================
echo.

REM Check if migration 064 is applied
echo Step 1: Checking prerequisites...
echo.
echo CRITICAL: Ensure migration 064 is applied to Supabase
echo File: web\db\064_mcp_helper_functions.sql
echo.
echo Have you applied migration 064? (Y/N)
set /p MIGRATION_APPLIED=
if /i "%MIGRATION_APPLIED%" NEQ "Y" (
    echo.
    echo Please apply migration first:
    echo 1. Open https://supabase.com/dashboard
    echo 2. Select Vete project
    echo 3. Go to SQL Editor
    echo 4. Paste contents of web\db\064_mcp_helper_functions.sql
    echo 5. Click Run
    echo.
    echo Then re-run this script.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting MCP Server Tests
echo ========================================
echo.

REM Create test file with commands
echo Creating test commands file...
(
echo # MCP Server Test Suite
echo # Auto-generated test commands
echo.
echo ## Test 1: List Tenant Tables
echo Use list_tenant_tables
echo.
echo ## Test 2: Query Pets with Tenant Filter
echo Use query_with_tenant to list all pets for tenant "adris"
echo.
echo ## Test 3: Verify RLS Compliance
echo Use verify_rls_compliance for table "appointments"
echo.
echo ## Test 4: Spanish Vet Tool - Search Pets
echo Usa buscar_mascotas en tenant "adris" buscando "Max"
echo.
echo ## Test 5: Validate Table
echo Use validate_tenant_isolation for table "invoices"
echo.
) > .opencode\mcp-test-commands.md

echo Test commands created: .opencode\mcp-test-commands.md
echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Open OpenCode:
echo    opencode
echo.
echo 2. Run each test command from .opencode\mcp-test-commands.md
echo.
echo 3. Expected Results:
echo    - Test 1: Should return list of multi-tenant tables
echo    - Test 2: Should return pets for adris clinic
echo    - Test 3: Should show RLS enabled and policies
echo    - Test 4: Should search pets in Spanish
echo    - Test 5: Should validate invoices table security
echo.
echo For detailed testing guide, see:
echo .opencode\MCP_TESTING_GUIDE.md
echo.
pause
