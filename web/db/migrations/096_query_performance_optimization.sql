-- =============================================================================
-- Migration: 096_query_performance_optimization
-- =============================================================================
-- Description: Add composite indexes for common query patterns and optimize
--              database queries to reduce N+1 patterns and improve performance.
-- 
-- Analysis: Identified several query patterns that need optimization:
-- 1. Tenant-based filtering with status/dates (appointments, pets)
-- 2. Common filtering combinations (tenant + owner, tenant + status + date)
-- 3. Missing indexes for frequent WHERE clauses
-- 4. Statistics queries that scan entire tables
-- =============================================================================

-- =============================================================================
-- APPOINTMENTS PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Composite index for appointment filtering (tenant + status + date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_status_date
ON appointments(tenant_id, status, start_time)
WHERE status IN ('pending', 'confirmed', 'checked_in', 'in_progress');

-- Index for vet schedule queries (tenant + vet + date range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_vet_schedule
ON appointments(tenant_id, vet_id, start_time)
WHERE vet_id IS NOT NULL;

-- Index for daily appointment queries (tenant + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_daily
ON appointments(tenant_id, (start_time::date))
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days';

-- =============================================================================
-- PETS PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Composite index for pet filtering (tenant + owner + active status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_tenant_owner_active
ON pets(tenant_id, owner_id, is_active)
WHERE is_active = true;

-- Index for species/breed filtering (common in stats queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_tenant_species
ON pets(tenant_id, species, is_active);

-- Index for search queries (name pattern matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_name_search
ON pets(tenant_id, name)
WHERE is_active = true;

-- =============================================================================
-- PROFILES PERFORMANCE OPTIMIZATION  
-- =============================================================================

-- Composite index for staff queries (tenant + role + active)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_staff_active
ON profiles(tenant_id, role)
WHERE role IN ('vet', 'admin', 'staff') AND deleted_at IS NULL;

-- Index for client lookups (phone/email search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_contact_search
ON profiles(tenant_id, phone)
WHERE role = 'owner' AND deleted_at IS NULL;

-- Additional index for email search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_search
ON profiles(tenant_id, email)
WHERE role = 'owner' AND deleted_at IS NULL;

-- =============================================================================
-- MEDICAL RECORDS PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Index for pet medical history (tenant + pet + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_pet_history
ON medical_records(tenant_id, pet_id, visit_date DESC)
WHERE deleted_at IS NULL;

-- Index for vet performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_vet_activity
ON medical_records(tenant_id, vet_id, visit_date DESC)
WHERE deleted_at IS NULL;

-- =============================================================================
-- VACCINES PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Index for vaccination schedules (pet + due dates)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_pet_schedule
ON vaccines(tenant_id, pet_id, due_date)
WHERE due_date >= CURRENT_DATE;

-- Index for vaccination history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_history
ON vaccines(tenant_id, pet_id, administered_at DESC)
WHERE administered_at IS NOT NULL;

-- =============================================================================
-- STORE INVENTORY OPTIMIZATION
-- =============================================================================

-- Index for low stock alerts (tenant + stock level)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_inventory_low_stock
ON store_inventory(tenant_id, current_stock, minimum_stock)
WHERE current_stock <= minimum_stock;

-- Index for product availability queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_inventory_available
ON store_inventory(tenant_id, product_id, current_stock)
WHERE current_stock > 0;

-- =============================================================================
-- INVOICES PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Index for billing queries (tenant + status + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_billing
ON invoices(tenant_id, status, issue_date DESC)
WHERE status IN ('draft', 'sent', 'overdue');

-- Index for customer billing history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_customer_history
ON invoices(tenant_id, owner_id, issue_date DESC)
WHERE owner_id IS NOT NULL;

-- =============================================================================
-- REMINDERS PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Index for due reminders (tenant + due date + sent status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_due
ON reminders(tenant_id, due_date, sent_at)
WHERE due_date <= CURRENT_DATE + INTERVAL '7 days' AND sent_at IS NULL;

-- =============================================================================
-- CREATE MATERIALIZED VIEW FOR DASHBOARD STATS
-- =============================================================================
-- This reduces the need for expensive aggregate queries

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    tenant_id,
    -- Pet statistics
    COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END) as active_pets,
    COUNT(DISTINCT p.id) as total_pets,
    COUNT(DISTINCT CASE WHEN p.species = 'dog' AND p.is_active THEN p.id END) as dogs,
    COUNT(DISTINCT CASE WHEN p.species = 'cat' AND p.is_active THEN p.id END) as cats,
    
    -- Appointment statistics (this month)
    COUNT(DISTINCT CASE 
        WHEN a.start_time >= DATE_TRUNC('month', CURRENT_DATE) 
        AND a.start_time < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        THEN a.id 
    END) as appointments_this_month,
    
    COUNT(DISTINCT CASE 
        WHEN a.start_time::date = CURRENT_DATE
        THEN a.id 
    END) as appointments_today,
    
    -- Revenue statistics (this month)
    COALESCE(SUM(CASE 
        WHEN i.issue_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND i.issue_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        AND i.status = 'paid'
        THEN i.total_amount
    END), 0) as revenue_this_month,
    
    -- Last updated
    NOW() as updated_at
FROM profiles pr
LEFT JOIN pets p ON pr.tenant_id = p.tenant_id
LEFT JOIN appointments a ON pr.tenant_id = a.tenant_id
LEFT JOIN invoices i ON pr.tenant_id = i.tenant_id
WHERE pr.role IN ('admin', 'vet') 
  AND pr.deleted_at IS NULL
GROUP BY pr.tenant_id;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_tenant
ON dashboard_stats(tenant_id);

-- =============================================================================
-- OPTIMIZE EXISTING SLOW QUERIES
-- =============================================================================

-- Function to refresh dashboard stats (call via cron or after major data changes)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ADD PARTIAL INDEXES FOR SOFT DELETES
-- =============================================================================
-- Most queries filter out deleted records, so partial indexes are more efficient

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_active_only
ON pets(tenant_id, id)
WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active_only  
ON profiles(tenant_id, id)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_active_only
ON medical_records(tenant_id, id) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- QUERY PERFORMANCE FUNCTIONS
-- =============================================================================

-- Optimized function to get pet stats (replaces repository method)
CREATE OR REPLACE FUNCTION get_pet_stats_optimized(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'by_species', json_build_object(
            'dog', COUNT(*) FILTER (WHERE species = 'dog'),
            'cat', COUNT(*) FILTER (WHERE species = 'cat'), 
            'bird', COUNT(*) FILTER (WHERE species = 'bird'),
            'rabbit', COUNT(*) FILTER (WHERE species = 'rabbit'),
            'other', COUNT(*) FILTER (WHERE species = 'other')
        ),
        'active', COUNT(*) FILTER (WHERE is_active = true),
        'inactive', COUNT(*) FILTER (WHERE is_active = false)
    )
    INTO result
    FROM pets
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATE STATISTICS
-- =============================================================================
-- Ensure query planner has fresh statistics for new indexes

ANALYZE appointments;
ANALYZE pets;
ANALYZE profiles;
ANALYZE medical_records;
ANALYZE vaccines;
ANALYZE store_inventory;
ANALYZE invoices;
ANALYZE reminders;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_appointments_tenant_status_date IS 
'Optimizes appointment filtering by tenant, status, and date range. Used in dashboard and booking views.';

COMMENT ON INDEX idx_pets_tenant_owner_active IS 
'Optimizes pet listing queries filtered by owner and active status.';

COMMENT ON INDEX idx_profiles_staff_active IS 
'Optimizes staff lookup queries for vet assignment and permissions.';

COMMENT ON MATERIALIZED VIEW dashboard_stats IS 
'Pre-computed dashboard statistics. Refresh via refresh_dashboard_stats() after major data changes.';

COMMENT ON FUNCTION get_pet_stats_optimized(UUID) IS 
'Optimized replacement for PetRepository.getStats() with better performance via single query.';