-- =============================================================================
-- 008_ADD_COVERING_INDEXES.SQL
-- =============================================================================
-- Adds covering indexes (using INCLUDE) for common query patterns.
-- Covering indexes store additional columns in the index leaf pages,
-- allowing index-only scans without heap access.
--
-- Benefits:
--   - Eliminates table heap lookups for common queries
--   - Significantly faster for dashboard/listing queries
--   - Reduces I/O and memory pressure
--
-- Trade-offs:
--   - Larger index size
--   - Slightly slower writes
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. APPOINTMENTS - Dashboard and Calendar Queries
-- =============================================================================

-- Staff calendar view: Get appointments for date range
DROP INDEX IF EXISTS idx_appointments_calendar;
CREATE INDEX idx_appointments_calendar
ON public.appointments (tenant_id, start_time, status)
INCLUDE (pet_id, vet_id, service_id, end_time, duration_minutes, reason)
WHERE deleted_at IS NULL;

-- Upcoming appointments for owner portal
DROP INDEX IF EXISTS idx_appointments_owner_upcoming;
CREATE INDEX idx_appointments_owner_upcoming
ON public.appointments (pet_id, start_time)
INCLUDE (tenant_id, service_id, vet_id, status, reason)
WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL;

-- Vet's daily schedule
DROP INDEX IF EXISTS idx_appointments_vet_schedule;
CREATE INDEX idx_appointments_vet_schedule
ON public.appointments (vet_id, start_time, end_time)
INCLUDE (tenant_id, pet_id, service_id, status)
WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- =============================================================================
-- B. INVOICES - Financial Dashboard Queries
-- =============================================================================

-- Invoice listing (most common query)
DROP INDEX IF EXISTS idx_invoices_list;
CREATE INDEX idx_invoices_list
ON public.invoices (tenant_id, invoice_date DESC)
INCLUDE (invoice_number, client_id, total, status, amount_paid, balance_due)
WHERE deleted_at IS NULL;

-- Unpaid invoices for reminders
DROP INDEX IF EXISTS idx_invoices_unpaid;
CREATE INDEX idx_invoices_unpaid
ON public.invoices (tenant_id, status, due_date)
INCLUDE (invoice_number, client_id, total, balance_due)
WHERE status NOT IN ('paid', 'void', 'refunded') AND deleted_at IS NULL;

-- Client's invoice history
DROP INDEX IF EXISTS idx_invoices_client_history;
CREATE INDEX idx_invoices_client_history
ON public.invoices (client_id, invoice_date DESC)
INCLUDE (invoice_number, total, status, balance_due)
WHERE deleted_at IS NULL;

-- =============================================================================
-- C. PETS - Pet Search and Listing
-- =============================================================================

-- Staff pet search (by tenant)
DROP INDEX IF EXISTS idx_pets_tenant_list;
CREATE INDEX idx_pets_tenant_list
ON public.pets (tenant_id, name)
INCLUDE (owner_id, species, breed, photo_url, is_deceased)
WHERE deleted_at IS NULL;

-- Owner's pet list
DROP INDEX IF EXISTS idx_pets_owner_list;
CREATE INDEX idx_pets_owner_list
ON public.pets (owner_id)
INCLUDE (name, species, breed, photo_url, birth_date, is_deceased)
WHERE deleted_at IS NULL;

-- =============================================================================
-- D. VACCINES - Vaccine Records
-- =============================================================================

-- Pet vaccine history
DROP INDEX IF EXISTS idx_vaccines_pet_history;
CREATE INDEX idx_vaccines_pet_history
ON public.vaccines (pet_id, administered_date DESC)
INCLUDE (name, status, next_due_date, administered_by)
WHERE deleted_at IS NULL;

-- Due vaccines for reminders
DROP INDEX IF EXISTS idx_vaccines_due;
CREATE INDEX idx_vaccines_due
ON public.vaccines (tenant_id, next_due_date)
INCLUDE (pet_id, name, status)
WHERE next_due_date IS NOT NULL
AND status = 'completed'
AND deleted_at IS NULL;

-- =============================================================================
-- E. SERVICES - Service Catalog
-- =============================================================================

-- Active services for booking
DROP INDEX IF EXISTS idx_services_booking;
CREATE INDEX idx_services_booking
ON public.services (tenant_id, category, display_order)
INCLUDE (name, base_price, duration_minutes, is_featured, species_allowed)
WHERE is_active = true AND deleted_at IS NULL;

-- =============================================================================
-- F. STORE_PRODUCTS - Product Catalog
-- =============================================================================

-- Product listing by category
DROP INDEX IF EXISTS idx_products_category_list;
CREATE INDEX idx_products_category_list
ON public.store_products (tenant_id, category_id, display_order)
INCLUDE (name, base_price, sale_price, image_url, is_featured)
WHERE is_active = true;

-- Product search
DROP INDEX IF EXISTS idx_products_search;
CREATE INDEX idx_products_search
ON public.store_products USING gin(name gin_trgm_ops);

-- Featured products
DROP INDEX IF EXISTS idx_products_featured_list;
CREATE INDEX idx_products_featured_list
ON public.store_products (tenant_id)
INCLUDE (name, base_price, sale_price, image_url, category_id)
WHERE is_featured = true AND is_active = true;

-- =============================================================================
-- G. HOSPITALIZATIONS - Active Patients Board
-- =============================================================================

-- Active hospitalizations dashboard
DROP INDEX IF EXISTS idx_hospitalizations_board;
CREATE INDEX idx_hospitalizations_board
ON public.hospitalizations (tenant_id, status, priority)
INCLUDE (pet_id, kennel_id, admitted_at, expected_discharge, diagnosis, primary_vet_id)
WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- =============================================================================
-- H. CONVERSATIONS - Messaging Inbox
-- =============================================================================

-- Staff inbox (unread first)
DROP INDEX IF EXISTS idx_conversations_inbox;
CREATE INDEX idx_conversations_inbox
ON public.conversations (tenant_id, unread_staff_count DESC, last_message_at DESC)
INCLUDE (client_id, pet_id, subject, status, priority);

-- Client conversations
DROP INDEX IF EXISTS idx_conversations_client;
CREATE INDEX idx_conversations_client
ON public.conversations (client_id, last_message_at DESC)
INCLUDE (tenant_id, subject, status, unread_client_count);

-- =============================================================================
-- I. NOTIFICATIONS - User Notifications
-- =============================================================================

-- Unread notifications for user
DROP INDEX IF EXISTS idx_notifications_unread_list;
CREATE INDEX idx_notifications_unread_list
ON public.notifications (user_id, created_at DESC)
INCLUDE (type, title, message, reference_type, reference_id)
WHERE read_at IS NULL AND dismissed_at IS NULL;

-- =============================================================================
-- J. REMINDERS - Pending Reminders Queue
-- =============================================================================

-- Reminders to process
DROP INDEX IF EXISTS idx_reminders_queue;
CREATE INDEX idx_reminders_queue
ON public.reminders (scheduled_at, status)
INCLUDE (tenant_id, client_id, pet_id, type, reference_type, reference_id)
WHERE status = 'pending';

-- =============================================================================
-- K. PROFILES - Staff and Client Lookups
-- =============================================================================

-- Staff listing
DROP INDEX IF EXISTS idx_profiles_staff_list;
CREATE INDEX idx_profiles_staff_list
ON public.profiles (tenant_id, role)
INCLUDE (full_name, email, phone, avatar_url, specializations)
WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- Client listing
DROP INDEX IF EXISTS idx_profiles_client_list;
CREATE INDEX idx_profiles_client_list
ON public.profiles (tenant_id)
INCLUDE (full_name, email, phone, client_code, avatar_url)
WHERE role = 'owner' AND deleted_at IS NULL;

-- =============================================================================
-- L. PAYMENTS - Payment History
-- =============================================================================

-- Payments by invoice
DROP INDEX IF EXISTS idx_payments_invoice_list;
CREATE INDEX idx_payments_invoice_list
ON public.payments (invoice_id, payment_date DESC)
INCLUDE (amount, payment_method_name, status, reference_number);

-- Daily payments report
DROP INDEX IF EXISTS idx_payments_daily_report;
CREATE INDEX idx_payments_daily_report
ON public.payments (tenant_id, payment_date DESC)
INCLUDE (invoice_id, amount, payment_method_name, status)
WHERE status = 'completed';

COMMIT;

-- =============================================================================
-- INDEX SIZE MONITORING
-- =============================================================================
-- Run this query to monitor index sizes:
--
-- SELECT
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) as size,
--     idx_scan as scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC
-- LIMIT 30;
--
-- To check for index-only scans:
-- EXPLAIN ANALYZE SELECT ... (look for "Index Only Scan" in output)
