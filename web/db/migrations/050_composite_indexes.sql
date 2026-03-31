-- Migration: 050_composite_indexes.sql
-- Description: PERF-005 - Add composite indexes for common query patterns
-- Created: January 2026

-- Use CONCURRENTLY to avoid locking tables during index creation
-- Note: CONCURRENTLY cannot be used inside a transaction, so run these individually

-- =============================================================================
-- APPOINTMENTS INDEXES
-- =============================================================================

-- Dashboard: List appointments by tenant, status, and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_status_start
ON appointments (tenant_id, status, start_time);

-- Calendar: Date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_daterange
ON appointments (tenant_id, start_time, end_time);

-- Partial index: Active appointments only (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_active
ON appointments (tenant_id, start_time)
WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- =============================================================================
-- INVOICES INDEXES
-- =============================================================================

-- Billing: Tenant invoices by status and due date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_status_due
ON invoices (tenant_id, status, due_date);

-- Partial index: Unpaid invoices (billing dashboard focus)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_unpaid
ON invoices (tenant_id, due_date)
WHERE status IN ('draft', 'sent', 'overdue');

-- =============================================================================
-- LAB ORDERS INDEXES
-- =============================================================================

-- Order number generation pattern matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_orders_order_number
ON lab_orders (order_number);

-- Lab orders by tenant and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_orders_tenant_status
ON lab_orders (tenant_id, status);

-- =============================================================================
-- STORE PRODUCTS INDEXES
-- =============================================================================

-- Category browsing: Products by tenant and category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_category_active
ON store_products (tenant_id, category_id, is_active)
WHERE deleted_at IS NULL;

-- Partial index: In-stock active products only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_in_stock
ON store_products (tenant_id, category_id)
WHERE is_active = TRUE AND deleted_at IS NULL;

-- =============================================================================
-- HOSPITALIZATIONS INDEXES
-- =============================================================================

-- Dashboard: Active hospitalizations by tenant and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalizations_tenant_status
ON hospitalizations (tenant_id, status);

-- =============================================================================
-- PETS INDEXES
-- =============================================================================

-- Owner's pet list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_owner_tenant
ON pets (owner_id, tenant_id);

-- =============================================================================
-- MEDICAL RECORDS INDEXES
-- =============================================================================

-- Pet history: Records by pet ordered by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_pet_date
ON medical_records (pet_id, created_at DESC);

-- =============================================================================
-- MESSAGES INDEXES
-- =============================================================================

-- Conversation messages ordered by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);

-- =============================================================================
-- STORE ORDERS INDEXES
-- =============================================================================

-- Customer order history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_created
ON store_orders (customer_id, created_at DESC);

-- Tenant orders by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status
ON store_orders (tenant_id, status);

-- =============================================================================
-- VACCINES INDEXES
-- =============================================================================

-- Pet vaccines with status and due date for reminders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_pet_due
ON vaccines (pet_id, next_due_date, status);

-- Tenant vaccine records for bulk queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_tenant_status
ON vaccines (tenant_id, status)
WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- CONVERSATIONS INDEXES
-- =============================================================================

-- Inbox: Conversations by tenant and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_status
ON conversations (tenant_id, status, last_message_at DESC);

-- =============================================================================
-- REMINDERS INDEXES
-- =============================================================================

-- Reminder processing by scheduled time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_scheduled
ON reminders (tenant_id, scheduled_at, status);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Run this after migration to verify indexes were created:
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%'
-- AND schemaname = 'public'
-- ORDER BY tablename, indexname;
