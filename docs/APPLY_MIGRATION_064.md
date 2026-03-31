# Apply Database Migration 064 - MCP Helper Functions

> **CRITICAL STEP**: MCP servers require these PostgreSQL functions to work

**Status**: ⏸️ PENDING USER ACTION  
**Estimated Time**: 5 minutes  
**Difficulty**: Easy (copy/paste SQL)

---

## What This Migration Does

Adds 5 PostgreSQL functions used by MCP servers to validate database security:

1. `check_rls_enabled(table_name)` - Check if Row-Level Security is enabled
2. `list_table_policies(table_name)` - List all RLS policies for a table
3. `list_tenant_tables()` - Find all tables with `tenant_id` column
4. `validate_tenant_isolation(table_name)` - Comprehensive multi-tenant validation
5. `get_tenant_table_stats()` - Statistics on RLS compliance

**Why Required**: The `vete-supabase-tenant` MCP server uses these functions to validate database security automatically.

---

## Prerequisites

- Access to Supabase Dashboard
- Project: https://okddppczckbjdotrxiev.supabase.co
- OR local PostgreSQL connection with `DATABASE_URL` environment variable

---

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Open SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: **Vete** (okddppczckbjdotrxiev)
3. Click **SQL Editor** in left sidebar
4. Click **New Query** button

### Step 2: Paste Migration SQL

1. Open file: `web/db/064_mcp_helper_functions.sql`
2. Copy **entire contents** (300+ lines)
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Installation

Run this query in SQL Editor:

```sql
-- Should return list of multi-tenant tables
SELECT * FROM list_tenant_tables();
```

**Expected Result**: List of tables like `pets`, `appointments`, `invoices`, etc.

If you see the list → ✅ Migration applied successfully!

---

## Option 2: Using psql (Advanced)

If you have PostgreSQL `psql` installed:

```bash
# From project root
cd web/db

# Apply migration
psql $DATABASE_URL -f 064_mcp_helper_functions.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM list_tenant_tables();"
```

---

## Option 3: Using Node.js Script (Advanced)

```bash
# From project root
cd web/db/v2

# This will apply migration 064 along with all others
node setup-db.mjs
```

⚠️ **Warning**: This applies ALL migrations, not just 064. Use only if database is fresh.

---

## Verification Tests

After applying, run these queries to verify:

### Test 1: Check RLS on appointments table
```sql
SELECT * FROM check_rls_enabled('appointments');
```
**Expected**: `rls_enabled = true`

### Test 2: List policies on pets table
```sql
SELECT * FROM list_table_policies('pets');
```
**Expected**: Multiple policies listed

### Test 3: Get tenant table statistics
```sql
SELECT * FROM get_tenant_table_stats();
```
**Expected**: Summary of all multi-tenant tables with RLS status

### Test 4: Validate tenant isolation on invoices
```sql
SELECT * FROM validate_tenant_isolation('invoices');
```
**Expected**: `has_tenant_id = true`, `rls_enabled = true`, `has_policies = true`

---

## Common Issues

### Issue: "Function already exists"

**Cause**: Migration already applied

**Solution**: Safe to ignore. Functions use `CREATE OR REPLACE` so they'll be updated.

---

### Issue: "Permission denied"

**Cause**: Insufficient database privileges

**Solution**: Ensure you're using an admin account or service role key in Supabase Dashboard.

---

### Issue: "Schema 'public' does not exist"

**Cause**: Database not properly initialized

**Solution**: 
1. Run base migrations first: `web/db/v2/run-migrations.sql`
2. Then apply migration 064

---

## What Happens Next

After applying this migration:

1. ✅ MCP servers can now use database validation tools
2. ✅ `verify_rls_compliance` tool will work in OpenCode
3. ✅ `list_tenant_tables` tool will work in OpenCode
4. ✅ Automated security validation enabled

---

## Next Steps After Migration

Once migration is applied, proceed to:

1. **Test MCP Servers** - Follow `.opencode/MCP_TESTING_GUIDE.md`
2. **Use validation tools** in OpenCode:
   ```
   > Use verify_rls_compliance for table "appointments"
   > Use list_tenant_tables
   ```

---

## Migration File Location

**Source**: `web/db/064_mcp_helper_functions.sql`  
**Lines**: 300+ lines  
**Dependencies**: None (standalone functions)  
**Safe to reapply**: Yes (uses `CREATE OR REPLACE`)

---

## Help & Support

If issues occur:
1. Check Supabase Dashboard logs for errors
2. Verify you're connected to correct project
3. Check `.opencode/MCP_TESTING_GUIDE.md` for troubleshooting
4. Review migration file for syntax errors (should be none)

---

**✅ Ready to apply?** 

**Go to Supabase Dashboard → SQL Editor → Paste → Run**

**File to copy**: `web/db/064_mcp_helper_functions.sql`

---

_Last Updated: January 17, 2026_
