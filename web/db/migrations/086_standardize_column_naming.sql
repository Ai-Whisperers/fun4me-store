-- =============================================================================
-- 083_STANDARDIZE_COLUMN_NAMING.SQL
-- =============================================================================
-- Standardizes column naming to use 'tenant_id' consistently across all tables
-- instead of mixed 'clinic_id' and 'tenant_id' usage.
--
-- ISSUE: Inconsistent naming makes code harder to maintain and understand.
-- Some tables use 'clinic_id' while most use 'tenant_id' to reference tenants.
--
-- EPIC: EPIC-002-Database-Schema-Consistency
-- TICKET: TICKET-DB-003
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. RENAME COLUMN IN CLAIM_AUDIT_LOG
-- =============================================================================

-- Rename clinic_id to tenant_id for consistency
ALTER TABLE public.claim_audit_log 
RENAME COLUMN clinic_id TO tenant_id;

-- Update comment
COMMENT ON COLUMN claim_audit_log.tenant_id IS 
'Reference to tenant (clinic) attempting to be claimed';

-- Drop old index
DROP INDEX IF EXISTS idx_claim_audit_clinic;

-- Create new index with correct name
CREATE INDEX IF NOT EXISTS idx_claim_audit_tenant_id 
ON claim_audit_log(tenant_id);

-- =============================================================================
-- B. UPDATE ANY FOREIGN KEY CONSTRAINTS (IF NEEDED)
-- =============================================================================

-- The FK constraint was created with column name clinic_id
-- Need to drop and recreate with new column name

-- First, find the constraint name
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'claim_audit_log'::regclass
    AND confrelid = 'tenants'::regclass;
    
    IF constraint_name IS NOT NULL THEN
        -- Drop old constraint
        EXECUTE format('ALTER TABLE claim_audit_log DROP CONSTRAINT %I', constraint_name);
        
        -- Create new constraint with standardized column name
        ALTER TABLE claim_audit_log 
        ADD CONSTRAINT claim_audit_log_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Updated FK constraint: % -> claim_audit_log_tenant_id_fkey', constraint_name;
    END IF;
END $$;

-- =============================================================================
-- C. UPDATE RLS POLICIES (IF ANY REFERENCE clinic_id)
-- =============================================================================

-- No RLS policies use clinic_id directly, so no changes needed here
-- (Verified: claim_audit_log only has service_role access policy)

-- =============================================================================
-- D. VERIFY NO OTHER clinic_id USAGES
-- =============================================================================

-- Check for any views, functions, or triggers that might reference clinic_id
DO $$
DECLARE
    view_count INTEGER;
    func_count INTEGER;
BEGIN
    -- Check views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views v
    WHERE v.table_schema = 'public'
    AND v.view_definition LIKE '%clinic_id%';
    
    IF view_count > 0 THEN
        RAISE WARNING '% views still reference clinic_id - manual review needed', view_count;
    END IF;
    
    -- Check functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND pg_get_functiondef(p.oid) LIKE '%clinic_id%';
    
    IF func_count > 0 THEN
        RAISE WARNING '% functions still reference clinic_id - manual review needed', func_count;
    END IF;
    
    IF view_count = 0 AND func_count = 0 THEN
        RAISE NOTICE 'Column naming standardization complete. No clinic_id references found.';
    END IF;
END $$;

-- =============================================================================
-- E. UPDATE APPLICATION QUERIES (DOCUMENTATION)
-- =============================================================================

-- IMPORTANT: After applying this migration, update application code:
--
-- 1. Search codebase for 'clinic_id' references:
--    grep -r "clinic_id" web/app/ web/lib/
--
-- 2. Update TypeScript types in:
--    - web/lib/types/entities/claim-audit-log.ts (if exists)
--    - Any API routes querying claim_audit_log
--
-- 3. Update queries:
--    BEFORE: .select('clinic_id, email_attempted, ...')
--    AFTER:  .select('tenant_id, email_attempted, ...')
--
-- 4. Update Zod schemas:
--    BEFORE: clinic_id: z.string()
--    AFTER:  tenant_id: z.string()
--
-- 5. Update any raw SQL queries in:
--    - Migration functions
--    - Background jobs
--    - Admin queries

-- =============================================================================
-- F. ANALYZE TABLES
-- =============================================================================

ANALYZE claim_audit_log;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- =============================================================================
-- Verify column was renamed:
-- \d claim_audit_log
--
-- Verify index exists:
-- \di idx_claim_audit_tenant_id
--
-- Verify FK constraint:
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conname LIKE '%claim_audit%';
--
-- Search for any remaining clinic_id references:
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND column_name = 'clinic_id';
-- (Should return 0 rows)
-- =============================================================================
