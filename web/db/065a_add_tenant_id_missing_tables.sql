-- ============================================================================
-- 065A_ADD_TENANT_ID_MISSING_TABLES.SQL
-- =============================================================================
-- Purpose: Add tenant_id columns to 13 tables before applying RLS policies
-- Date: 2026-01-17
-- Sprint: 1 (Security Lockdown)
-- Dependencies: Must run before 065_add_rls_missing_tables.sql
-- =============================================================================

-- =============================================================================
-- Add tenant_id columns to tables that need them
-- =============================================================================

-- Note: Some of these tables relate to parent tables that have tenant_id
-- We'll populate them based on those relationships

-- 1. audit_configuration
ALTER TABLE audit_configuration 
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

UPDATE audit_configuration
SET tenant_id = 'adris' -- Default tenant for existing data
WHERE tenant_id IS NULL;

ALTER TABLE audit_configuration
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_configuration_tenant_id 
ON audit_configuration(tenant_id);

-- 2. consent_audit_log
ALTER TABLE consent_audit_log
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from blanket_consents (consent_audit_log -> blanket_consents -> tenant_id)
UPDATE consent_audit_log cal
SET tenant_id = bc.tenant_id
FROM blanket_consents bc
WHERE cal.consent_document_id = bc.id AND cal.tenant_id IS NULL;

-- Set default for any remaining
UPDATE consent_audit_log
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE consent_audit_log
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_tenant_id
ON consent_audit_log(tenant_id);

-- 3. consent_template_fields  
ALTER TABLE consent_template_fields
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from consent_templates
UPDATE consent_template_fields ctf
SET tenant_id = ct.tenant_id
FROM consent_templates ct
WHERE ctf.template_id = ct.id AND ctf.tenant_id IS NULL;

UPDATE consent_template_fields
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE consent_template_fields
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_template_fields_tenant_id
ON consent_template_fields(tenant_id);

-- 4. hospitalization_documents
ALTER TABLE hospitalization_documents
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from hospitalizations
UPDATE hospitalization_documents hd
SET tenant_id = h.tenant_id
FROM hospitalizations h
WHERE hd.hospitalization_id = h.id AND hd.tenant_id IS NULL;

UPDATE hospitalization_documents
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE hospitalization_documents
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospitalization_documents_tenant_id
ON hospitalization_documents(tenant_id);

-- 5. hospitalization_visits
ALTER TABLE hospitalization_visits
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from hospitalizations
UPDATE hospitalization_visits hv
SET tenant_id = h.tenant_id
FROM hospitalizations h
WHERE hv.hospitalization_id = h.id AND hv.tenant_id IS NULL;

UPDATE hospitalization_visits
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE hospitalization_visits
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospitalization_visits_tenant_id
ON hospitalization_visits(tenant_id);

-- 6. lab_panel_tests
ALTER TABLE lab_panel_tests
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from lab_panels
UPDATE lab_panel_tests lpt
SET tenant_id = lp.tenant_id
FROM lab_panels lp
WHERE lpt.panel_id = lp.id AND lpt.tenant_id IS NULL;

UPDATE lab_panel_tests
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE lab_panel_tests
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_panel_tests_tenant_id
ON lab_panel_tests(tenant_id);

-- 7. lab_reference_ranges
ALTER TABLE lab_reference_ranges
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from lab_test_catalog
UPDATE lab_reference_ranges lrr
SET tenant_id = ltc.tenant_id
FROM lab_test_catalog ltc
WHERE lrr.test_id = ltc.id AND lrr.tenant_id IS NULL;

UPDATE lab_reference_ranges
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE lab_reference_ranges
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_reference_ranges_tenant_id
ON lab_reference_ranges(tenant_id);

-- 8. materialized_view_refresh_log (system table - no tenant_id needed)
-- This table tracks system-wide view refreshes, not tenant-specific
-- Skip adding tenant_id, will handle differently in RLS policies

-- 9. scheduled_job_log
ALTER TABLE scheduled_job_log
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

UPDATE scheduled_job_log
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

-- Allow NULL for system-wide jobs
-- ALTER TABLE scheduled_job_log
-- ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_job_log_tenant_id
ON scheduled_job_log(tenant_id);

-- 10. staff_availability_overrides
ALTER TABLE staff_availability_overrides
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from staff_profiles
UPDATE staff_availability_overrides sao
SET tenant_id = sp.tenant_id
FROM staff_profiles sp
WHERE sao.staff_profile_id = sp.id AND sao.tenant_id IS NULL;

UPDATE staff_availability_overrides
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE staff_availability_overrides
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_availability_overrides_tenant_id
ON staff_availability_overrides(tenant_id);

-- 11. staff_reviews
ALTER TABLE staff_reviews
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from staff_profiles (staff being reviewed)
UPDATE staff_reviews sr
SET tenant_id = sp.tenant_id
FROM staff_profiles sp
WHERE sr.staff_profile_id = sp.id AND sr.tenant_id IS NULL;

UPDATE staff_reviews
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE staff_reviews
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_reviews_tenant_id
ON staff_reviews(tenant_id);

-- 12. time_off_balances
ALTER TABLE time_off_balances
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- Populate from staff_profiles
UPDATE time_off_balances tob
SET tenant_id = sp.tenant_id
FROM staff_profiles sp
WHERE tob.staff_profile_id = sp.id AND tob.tenant_id IS NULL;

UPDATE time_off_balances
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE time_off_balances
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_off_balances_tenant_id
ON time_off_balances(tenant_id);

-- 13. vaccine_protocols
ALTER TABLE vaccine_protocols
ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

UPDATE vaccine_protocols
SET tenant_id = 'adris'
WHERE tenant_id IS NULL;

ALTER TABLE vaccine_protocols
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_tenant_id
ON vaccine_protocols(tenant_id);

-- =============================================================================
-- Verification
-- =============================================================================

-- Check all tables now have tenant_id
/*
SELECT 
  table_name,
  CASE WHEN column_name IS NOT NULL THEN '✓' ELSE '✗' END as has_tenant_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON c.table_name = t.table_name 
  AND c.column_name = 'tenant_id'
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'audit_configuration', 'consent_audit_log', 'consent_template_fields',
    'hospitalization_documents', 'hospitalization_visits', 'lab_panel_tests',
    'lab_reference_ranges', 'scheduled_job_log', 'staff_availability_overrides',
    'staff_reviews', 'time_off_balances', 'vaccine_protocols'
  )
ORDER BY table_name;
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

COMMENT ON SCHEMA public IS 
  'Pre-RLS Migration 065a: Added tenant_id to 12 tables (materialized_view_refresh_log excluded)';
