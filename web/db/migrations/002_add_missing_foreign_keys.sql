-- =============================================================================
-- 002_ADD_MISSING_FOREIGN_KEYS.SQL
-- =============================================================================
-- Adds missing foreign key constraints to ensure data integrity.
--
-- Fixes:
--   - invoice_items.product_id -> store_products.id
--   - hospitalizations.invoice_id -> invoices.id
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. INVOICE_ITEMS.PRODUCT_ID FK
-- =============================================================================
-- The product_id column exists but has no FK constraint

DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_product_fk
        FOREIGN KEY (product_id) REFERENCES public.store_products(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN
        RAISE NOTICE 'store_products table does not exist, skipping FK';
END $$;

-- =============================================================================
-- B. HOSPITALIZATIONS.INVOICE_ID FK
-- =============================================================================
-- The invoice_id column exists but has no FK constraint

DO $$ BEGIN
    ALTER TABLE public.hospitalizations
        ADD CONSTRAINT hospitalizations_invoice_fk
        FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN
        RAISE NOTICE 'invoices table does not exist, skipping FK';
END $$;

COMMIT;
