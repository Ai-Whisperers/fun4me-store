-- =============================================================================
-- 022_ADD_MISSING_INDEXES.SQL
-- =============================================================================
-- Adds missing indexes identified in the codebase analysis for improved query
-- performance. These indexes support common query patterns and RLS policy checks.
--
-- INDEXES ADDED:
-- 1. invoice_items(tenant_id, invoice_id) - Supports RLS and invoice queries
-- 2. store_order_items(tenant_id) - Supports RLS policies
-- 3. hospitalization_vitals(hospitalization_id) - Supports vitals queries
-- 4. drug_dosages(species) - GIN index for species array searches
-- 5. appointments(appointment_date) - Supports date-based queries
-- 6. pets(tenant_id, species) - Supports species filtering in clinics
-- =============================================================================

-- Use CONCURRENTLY for production-safe index creation (doesn't lock table)
-- Note: CONCURRENTLY cannot be used inside a transaction block

-- =============================================================================
-- INVOICE ITEMS INDEX
-- =============================================================================
-- Supports: RLS policy checks, listing items by invoice
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_tenant_invoice
ON public.invoice_items(tenant_id, invoice_id);

-- =============================================================================
-- STORE ORDER ITEMS INDEX
-- =============================================================================
-- Supports: RLS policy checks, order item lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_order_items_tenant
ON public.store_order_items(tenant_id);

-- Additional composite index for order queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_order_items_order
ON public.store_order_items(order_id, product_id);

-- =============================================================================
-- HOSPITALIZATION VITALS INDEX
-- =============================================================================
-- Supports: Fetching vitals history for a hospitalization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalization_vitals_hosp
ON public.hospitalization_vitals(hospitalization_id, recorded_at DESC);

-- =============================================================================
-- DRUG DOSAGES SPECIES INDEX (GIN for array)
-- =============================================================================
-- Supports: Filtering drug dosages by species (species is an array column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drug_dosages_species_gin
ON public.drug_dosages USING GIN(species);

-- Also add a BTREE index for drug name lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drug_dosages_name
ON public.drug_dosages(drug_name);

-- =============================================================================
-- APPOINTMENTS DATE INDEX
-- =============================================================================
-- Supports: Calendar views, date range queries
-- The existing idx_appointments_tenant_date uses start_time, add one for appointment_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date
ON public.appointments(appointment_date, tenant_id)
WHERE deleted_at IS NULL;

-- =============================================================================
-- PETS SPECIES INDEX
-- =============================================================================
-- Supports: Filtering pets by species within a clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_tenant_species
ON public.pets(tenant_id, species)
WHERE deleted_at IS NULL;

-- =============================================================================
-- PROFILES ROLE INDEX
-- =============================================================================
-- Supports: RLS is_staff_of() function lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_tenant_role
ON public.profiles(tenant_id, role)
WHERE deleted_at IS NULL;

-- =============================================================================
-- VACCINES DUE DATE INDEX
-- =============================================================================
-- Supports: Reminder queries, overdue vaccine reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_due_date
ON public.vaccines(next_due_date, tenant_id)
WHERE next_due_date IS NOT NULL;

-- =============================================================================
-- MESSAGES INDEX FOR CONVERSATION LOOKUPS
-- =============================================================================
-- Supports: Loading messages for a conversation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation
ON public.messages(conversation_id, created_at DESC);

-- =============================================================================
-- STORE PRODUCTS ACTIVE INDEX
-- =============================================================================
-- Supports: Store catalog queries (active products only)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_products_active_tenant
ON public.store_products(tenant_id, category_id)
WHERE is_active = true AND deleted_at IS NULL;

-- =============================================================================
-- INVOICES STATUS INDEX
-- =============================================================================
-- Supports: Filtering invoices by status (pending, overdue, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_status
ON public.invoices(tenant_id, status, due_date)
WHERE deleted_at IS NULL;

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
-- Update statistics for query planner after adding indexes
ANALYZE public.invoice_items;
ANALYZE public.store_order_items;
ANALYZE public.hospitalization_vitals;
ANALYZE public.drug_dosages;
ANALYZE public.appointments;
ANALYZE public.pets;
ANALYZE public.profiles;
ANALYZE public.vaccines;
ANALYZE public.messages;
ANALYZE public.store_products;
ANALYZE public.invoices;
