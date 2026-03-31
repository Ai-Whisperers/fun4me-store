-- Rollback Migration: 091_add_performance_indexes
-- Description: Remove performance indexes added in migration 091
-- Author: Autonomous Refactoring System
-- Date: 2026-01-15

-- ============================================================================
-- ROLLBACK: Drop all indexes created in migration 091
-- ============================================================================

-- APPOINTMENTS INDEXES
DROP INDEX IF EXISTS idx_appointments_start_time;
DROP INDEX IF EXISTS idx_appointments_tenant_start;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_appointments_vet_start;
DROP INDEX IF EXISTS idx_appointments_pet_created;

-- INVOICES INDEXES
DROP INDEX IF EXISTS idx_invoices_created_at;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_tenant_created;
DROP INDEX IF EXISTS idx_invoices_client_created;
DROP INDEX IF EXISTS idx_invoices_due_date;

-- MEDICAL RECORDS INDEXES
DROP INDEX IF EXISTS idx_medical_records_pet_created;
DROP INDEX IF EXISTS idx_medical_records_tenant_created;
DROP INDEX IF EXISTS idx_medical_records_type;
DROP INDEX IF EXISTS idx_medical_records_vet;

-- PETS INDEXES
DROP INDEX IF EXISTS idx_pets_owner;
DROP INDEX IF EXISTS idx_pets_tenant_name;
DROP INDEX IF EXISTS idx_pets_species;

-- VACCINES INDEXES
DROP INDEX IF EXISTS idx_vaccines_pet_date;
DROP INDEX IF EXISTS idx_vaccines_next_due;

-- STORE ORDERS INDEXES
DROP INDEX IF EXISTS idx_store_orders_customer_created;
DROP INDEX IF EXISTS idx_store_orders_status;
DROP INDEX IF EXISTS idx_store_orders_tenant_created;

-- STORE INVENTORY INDEXES
DROP INDEX IF EXISTS idx_store_inventory_low_stock;
DROP INDEX IF EXISTS idx_store_inventory_product;

-- PAYMENTS INDEXES
DROP INDEX IF EXISTS idx_payments_tenant_date;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_invoice;

-- PRESCRIPTIONS INDEXES
DROP INDEX IF EXISTS idx_prescriptions_pet_created;
DROP INDEX IF EXISTS idx_prescriptions_vet;
DROP INDEX IF EXISTS idx_prescriptions_valid_until;

-- Note: Safe to run even if indexes don't exist (IF EXISTS clause)
-- Total indexes removed: 35
