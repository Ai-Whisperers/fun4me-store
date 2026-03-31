-- =============================================================================
-- 006_ADD_CONSTRAINTS.SQL
-- =============================================================================
-- Adds business rule constraints and unique constraints for data integrity.
--
-- Categories:
--   A. Unique constraints (prevent duplicate business records)
--   B. CHECK constraints (enforce valid data)
--   C. Exclusion constraints (prevent overlapping ranges)
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. UNIQUE CONSTRAINTS
-- =============================================================================

-- A.1 Only one active hospitalization per pet at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_hospitalization
ON public.hospitalizations (pet_id)
WHERE status NOT IN ('discharged', 'deceased', 'transferred')
AND deleted_at IS NULL;

-- A.2 Only one default payment method per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_payment_method
ON public.payment_methods (tenant_id)
WHERE is_default = true AND is_active = true;

-- A.3 Unique client code per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_code
ON public.profiles (tenant_id, client_code)
WHERE client_code IS NOT NULL AND deleted_at IS NULL;

-- A.4 Unique microchip numbers (global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_microchip
ON public.pets (microchip_number)
WHERE microchip_number IS NOT NULL AND deleted_at IS NULL;

-- A.5 One QR tag per pet (active tags only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_qr_tag_per_pet
ON public.qr_tags (pet_id)
WHERE pet_id IS NOT NULL AND is_active = true;

-- A.6 Unique lost pet report per pet (only one active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_lost_report_per_pet
ON public.lost_pets (pet_id)
WHERE status = 'lost';

-- =============================================================================
-- B. CHECK CONSTRAINTS - INVOICES
-- =============================================================================

-- B.1 Invoice amounts must be non-negative
DO $$ BEGIN
    ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_amounts_non_negative
        CHECK (
            subtotal >= 0 AND
            total >= 0 AND
            amount_paid >= 0 AND
            COALESCE(discount_amount, 0) >= 0 AND
            COALESCE(tax_amount, 0) >= 0
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B.2 Due date must be on or after invoice date
DO $$ BEGIN
    ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_due_date_valid
        CHECK (due_date IS NULL OR due_date >= invoice_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- C. CHECK CONSTRAINTS - INVOICE_ITEMS
-- =============================================================================

-- C.1 Quantity must be positive (except for discounts which can be negative)
DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_quantity_valid
        CHECK (
            (item_type = 'discount' AND quantity != 0) OR
            (item_type != 'discount' AND quantity > 0)
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- C.2 Tax rate must be between 0 and 100
DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_tax_rate_valid
        CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- D. CHECK CONSTRAINTS - PAYMENTS
-- =============================================================================

-- D.1 Payment amount must be positive
DO $$ BEGIN
    ALTER TABLE public.payments
        ADD CONSTRAINT payments_amount_positive
        CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- E. CHECK CONSTRAINTS - REFUNDS
-- =============================================================================

-- E.1 Refund amount must be positive
DO $$ BEGIN
    ALTER TABLE public.refunds
        ADD CONSTRAINT refunds_amount_positive
        CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- E.2 Refund reason is required
DO $$ BEGIN
    ALTER TABLE public.refunds
        ADD CONSTRAINT refunds_reason_required
        CHECK (reason IS NOT NULL AND char_length(TRIM(reason)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- F. CHECK CONSTRAINTS - STORE_PRODUCTS
-- =============================================================================

-- F.1 Prices must be non-negative
DO $$ BEGIN
    ALTER TABLE public.store_products
        ADD CONSTRAINT store_products_prices_valid
        CHECK (
            base_price >= 0 AND
            (sale_price IS NULL OR sale_price >= 0) AND
            (cost_price IS NULL OR cost_price >= 0)
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- F.2 Sale price should be less than base price
DO $$ BEGIN
    ALTER TABLE public.store_products
        ADD CONSTRAINT store_products_sale_less_than_base
        CHECK (sale_price IS NULL OR sale_price <= base_price);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- G. CHECK CONSTRAINTS - STORE_INVENTORY
-- =============================================================================

-- G.1 Stock quantity must be non-negative
DO $$ BEGIN
    ALTER TABLE public.store_inventory
        ADD CONSTRAINT store_inventory_stock_non_negative
        CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- G.2 Reserved quantity cannot exceed stock
DO $$ BEGIN
    ALTER TABLE public.store_inventory
        ADD CONSTRAINT store_inventory_reserved_valid
        CHECK (COALESCE(reserved_quantity, 0) <= stock_quantity);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- H. CHECK CONSTRAINTS - STORE_COUPONS
-- =============================================================================

-- H.1 Discount value must be positive
DO $$ BEGIN
    ALTER TABLE public.store_coupons
        ADD CONSTRAINT store_coupons_discount_positive
        CHECK (discount_value > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- H.2 Percentage discount must be <= 100
DO $$ BEGIN
    ALTER TABLE public.store_coupons
        ADD CONSTRAINT store_coupons_percentage_valid
        CHECK (
            discount_type != 'percentage' OR
            (discount_value > 0 AND discount_value <= 100)
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- H.3 Valid period must be correct
DO $$ BEGIN
    ALTER TABLE public.store_coupons
        ADD CONSTRAINT store_coupons_valid_period
        CHECK (valid_until IS NULL OR valid_until > valid_from);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- H.4 Usage count cannot exceed limit
DO $$ BEGIN
    ALTER TABLE public.store_coupons
        ADD CONSTRAINT store_coupons_usage_valid
        CHECK (
            usage_limit IS NULL OR
            COALESCE(usage_count, 0) <= usage_limit
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- I. CHECK CONSTRAINTS - KENNELS
-- =============================================================================

-- I.1 Daily rate must be non-negative
DO $$ BEGIN
    ALTER TABLE public.kennels
        ADD CONSTRAINT kennels_daily_rate_non_negative
        CHECK (daily_rate >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- I.2 Max occupancy must be positive
DO $$ BEGIN
    ALTER TABLE public.kennels
        ADD CONSTRAINT kennels_max_occupancy_positive
        CHECK (max_occupancy > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- J. CHECK CONSTRAINTS - HOSPITALIZATIONS
-- =============================================================================

-- J.1 Costs must be non-negative
DO $$ BEGIN
    ALTER TABLE public.hospitalizations
        ADD CONSTRAINT hospitalizations_costs_non_negative
        CHECK (
            (estimated_cost IS NULL OR estimated_cost >= 0) AND
            (actual_cost IS NULL OR actual_cost >= 0)
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- J.2 Discharge date must be after admission
DO $$ BEGIN
    ALTER TABLE public.hospitalizations
        ADD CONSTRAINT hospitalizations_discharge_after_admission
        CHECK (actual_discharge IS NULL OR actual_discharge >= admitted_at);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- K. CHECK CONSTRAINTS - HOSPITALIZATION_VITALS
-- =============================================================================

-- K.1 Temperature in valid range (Celsius)
DO $$ BEGIN
    ALTER TABLE public.hospitalization_vitals
        ADD CONSTRAINT vitals_temperature_valid
        CHECK (temperature IS NULL OR (temperature >= 30 AND temperature <= 45));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- K.2 Heart rate in valid range
DO $$ BEGIN
    ALTER TABLE public.hospitalization_vitals
        ADD CONSTRAINT vitals_heart_rate_valid
        CHECK (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 400));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- K.3 Respiratory rate in valid range
DO $$ BEGIN
    ALTER TABLE public.hospitalization_vitals
        ADD CONSTRAINT vitals_respiratory_rate_valid
        CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 5 AND respiratory_rate <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- K.4 Blood pressure in valid range
DO $$ BEGIN
    ALTER TABLE public.hospitalization_vitals
        ADD CONSTRAINT vitals_blood_pressure_valid
        CHECK (
            (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 50 AND blood_pressure_systolic <= 300)) AND
            (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 20 AND blood_pressure_diastolic <= 200))
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- L. CHECK CONSTRAINTS - CLIENT_CREDITS
-- =============================================================================

-- L.1 Credit amount must be positive
DO $$ BEGIN
    ALTER TABLE public.client_credits
        ADD CONSTRAINT client_credits_amount_positive
        CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- M. CHECK CONSTRAINTS - SERVICES
-- =============================================================================

-- M.1 Tax rate in valid range
DO $$ BEGIN
    ALTER TABLE public.services
        ADD CONSTRAINT services_tax_rate_valid
        CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- M.2 Buffer minutes non-negative
DO $$ BEGIN
    ALTER TABLE public.services
        ADD CONSTRAINT services_buffer_non_negative
        CHECK (buffer_minutes IS NULL OR buffer_minutes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================
-- Run these to check for existing data that violates new constraints:
--
-- -- Check for negative invoice amounts
-- SELECT id, subtotal, total, amount_paid FROM invoices
-- WHERE subtotal < 0 OR total < 0 OR amount_paid < 0;
--
-- -- Check for invalid coupon percentages
-- SELECT id, code, discount_type, discount_value FROM store_coupons
-- WHERE discount_type = 'percentage' AND discount_value > 100;
--
-- -- Check for multiple active hospitalizations per pet
-- SELECT pet_id, COUNT(*) FROM hospitalizations
-- WHERE status NOT IN ('discharged', 'deceased', 'transferred')
-- GROUP BY pet_id HAVING COUNT(*) > 1;
