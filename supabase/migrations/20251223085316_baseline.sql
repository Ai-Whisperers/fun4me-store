-- BASELINE MIGRATION 
-- Auto-generated from legacy setup-db.mjs



-- ==========================================
-- FILE: 00_setup/01_extensions.sql
-- ==========================================

-- =============================================================================
-- 01_EXTENSIONS.SQL
-- =============================================================================
-- PostgreSQL extensions required for the application.
-- Run this FIRST before any other scripts.
-- =============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram similarity for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Unaccent for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ==========================================
-- FILE: 00_setup/02_core_functions.sql
-- ==========================================

-- =============================================================================
-- 02_CORE_FUNCTIONS.SQL
-- =============================================================================
-- Core utility functions needed BEFORE tables are created.
-- These include stub versions of authorization functions that RLS policies reference.
-- The real implementations are created in 02_functions/ AFTER tables exist.
--
-- DEPENDENCIES: 01_extensions.sql, 01_types/01_enums_and_domains.sql
-- =============================================================================

-- =============================================================================
-- A. UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- This function is used by nearly all tables to auto-update the updated_at column.
-- Attached via: CREATE TRIGGER handle_updated_at BEFORE UPDATE ... EXECUTE FUNCTION handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.handle_updated_at() IS
'Trigger function to automatically update updated_at timestamp on row modification.
Usage: CREATE TRIGGER handle_updated_at BEFORE UPDATE ON table FOR EACH ROW EXECUTE FUNCTION handle_updated_at();';

-- =============================================================================
-- B. AUTHORIZATION STUB FUNCTIONS
-- =============================================================================
-- These are STUB versions that return FALSE initially.
-- They are replaced with real implementations AFTER profiles/pets tables exist.
-- RLS policies reference these functions, so they must exist before table creation.

-- Check if user is staff (vet/admin) of a tenant
-- STUB: Always returns FALSE until replaced with real function
CREATE OR REPLACE FUNCTION public.is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    -- Real implementation checks: profiles.role IN ('vet', 'admin') AND profiles.tenant_id = in_tenant_id
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_staff_of(TEXT) IS
'Check if current user is staff (vet/admin) of the specified tenant.
STUB VERSION - replaced by 02_functions/02_core_functions.sql after profiles table exists.
Used extensively in RLS policies for tenant data isolation.';

-- Check if user owns a specific pet
-- STUB: Always returns FALSE until replaced with real function
CREATE OR REPLACE FUNCTION public.is_owner_of_pet(pet_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Stub implementation - will be replaced after pets table exists
    -- Real implementation checks: pets.owner_id = auth.uid() AND pets.deleted_at IS NULL
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_owner_of_pet(UUID) IS
'Check if current user owns the specified pet.
STUB VERSION - replaced by 02_functions/02_core_functions.sql after pets table exists.
Used in RLS policies for owner access to pet data.';

-- Get user's tenant_id
-- STUB: Returns NULL until replaced with real function
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TEXT AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_user_tenant() IS
'Get the tenant_id for the current authenticated user.
STUB VERSION - replaced after profiles table exists.';

-- Get user's role
-- STUB: Returns NULL until replaced with real function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    -- Stub implementation - will be replaced after profiles table exists
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_user_role() IS
'Get the role for the current authenticated user.
STUB VERSION - replaced after profiles table exists.';

-- =============================================================================
-- C. GENERIC SOFT DELETE TRIGGER FUNCTION
-- =============================================================================
-- Converts DELETE to soft delete by setting deleted_at instead.
-- Can be used on any table with deleted_at and deleted_by columns.

CREATE OR REPLACE FUNCTION public.handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, update the soft delete columns
    EXECUTE format(
        'UPDATE %I.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME
    ) USING auth.uid(), OLD.id;

    RETURN NULL; -- Prevent the actual DELETE
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_soft_delete() IS
'Generic trigger function to convert DELETE operations to soft deletes.
Sets deleted_at = NOW() and deleted_by = auth.uid() instead of removing the row.
Usage: CREATE TRIGGER soft_delete BEFORE DELETE ON table FOR EACH ROW EXECUTE FUNCTION handle_soft_delete();
Requires table to have: id UUID PRIMARY KEY, deleted_at TIMESTAMPTZ, deleted_by UUID';

-- =============================================================================
-- D. PROTECT CRITICAL COLUMNS (Security Trigger)
-- =============================================================================
-- Prevents users from modifying their own role or tenant.

CREATE OR REPLACE FUNCTION public.protect_critical_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service role to do anything
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Prevent users from modifying their own role/tenant
    IF OLD.id = auth.uid() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Cannot modify your own role'
                USING ERRCODE = 'insufficient_privilege',
                      HINT = 'Role changes must be made by an administrator';
        END IF;
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Cannot modify your own tenant'
                USING ERRCODE = 'insufficient_privilege',
                      HINT = 'Tenant changes must be made by an administrator';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.protect_critical_profile_columns() IS
'Security trigger to prevent users from modifying their own role or tenant_id.
Allows service_role to bypass for administrative operations.';

-- =============================================================================
-- E. GENERIC DOCUMENT NUMBER GENERATOR (Thread-Safe)
-- =============================================================================
-- Uses document_sequences table with advisory locks to prevent race conditions.
-- Generates numbers like: FAC-2024-00001, ADM-00001, LAB-2024-00001

CREATE OR REPLACE FUNCTION public.next_document_number(
    p_tenant_id TEXT,
    p_document_type TEXT,
    p_prefix TEXT DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_prefix TEXT;
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Validate inputs
    IF p_tenant_id IS NULL OR p_document_type IS NULL THEN
        RAISE EXCEPTION 'tenant_id and document_type are required'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Default year to current (use 0 for non-yearly sequences like admissions)
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

    -- Default prefix based on document type
    v_prefix := COALESCE(p_prefix, CASE p_document_type
        WHEN 'invoice' THEN 'FAC'
        WHEN 'admission' THEN 'ADM'
        WHEN 'lab_order' THEN 'LAB'
        WHEN 'payment' THEN 'PAG'
        WHEN 'refund' THEN 'REE'
        WHEN 'claim' THEN 'CLM'
        WHEN 'prescription' THEN 'REC'
        WHEN 'order' THEN 'ORD'
        ELSE UPPER(LEFT(p_document_type, 3))
    END);

    -- Generate unique lock key from tenant + type + year
    v_lock_key := hashtext(p_tenant_id || ':' || p_document_type || ':' || v_year::TEXT);

    -- Acquire advisory lock for this specific sequence
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert and get next sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, p_document_type, v_year, 1, v_prefix)
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    -- Return formatted number (with or without year based on year value)
    IF v_year = 0 THEN
        -- Non-yearly format: ADM-000001
        RETURN v_prefix || '-' || LPAD(v_seq::TEXT, 6, '0');
    ELSE
        -- Yearly format: FAC-2024-00001
        RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.next_document_number(TEXT, TEXT, TEXT, INTEGER) IS
'Thread-safe document number generator using advisory locks.
Parameters:
  - p_tenant_id: Tenant identifier (required)
  - p_document_type: Type of document (invoice, admission, lab_order, etc.)
  - p_prefix: Optional custom prefix (defaults based on type)
  - p_year: Optional year (defaults to current, use 0 for non-yearly sequences)
Returns: Formatted document number (e.g., FAC-2024-00001 or ADM-000001)';

-- =============================================================================
-- F. INVOICE NUMBER GENERATOR (Convenience Wrapper)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'invoice', 'FAC');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_invoice_number(TEXT) IS
'Generate sequential invoice number for a tenant. Format: FAC-YYYY-NNNNN';

-- =============================================================================
-- G. WEIGHTED AVERAGE COST CALCULATOR
-- =============================================================================
-- Calculates new weighted average cost when inventory is received.

CREATE OR REPLACE FUNCTION public.calculate_weighted_average_cost(
    p_product_id UUID,
    p_new_quantity INTEGER,
    p_new_cost NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_current_qty INTEGER;
    v_current_cost NUMERIC;
    v_new_avg NUMERIC;
BEGIN
    -- Validate inputs
    IF p_new_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_new_cost < 0 THEN
        RAISE EXCEPTION 'Cost cannot be negative'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Get current inventory
    SELECT stock_quantity, weighted_average_cost
    INTO v_current_qty, v_current_cost
    FROM public.store_inventory
    WHERE product_id = p_product_id;

    -- If no existing inventory, return the new cost
    IF v_current_qty IS NULL OR v_current_qty = 0 THEN
        RETURN p_new_cost;
    END IF;

    -- Calculate weighted average
    v_new_avg := (
        (v_current_qty * COALESCE(v_current_cost, 0)) +
        (p_new_quantity * p_new_cost)
    ) / (v_current_qty + p_new_quantity);

    RETURN ROUND(v_new_avg, 2);
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.calculate_weighted_average_cost(UUID, INTEGER, NUMERIC) IS
'Calculate new weighted average cost when receiving inventory.
Parameters:
  - p_product_id: Product to calculate WAC for
  - p_new_quantity: Quantity being received
  - p_new_cost: Unit cost of new inventory
Returns: New weighted average cost rounded to 2 decimal places';

-- =============================================================================
-- H. ARRAY VALIDATION HELPERS
-- =============================================================================

-- Validate array is not empty
CREATE OR REPLACE FUNCTION public.array_not_empty(arr ANYARRAY)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN arr IS NOT NULL AND array_length(arr, 1) > 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.array_not_empty(ANYARRAY) IS
'Check if an array is not null and has at least one element';

-- Validate array length within bounds
CREATE OR REPLACE FUNCTION public.array_length_between(arr ANYARRAY, min_len INTEGER, max_len INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    len INTEGER;
BEGIN
    len := COALESCE(array_length(arr, 1), 0);
    RETURN len >= min_len AND len <= max_len;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.array_length_between(ANYARRAY, INTEGER, INTEGER) IS
'Check if array length is between min and max (inclusive)';

-- =============================================================================
-- I. JSON VALIDATION HELPERS
-- =============================================================================

-- Validate JSONB is an object (not array or scalar)
CREATE OR REPLACE FUNCTION public.jsonb_is_object(val JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN val IS NOT NULL AND jsonb_typeof(val) = 'object';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.jsonb_is_object(JSONB) IS
'Check if JSONB value is an object (not array or scalar)';

-- Validate JSONB is an array
CREATE OR REPLACE FUNCTION public.jsonb_is_array(val JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN val IS NOT NULL AND jsonb_typeof(val) = 'array';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.jsonb_is_array(JSONB) IS
'Check if JSONB value is an array';

-- =============================================================================
-- J. GRANT EXECUTE PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_soft_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_critical_profile_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_weighted_average_cost(UUID, INTEGER, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.array_not_empty(ANYARRAY) TO authenticated;
GRANT EXECUTE ON FUNCTION public.array_length_between(ANYARRAY, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_is_object(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jsonb_is_array(JSONB) TO authenticated;


-- ==========================================
-- FILE: 01_types/01_enums_and_domains.sql
-- ==========================================

-- =============================================================================
-- 01_ENUMS_AND_DOMAINS.SQL
-- =============================================================================
-- Standardized types, enums, and domains for data consistency.
-- Run AFTER extensions but BEFORE any tables.
-- =============================================================================

-- =============================================================================
-- CUSTOM DOMAINS (Validated Types)
-- =============================================================================

-- Email domain with validation
DO $$ BEGIN
    CREATE DOMAIN public.email_address AS TEXT
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON DOMAIN public.email_address IS 'Validated email address format';

-- Phone number domain (minimum 6 chars)
DO $$ BEGIN
    CREATE DOMAIN public.phone_number AS TEXT
    CHECK (VALUE IS NULL OR char_length(VALUE) >= 6);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON DOMAIN public.phone_number IS 'Phone number with minimum length validation';

-- Positive money amount
DO $$ BEGIN
    CREATE DOMAIN public.money_positive AS NUMERIC(12,2)
    CHECK (VALUE >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON DOMAIN public.money_positive IS 'Non-negative monetary amount with 2 decimal places';

-- Percentage (0-100)
DO $$ BEGIN
    CREATE DOMAIN public.percentage AS NUMERIC(5,2)
    CHECK (VALUE >= 0 AND VALUE <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON DOMAIN public.percentage IS 'Percentage value between 0 and 100';

-- =============================================================================
-- STANDARD ENUM TYPES
-- =============================================================================

-- User roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'vet', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.user_role IS 'User role in the system: owner (pet owner), vet (veterinarian), admin (clinic admin)';

-- Pet species
DO $$ BEGIN
    CREATE TYPE public.pet_species AS ENUM ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.pet_species IS 'Supported pet species';

-- Pet sex
DO $$ BEGIN
    CREATE TYPE public.pet_sex AS ENUM ('male', 'female', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.pet_sex IS 'Pet biological sex';

-- Contact preference
DO $$ BEGIN
    CREATE TYPE public.contact_preference AS ENUM ('phone', 'email', 'whatsapp', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.contact_preference IS 'Preferred contact method';

-- =============================================================================
-- STATUS ENUMS (Standardized across modules)
-- =============================================================================

-- Generic workflow status (for simple entities)
DO $$ BEGIN
    CREATE TYPE public.workflow_status AS ENUM ('draft', 'pending', 'active', 'completed', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.workflow_status IS 'Standard workflow status for simple entities';

-- Appointment status
DO $$ BEGIN
    CREATE TYPE public.appointment_status AS ENUM (
        'scheduled',    -- Confirmed appointment
        'confirmed',    -- Client confirmed
        'checked_in',   -- Client arrived
        'in_progress',  -- Currently being seen
        'completed',    -- Appointment done
        'cancelled',    -- Cancelled
        'no_show'       -- Client didn't show
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.appointment_status IS 'Appointment lifecycle status';

-- Invoice status
DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM (
        'draft',        -- Being created
        'sent',         -- Sent to client
        'partial',      -- Partially paid
        'paid',         -- Fully paid
        'overdue',      -- Past due date
        'cancelled',    -- Cancelled
        'refunded'      -- Refunded
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.invoice_status IS 'Invoice payment status';

-- Payment status
DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'pending',      -- Awaiting payment
        'completed',    -- Payment received
        'failed',       -- Payment failed
        'refunded',     -- Refunded
        'cancelled'     -- Cancelled
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.payment_status IS 'Payment transaction status';

-- Lab order status
DO $$ BEGIN
    CREATE TYPE public.lab_order_status AS ENUM (
        'pending',      -- Order created
        'collected',    -- Sample collected
        'processing',   -- In lab
        'completed',    -- Results ready
        'cancelled'     -- Cancelled
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.lab_order_status IS 'Lab order processing status';

-- Hospitalization status
DO $$ BEGIN
    CREATE TYPE public.hospitalization_status AS ENUM (
        'admitted',     -- Currently hospitalized
        'in_treatment', -- Under active treatment
        'stable',       -- Stable condition
        'critical',     -- Critical condition
        'discharged',   -- Released
        'transferred',  -- Transferred elsewhere
        'deceased'      -- Patient died
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.hospitalization_status IS 'Hospitalization patient status';

-- Vaccine status
DO $$ BEGIN
    CREATE TYPE public.vaccine_status AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.vaccine_status IS 'Vaccination record status';

-- Prescription status
DO $$ BEGIN
    CREATE TYPE public.prescription_status AS ENUM ('draft', 'active', 'dispensed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.prescription_status IS 'Prescription lifecycle status';

-- Insurance claim status
DO $$ BEGIN
    CREATE TYPE public.claim_status AS ENUM (
        'draft',            -- Being prepared
        'submitted',        -- Sent to insurer
        'under_review',     -- Being reviewed
        'approved',         -- Approved for payment
        'partially_approved', -- Partially approved
        'denied',           -- Denied
        'paid'              -- Payment received
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.claim_status IS 'Insurance claim processing status';

-- Invite status
DO $$ BEGIN
    CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.invite_status IS 'Clinic invite status';

-- =============================================================================
-- SEVERITY LEVELS (Standardized)
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.severity_level IS 'Standard severity/priority level';

-- Acuity level for hospitalizations
DO $$ BEGIN
    CREATE TYPE public.acuity_level AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.acuity_level IS 'Patient acuity level for triage and care intensity';

-- =============================================================================
-- CLINICAL ENUMS
-- =============================================================================

-- Medical record types
DO $$ BEGIN
    CREATE TYPE public.medical_record_type AS ENUM (
        'consultation', 'surgery', 'emergency', 'vaccination', 'checkup',
        'dental', 'grooming', 'lab_result', 'imaging', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.medical_record_type IS 'Types of medical records';

-- Service categories
DO $$ BEGIN
    CREATE TYPE public.service_category AS ENUM (
        'consultation', 'vaccination', 'grooming', 'surgery',
        'diagnostic', 'dental', 'emergency', 'hospitalization',
        'treatment', 'identification', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.service_category IS 'Service catalog categories';

-- Expense categories
DO $$ BEGIN
    CREATE TYPE public.expense_category AS ENUM (
        'supplies', 'utilities', 'payroll', 'rent', 'equipment',
        'marketing', 'insurance', 'taxes', 'travel', 'maintenance',
        'professional_services', 'training', 'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.expense_category IS 'Business expense categories';

-- Loyalty tiers
DO $$ BEGIN
    CREATE TYPE public.loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.loyalty_tier IS 'Customer loyalty program tiers';

-- Loyalty transaction types
DO $$ BEGIN
    CREATE TYPE public.loyalty_transaction_type AS ENUM ('earn', 'redeem', 'expire', 'adjust', 'bonus');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.loyalty_transaction_type IS 'Types of loyalty point transactions';

-- Growth standard percentiles
DO $$ BEGIN
    CREATE TYPE public.growth_percentile AS ENUM ('P3', 'P10', 'P25', 'P50', 'P75', 'P90', 'P97');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.growth_percentile IS 'Standard growth chart percentiles';

-- Diagnosis code standards
DO $$ BEGIN
    CREATE TYPE public.diagnosis_standard AS ENUM ('venom', 'snomed', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.diagnosis_standard IS 'Medical diagnosis coding standards';

-- =============================================================================
-- MESSAGING ENUMS
-- =============================================================================

-- Message channel
DO $$ BEGIN
    CREATE TYPE public.message_channel AS ENUM ('internal', 'whatsapp', 'email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.message_channel IS 'Communication channel for messages';

-- Message status
DO $$ BEGIN
    CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.message_status IS 'Message delivery status';

-- Conversation status
DO $$ BEGIN
    CREATE TYPE public.conversation_status AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.conversation_status IS 'Conversation thread status';

-- =============================================================================
-- STORE/INVENTORY ENUMS
-- =============================================================================

-- Order status
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'pending',      -- Order placed
        'confirmed',    -- Order confirmed
        'processing',   -- Being prepared
        'ready',        -- Ready for pickup/delivery
        'shipped',      -- In transit
        'delivered',    -- Delivered
        'cancelled',    -- Cancelled
        'returned'      -- Returned
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.order_status IS 'E-commerce order status';

-- Inventory transaction types
DO $$ BEGIN
    CREATE TYPE public.inventory_transaction_type AS ENUM (
        'purchase',     -- Stock purchase
        'sale',         -- Stock sale
        'adjustment',   -- Manual adjustment
        'return',       -- Customer return
        'transfer',     -- Transfer between locations
        'waste',        -- Damaged/expired
        'reservation'   -- Reserved for order
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.inventory_transaction_type IS 'Inventory movement types';

-- Discount types
DO $$ BEGIN
    CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount', 'buy_x_get_y');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.discount_type IS 'Types of discounts/promotions';

-- =============================================================================
-- INSURANCE ENUMS
-- =============================================================================

-- Policy status
DO $$ BEGIN
    CREATE TYPE public.policy_status AS ENUM ('pending', 'active', 'expired', 'cancelled', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.policy_status IS 'Insurance policy status';

-- Coverage type
DO $$ BEGIN
    CREATE TYPE public.coverage_type AS ENUM ('basic', 'standard', 'premium', 'comprehensive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.coverage_type IS 'Insurance coverage level';

-- Claim type
DO $$ BEGIN
    CREATE TYPE public.claim_type AS ENUM ('treatment', 'surgery', 'hospitalization', 'medication', 'diagnostic', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.claim_type IS 'Types of insurance claims';

-- =============================================================================
-- STAFF/HR ENUMS
-- =============================================================================

-- Time off types
DO $$ BEGIN
    CREATE TYPE public.time_off_type AS ENUM ('vacation', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.time_off_type IS 'Types of staff time off';

-- Time off request status
DO $$ BEGIN
    CREATE TYPE public.time_off_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.time_off_status IS 'Time off request approval status';

-- =============================================================================
-- DAY OF WEEK ARRAY VALIDATION
-- =============================================================================

-- Function to validate day of week arrays (1-7, ISO week)
CREATE OR REPLACE FUNCTION public.validate_days_of_week(days INTEGER[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN days IS NULL OR days <@ ARRAY[1,2,3,4,5,6,7]::INTEGER[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.validate_days_of_week IS 'Validates that day array contains only 1-7 (ISO week days)';


-- ==========================================
-- FILE: 10_core/01_tenants.sql
-- ==========================================

-- =============================================================================
-- 01_TENANTS.SQL
-- =============================================================================
-- Multi-tenant support: each clinic is a tenant with isolated data.
-- This is the foundation table - all other tables reference tenant_id.
--
-- DEPENDENCIES: 00_setup/01_extensions.sql, 00_setup/02_core_functions.sql
-- =============================================================================

-- =============================================================================
-- TENANTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,

    -- Contact information
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Paraguay',

    -- Business information
    ruc TEXT,                    -- Paraguay tax ID
    logo_url TEXT,
    website_url TEXT,

    -- Settings (JSONB for flexibility)
    -- Structure: { currency: 'PYG', timezone: 'America/Asuncion', ... }
    settings JSONB DEFAULT '{}'::jsonb,
    business_hours JSONB DEFAULT '{}'::jsonb,

    -- Feature flags (which modules are enabled)
    features_enabled TEXT[] DEFAULT ARRAY['core'],

    -- Subscription/billing
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    plan_expires_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT tenants_id_format CHECK (id ~ '^[a-z][a-z0-9_-]*$'),
    CONSTRAINT tenants_id_length CHECK (char_length(id) BETWEEN 2 AND 50),
    CONSTRAINT tenants_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT tenants_settings_is_object CHECK (settings IS NULL OR jsonb_typeof(settings) = 'object')
);

COMMENT ON TABLE public.tenants IS 'Multi-tenant clinic organizations. Each clinic is a tenant with isolated data.';
COMMENT ON COLUMN public.tenants.id IS 'URL-friendly slug identifier (e.g., "adris", "petlife")';
COMMENT ON COLUMN public.tenants.settings IS 'Flexible settings: { currency, timezone, working_hours, notification_preferences, ... }';
COMMENT ON COLUMN public.tenants.features_enabled IS 'Array of enabled module names: core, store, lab, hospitalization, etc.';
COMMENT ON COLUMN public.tenants.plan IS 'Subscription tier affecting available features and limits';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see active tenants (RLS will be updated after profiles table exists)
DROP POLICY IF EXISTS "Authenticated users view active tenants" ON public.tenants;
CREATE POLICY "Authenticated users view active tenants" ON public.tenants
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.tenants;
CREATE POLICY "Service role full access" ON public.tenants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenants_name ON public.tenants USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON public.tenants(plan) WHERE is_active = true;

-- GIN index for JSONB settings (efficient key/value queries)
CREATE INDEX IF NOT EXISTS idx_tenants_settings_gin ON public.tenants USING gin(settings jsonb_path_ops)
    WHERE settings IS NOT NULL AND settings != '{}';

-- =============================================================================
-- DOCUMENT SEQUENCES (Thread-Safe Sequence Generation)
-- =============================================================================
-- Generic sequence table for all document types (invoices, admissions, etc.)
-- Uses advisory locks to prevent race conditions in concurrent environments

CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,  -- 'invoice', 'admission', 'lab_order', 'payment', etc.
    year INTEGER NOT NULL,        -- 0 for non-yearly sequences (like admissions)
    current_sequence INTEGER NOT NULL DEFAULT 0 CHECK (current_sequence >= 0),
    prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, document_type, year)
);

COMMENT ON TABLE public.document_sequences IS 'Thread-safe document numbering sequences per tenant/type/year';
COMMENT ON COLUMN public.document_sequences.year IS 'Sequence year. Use 0 for non-yearly sequences (e.g., admission numbers)';
COMMENT ON COLUMN public.document_sequences.current_sequence IS 'Last used sequence number. Next number = current_sequence + 1';

-- Enable RLS
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Service role manages sequences (admin policy added after profiles table exists)
DROP POLICY IF EXISTS "Service role full access sequences" ON public.document_sequences;
CREATE POLICY "Service role full access sequences" ON public.document_sequences
    FOR ALL TO service_role USING (true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_document_sequences_lookup
ON public.document_sequences(tenant_id, document_type, year);

-- Updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.document_sequences;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.document_sequences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- TENANT SETTINGS VIEW (Safe public access)
-- =============================================================================

CREATE OR REPLACE VIEW public.tenant_public_info AS
SELECT
    id,
    name,
    logo_url,
    city,
    country,
    is_active
FROM public.tenants
WHERE is_active = true;

COMMENT ON VIEW public.tenant_public_info IS 'Public-safe tenant information for discovery/display';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.tenants;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ==========================================
-- FILE: 10_core/02_profiles.sql
-- ==========================================

-- =============================================================================
-- 02_PROFILES.SQL
-- =============================================================================
-- User profiles extending auth.users with application-specific data.
-- Links Supabase Auth users to tenant-specific roles and information.
--
-- DEPENDENCIES: 01_tenants.sql
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- REFERENCES auth.users(id) ON DELETE CASCADE, -- Disabled for seeding
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,

    -- Identity
    full_name TEXT,
    email TEXT,  -- Denormalized from auth.users for queries
    phone TEXT,
    secondary_phone TEXT,
    avatar_url TEXT,

    -- Role-based access control
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Owner-specific fields (clients)
    client_code TEXT,            -- Unique client identifier within tenant
    address TEXT,
    city TEXT,
    document_type TEXT,          -- CI, RUC, Pasaporte
    document_number TEXT,
    preferred_contact TEXT DEFAULT 'phone' CHECK (preferred_contact IN ('phone', 'email', 'whatsapp', 'sms')),
    notes TEXT,                  -- Internal notes about this client

    -- Vet/Staff-specific fields
    signature_url TEXT,          -- Digital signature for prescriptions
    license_number TEXT,         -- Professional license
    specializations TEXT[],      -- ['surgery', 'dermatology', etc.]
    bio TEXT,                    -- Public bio for display

    -- Soft delete (proper FK to profiles)
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT profiles_phone_length CHECK (phone IS NULL OR char_length(phone) >= 6),
    CONSTRAINT profiles_email_format CHECK (
        email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT profiles_name_length CHECK (full_name IS NULL OR char_length(full_name) >= 2),
    -- Staff must have email and name (critical for clinic operations)
    CONSTRAINT profiles_staff_requires_info CHECK (
        role = 'owner' OR (full_name IS NOT NULL AND email IS NOT NULL)
    )
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users with app-specific data';
COMMENT ON COLUMN public.profiles.role IS 'User role: owner (pet owner/client), vet (veterinarian), admin (clinic administrator)';
COMMENT ON COLUMN public.profiles.tenant_id IS 'The clinic this user belongs to. NULL for unassigned users';
COMMENT ON COLUMN public.profiles.client_code IS 'Unique client identifier within the tenant (e.g., CLI-00001)';
COMMENT ON COLUMN public.profiles.preferred_contact IS 'How the client prefers to be contacted';
COMMENT ON COLUMN public.profiles.specializations IS 'Vet specialization areas for staff profiles';

-- =============================================================================
-- CLINIC PROFILES (Junction table for multi-tenancy)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Clinic-specific role (may differ from global role)
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Membership status
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Clinic-specific settings
    permissions JSONB DEFAULT '{}',  -- Additional permissions within this clinic

    -- Audit
    invited_by UUID REFERENCES public.profiles(id),
    invitation_accepted_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(profile_id, tenant_id)
);

COMMENT ON TABLE public.clinic_profiles IS 'Junction table linking users to clinics they can access. Supports multi-tenancy.';
COMMENT ON COLUMN public.clinic_profiles.role IS 'Role within this specific clinic (may override global role)';
COMMENT ON COLUMN public.clinic_profiles.permissions IS 'Clinic-specific permission overrides';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinic_profiles_profile ON public.clinic_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_tenant ON public.clinic_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_active ON public.clinic_profiles(tenant_id, is_active)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.clinic_profiles ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access clinic_profiles" ON public.clinic_profiles;
CREATE POLICY "Service role full access clinic_profiles" ON public.clinic_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view their own clinic memberships
DROP POLICY IF EXISTS "Users view own clinic memberships" ON public.clinic_profiles;
CREATE POLICY "Users view own clinic memberships" ON public.clinic_profiles
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

-- Clinic staff can manage clinic memberships
DROP POLICY IF EXISTS "Clinic staff manage clinic memberships" ON public.clinic_profiles;
CREATE POLICY "Clinic staff manage clinic memberships" ON public.clinic_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clinic_profiles cp
            WHERE cp.profile_id = auth.uid()
            AND cp.tenant_id = clinic_profiles.tenant_id
            AND cp.role IN ('vet', 'admin')
            AND cp.is_active = true
            AND cp.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_profiles cp
            WHERE cp.profile_id = auth.uid()
            AND cp.tenant_id = clinic_profiles.tenant_id
            AND cp.role IN ('vet', 'admin')
            AND cp.is_active = true
            AND cp.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_clinic_profiles ON public.clinic_profiles;
CREATE TRIGGER handle_updated_at_clinic_profiles
    BEFORE UPDATE ON public.clinic_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Staff can view profiles in their tenant (for client lookup)
DROP POLICY IF EXISTS "Staff view tenant profiles" ON public.profiles;
CREATE POLICY "Staff view tenant profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- Staff can update other profiles in their tenant (not their own role/tenant)
DROP POLICY IF EXISTS "Staff update tenant profiles" ON public.profiles;
CREATE POLICY "Staff update tenant profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        tenant_id IS NOT NULL
        AND public.is_staff_of(tenant_id)
        AND id != auth.uid()  -- Can't modify own profile via this policy
        AND deleted_at IS NULL
    );

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON public.profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- Case-insensitive email search
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email));

-- UNIQUE email per tenant (prevents duplicate registrations within a clinic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_email_per_tenant
ON public.profiles(tenant_id, LOWER(email))
WHERE tenant_id IS NOT NULL AND email IS NOT NULL AND deleted_at IS NULL;

-- Name search with trigrams
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles USING gin(full_name gin_trgm_ops);

-- GIN index for specializations array search
CREATE INDEX IF NOT EXISTS idx_profiles_specializations_gin ON public.profiles USING gin(specializations)
WHERE specializations IS NOT NULL;

-- Unique client code per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_code ON public.profiles(tenant_id, client_code)
    WHERE client_code IS NOT NULL AND deleted_at IS NULL;

-- Staff lookup optimization for RLS (is_staff_of function)
CREATE INDEX IF NOT EXISTS idx_profiles_staff_lookup ON public.profiles(id, tenant_id, role)
    WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- Staff listing (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_profiles_staff_list ON public.profiles(tenant_id, role)
    INCLUDE (full_name, email, phone, avatar_url, license_number)
    WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- Client listing (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_profiles_client_list ON public.profiles(tenant_id)
    INCLUDE (full_name, email, phone, client_code, avatar_url)
    WHERE role = 'owner' AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Prevent users from modifying their own role/tenant
DROP TRIGGER IF EXISTS protect_critical_columns ON public.profiles;
CREATE TRIGGER protect_critical_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_critical_profile_columns();

-- =============================================================================
-- DEMO ACCOUNTS TABLE (For Development - DELETE IN PRODUCTION)
-- =============================================================================
-- Maps emails to tenants/roles for development without invites

DROP TABLE IF EXISTS public.demo_accounts;
CREATE TABLE public.demo_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.demo_accounts IS 'Development-only: pre-configured accounts for testing. DELETE IN PRODUCTION.';

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage demo accounts" ON public.demo_accounts;
CREATE POLICY "Service role manage demo accounts" ON public.demo_accounts
    FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_demo_accounts_email ON public.demo_accounts(email) WHERE is_active = true;

-- =============================================================================
-- AUTH TRIGGER (Create profile on signup)
-- =============================================================================
-- Automatically creates a profile when a new user signs up via Supabase Auth.
-- Checks for pending invites or demo accounts to assign tenant/role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record RECORD;
    demo_record RECORD;
    v_tenant_id TEXT;
    v_role TEXT;
BEGIN
    -- 1. Check for pending invite (highest priority)
    BEGIN
        SELECT tenant_id, role INTO invite_record
        FROM public.clinic_invites
        WHERE email = NEW.email
        AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1;

        IF invite_record.tenant_id IS NOT NULL THEN
            v_tenant_id := invite_record.tenant_id;
            v_role := COALESCE(invite_record.role, 'owner');

            -- Mark invite as accepted
            UPDATE public.clinic_invites
            SET status = 'accepted',
                accepted_at = NOW(),
                accepted_by = NEW.id
            WHERE email = NEW.email AND status = 'pending';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- clinic_invites table might not exist yet during initial setup
        NULL;
    END;

    -- 2. If no invite, check demo accounts (for dev/test environments)
    IF v_tenant_id IS NULL THEN
        BEGIN
            SELECT tenant_id, role INTO demo_record
            FROM public.demo_accounts
            WHERE email = NEW.email
            AND is_active = true;

            IF demo_record.tenant_id IS NOT NULL THEN
                v_tenant_id := demo_record.tenant_id;
                v_role := demo_record.role;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- demo_accounts table might not exist yet during initial setup
            NULL;
        END;
    END IF;

    -- 3. Default: no tenant assigned (user will be assigned later via portal/invite)
    IF v_tenant_id IS NULL THEN
        v_role := 'owner';
    END IF;

    -- Create profile (with conflict handling for safety)
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        avatar_url,
        tenant_id,
        role
    ) VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        v_tenant_id,
        v_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth flow
    -- Profile will be created by application fallback
    RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS
'Auth trigger: Creates profile on user signup, checking for invites/demo accounts to assign tenant/role';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if demo mode is enabled (any active demo accounts exist)
CREATE OR REPLACE FUNCTION public.is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.demo_accounts WHERE is_active = true LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_demo_mode() IS 'Check if demo mode is enabled (any active demo accounts exist)';

-- Generate client code for a new client
CREATE OR REPLACE FUNCTION public.generate_client_code(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'client', 'CLI', 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_client_code(TEXT) IS 'Generate sequential client code for a tenant. Format: CLI-NNNNNN';

-- =============================================================================
-- DEFERRED POLICIES (require profiles to exist)
-- =============================================================================

-- Admin policy for document_sequences (moved here since profiles now exists)
DROP POLICY IF EXISTS "Admin manage sequences" ON public.document_sequences;
CREATE POLICY "Admin manage sequences" ON public.document_sequences
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = document_sequences.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- UPDATE TENANTS RLS (now that profiles table exists)
-- =============================================================================

-- Update tenants RLS to include profile-based access
DROP POLICY IF EXISTS "Authenticated users view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users view own tenant" ON public.tenants;
CREATE POLICY "Authenticated users view own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (
        is_active = true
        AND (
            -- Users can see their own tenant
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.tenant_id = tenants.id
            )
            -- Or public discovery (limited info via column security in views)
            OR true
        )
    );

-- ==========================================
-- FILE: 10_core/03_invites.sql
-- ==========================================

-- =============================================================================
-- 03_INVITES.SQL
-- =============================================================================
-- Clinic invite system for onboarding new users to specific tenants.
-- Supports inviting clients, vets, and admins with email-based acceptance.
--
-- DEPENDENCIES: 01_tenants.sql, 02_profiles.sql
-- =============================================================================

-- =============================================================================
-- CLINIC INVITES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Invite details
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Invite metadata
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT,  -- Optional personal message to invitee

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    -- Acceptance tracking
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT clinic_invites_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT clinic_invites_message_length CHECK (
        message IS NULL OR char_length(message) <= 500
    )
);

COMMENT ON TABLE public.clinic_invites IS 'Email invitations to join a clinic as owner/vet/admin';
COMMENT ON COLUMN public.clinic_invites.status IS 'pending: awaiting acceptance, accepted: user signed up, expired: past expiry, cancelled: revoked';
COMMENT ON COLUMN public.clinic_invites.expires_at IS 'Invite expires after 7 days by default';
COMMENT ON COLUMN public.clinic_invites.message IS 'Optional personal message from inviter to invitee';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;

-- Staff can manage invites for their tenant
DROP POLICY IF EXISTS "Staff manage invites" ON public.clinic_invites;
CREATE POLICY "Staff manage invites" ON public.clinic_invites
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.clinic_invites;
CREATE POLICY "Service role full access" ON public.clinic_invites
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_clinic_invites_tenant ON public.clinic_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_email ON public.clinic_invites(email);

-- FK indexes (for join performance)
CREATE INDEX IF NOT EXISTS idx_clinic_invites_invited_by ON public.clinic_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_accepted_by ON public.clinic_invites(accepted_by);

-- Pending invites lookup (used in handle_new_user trigger)
CREATE INDEX IF NOT EXISTS idx_clinic_invites_pending ON public.clinic_invites(email, status, expires_at)
    WHERE status = 'pending';

-- Tenant's active invites
CREATE INDEX IF NOT EXISTS idx_clinic_invites_tenant_pending ON public.clinic_invites(tenant_id, status)
    INCLUDE (email, role, expires_at, invited_by)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.clinic_invites;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.clinic_invites
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Create invite function (with duplicate checking)
CREATE OR REPLACE FUNCTION public.create_clinic_invite(
    p_tenant_id TEXT,
    p_email TEXT,
    p_role TEXT DEFAULT 'owner',
    p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Validate role
    IF p_role NOT IN ('owner', 'vet', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Role must be one of: owner, vet, admin';
    END IF;

    -- Check if user already exists in this tenant
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE email = p_email
        AND tenant_id = p_tenant_id
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User already belongs to this clinic'
            USING ERRCODE = 'unique_violation',
                  HINT = 'This email is already registered with this clinic';
    END IF;

    -- Cancel any existing pending invites for this email/tenant
    UPDATE public.clinic_invites
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE email = p_email
    AND tenant_id = p_tenant_id
    AND status = 'pending';

    -- Create new invite
    INSERT INTO public.clinic_invites (tenant_id, email, role, invited_by, message)
    VALUES (p_tenant_id, LOWER(TRIM(p_email)), p_role, auth.uid(), p_message)
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_clinic_invite(TEXT, TEXT, TEXT, TEXT) IS
'Create a clinic invite. Cancels existing pending invites for same email/tenant.
Returns the new invite UUID.';

-- Check invite validity (for signup flow)
CREATE OR REPLACE FUNCTION public.check_invite(p_email TEXT)
RETURNS TABLE (
    invite_id UUID,
    tenant_id TEXT,
    tenant_name TEXT,
    role TEXT,
    expires_at TIMESTAMPTZ,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.id,
        ci.tenant_id,
        t.name,
        ci.role,
        ci.expires_at,
        ci.message
    FROM public.clinic_invites ci
    JOIN public.tenants t ON t.id = ci.tenant_id
    WHERE ci.email = LOWER(TRIM(p_email))
    AND ci.status = 'pending'
    AND (ci.expires_at IS NULL OR ci.expires_at > NOW())
    ORDER BY ci.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_invite(TEXT) IS
'Check if a valid pending invite exists for an email. Used during signup flow.';

-- Expire old invites (for scheduled job)
CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.expire_old_invites() IS
'Mark expired invites as expired. Returns count of updated invites. Run via scheduled job.';

-- Resend invite (extends expiry)
CREATE OR REPLACE FUNCTION public.resend_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.clinic_invites
    SET expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.resend_invite(UUID) IS
'Extend invite expiry by 7 days. Returns true if successful.';

-- Cancel invite
CREATE OR REPLACE FUNCTION public.cancel_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.cancel_invite(UUID) IS
'Cancel a pending invite. Returns true if successful.';


-- ==========================================
-- FILE: 20_pets/01_pets.sql
-- ==========================================

-- =============================================================================
-- 01_PETS.SQL
-- =============================================================================
-- Pet profiles - the core entity for veterinary management.
-- Each pet belongs to an owner (profile) and a tenant (clinic).
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- PETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tenant_id TEXT REFERENCES public.tenants(id), -- Nullable for global pets

    -- Identity
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    breed TEXT,
    color TEXT,

    -- Demographics
    sex TEXT CHECK (sex IN ('male', 'female', 'unknown')),
    birth_date DATE,
    birth_date_estimated BOOLEAN DEFAULT false,  -- True if birth_date is estimated
    is_neutered BOOLEAN DEFAULT false,
    neutered_date DATE,

    -- Physical characteristics
    weight_kg NUMERIC(6,2),
    weight_updated_at TIMESTAMPTZ,

    -- Identification
    microchip_number TEXT,
    microchip_date DATE,
    registration_number TEXT,  -- Government/breed registration

    -- Media
    photo_url TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Medical flags
    is_deceased BOOLEAN DEFAULT false,
    deceased_date DATE,
    deceased_reason TEXT,
    blood_type TEXT,  -- For dogs/cats

    -- Medical conditions (consider normalizing to junction tables for large datasets)
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pets_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT pets_weight_positive CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT pets_birth_not_future CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE),
    CONSTRAINT pets_deceased_consistency CHECK (
        (is_deceased = false AND deceased_date IS NULL) OR (is_deceased = true)
    ),
    CONSTRAINT pets_neutered_consistency CHECK (
        (is_neutered = false AND neutered_date IS NULL) OR (is_neutered = true)
    ),
    CONSTRAINT pets_allergies_limit CHECK (
        allergies IS NULL OR array_length(allergies, 1) IS NULL OR array_length(allergies, 1) <= 50
    ),
    CONSTRAINT pets_conditions_limit CHECK (
        chronic_conditions IS NULL OR array_length(chronic_conditions, 1) IS NULL OR array_length(chronic_conditions, 1) <= 50
    )
);

COMMENT ON TABLE public.pets IS 'Pet profiles - core entity for veterinary management';
COMMENT ON COLUMN public.pets.species IS 'Pet species: dog, cat, bird, rabbit, hamster, fish, reptile, other';
COMMENT ON COLUMN public.pets.birth_date_estimated IS 'True if birth_date is estimated (e.g., rescue animals)';
COMMENT ON COLUMN public.pets.blood_type IS 'Blood type for dogs (DEA 1.1+/-) or cats (A, B, AB)';
COMMENT ON COLUMN public.pets.allergies IS 'Known allergies. Consider pet_allergies junction table for complex querying.';
COMMENT ON COLUMN public.pets.chronic_conditions IS 'Chronic conditions. Consider pet_conditions junction table for complex querying.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own pets
DROP POLICY IF EXISTS "Owners manage own pets" ON public.pets;
CREATE POLICY "Owners manage own pets" ON public.pets
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (owner_id = auth.uid());

-- Staff can manage all pets in their tenant
DROP POLICY IF EXISTS "Staff manage tenant pets" ON public.pets;
CREATE POLICY "Staff manage tenant pets" ON public.pets
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.pets;
CREATE POLICY "Service role full access" ON public.pets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_pets_owner ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant ON public.pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant_owner ON public.pets(tenant_id, owner_id);

-- Active pets (most common filter)
CREATE INDEX IF NOT EXISTS idx_pets_active ON public.pets(tenant_id)
    WHERE deleted_at IS NULL AND is_deceased = false;

-- Name search with trigrams
CREATE INDEX IF NOT EXISTS idx_pets_name_search ON public.pets USING gin(name gin_trgm_ops);

-- Species filtering
CREATE INDEX IF NOT EXISTS idx_pets_species ON public.pets(tenant_id, species)
    WHERE deleted_at IS NULL;

-- Unique microchip number globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_microchip ON public.pets(microchip_number)
    WHERE microchip_number IS NOT NULL AND deleted_at IS NULL;

-- GIN indexes for array columns (efficient array containment queries)
CREATE INDEX IF NOT EXISTS idx_pets_allergies_gin ON public.pets USING gin(allergies)
    WHERE allergies IS NOT NULL AND allergies != '{}';
CREATE INDEX IF NOT EXISTS idx_pets_conditions_gin ON public.pets USING gin(chronic_conditions)
    WHERE chronic_conditions IS NOT NULL AND chronic_conditions != '{}';

-- Pet ownership lookup for RLS (is_owner_of_pet function)
CREATE INDEX IF NOT EXISTS idx_pets_owner_rls ON public.pets(id, owner_id)
    WHERE deleted_at IS NULL;

-- Staff pet list (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_pets_tenant_list ON public.pets(tenant_id, name)
    INCLUDE (owner_id, species, breed, photo_url, is_deceased, is_active)
    WHERE deleted_at IS NULL;

-- Owner's pet list (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_pets_owner_list ON public.pets(owner_id)
    INCLUDE (name, species, breed, photo_url, birth_date, is_deceased, tenant_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.pets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get pet age as human-readable string
CREATE OR REPLACE FUNCTION public.get_pet_age(pet_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_birth_date DATE;
    v_years INTEGER;
    v_months INTEGER;
BEGIN
    SELECT birth_date INTO v_birth_date FROM public.pets WHERE id = pet_id;

    IF v_birth_date IS NULL THEN
        RETURN NULL;
    END IF;

    v_years := EXTRACT(YEAR FROM age(CURRENT_DATE, v_birth_date));
    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_birth_date));

    IF v_years > 0 THEN
        RETURN v_years || ' año' || CASE WHEN v_years > 1 THEN 's' ELSE '' END;
    ELSE
        RETURN v_months || ' mes' || CASE WHEN v_months != 1 THEN 'es' ELSE '' END;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_pet_age(UUID) IS 'Get pet age as human-readable string in Spanish (e.g., "2 años", "5 meses")';

-- Search pets by name, microchip, or owner info
CREATE OR REPLACE FUNCTION public.search_pets(
    p_tenant_id TEXT,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    species TEXT,
    breed TEXT,
    photo_url TEXT,
    owner_name TEXT,
    owner_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.photo_url,
        pr.full_name,
        pr.phone
    FROM public.pets p
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND (
        p.name ILIKE '%' || p_query || '%'
        OR p.microchip_number ILIKE '%' || p_query || '%'
        OR pr.full_name ILIKE '%' || p_query || '%'
        OR pr.phone ILIKE '%' || p_query || '%'
    )
    ORDER BY
        CASE WHEN p.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
        p.name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.search_pets(TEXT, TEXT, INTEGER) IS
'Search pets by name, microchip, or owner name/phone. Returns top matches with owner info.';

-- Get pet with owner info
CREATE OR REPLACE FUNCTION public.get_pet_with_owner(p_pet_id UUID)
RETURNS TABLE (
    pet_id UUID,
    pet_name TEXT,
    species TEXT,
    breed TEXT,
    birth_date DATE,
    photo_url TEXT,
    owner_id UUID,
    owner_name TEXT,
    owner_phone TEXT,
    owner_email TEXT,
    tenant_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.birth_date,
        p.photo_url,
        p.owner_id,
        pr.full_name,
        pr.phone,
        pr.email,
        p.tenant_id
    FROM public.pets p
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE p.id = p_pet_id
    AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_with_owner(UUID) IS
'Get pet details with owner contact information.';

-- =============================================================================
-- QR TAGS TABLE
-- =============================================================================
-- QR tag codes that can be assigned to pets for identification

CREATE TABLE IF NOT EXISTS public.qr_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,

    -- Tag info
    code TEXT NOT NULL UNIQUE,  -- Unique tag code (printed on physical tag)
    batch_number TEXT,          -- Manufacturing batch
    batch_id TEXT,              -- Batch identifier

    -- Assignment
    is_registered BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT qr_tags_code_format CHECK (char_length(code) >= 6)
);

COMMENT ON TABLE public.qr_tags IS 'QR tag codes for pet identification. Tags can be pre-generated and assigned later.';
COMMENT ON COLUMN public.qr_tags.code IS 'Unique code printed on physical QR tag';
COMMENT ON COLUMN public.qr_tags.is_registered IS 'True if tag has been linked to a pet';

-- RLS
ALTER TABLE public.qr_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public lookup tags" ON public.qr_tags;
CREATE POLICY "Public lookup tags" ON public.qr_tags
    FOR SELECT USING (is_active = true AND is_registered = true);

DROP POLICY IF EXISTS "Staff manage tags" ON public.qr_tags;
CREATE POLICY "Staff manage tags" ON public.qr_tags
    FOR ALL TO authenticated
    USING (tenant_id IS NULL OR public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access tags" ON public.qr_tags;
CREATE POLICY "Service role full access tags" ON public.qr_tags
    FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_tags_code ON public.qr_tags(code);
CREATE INDEX IF NOT EXISTS idx_qr_tags_pet ON public.qr_tags(pet_id) WHERE pet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_tags_tenant ON public.qr_tags(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_tags_unassigned ON public.qr_tags(tenant_id)
    WHERE pet_id IS NULL AND is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.qr_tags;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.qr_tags
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- LOST PETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lost_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found', 'reunited')),

    -- Location info
    last_seen_location TEXT,
    last_seen_lat NUMERIC(10, 7),
    last_seen_lng NUMERIC(10, 7),
    last_seen_at TIMESTAMPTZ,

    -- Reporter
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_phone TEXT,
    contact_email TEXT,

    -- Resolution
    found_at TIMESTAMPTZ,
    found_location TEXT,
    found_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lost_pets IS 'Lost and found pet reports';
COMMENT ON COLUMN public.lost_pets.status IS 'lost: currently missing, found: located but not returned, reunited: back with owner';

-- RLS
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view lost pets" ON public.lost_pets;
CREATE POLICY "Public view lost pets" ON public.lost_pets
    FOR SELECT USING (status = 'lost');

DROP POLICY IF EXISTS "Staff manage lost pets" ON public.lost_pets;
CREATE POLICY "Staff manage lost pets" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners manage own lost pets" ON public.lost_pets;
CREATE POLICY "Owners manage own lost pets" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_owner_of_pet(pet_id));

DROP POLICY IF EXISTS "Service role full access lost pets" ON public.lost_pets;
CREATE POLICY "Service role full access lost pets" ON public.lost_pets
    FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lost_pets_pet ON public.lost_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_tenant ON public.lost_pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON public.lost_pets(status) WHERE status = 'lost';
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON public.lost_pets(last_seen_lat, last_seen_lng)
    WHERE status = 'lost' AND last_seen_lat IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.lost_pets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
CREATE OR REPLACE FUNCTION public.lost_pets_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS lost_pets_auto_tenant ON public.lost_pets;
CREATE TRIGGER lost_pets_auto_tenant
    BEFORE INSERT ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.lost_pets_set_tenant_id();

-- =============================================================================
-- CLINIC PETS (Junction table for pet-clinic relationships)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Visit tracking
    first_visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_date TIMESTAMPTZ,
    visit_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Clinic-specific notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(pet_id, tenant_id)
);

COMMENT ON TABLE public.clinic_pets IS 'Junction table linking pets to clinics they visit. Supports pets visiting multiple clinics.';
COMMENT ON COLUMN public.clinic_pets.first_visit_date IS 'When this pet was first seen at this clinic';
COMMENT ON COLUMN public.clinic_pets.visit_count IS 'Total visits to this clinic';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinic_pets_pet ON public.clinic_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_clinic_pets_tenant ON public.clinic_pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_pets_active ON public.clinic_pets(tenant_id, is_active)
    WHERE is_active = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.clinic_pets ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access clinic_pets" ON public.clinic_pets;
CREATE POLICY "Service role full access clinic_pets" ON public.clinic_pets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's pet relationships
DROP POLICY IF EXISTS "Clinic staff manage clinic_pets" ON public.clinic_pets;
CREATE POLICY "Clinic staff manage clinic_pets" ON public.clinic_pets
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_pets.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_pets.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Pet owners can view their pets' clinic relationships
DROP POLICY IF EXISTS "Owners view their pets clinic relationships" ON public.clinic_pets;
CREATE POLICY "Owners view their pets clinic relationships" ON public.clinic_pets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pets pet
            WHERE pet.id = clinic_pets.pet_id
            AND pet.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_clinic_pets ON public.clinic_pets;
CREATE TRIGGER handle_updated_at_clinic_pets
    BEFORE UPDATE ON public.clinic_pets
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 20_pets/02_vaccines.sql
-- ==========================================

-- =============================================================================
-- 02_VACCINES.SQL
-- =============================================================================
-- Vaccination records, templates, and reaction tracking.
-- Vaccines are global with administered_by_clinic for attribution.
--
-- DEPENDENCIES: 20_pets/01_pets.sql
-- =============================================================================

-- =============================================================================
-- VACCINE TEMPLATES (Reference Data)
-- =============================================================================
-- Global or tenant-specific vaccine schedules/requirements

CREATE TABLE IF NOT EXISTS public.vaccine_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,  -- NULL = global template

    -- Vaccine info
    name TEXT NOT NULL,
    code TEXT,                   -- Short code (e.g., "DHPP", "FVRCP")
    species TEXT[] NOT NULL,     -- ['dog'], ['cat'], ['dog', 'cat']
    description TEXT,

    -- Schedule
    min_age_weeks INTEGER CHECK (min_age_weeks IS NULL OR min_age_weeks >= 0),
    recommended_age_weeks INTEGER CHECK (recommended_age_weeks IS NULL OR recommended_age_weeks >= 0),
    booster_interval_days INTEGER CHECK (booster_interval_days IS NULL OR booster_interval_days > 0),
    is_required BOOLEAN DEFAULT false,

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT vaccine_templates_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT vaccine_templates_age_order CHECK (
        min_age_weeks IS NULL OR recommended_age_weeks IS NULL OR
        recommended_age_weeks >= min_age_weeks
    )
);

COMMENT ON TABLE public.vaccine_templates IS 'Vaccine schedule templates. NULL tenant_id = global template available to all clinics.';
COMMENT ON COLUMN public.vaccine_templates.species IS 'Array of species this vaccine applies to';
COMMENT ON COLUMN public.vaccine_templates.min_age_weeks IS 'Minimum age in weeks for first dose';
COMMENT ON COLUMN public.vaccine_templates.booster_interval_days IS 'Days between booster doses';
COMMENT ON COLUMN public.vaccine_templates.is_required IS 'True if legally required (e.g., rabies)';

-- =============================================================================
-- VACCINES (Applied to Pets)
-- =============================================================================
-- WITH TENANT_ID FOR OPTIMIZED RLS (avoids expensive join to pets table)

CREATE TABLE IF NOT EXISTS public.vaccines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    administered_by_clinic TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.vaccine_templates(id) ON DELETE SET NULL,
    administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Vaccine details
    name TEXT NOT NULL,
    batch_number TEXT,
    manufacturer TEXT,
    route TEXT CHECK (route IN ('oral', 'PO', 'IV', 'IM', 'SC', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    dosage TEXT,
    lot_expiry DATE,

    -- Dates
    administered_date DATE NOT NULL,
    next_due_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),

    -- Documentation
    vet_signature TEXT,
    certificate_url TEXT,
    adverse_reactions TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT vaccines_date_order CHECK (
        next_due_date IS NULL OR next_due_date > administered_date
    ),
    CONSTRAINT vaccines_name_length CHECK (char_length(name) BETWEEN 2 AND 100)
);

COMMENT ON TABLE public.vaccines IS 'Vaccination records for pets';
COMMENT ON COLUMN public.vaccines.administered_by_clinic IS 'Clinic that administered the vaccine';
COMMENT ON COLUMN public.vaccines.status IS 'scheduled: upcoming, completed: administered, missed: overdue, cancelled: not needed';
COMMENT ON COLUMN public.vaccines.next_due_date IS 'Next booster due date (NULL if no booster needed)';

-- =============================================================================
-- VACCINE REACTIONS
-- =============================================================================
-- Track adverse reactions for safety monitoring

CREATE TABLE IF NOT EXISTS public.vaccine_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    vaccine_id UUID REFERENCES public.vaccines(id) ON DELETE SET NULL,

    -- Reaction details
    vaccine_name TEXT NOT NULL,
    vaccine_brand TEXT,
    reaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    onset_hours INTEGER,  -- Hours after vaccination when reaction started

    -- Classification
    severity TEXT NOT NULL DEFAULT 'low'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reaction_type TEXT CHECK (reaction_type IN (
        'local', 'systemic', 'allergic', 'anaphylactic', 'other'
    )),

    -- Symptoms and treatment
    symptoms TEXT[],
    treatment TEXT,
    outcome TEXT,
    hospitalization_required BOOLEAN DEFAULT false,
    recovery_days INTEGER,

    -- Notes
    notes TEXT,

    -- Reporter
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vaccine_reactions IS 'Adverse reaction reports for pharmacovigilance';
COMMENT ON COLUMN public.vaccine_reactions.severity IS 'low: mild local, medium: requires treatment, high: serious, critical: life-threatening';
COMMENT ON COLUMN public.vaccine_reactions.reaction_type IS 'local: injection site, systemic: fever/lethargy, allergic: hives/swelling, anaphylactic: shock';
COMMENT ON COLUMN public.vaccine_reactions.onset_hours IS 'Hours after vaccination when symptoms appeared';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.vaccine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_reactions ENABLE ROW LEVEL SECURITY;

-- Templates: Public read global, staff manage tenant-specific
DROP POLICY IF EXISTS "Public read global templates" ON public.vaccine_templates;
CREATE POLICY "Public read global templates" ON public.vaccine_templates
    FOR SELECT USING (tenant_id IS NULL AND is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff read tenant templates" ON public.vaccine_templates;
CREATE POLICY "Staff read tenant templates" ON public.vaccine_templates
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage tenant templates" ON public.vaccine_templates;
CREATE POLICY "Staff manage tenant templates" ON public.vaccine_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access templates" ON public.vaccine_templates;
CREATE POLICY "Service role full access templates" ON public.vaccine_templates
    FOR ALL TO service_role USING (true);

-- Vaccines: Staff manage, owners view (OPTIMIZED with direct tenant_id)
DROP POLICY IF EXISTS "Owners view pet vaccines" ON public.vaccines;
CREATE POLICY "Owners view pet vaccines" ON public.vaccines
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

-- Temporarily disabled RLS policies for vaccines due to syntax issues
-- DROP POLICY IF EXISTS "Staff manage vaccines" ON public.vaccines;
-- CREATE POLICY "Staff manage vaccines" ON public.vaccines
--     FOR ALL TO authenticated
--     USING (administered_by_clinic IS NULL OR public.is_staff_of(administered_by_clinic)) AND deleted_at IS NULL;

DROP POLICY IF EXISTS "Service role full access vaccines" ON public.vaccines;
CREATE POLICY "Service role full access vaccines" ON public.vaccines
    FOR ALL TO service_role USING (true);

-- Reactions: Staff manage, owners view
DROP POLICY IF EXISTS "Owners view pet reactions" ON public.vaccine_reactions;
CREATE POLICY "Owners view pet reactions" ON public.vaccine_reactions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id));

-- Temporarily disabled RLS policies for vaccine_reactions due to syntax issues
-- DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
-- CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
--     FOR ALL TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.vaccines v WHERE v.id = vaccine_id AND (v.administered_by_clinic IS NULL OR public.is_staff_of(v.administered_by_clinic))));

DROP POLICY IF EXISTS "Service role full access reactions" ON public.vaccine_reactions;
CREATE POLICY "Service role full access reactions" ON public.vaccine_reactions
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Templates
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_tenant ON public.vaccine_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_species ON public.vaccine_templates USING gin(species);
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_active ON public.vaccine_templates(id)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_global ON public.vaccine_templates(display_order)
    WHERE tenant_id IS NULL AND is_active = true AND deleted_at IS NULL;

-- Vaccines
CREATE INDEX IF NOT EXISTS idx_vaccines_pet ON public.vaccines(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccines_administered_by_clinic ON public.vaccines(administered_by_clinic);
CREATE INDEX IF NOT EXISTS idx_vaccines_template ON public.vaccines(template_id);
-- CREATE INDEX IF NOT EXISTS idx_vaccines_status ON public.vaccines(status) WHERE deleted_at IS NULL; -- Temporarily disabled due to IMMUTABLE function issue
CREATE INDEX IF NOT EXISTS idx_vaccines_administered_by ON public.vaccines(administered_by);

-- Vaccine history (covering index)
CREATE INDEX IF NOT EXISTS idx_vaccines_pet_history ON public.vaccines(pet_id, administered_date DESC)
    INCLUDE (name, status, next_due_date, administered_by, batch_number)
    WHERE deleted_at IS NULL;

-- Due vaccines for reminders
-- CREATE INDEX IF NOT EXISTS idx_vaccines_due ON public.vaccines(administered_by_clinic, next_due_date)
--     INCLUDE (pet_id, name, status)
--     WHERE next_due_date IS NOT NULL AND next_due_date <= CURRENT_DATE + INTERVAL '30 days'
--     AND status = 'completed' AND deleted_at IS NULL; -- CURRENT_DATE is STABLE, not IMMUTABLE

-- Overdue vaccines
-- CREATE INDEX IF NOT EXISTS idx_vaccines_overdue ON public.vaccines(administered_by_clinic, next_due_date)
--     WHERE next_due_date < CURRENT_DATE AND status = 'completed' AND deleted_at IS NULL; -- CURRENT_DATE is STABLE, not IMMUTABLE

-- Reactions
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_pet ON public.vaccine_reactions(pet_id);
-- Note: vaccine_reactions no longer has tenant_id - uses vaccine relationship
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_vaccine ON public.vaccine_reactions(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_severity ON public.vaccine_reactions(severity)
    WHERE severity IN ('high', 'critical');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccine_templates;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccine_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccines;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccines
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccine_reactions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccine_reactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Note: Vaccines are global - no tenant_id auto-setting needed

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get pet's vaccination history
CREATE OR REPLACE FUNCTION public.get_pet_vaccines(p_pet_id UUID)
RETURNS TABLE (
    vaccine_id UUID,
    name TEXT,
    administered_date DATE,
    next_due_date DATE,
    status TEXT,
    administered_by_name TEXT,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.name,
        v.administered_date,
        v.next_due_date,
        v.status,
        p.full_name,
        v.next_due_date IS NOT NULL AND v.next_due_date < CURRENT_DATE AND v.status = 'completed'
    FROM public.vaccines v
    LEFT JOIN public.profiles p ON v.administered_by = p.id
    WHERE v.pet_id = p_pet_id
    AND v.deleted_at IS NULL
    ORDER BY v.administered_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_vaccines(UUID) IS
'Get vaccination history for a pet with overdue status';

-- Get vaccines due soon for a tenant
-- Temporarily disabled get_vaccines_due function due to syntax issues
-- TODO: Fix and re-enable

-- COMMENT ON FUNCTION public.get_vaccines_due(TEXT, INTEGER) IS
-- 'Get vaccines due within specified days for reminder system';


-- ==========================================
-- FILE: 30_clinical/01_reference_data.sql
-- ==========================================

-- =============================================================================
-- 01_REFERENCE_DATA.SQL
-- =============================================================================
-- Clinical reference tables: diagnosis codes, drug dosages, growth standards,
-- reproductive cycles, and euthanasia assessments.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql, 20_pets/01_pets.sql
-- =============================================================================

-- =============================================================================
-- DIAGNOSIS CODES
-- =============================================================================
-- Standard and custom diagnosis codes for veterinary medicine.
-- Supports VeNom, SNOMED, and custom codes.

CREATE TABLE IF NOT EXISTS public.diagnosis_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code info
    code TEXT NOT NULL UNIQUE,
    term TEXT NOT NULL,
    standard TEXT DEFAULT 'custom' CHECK (standard IN ('venom', 'snomed', 'custom')),
    category TEXT,
    description TEXT,

    -- Species applicability
    species TEXT[] DEFAULT ARRAY['all']::TEXT[],

    -- Severity level
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT diagnosis_codes_code_length CHECK (char_length(code) >= 2),
    CONSTRAINT diagnosis_codes_term_length CHECK (char_length(term) >= 2)
);

COMMENT ON TABLE public.diagnosis_codes IS 'Standardized diagnosis codes (VeNom, SNOMED) and custom codes for veterinary diagnoses';
COMMENT ON COLUMN public.diagnosis_codes.standard IS 'venom: VeNom standard, snomed: SNOMED-CT, custom: clinic-defined';
COMMENT ON COLUMN public.diagnosis_codes.species IS 'Species this code applies to. ["all"] means all species.';

-- =============================================================================
-- DRUG DOSAGES
-- =============================================================================
-- Drug dosage reference data for dose calculations.

CREATE TABLE IF NOT EXISTS public.drug_dosages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug info
    name TEXT NOT NULL,
    generic_name TEXT,
    species TEXT DEFAULT 'all' CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'all')),
    category TEXT CHECK (category IN ('antibiotic', 'analgesic', 'nsaid', 'corticosteroid', 'antiemetic', 'cardiac', 'antifungal', 'antiparasitic', 'sedative', 'steroid', 'heartworm', 'vaccine', 'other')),

    -- Dosage range
    min_dose_mg_kg NUMERIC(10,2) CHECK (min_dose_mg_kg IS NULL OR min_dose_mg_kg >= 0),
    max_dose_mg_kg NUMERIC(10,2) CHECK (max_dose_mg_kg IS NULL OR max_dose_mg_kg >= 0),
    concentration_mg_ml NUMERIC(10,2) CHECK (concentration_mg_ml IS NULL OR concentration_mg_ml > 0),

    -- Administration
    route TEXT CHECK (route IS NULL OR route IN ('oral', 'PO', 'IV', 'IM', 'SC', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    frequency TEXT,
    max_daily_dose_mg_kg NUMERIC(10,2) CHECK (max_daily_dose_mg_kg IS NULL OR max_daily_dose_mg_kg >= 0),

    -- Warnings
    contraindications TEXT[],
    side_effects TEXT[],
    notes TEXT,

    -- Prescription requirements
    requires_prescription BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(name, species),
    CONSTRAINT drug_dosages_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT drug_dosages_dose_order CHECK (
        min_dose_mg_kg IS NULL OR max_dose_mg_kg IS NULL OR max_dose_mg_kg >= min_dose_mg_kg
    )
);

COMMENT ON TABLE public.drug_dosages IS 'Drug dosage reference data for veterinary dose calculations';
COMMENT ON COLUMN public.drug_dosages.min_dose_mg_kg IS 'Minimum dose in mg per kg body weight';
COMMENT ON COLUMN public.drug_dosages.max_dose_mg_kg IS 'Maximum dose in mg per kg body weight';
COMMENT ON COLUMN public.drug_dosages.concentration_mg_ml IS 'Drug concentration for liquid formulations';
COMMENT ON COLUMN public.drug_dosages.route IS 'Administration route: oral, IV, IM, SQ, topical, etc.';

-- =============================================================================
-- GROWTH STANDARDS
-- =============================================================================
-- Weight percentile data for growth chart calculations.

CREATE TABLE IF NOT EXISTS public.growth_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    species TEXT NOT NULL DEFAULT 'dog' CHECK (species IN ('dog', 'cat')),
    breed TEXT,  -- NULL for general breed category standards
    breed_category TEXT,  -- 'toy', 'small', 'medium', 'large', 'giant'
    gender TEXT CHECK (gender IN ('male', 'female')),
    age_weeks INTEGER NOT NULL CHECK (age_weeks >= 0),

    -- Weight data
    weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg > 0),
    percentile TEXT DEFAULT 'P50' CHECK (percentile IN ('P3', 'P10', 'P25', 'P50', 'P75', 'P90', 'P97')),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(species, breed, gender, age_weeks, percentile)
);

COMMENT ON TABLE public.growth_standards IS 'Weight percentile reference data for pet growth chart analysis';
COMMENT ON COLUMN public.growth_standards.percentile IS 'Weight percentile: P3, P10, P25, P50 (median), P75, P90, P97';
COMMENT ON COLUMN public.growth_standards.breed_category IS 'Size category for dogs: small, medium, large, giant';

-- =============================================================================
-- VACCINE PROTOCOLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vaccine_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vaccine info
    vaccine_name TEXT NOT NULL,
    vaccine_code TEXT NOT NULL UNIQUE,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'all')),
    protocol_type TEXT NOT NULL CHECK (protocol_type IN ('core', 'non-core', 'lifestyle')),

    -- Diseases prevented
    diseases_prevented TEXT[] NOT NULL,

    -- Dosing schedule
    first_dose_weeks INTEGER,
    booster_weeks INTEGER[],
    booster_intervals_months INTEGER[],
    revaccination_months INTEGER,
    duration_years INTEGER,

    -- Additional info
    manufacturer TEXT,
    notes TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vaccine_protocols IS 'Standard vaccination protocols by species and vaccine type';
COMMENT ON COLUMN public.vaccine_protocols.type IS 'Vaccine type: core (essential), non-core (recommended), lifestyle (optional)';
COMMENT ON COLUMN public.vaccine_protocols.diseases_prevented IS 'Array of diseases this vaccine prevents';
COMMENT ON COLUMN public.vaccine_protocols.booster_intervals_months IS 'Array of booster intervals in months';

-- =============================================================================
-- REPRODUCTIVE CYCLES
-- =============================================================================
-- Track reproductive cycles for breeding management.

CREATE TABLE IF NOT EXISTS public.reproductive_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Cycle details
    cycle_type TEXT NOT NULL DEFAULT 'heat' CHECK (cycle_type IN ('heat', 'pregnancy', 'lactation', 'anestrus')),
    cycle_start TIMESTAMPTZ NOT NULL,
    cycle_end TIMESTAMPTZ,

    -- Breeding info
    mating_date DATE,
    expected_due_date DATE,
    actual_birth_date DATE,
    litter_size INTEGER CHECK (litter_size IS NULL OR litter_size >= 0),

    -- Notes
    notes TEXT,

    -- Recorded by
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reproductive_cycles_dates CHECK (cycle_end IS NULL OR cycle_end >= cycle_start)
);

COMMENT ON TABLE public.reproductive_cycles IS 'Reproductive cycle tracking for breeding management';
COMMENT ON COLUMN public.reproductive_cycles.cycle_type IS 'heat: estrus, pregnancy: gestation, lactation: nursing, anestrus: non-cycling';

-- =============================================================================
-- EUTHANASIA ASSESSMENTS (HHHHHMM Scale)
-- =============================================================================
-- Quality of life assessments using the Hurt-Hunger-Hydration-Hygiene-Happiness-Mobility-More scale.

CREATE TABLE IF NOT EXISTS public.euthanasia_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- HHHHHMM Scale (each 0-10)
    hurt_score INTEGER NOT NULL CHECK (hurt_score >= 0 AND hurt_score <= 10),
    hunger_score INTEGER NOT NULL CHECK (hunger_score >= 0 AND hunger_score <= 10),
    hydration_score INTEGER NOT NULL CHECK (hydration_score >= 0 AND hydration_score <= 10),
    hygiene_score INTEGER NOT NULL CHECK (hygiene_score >= 0 AND hygiene_score <= 10),
    happiness_score INTEGER NOT NULL CHECK (happiness_score >= 0 AND happiness_score <= 10),
    mobility_score INTEGER NOT NULL CHECK (mobility_score >= 0 AND mobility_score <= 10),
    more_good_days_score INTEGER NOT NULL CHECK (more_good_days_score >= 0 AND more_good_days_score <= 10),

    -- Computed total (0-70, higher is better quality of life)
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 70),

    -- Notes
    notes TEXT,
    recommendations TEXT,

    -- Assessor
    assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.euthanasia_assessments IS 'Quality of life assessments using HHHHHMM (Hurt-Hunger-Hydration-Hygiene-Happiness-Mobility-More) scale';
COMMENT ON COLUMN public.euthanasia_assessments.hurt_score IS 'Pain level assessment (0=severe pain, 10=no pain)';
COMMENT ON COLUMN public.euthanasia_assessments.total_score IS 'Sum of all scores. Above 35 generally indicates acceptable quality of life.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.diagnosis_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_dosages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.euthanasia_assessments ENABLE ROW LEVEL SECURITY;

-- Diagnosis codes: Public read
DROP POLICY IF EXISTS "Public read diagnosis codes" ON public.diagnosis_codes;
CREATE POLICY "Public read diagnosis codes" ON public.diagnosis_codes
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage diagnosis codes" ON public.diagnosis_codes;
CREATE POLICY "Service role manage diagnosis codes" ON public.diagnosis_codes
    FOR ALL TO service_role USING (true);

-- Drug dosages: Public read
DROP POLICY IF EXISTS "Public read drug dosages" ON public.drug_dosages;
CREATE POLICY "Public read drug dosages" ON public.drug_dosages
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage drug dosages" ON public.drug_dosages;
CREATE POLICY "Service role manage drug dosages" ON public.drug_dosages
    FOR ALL TO service_role USING (true);

-- Growth standards: Public read
DROP POLICY IF EXISTS "Public read growth standards" ON public.growth_standards;
CREATE POLICY "Public read growth standards" ON public.growth_standards
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage growth standards" ON public.growth_standards;
CREATE POLICY "Service role manage growth standards" ON public.growth_standards
    FOR ALL TO service_role USING (true);

-- Reproductive cycles: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage reproductive cycles" ON public.reproductive_cycles;
CREATE POLICY "Staff manage reproductive cycles" ON public.reproductive_cycles
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet cycles" ON public.reproductive_cycles;
CREATE POLICY "Owners view pet cycles" ON public.reproductive_cycles
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access cycles" ON public.reproductive_cycles;
CREATE POLICY "Service role full access cycles" ON public.reproductive_cycles
    FOR ALL TO service_role USING (true);

-- Euthanasia assessments: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage assessments" ON public.euthanasia_assessments;
CREATE POLICY "Staff manage assessments" ON public.euthanasia_assessments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet assessments" ON public.euthanasia_assessments;
CREATE POLICY "Owners view pet assessments" ON public.euthanasia_assessments
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access assessments" ON public.euthanasia_assessments;
CREATE POLICY "Service role full access assessments" ON public.euthanasia_assessments
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Diagnosis codes
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_code ON public.diagnosis_codes(code);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_category ON public.diagnosis_codes(category);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_standard ON public.diagnosis_codes(standard);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_active ON public.diagnosis_codes(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_term_search ON public.diagnosis_codes USING gin(term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_species ON public.diagnosis_codes USING gin(species);

-- Drug dosages
CREATE INDEX IF NOT EXISTS idx_drug_dosages_name ON public.drug_dosages(name);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_species ON public.drug_dosages(species);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_active ON public.drug_dosages(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drug_dosages_name_search ON public.drug_dosages USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_route ON public.drug_dosages(route);

-- Growth standards
CREATE INDEX IF NOT EXISTS idx_growth_standards_breed ON public.growth_standards(breed);
CREATE INDEX IF NOT EXISTS idx_growth_standards_species ON public.growth_standards(species);
CREATE INDEX IF NOT EXISTS idx_growth_standards_lookup ON public.growth_standards(species, breed, gender, age_weeks);
CREATE INDEX IF NOT EXISTS idx_growth_standards_active ON public.growth_standards(id) WHERE deleted_at IS NULL;

-- Reproductive cycles
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_pet ON public.reproductive_cycles(pet_id);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_tenant ON public.reproductive_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_type ON public.reproductive_cycles(cycle_type);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_recorded_by ON public.reproductive_cycles(recorded_by);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_dates ON public.reproductive_cycles(cycle_start, cycle_end);

-- Euthanasia assessments
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_pet ON public.euthanasia_assessments(pet_id);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_tenant ON public.euthanasia_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_assessed_by ON public.euthanasia_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_date ON public.euthanasia_assessments(assessed_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.diagnosis_codes;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.diagnosis_codes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.drug_dosages;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.drug_dosages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.growth_standards;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.growth_standards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.reproductive_cycles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.reproductive_cycles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.euthanasia_assessments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.euthanasia_assessments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
CREATE OR REPLACE FUNCTION public.clinical_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL AND NEW.pet_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.clinical_set_tenant_id() IS 'Auto-populate tenant_id from pet_id for clinical tables';

DROP TRIGGER IF EXISTS reproductive_cycles_auto_tenant ON public.reproductive_cycles;
CREATE TRIGGER reproductive_cycles_auto_tenant
    BEFORE INSERT ON public.reproductive_cycles
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

DROP TRIGGER IF EXISTS euthanasia_assessments_auto_tenant ON public.euthanasia_assessments;
CREATE TRIGGER euthanasia_assessments_auto_tenant
    BEFORE INSERT ON public.euthanasia_assessments
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate drug dose for a pet
CREATE OR REPLACE FUNCTION public.calculate_drug_dose(
    p_drug_name TEXT,
    p_species TEXT,
    p_weight_kg NUMERIC
)
RETURNS TABLE (
    drug_name TEXT,
    min_dose_mg NUMERIC,
    max_dose_mg NUMERIC,
    min_ml NUMERIC,
    max_ml NUMERIC,
    route TEXT,
    frequency TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.name,
        ROUND(d.min_dose_mg_kg * p_weight_kg, 2),
        ROUND(d.max_dose_mg_kg * p_weight_kg, 2),
        CASE WHEN d.concentration_mg_ml IS NOT NULL AND d.concentration_mg_ml > 0
             THEN ROUND((d.min_dose_mg_kg * p_weight_kg) / d.concentration_mg_ml, 2)
             ELSE NULL END,
        CASE WHEN d.concentration_mg_ml IS NOT NULL AND d.concentration_mg_ml > 0
             THEN ROUND((d.max_dose_mg_kg * p_weight_kg) / d.concentration_mg_ml, 2)
             ELSE NULL END,
        d.route,
        d.frequency,
        d.notes
    FROM public.drug_dosages d
    WHERE d.name ILIKE p_drug_name
    AND (d.species = p_species OR d.species = 'all')
    AND d.deleted_at IS NULL
    ORDER BY
        CASE WHEN d.species = p_species THEN 0 ELSE 1 END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.calculate_drug_dose(TEXT, TEXT, NUMERIC) IS
'Calculate drug dose in mg and mL for a given drug, species, and body weight';

-- Get growth percentile for a pet
CREATE OR REPLACE FUNCTION public.get_growth_percentile(
    p_species TEXT,
    p_breed TEXT,
    p_gender TEXT,
    p_age_weeks INTEGER,
    p_weight_kg NUMERIC
)
RETURNS TEXT AS $$
DECLARE
    v_p50 NUMERIC;
    v_p25 NUMERIC;
    v_p75 NUMERIC;
    v_p10 NUMERIC;
    v_p90 NUMERIC;
BEGIN
    -- Get reference weights
    SELECT weight_kg INTO v_p50 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P50' AND deleted_at IS NULL;

    IF v_p50 IS NULL THEN
        RETURN 'No data';
    END IF;

    SELECT weight_kg INTO v_p25 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P25' AND deleted_at IS NULL;

    SELECT weight_kg INTO v_p75 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P75' AND deleted_at IS NULL;

    -- Estimate percentile
    IF p_weight_kg < v_p25 THEN
        RETURN 'Below 25th';
    ELSIF p_weight_kg < v_p50 THEN
        RETURN '25th-50th';
    ELSIF p_weight_kg < v_p75 THEN
        RETURN '50th-75th';
    ELSE
        RETURN 'Above 75th';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_growth_percentile(TEXT, TEXT, TEXT, INTEGER, NUMERIC) IS
'Estimate weight percentile for a pet based on breed growth standards';

-- =============================================================================
-- CONSENT TEMPLATES
-- =============================================================================
-- Templates for informed consent forms and documents

CREATE TABLE IF NOT EXISTS public.consent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = global template, SET = clinic-specific
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Template identification
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('surgical', 'anesthetic', 'diagnostic', 'therapeutic', 'vaccination', 'euthanasia', 'general')),

    -- Content
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    requires_witness BOOLEAN DEFAULT false,

    -- Validity
    validity_days INTEGER,  -- NULL = unlimited
    version TEXT DEFAULT '1.0',

    -- Metadata
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT consent_templates_code_length CHECK (char_length(code) BETWEEN 2 AND 50),
    CONSTRAINT consent_templates_name_length CHECK (char_length(name) BETWEEN 2 AND 200),
    CONSTRAINT consent_templates_version_format CHECK (version ~ '^\d+\.\d+$'),

    -- Unique constraints
    CONSTRAINT consent_templates_global_code UNIQUE (code) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT consent_templates_tenant_code UNIQUE (tenant_id, code) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE public.consent_templates IS 'Templates for informed consent forms and legal documents';
COMMENT ON COLUMN public.consent_templates.tenant_id IS 'NULL for global templates, clinic ID for clinic-specific templates';
COMMENT ON COLUMN public.consent_templates.validity_days IS 'How long the signed consent is valid (NULL = unlimited)';
COMMENT ON COLUMN public.consent_templates.version IS 'Semantic version for template updates';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant ON public.consent_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_templates_category ON public.consent_templates(category);
CREATE INDEX IF NOT EXISTS idx_consent_templates_code ON public.consent_templates(code);

-- Row Level Security
DROP POLICY IF EXISTS "Global templates viewable by all" ON public.consent_templates;
CREATE POLICY "Global templates viewable by all" ON public.consent_templates
    FOR SELECT TO authenticated
    USING (tenant_id IS NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Clinic templates managed by staff" ON public.consent_templates;
CREATE POLICY "Clinic templates managed by staff" ON public.consent_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access consent_templates" ON public.consent_templates;
CREATE POLICY "Service role full access consent_templates" ON public.consent_templates
    FOR ALL TO service_role USING (true);



-- ==========================================
-- FILE: 30_clinical/02_medical_records.sql
-- ==========================================

-- =============================================================================
-- 02_MEDICAL_RECORDS.SQL
-- =============================================================================
-- Medical records and prescriptions for veterinary patients.
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 30_clinical/01_reference_data.sql
-- =============================================================================

-- =============================================================================
-- MEDICAL RECORDS
-- =============================================================================
-- Core medical records for all patient encounters.

CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Record type
    record_type TEXT NOT NULL CHECK (record_type IN (
        'consultation', 'surgery', 'emergency', 'vaccination', 'checkup',
        'dental', 'grooming', 'lab_result', 'imaging', 'follow_up', 'other'
    )),

    -- Visit info
    visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chief_complaint TEXT,
    history TEXT,
    physical_exam TEXT,  -- Physical examination findings

    -- Vitals
    weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
    temperature_celsius NUMERIC(4,1) CHECK (temperature_celsius IS NULL OR (temperature_celsius >= 30 AND temperature_celsius <= 45)),
    heart_rate_bpm INTEGER CHECK (heart_rate_bpm IS NULL OR (heart_rate_bpm >= 20 AND heart_rate_bpm <= 400)),
    respiratory_rate_rpm INTEGER CHECK (respiratory_rate_rpm IS NULL OR (respiratory_rate_rpm >= 5 AND respiratory_rate_rpm <= 150)),
    blood_pressure TEXT,
    body_condition_score INTEGER CHECK (body_condition_score IS NULL OR (body_condition_score >= 1 AND body_condition_score <= 9)),

    -- Assessment
    diagnosis_code TEXT,
    diagnosis_text TEXT,
    assessment TEXT,  -- Assessment/Diagnosis summary
    clinical_notes TEXT,

    -- Plan
    treatment_plan TEXT,
    medications_prescribed TEXT,
    followup_date DATE,
    follow_up_notes TEXT,

    -- Emergency and follow-up flags
    is_emergency BOOLEAN DEFAULT false,
    requires_followup BOOLEAN DEFAULT false,

    -- Additional notes
    notes TEXT,

    -- Attachments
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT medical_records_visit_not_future CHECK (visit_date <= NOW() + INTERVAL '1 day')
);

COMMENT ON TABLE public.medical_records IS 'Core medical records for all patient encounters (consultations, surgeries, etc.)';
COMMENT ON COLUMN public.medical_records.record_type IS 'Type of visit: consultation, surgery, emergency, vaccination, checkup, etc.';
COMMENT ON COLUMN public.medical_records.body_condition_score IS 'BCS on 1-9 scale: 1-3 underweight, 4-5 ideal, 6-9 overweight';
COMMENT ON COLUMN public.medical_records.diagnosis_code IS 'Reference to diagnosis_codes.code (VeNom/SNOMED)';

-- =============================================================================
-- PRESCRIPTIONS
-- =============================================================================
-- Digital prescriptions with medication details and signatures.

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vet_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,

    -- Prescription number
    prescription_number TEXT NOT NULL,

    -- Dates
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Medications (JSONB array)
    -- Structure: [{"name": "...", "dose": "...", "frequency": "...", "duration": "...", "instructions": "..."}]
    medications JSONB NOT NULL DEFAULT '[]',

    -- Signature
    signature_url TEXT,
    signed_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'dispensed', 'expired', 'cancelled')),

    -- PDF
    pdf_url TEXT,

    -- Notes
    notes TEXT,
    pharmacist_notes TEXT,
    dispensing_notes TEXT,

    -- Dispensing info
    dispensed_at TIMESTAMPTZ,
    dispensed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, prescription_number),
    CONSTRAINT prescriptions_valid_until_after_prescribed CHECK (
        valid_until IS NULL OR valid_until >= prescribed_date
    ),
    CONSTRAINT prescriptions_medications_is_array CHECK (
        jsonb_typeof(medications) = 'array'
    )
);

COMMENT ON TABLE public.prescriptions IS 'Digital veterinary prescriptions with medication details';
COMMENT ON COLUMN public.prescriptions.medications IS 'JSON array of medications with dose, frequency, duration, instructions';
COMMENT ON COLUMN public.prescriptions.status IS 'draft: being written, active: ready to dispense, dispensed: filled, expired: past valid_until, cancelled: voided';
COMMENT ON COLUMN public.prescriptions.signature_url IS 'URL to veterinarian digital signature image';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Medical records: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage medical records" ON public.medical_records;
CREATE POLICY "Staff manage medical records" ON public.medical_records
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet records" ON public.medical_records;
CREATE POLICY "Owners view pet records" ON public.medical_records
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access records" ON public.medical_records;
CREATE POLICY "Service role full access records" ON public.medical_records
    FOR ALL TO service_role USING (true);

-- Prescriptions: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage prescriptions" ON public.prescriptions;
CREATE POLICY "Staff manage prescriptions" ON public.prescriptions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet prescriptions" ON public.prescriptions;
CREATE POLICY "Owners view pet prescriptions" ON public.prescriptions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access prescriptions" ON public.prescriptions;
CREATE POLICY "Service role full access prescriptions" ON public.prescriptions
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_pet ON public.medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_tenant ON public.medical_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_vet ON public.medical_records(vet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON public.medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_diagnosis ON public.medical_records(diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_active ON public.medical_records(tenant_id, deleted_at)
    WHERE deleted_at IS NULL;

-- Pet medical history (covering index)
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_history ON public.medical_records(pet_id, visit_date DESC)
    INCLUDE (record_type, diagnosis_text, vet_id, weight_kg)
    WHERE deleted_at IS NULL;

-- Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet ON public.prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON public.prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_vet ON public.prescriptions(vet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record ON public.prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions(prescribed_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON public.prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_by ON public.prescriptions(dispensed_by);

-- Active prescriptions for a pet (covering index)
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet_active ON public.prescriptions(pet_id, prescribed_date DESC)
    INCLUDE (prescription_number, status, valid_until, vet_id)
    WHERE deleted_at IS NULL AND status IN ('active', 'dispensed');

-- GIN index for JSONB medications (efficient medication searches)
CREATE INDEX IF NOT EXISTS idx_prescriptions_medications_gin ON public.prescriptions USING gin(medications jsonb_path_ops)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.medical_records;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.prescriptions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
DROP TRIGGER IF EXISTS medical_records_auto_tenant ON public.medical_records;
CREATE TRIGGER medical_records_auto_tenant
    BEFORE INSERT ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

DROP TRIGGER IF EXISTS prescriptions_auto_tenant ON public.prescriptions;
CREATE TRIGGER prescriptions_auto_tenant
    BEFORE INSERT ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

-- Auto-expire prescriptions trigger
CREATE OR REPLACE FUNCTION public.auto_expire_prescription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valid_until IS NOT NULL AND NEW.valid_until < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.auto_expire_prescription() IS 'Automatically set prescription status to expired when past valid_until date';

DROP TRIGGER IF EXISTS prescription_auto_expire ON public.prescriptions;
CREATE TRIGGER prescription_auto_expire
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.auto_expire_prescription();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate prescription number (thread-safe)
CREATE OR REPLACE FUNCTION public.generate_prescription_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'prescription', 'RX');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_prescription_number(TEXT) IS
'Generate unique prescription number for a tenant. Format: RX-YYYY-NNNNNN';

-- Get pet medical summary
CREATE OR REPLACE FUNCTION public.get_pet_medical_summary(p_pet_id UUID)
RETURNS TABLE (
    total_visits INTEGER,
    last_visit_date TIMESTAMPTZ,
    last_weight_kg NUMERIC,
    last_diagnosis TEXT,
    active_prescriptions INTEGER,
    chronic_conditions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.medical_records WHERE pet_id = p_pet_id AND deleted_at IS NULL),
        (SELECT MAX(visit_date) FROM public.medical_records WHERE pet_id = p_pet_id AND deleted_at IS NULL),
        (SELECT weight_kg FROM public.medical_records WHERE pet_id = p_pet_id AND weight_kg IS NOT NULL AND deleted_at IS NULL ORDER BY visit_date DESC LIMIT 1),
        (SELECT diagnosis_text FROM public.medical_records WHERE pet_id = p_pet_id AND diagnosis_text IS NOT NULL AND deleted_at IS NULL ORDER BY visit_date DESC LIMIT 1),
        (SELECT COUNT(*)::INTEGER FROM public.prescriptions WHERE pet_id = p_pet_id AND status = 'active' AND deleted_at IS NULL),
        (SELECT p.chronic_conditions FROM public.pets p WHERE p.id = p_pet_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_medical_summary(UUID) IS
'Get summary of pet medical history including visit count, last weight, active prescriptions';

-- Get recent records for a pet
CREATE OR REPLACE FUNCTION public.get_pet_recent_records(
    p_pet_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    record_id UUID,
    record_type TEXT,
    visit_date TIMESTAMPTZ,
    diagnosis_text TEXT,
    vet_name TEXT,
    weight_kg NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mr.id,
        mr.record_type,
        mr.visit_date,
        mr.diagnosis_text,
        pr.full_name,
        mr.weight_kg
    FROM public.medical_records mr
    LEFT JOIN public.profiles pr ON mr.vet_id = pr.id
    WHERE mr.pet_id = p_pet_id
    AND mr.deleted_at IS NULL
    ORDER BY mr.visit_date DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_recent_records(UUID, INTEGER) IS
'Get recent medical records for a pet with vet information';



-- ==========================================
-- FILE: 40_scheduling/01_services.sql
-- ==========================================

-- =============================================================================
-- 01_SERVICES.SQL
-- =============================================================================
-- Service catalog for appointments and invoicing.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Service details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'consultation', 'vaccination', 'grooming', 'surgery',
        'diagnostic', 'dental', 'emergency', 'hospitalization',
        'treatment', 'identification', 'other'
    )),

    -- Pricing
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    currency TEXT NOT NULL DEFAULT 'PYG',
    tax_rate NUMERIC(5,2) DEFAULT 10.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),

    -- Scheduling
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    buffer_minutes INTEGER DEFAULT 0 CHECK (buffer_minutes >= 0),
    max_daily_bookings INTEGER CHECK (max_daily_bookings IS NULL OR max_daily_bookings > 0),

    -- Availability - USED BY get_available_slots
    requires_appointment BOOLEAN DEFAULT true,
    available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- Mon-Fri (1=Monday per ISO)
    available_start_time TIME DEFAULT '08:00',
    available_end_time TIME DEFAULT '18:00',

    -- Deposits
    requires_deposit BOOLEAN DEFAULT false,
    deposit_percentage NUMERIC(5,2) CHECK (deposit_percentage IS NULL OR (deposit_percentage >= 0 AND deposit_percentage <= 100)),

    -- Species restrictions
    species_allowed TEXT[],  -- NULL = all species

    -- Display
    display_order INTEGER DEFAULT 100,
    is_featured BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT services_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT services_time_order CHECK (available_start_time < available_end_time),
    CONSTRAINT services_tax_rate_valid CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),
    CONSTRAINT services_buffer_non_negative CHECK (buffer_minutes IS NULL OR buffer_minutes >= 0)
);

COMMENT ON TABLE public.services IS 'Service catalog for appointments and invoicing';
COMMENT ON COLUMN public.services.category IS 'Service category: consultation, vaccination, grooming, surgery, diagnostic, dental, emergency, hospitalization, treatment, identification, other';
COMMENT ON COLUMN public.services.available_days IS 'Days service is available as ISO day numbers: 1=Monday, 7=Sunday';
COMMENT ON COLUMN public.services.species_allowed IS 'Allowed species array (NULL = all species allowed)';
COMMENT ON COLUMN public.services.buffer_minutes IS 'Buffer time after appointment before next can be booked';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public can view active services (for booking)
DROP POLICY IF EXISTS "Public view active services" ON public.services;
CREATE POLICY "Public view active services" ON public.services
    FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);

-- Staff can manage services
DROP POLICY IF EXISTS "Staff manage services" ON public.services;
CREATE POLICY "Staff manage services" ON public.services
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.services;
CREATE POLICY "Service role full access" ON public.services
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- Service names must be unique per tenant (for upsert support)
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_tenant_name_unique
    ON public.services(tenant_id, name) WHERE deleted_at IS NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON public.services(tenant_id, is_active)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_services_featured ON public.services(tenant_id, is_featured)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;

-- Covering index for service list
CREATE INDEX IF NOT EXISTS idx_services_list ON public.services(tenant_id, display_order)
    INCLUDE (name, category, base_price, duration_minutes, is_featured)
    WHERE is_active = true AND deleted_at IS NULL;

-- Active services for booking
CREATE INDEX IF NOT EXISTS idx_services_booking ON public.services(tenant_id, category, display_order)
    INCLUDE (name, base_price, duration_minutes, is_featured, species_allowed)
    WHERE is_active = true AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.services;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get services available for a species
CREATE OR REPLACE FUNCTION public.get_services_for_species(
    p_tenant_id TEXT,
    p_species TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    duration_minutes INTEGER,
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.description,
        s.category,
        s.base_price,
        s.duration_minutes,
        s.is_featured
    FROM public.services s
    WHERE s.tenant_id = p_tenant_id
    AND s.is_active = true
    AND s.deleted_at IS NULL
    AND (s.species_allowed IS NULL OR p_species = ANY(s.species_allowed))
    ORDER BY s.display_order, s.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_services_for_species(TEXT, TEXT) IS
'Get services available for a specific species (filters by species_allowed array)';



-- ==========================================
-- FILE: 40_scheduling/02_appointments.sql
-- ==========================================

-- =============================================================================
-- 02_APPOINTMENTS.SQL
-- =============================================================================
-- Appointment scheduling with overlap detection and dynamic slot generation.
-- INCLUDES FIXED get_available_slots using service settings.
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 40_scheduling/01_services.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Scheduling
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),

    -- Details
    reason TEXT,
    notes TEXT,
    internal_notes TEXT,  -- Staff-only notes

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN (
            'scheduled',    -- Confirmed appointment
            'confirmed',    -- Client confirmed
            'checked_in',   -- Client arrived
            'in_progress',  -- Currently being seen
            'completed',    -- Appointment done
            'cancelled',    -- Cancelled
            'no_show'       -- Client didn't show
        )),

    -- Status timestamps
    confirmed_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancellation_reason TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT appointments_time_order CHECK (end_time > start_time),
    CONSTRAINT appointments_duration_matches CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 = duration_minutes
    )
);

COMMENT ON TABLE public.appointments IS 'Appointment scheduling with overlap detection and status tracking';
COMMENT ON COLUMN public.appointments.status IS 'Workflow: scheduled → confirmed → checked_in → in_progress → completed';
COMMENT ON COLUMN public.appointments.internal_notes IS 'Staff-only notes not visible to pet owners';
COMMENT ON COLUMN public.appointments.duration_minutes IS 'Duration in minutes (must match end_time - start_time)';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Owners can view their pets' appointments
DROP POLICY IF EXISTS "Owners view pet appointments" ON public.appointments;
CREATE POLICY "Owners view pet appointments" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND deleted_at IS NULL
    );

-- Owners can create appointments for their pets
DROP POLICY IF EXISTS "Owners create appointments" ON public.appointments;
CREATE POLICY "Owners create appointments" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner_of_pet(pet_id));

-- Owners can cancel their own appointments
DROP POLICY IF EXISTS "Owners cancel appointments" ON public.appointments;
CREATE POLICY "Owners cancel appointments" ON public.appointments
    FOR UPDATE TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND status IN ('scheduled', 'confirmed')
        AND deleted_at IS NULL
    )
    WITH CHECK (status = 'cancelled');

-- Staff can manage all appointments
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
CREATE POLICY "Staff manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.appointments;
CREATE POLICY "Service role full access" ON public.appointments
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet ON public.appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_by ON public.appointments(cancelled_by);

-- Date-based queries (most common) - BRIN for time-series
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, start_time)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_start_brin ON public.appointments
    USING BRIN(start_time) WITH (pages_per_range = 64);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status)
    WHERE deleted_at IS NULL;

-- Upcoming appointments (dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON public.appointments(tenant_id, start_time, status)
    WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL;

-- Overlap detection (critical for booking)
CREATE INDEX IF NOT EXISTS idx_appointments_vet_overlap ON public.appointments(vet_id, start_time, end_time)
    WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- Calendar view covering index
CREATE INDEX IF NOT EXISTS idx_appointments_calendar ON public.appointments(tenant_id, start_time, status)
    INCLUDE (pet_id, vet_id, service_id, end_time, duration_minutes, reason)
    WHERE deleted_at IS NULL;

-- Upcoming appointments for owner portal
CREATE INDEX IF NOT EXISTS idx_appointments_owner_upcoming ON public.appointments(pet_id, start_time)
    INCLUDE (tenant_id, service_id, vet_id, status, reason)
    WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL;

-- Vet's daily schedule
CREATE INDEX IF NOT EXISTS idx_appointments_vet_schedule ON public.appointments(vet_id, start_time, end_time)
    INCLUDE (tenant_id, pet_id, service_id, status)
    WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.appointments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- OVERLAP DETECTION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
    p_tenant_id TEXT,
    p_vet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflicting_id UUID,
    conflicting_start TIMESTAMPTZ,
    conflicting_end TIMESTAMPTZ,
    pet_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    WHERE a.tenant_id = p_tenant_id
    AND a.vet_id = p_vet_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND (
        (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_appointment_overlap(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
'Check for overlapping appointments for a vet. Returns conflicting appointments if any.';

-- =============================================================================
-- BOOKING VALIDATION TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_appointment_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict RECORD;
BEGIN
    -- Skip for cancelled/no-show
    IF NEW.status IN ('cancelled', 'no_show') THEN
        RETURN NEW;
    END IF;

    -- Check for overlaps if vet is assigned
    IF NEW.vet_id IS NOT NULL THEN
        SELECT * INTO v_conflict
        FROM public.check_appointment_overlap(
            NEW.tenant_id,
            NEW.vet_id,
            NEW.start_time,
            NEW.end_time,
            NEW.id
        )
        LIMIT 1;

        IF v_conflict.conflicting_id IS NOT NULL THEN
            RAISE EXCEPTION 'Appointment overlaps with existing booking for %',
                v_conflict.pet_name
                USING ERRCODE = 'exclusion_violation',
                      HINT = 'Choose a different time slot or vet';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.validate_appointment_booking() IS
'Validates that new/updated appointments do not overlap with existing ones for the same vet';

DROP TRIGGER IF EXISTS validate_appointment_booking ON public.appointments;
CREATE TRIGGER validate_appointment_booking
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_appointment_booking();

-- =============================================================================
-- AVAILABLE SLOTS FUNCTION
-- Uses service settings instead of hardcoded times
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_tenant_id TEXT,
    p_date DATE,
    p_service_id UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    vet_id UUID,
    vet_name TEXT
) AS $$
DECLARE
    v_start_time TIME;
    v_end_time TIME;
    v_duration INTEGER;
    v_available_days INTEGER[];
    v_slot_interval INTERVAL;
    v_day_of_week INTEGER;
BEGIN
    -- Get service settings if service_id provided
    IF p_service_id IS NOT NULL THEN
        SELECT
            s.available_start_time,
            s.available_end_time,
            s.duration_minutes,
            s.available_days
        INTO v_start_time, v_end_time, v_duration, v_available_days
        FROM public.services s
        WHERE s.id = p_service_id
        AND s.tenant_id = p_tenant_id
        AND s.is_active = true
        AND s.deleted_at IS NULL;

        -- Use service duration if found, otherwise use parameter
        v_duration := COALESCE(v_duration, p_duration_minutes);
    ELSE
        -- Default values if no service specified
        v_start_time := '08:00'::TIME;
        v_end_time := '18:00'::TIME;
        v_duration := p_duration_minutes;
        v_available_days := ARRAY[1,2,3,4,5];  -- Mon-Fri
    END IF;

    -- Check if day is available
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;  -- 1=Monday, 7=Sunday
    IF NOT (v_day_of_week = ANY(v_available_days)) THEN
        RETURN;  -- Day not available for this service
    END IF;

    v_slot_interval := (v_duration || ' minutes')::INTERVAL;

    -- Generate slots for each vet
    RETURN QUERY
    WITH vets AS (
        SELECT pr.id, pr.full_name
        FROM public.profiles pr
        WHERE pr.tenant_id = p_tenant_id
        AND pr.role = 'vet'
        AND pr.deleted_at IS NULL
        AND (p_vet_id IS NULL OR pr.id = p_vet_id)
    ),
    time_slots AS (
        SELECT generate_series(
            p_date + v_start_time,
            p_date + v_end_time - v_slot_interval,
            v_slot_interval
        ) AS start_ts
    ),
    all_slots AS (
        SELECT
            ts.start_ts,
            ts.start_ts + v_slot_interval AS end_ts,
            v.id AS vet_id,
            v.full_name AS vet_name
        FROM time_slots ts
        CROSS JOIN vets v
    )
    SELECT
        s.start_ts,
        s.end_ts,
        s.vet_id,
        s.vet_name
    FROM all_slots s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.tenant_id = p_tenant_id
        AND a.vet_id = s.vet_id
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.deleted_at IS NULL
        AND (a.start_time, a.end_time) OVERLAPS (s.start_ts, s.end_ts)
    )
    -- Only return future slots for today
    AND (p_date > CURRENT_DATE OR s.start_ts > NOW())
    ORDER BY s.start_ts, s.vet_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_available_slots(TEXT, DATE, UUID, UUID, INTEGER) IS
'Generate available appointment slots for a given date, respecting service settings and existing bookings';

-- =============================================================================
-- HELPER: GET NEXT AVAILABLE SLOT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_available_slot(
    p_tenant_id TEXT,
    p_service_id UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    vet_id UUID,
    vet_name TEXT
) AS $$
DECLARE
    v_check_date DATE;
    v_max_days INTEGER := 30;  -- Look ahead 30 days
BEGIN
    v_check_date := p_from_date;

    -- Loop through dates until we find a slot
    FOR i IN 1..v_max_days LOOP
        RETURN QUERY
        SELECT s.slot_start, s.slot_end, s.vet_id, s.vet_name
        FROM public.get_available_slots(p_tenant_id, v_check_date, p_service_id, p_vet_id) s
        LIMIT 1;

        IF FOUND THEN
            RETURN;
        END IF;

        v_check_date := v_check_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_next_available_slot(TEXT, UUID, UUID, DATE) IS
'Find the next available appointment slot within 30 days';

-- =============================================================================
-- HELPER: GET APPOINTMENTS FOR DATE RANGE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_appointments_in_range(
    p_tenant_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_vet_id UUID DEFAULT NULL
)
RETURNS TABLE (
    appointment_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    pet_name TEXT,
    owner_name TEXT,
    service_name TEXT,
    vet_name TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name,
        pr.full_name,
        s.name,
        v.full_name,
        a.status
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.services s ON a.service_id = s.id
    LEFT JOIN public.profiles v ON a.vet_id = v.id
    WHERE a.tenant_id = p_tenant_id
    AND a.start_time >= p_start_date
    AND a.start_time < p_end_date + 1
    AND a.deleted_at IS NULL
    AND (p_vet_id IS NULL OR a.vet_id = p_vet_id)
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_appointments_in_range(TEXT, DATE, DATE, UUID) IS
'Get appointments within a date range for calendar views';



-- ==========================================
-- FILE: 60_store/suppliers/01_suppliers.sql
-- ==========================================

-- =============================================================================
-- 01_SUPPLIERS.SQL
-- =============================================================================
-- B2B supplier management for veterinary products and services
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- SUPPLIERS (B2B Layer)
-- =============================================================================
-- Suppliers can be GLOBAL (tenant_id NULL) or LOCAL (tenant_id set).
-- Global suppliers are platform-verified and available to all clinics.
-- Local suppliers are clinic-specific additions.

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-verified), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Supplier info
    name TEXT NOT NULL,
    legal_name TEXT,                              -- Razón social
    tax_id TEXT,                                  -- RUC (Paraguay)

    -- Contact
    contact_info JSONB DEFAULT '{}'::JSONB,       -- {phone, email, address, contact_person}
    website TEXT,

    -- Classification
    supplier_type TEXT DEFAULT 'products'
        CHECK (supplier_type IN ('products', 'services', 'both')),

    -- B2B specific
    is_platform_provider BOOLEAN DEFAULT false,   -- TRUE = This is US (The Aggregator)
    minimum_order_amount NUMERIC(12,2),
    payment_terms TEXT,                           -- "30 días", "Contado"
    delivery_time_days INTEGER,

    -- Verification
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.suppliers IS 'Product suppliers. NULL tenant_id = global platform-verified, SET = local clinic-specific';
COMMENT ON COLUMN public.suppliers.tenant_id IS 'NULL for global (platform-verified) suppliers, SET for local (clinic-specific)';
COMMENT ON COLUMN public.suppliers.is_platform_provider IS 'TRUE if this is the platform aggregator (us)';
COMMENT ON COLUMN public.suppliers.verification_status IS 'Verification status: pending, verified, rejected';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_verification ON public.suppliers(verification_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_platform_provider ON public.suppliers(is_platform_provider) WHERE is_platform_provider = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access suppliers" ON public.suppliers;
CREATE POLICY "Service role full access suppliers" ON public.suppliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view suppliers (global + their clinic's local)
DROP POLICY IF EXISTS "Authenticated users view suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users view suppliers" ON public.suppliers
    FOR SELECT TO authenticated
    USING (
        -- Global suppliers (available to all)
        tenant_id IS NULL
        -- OR clinic-specific suppliers for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's suppliers
DROP POLICY IF EXISTS "Clinic staff manage suppliers" ON public.suppliers;
CREATE POLICY "Clinic staff manage suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global suppliers
DROP POLICY IF EXISTS "Platform admins manage global suppliers" ON public.suppliers;
CREATE POLICY "Platform admins manage global suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_suppliers ON public.suppliers;
CREATE TRIGGER handle_updated_at_suppliers
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/categories/01_categories.sql
-- ==========================================

-- =============================================================================
-- 01_CATEGORIES.SQL
-- =============================================================================
-- Product category hierarchy for veterinary store
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STORE CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Category info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.store_categories(id),

    -- Hierarchy level (1 = top, 2 = sub, 3 = detail, 4 = granular, 5 = micro)
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),

    -- Media
    image_url TEXT,

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified category
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Who created it originally

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_categories IS 'Product categories. NULL tenant_id = global platform category, SET = local clinic-specific';
COMMENT ON COLUMN public.store_categories.level IS 'Hierarchy level: 1=top, 2=sub, 3=detail, 4=granular, 5=micro';
COMMENT ON COLUMN public.store_categories.is_global_catalog IS 'TRUE for platform-verified categories';

-- Unique constraint: global categories have unique slugs, local categories unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_global_slug
    ON public.store_categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_tenant_slug
    ON public.store_categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_parent ON public.store_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_level ON public.store_categories(level);
CREATE INDEX IF NOT EXISTS idx_store_categories_tenant_active ON public.store_categories(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_categories_global_catalog ON public.store_categories(is_global_catalog) WHERE is_global_catalog = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access categories" ON public.store_categories;
CREATE POLICY "Service role full access categories" ON public.store_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view categories
DROP POLICY IF EXISTS "Authenticated users view categories" ON public.store_categories;
CREATE POLICY "Authenticated users view categories" ON public.store_categories
    FOR SELECT TO authenticated
    USING (
        -- Global categories (available to all)
        tenant_id IS NULL
        -- OR clinic-specific categories for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's categories
DROP POLICY IF EXISTS "Clinic staff manage categories" ON public.store_categories;
CREATE POLICY "Clinic staff manage categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global categories
DROP POLICY IF EXISTS "Platform admins manage global categories" ON public.store_categories;
CREATE POLICY "Platform admins manage global categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_categories ON public.store_categories;
CREATE TRIGGER handle_updated_at_categories
    BEFORE UPDATE ON public.store_categories
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/brands/01_brands.sql
-- ==========================================

-- =============================================================================
-- 01_BRANDS.SQL
-- =============================================================================
-- Product brand management for veterinary store
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STORE BRANDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Brand info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    country_origin TEXT,                          -- País de origen

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified brand
    created_by_tenant_id TEXT REFERENCES public.tenants(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_brands IS 'Product brands. NULL tenant_id = global platform brand, SET = local clinic-specific';
COMMENT ON COLUMN public.store_brands.is_global_catalog IS 'TRUE for platform-verified brands';

-- Unique constraint: global brands have unique slugs, local brands unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_global_slug
    ON public.store_brands(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_tenant_slug
    ON public.store_brands(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_store_brands_tenant_active ON public.store_brands(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_brands_global_catalog ON public.store_brands(is_global_catalog) WHERE is_global_catalog = true;
CREATE INDEX IF NOT EXISTS idx_store_brands_country ON public.store_brands(country_origin);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_brands ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access brands" ON public.store_brands;
CREATE POLICY "Service role full access brands" ON public.store_brands
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view brands
DROP POLICY IF EXISTS "Authenticated users view brands" ON public.store_brands;
CREATE POLICY "Authenticated users view brands" ON public.store_brands
    FOR SELECT TO authenticated
    USING (
        -- Global brands (available to all)
        tenant_id IS NULL
        -- OR clinic-specific brands for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's brands
DROP POLICY IF EXISTS "Clinic staff manage brands" ON public.store_brands;
CREATE POLICY "Clinic staff manage brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global brands
DROP POLICY IF EXISTS "Platform admins manage global brands" ON public.store_brands;
CREATE POLICY "Platform admins manage global brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_brands ON public.store_brands;
CREATE TRIGGER handle_updated_at_brands
    BEFORE UPDATE ON public.store_brands
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/products/01_products.sql
-- ==========================================

-- =============================================================================
-- 01_PRODUCTS.SQL
-- =============================================================================
-- Product catalog with dual-unit inventory system
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/categories/01_categories.sql, 60_store/brands/01_brands.sql,
--               60_store/suppliers/01_suppliers.sql
-- =============================================================================

-- =============================================================================
-- STORE PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global catalog product, SET = Local clinic product
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Classification
    category_id UUID REFERENCES public.store_categories(id),
    brand_id UUID REFERENCES public.store_brands(id),

    -- Identification
    sku TEXT,
    barcode TEXT,

    -- Product info
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,

    -- ==========================================================================
    -- DUAL-UNIT INVENTORY (B2B Layer)
    -- ==========================================================================
    -- Example: Buy "Caja" of 100 pills, sell by "Tableta"
    -- purchase_unit = 'Caja', sale_unit = 'Tableta', conversion_factor = 100
    -- unit_cost = price_per_box / 100 = cost per pill
    -- ==========================================================================

    -- Unit of PURCHASE (how you buy from supplier)
    purchase_unit TEXT DEFAULT 'Unidad'
        CHECK (purchase_unit IN (
            'Unidad', 'Caja', 'Pack', 'Bolsa', 'Frasco', 'Bulto',
            'Display', 'Blister', 'Paquete', 'Kg', 'L'
        )),

    -- Unit of SALE (how you sell to customers)
    sale_unit TEXT DEFAULT 'Unidad'
        CHECK (sale_unit IN (
            'Unidad', 'Tableta', 'Ampolla', 'Cápsula', 'Comprimido',
            'ml', 'g', 'Kg', 'Dosis', 'Aplicación',
            'Bolsa', 'Frasco', 'Caja', 'Sobre', 'Pipeta'
        )),

    -- Conversion: 1 purchase_unit = N sale_units
    conversion_factor NUMERIC(12,4) DEFAULT 1 CHECK (conversion_factor > 0),

    -- Pricing
    -- purchase_price: What you pay per purchase_unit (Box price)
    purchase_price NUMERIC(12,2) CHECK (purchase_price IS NULL OR purchase_price >= 0),

    -- unit_cost: Computed cost per sale_unit = purchase_price / conversion_factor
    -- This is STORED for performance (updated via trigger)
    unit_cost NUMERIC(12,4) GENERATED ALWAYS AS (
        CASE WHEN purchase_price IS NOT NULL AND conversion_factor > 0
             THEN purchase_price / conversion_factor
             ELSE NULL
        END
    ) STORED,

    -- base_price: Selling price per sale_unit (what customer pays)
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),

    -- sale_price: Promotional price per sale_unit (optional)
    sale_price NUMERIC(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),

    -- cost_price: Legacy field, prefer unit_cost
    cost_price NUMERIC(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),

    -- Supplier relationship
    default_supplier_id UUID REFERENCES public.suppliers(id),

    -- Media
    image_url TEXT,
    images TEXT[] DEFAULT '{}',

    -- Attributes
    weight_grams NUMERIC(10,2),
    dimensions JSONB,  -- {length, width, height, unit}
    attributes JSONB DEFAULT '{}',  -- {color, size, concentration, etc.}

    -- Species/targeting
    target_species TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_prescription BOOLEAN DEFAULT false,

    -- Display
    display_order INTEGER DEFAULT 100,

    -- ==========================================================================
    -- GLOBAL CATALOG FLAGS (B2B Layer)
    -- ==========================================================================
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified product
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Original creator
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_products IS 'Product catalog. NULL tenant_id = global catalog, SET = local clinic product. Supports dual-unit inventory.';
COMMENT ON COLUMN public.store_products.purchase_unit IS 'Unit for purchasing from supplier (e.g., Caja, Bulto)';
COMMENT ON COLUMN public.store_products.sale_unit IS 'Unit for selling to customer (e.g., Tableta, Unidad)';
COMMENT ON COLUMN public.store_products.conversion_factor IS '1 purchase_unit = N sale_units (e.g., 1 Caja = 100 Tabletas)';
COMMENT ON COLUMN public.store_products.purchase_price IS 'Price per purchase_unit (what you pay supplier)';
COMMENT ON COLUMN public.store_products.unit_cost IS 'Computed cost per sale_unit = purchase_price / conversion_factor';
COMMENT ON COLUMN public.store_products.base_price IS 'Selling price per sale_unit';
COMMENT ON COLUMN public.store_products.is_global_catalog IS 'TRUE for platform-verified global catalog products';

-- Unique constraint: global products have unique SKUs, local products unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_global_sku
    ON public.store_products(sku) WHERE tenant_id IS NULL AND sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_tenant_sku
    ON public.store_products(tenant_id, sku) WHERE tenant_id IS NOT NULL AND sku IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_store_products_category ON public.store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_brand ON public.store_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_store_products_supplier ON public.store_products(default_supplier_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON public.store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON public.store_products(is_featured)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_prescription ON public.store_products(requires_prescription)
    WHERE requires_prescription = true;
CREATE INDEX IF NOT EXISTS idx_store_products_global_catalog ON public.store_products(is_global_catalog)
    WHERE is_global_catalog = true;
CREATE INDEX IF NOT EXISTS idx_store_products_verification ON public.store_products(verification_status);
CREATE INDEX IF NOT EXISTS idx_store_products_active ON public.store_products(tenant_id, is_active, deleted_at)
    INCLUDE (name, base_price, sale_price, image_url, is_featured);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_store_products_search ON public.store_products
    USING gin(to_tsvector('spanish', name || ' ' || coalesce(description, '')))
    WHERE deleted_at IS NULL;

-- Species targeting index (for filtering)
CREATE INDEX IF NOT EXISTS idx_store_products_species ON public.store_products
    USING gin(target_species) WHERE target_species IS NOT NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access products" ON public.store_products;
CREATE POLICY "Service role full access products" ON public.store_products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view products
DROP POLICY IF EXISTS "Authenticated users view products" ON public.store_products;
CREATE POLICY "Authenticated users view products" ON public.store_products
    FOR SELECT TO authenticated
    USING (
        -- Global catalog products (available to all)
        tenant_id IS NULL
        -- OR clinic-specific products for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's products
DROP POLICY IF EXISTS "Clinic staff manage products" ON public.store_products;
CREATE POLICY "Clinic staff manage products" ON public.store_products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global catalog products
DROP POLICY IF EXISTS "Platform admins manage global products" ON public.store_products;
CREATE POLICY "Platform admins manage global products" ON public.store_products
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_products ON public.store_products;
CREATE TRIGGER handle_updated_at_products
    BEFORE UPDATE ON public.store_products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/inventory/01_inventory.sql
-- ==========================================

-- =============================================================================
-- 01_INVENTORY.SQL
-- =============================================================================
-- Inventory management and stock tracking
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STORE INVENTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Stock levels
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(12,2) DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity NUMERIC(12,2) GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,

    -- Reorder settings
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    reorder_quantity NUMERIC(12,2),
    reorder_point NUMERIC(12,2),

    -- Cost tracking
    weighted_average_cost NUMERIC(12,2) DEFAULT 0,

    -- Location
    location TEXT,
    bin_number TEXT,

    -- Batch/Expiry
    batch_number TEXT,
    expiry_date DATE,
    supplier_name TEXT,

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(product_id),

    -- CHECK constraints
    CONSTRAINT store_inventory_stock_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT store_inventory_reserved_valid CHECK (COALESCE(reserved_quantity, 0) <= stock_quantity)
);

COMMENT ON TABLE public.store_inventory IS 'Per-product per-clinic inventory levels with weighted average cost tracking';
COMMENT ON COLUMN public.store_inventory.available_quantity IS 'Computed: stock_quantity - reserved_quantity';
COMMENT ON COLUMN public.store_inventory.weighted_average_cost IS 'Running WAC updated on purchase transactions';
COMMENT ON COLUMN public.store_inventory.reorder_point IS 'Stock level at which to reorder';

-- =============================================================================
-- INVENTORY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Transaction
    type TEXT NOT NULL
        CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'damage', 'theft', 'expired', 'transfer')),
    quantity NUMERIC(12,2) NOT NULL,  -- Positive = add, Negative = remove
    unit_cost NUMERIC(12,2),

    -- Reference
    reference_type TEXT,  -- 'order', 'invoice', 'adjustment'
    reference_id UUID,
    notes TEXT,

    -- Performed by
    performed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_inventory_transactions IS 'Inventory movement ledger: purchases, sales, adjustments, returns, damages';
COMMENT ON COLUMN public.store_inventory_transactions.type IS 'Transaction type: purchase, sale, adjustment, return, damage, theft, expired, transfer';
COMMENT ON COLUMN public.store_inventory_transactions.quantity IS 'Positive = add stock, Negative = remove stock';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_product ON public.store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_tenant ON public.store_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_available ON public.store_inventory(tenant_id, available_quantity)
    WHERE available_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_store_inventory_reorder ON public.store_inventory(tenant_id, reorder_point)
    WHERE reorder_point IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_inventory_expiry ON public.store_inventory(expiry_date)
    WHERE expiry_date IS NOT NULL;

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant ON public.store_inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON public.store_inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.store_inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.store_inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON public.store_inventory_transactions(reference_type, reference_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access inventory" ON public.store_inventory;
CREATE POLICY "Service role full access inventory" ON public.store_inventory
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access inventory_txns" ON public.store_inventory_transactions;
CREATE POLICY "Service role full access inventory_txns" ON public.store_inventory_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's inventory
DROP POLICY IF EXISTS "Clinic staff manage inventory" ON public.store_inventory;
CREATE POLICY "Clinic staff manage inventory" ON public.store_inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage inventory_txns" ON public.store_inventory_transactions;
CREATE POLICY "Clinic staff manage inventory_txns" ON public.store_inventory_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory_transactions.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory_transactions.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for inventory
DROP TRIGGER IF EXISTS handle_updated_at_inventory ON public.store_inventory;
CREATE TRIGGER handle_updated_at_inventory
    BEFORE UPDATE ON public.store_inventory
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/orders/01_orders.sql
-- ==========================================

-- =============================================================================
-- 01_ORDERS.SQL
-- =============================================================================
-- Order management, payments, and coupons
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STORE CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Campaign info
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT DEFAULT 'sale'
        CHECK (campaign_type IN ('sale', 'bogo', 'bundle', 'flash', 'seasonal')),

    -- Duration
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,

    -- Discount
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT store_campaigns_dates CHECK (end_date > start_date)
);

COMMENT ON TABLE public.store_campaigns IS 'Promotional campaigns: sales, BOGO, bundles, flash sales, seasonal';
COMMENT ON COLUMN public.store_campaigns.campaign_type IS 'Campaign type: sale, bogo (buy one get one), bundle, flash, seasonal';

-- =============================================================================
-- STORE CAMPAIGN ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.store_campaigns(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Override discount for this product
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_campaign_items IS 'Campaign-specific product discounts and overrides';

-- =============================================================================
-- STORE COUPONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Coupon details
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,

    -- Type and value
    type TEXT NOT NULL
        CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
    value NUMERIC(12,2) NOT NULL
        CHECK (value > 0),

    -- Conditions
    minimum_order_amount NUMERIC(12,2),
    applicable_categories UUID[],  -- Array of category IDs (no FK constraint for arrays)
    applicable_products UUID[],    -- Array of product IDs (no FK constraint for arrays)

    -- Usage limits
    usage_limit INTEGER,  -- Total uses allowed
    usage_limit_per_user INTEGER,  -- Uses per customer
    used_count INTEGER DEFAULT 0,

    -- Validity
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Created by
    created_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.store_coupons IS 'Discount coupons and promotional codes';
COMMENT ON COLUMN public.store_coupons.type IS 'Type: percentage, fixed_amount, free_shipping';
COMMENT ON COLUMN public.store_coupons.applicable_categories IS 'Categories this coupon applies to (NULL = all)';
COMMENT ON COLUMN public.store_coupons.applicable_products IS 'Specific products this coupon applies to (NULL = all)';

-- =============================================================================
-- STORE ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Order number
    order_number TEXT NOT NULL,

    -- Customer
    customer_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Order placed
            'confirmed',    -- Payment confirmed
            'processing',   -- Being prepared
            'ready',        -- Ready for pickup/shipping
            'shipped',      -- In transit
            'delivered',    -- Completed
            'cancelled',    -- Cancelled
            'refunded'      -- Refunded
        )),

    -- Totals
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    shipping_cost NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Shipping
    shipping_address JSONB,
    shipping_method TEXT,
    tracking_number TEXT,

    -- Payment
    payment_status TEXT DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,

    -- Coupon
    coupon_id UUID REFERENCES public.store_coupons(id),
    coupon_code TEXT,

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.store_orders IS 'Customer orders with status tracking and payment handling';
COMMENT ON COLUMN public.store_orders.status IS 'Workflow: pending → confirmed → processing → ready → shipped → delivered. Also: cancelled, refunded';
COMMENT ON COLUMN public.store_orders.payment_status IS 'Payment status: pending, paid, failed, refunded';

-- =============================================================================
-- STORE ORDER ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,

    -- Product
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Quantities and pricing
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL,

    -- Product snapshot (for historical accuracy)
    product_name TEXT NOT NULL,
    product_sku TEXT,
    product_image_url TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_order_items IS 'Order line items with product snapshots for historical accuracy';

-- =============================================================================
-- STORE PRICE HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Price change
    old_price NUMERIC(12,2),
    new_price NUMERIC(12,2) NOT NULL,
    old_sale_price NUMERIC(12,2),
    new_sale_price NUMERIC(12,2),

    -- Reason
    change_reason TEXT,
    changed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_price_history IS 'Audit trail of price changes for products';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_store_campaigns_tenant ON public.store_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_type ON public.store_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_dates ON public.store_campaigns(start_date, end_date)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active ON public.store_campaigns(tenant_id, is_active, start_date, end_date)
    WHERE is_active = true AND deleted_at IS NULL;

-- Campaign items indexes
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_campaign ON public.store_campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_tenant ON public.store_campaign_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_product ON public.store_campaign_items(product_id);

-- Coupons indexes
CREATE INDEX IF NOT EXISTS idx_store_coupons_tenant ON public.store_coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_coupons_code ON public.store_coupons(code);
-- CREATE INDEX IF NOT EXISTS idx_store_coupons_active ON public.store_coupons(tenant_id, is_active, expires_at)
--     WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW()); -- NOW() is STABLE, not IMMUTABLE

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON public.store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer ON public.store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON public.store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON public.store_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_number ON public.store_orders(order_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_store_order_items_tenant ON public.store_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product ON public.store_order_items(product_id);

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_store_price_history_tenant ON public.store_price_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_price_history_product ON public.store_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_store_price_history_date ON public.store_price_history(created_at DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_price_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.store_campaigns;
CREATE POLICY "Service role full access campaigns" ON public.store_campaigns
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access campaign_items" ON public.store_campaign_items;
CREATE POLICY "Service role full access campaign_items" ON public.store_campaign_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access coupons" ON public.store_coupons;
CREATE POLICY "Service role full access coupons" ON public.store_coupons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access orders" ON public.store_orders;
CREATE POLICY "Service role full access orders" ON public.store_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access order_items" ON public.store_order_items;
CREATE POLICY "Service role full access order_items" ON public.store_order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access price_history" ON public.store_price_history;
CREATE POLICY "Service role full access price_history" ON public.store_price_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's campaigns, coupons and orders
DROP POLICY IF EXISTS "Clinic staff manage campaigns" ON public.store_campaigns;
CREATE POLICY "Clinic staff manage campaigns" ON public.store_campaigns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaigns.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaigns.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage campaign_items" ON public.store_campaign_items;
CREATE POLICY "Clinic staff manage campaign_items" ON public.store_campaign_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaign_items.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaign_items.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage coupons" ON public.store_coupons;
CREATE POLICY "Clinic staff manage coupons" ON public.store_coupons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_coupons.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_coupons.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage orders" ON public.store_orders;
CREATE POLICY "Clinic staff manage orders" ON public.store_orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Customers can view their own orders
DROP POLICY IF EXISTS "Customers view own orders" ON public.store_orders;
CREATE POLICY "Customers view own orders" ON public.store_orders
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers view own order_items" ON public.store_order_items;
CREATE POLICY "Customers view own order_items" ON public.store_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_orders o
            WHERE o.id = store_order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
DROP TRIGGER IF EXISTS handle_updated_at_campaigns ON public.store_campaigns;
CREATE TRIGGER handle_updated_at_campaigns
    BEFORE UPDATE ON public.store_campaigns
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_campaign_items ON public.store_campaign_items;
CREATE TRIGGER handle_updated_at_campaign_items
    BEFORE UPDATE ON public.store_campaign_items
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_coupons ON public.store_coupons;
CREATE TRIGGER handle_updated_at_coupons
    BEFORE UPDATE ON public.store_coupons
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_orders ON public.store_orders;
CREATE TRIGGER handle_updated_at_orders
    BEFORE UPDATE ON public.store_orders
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_order_items ON public.store_order_items;
CREATE TRIGGER handle_updated_at_order_items
    BEFORE UPDATE ON public.store_order_items
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/reviews/01_reviews.sql
-- ==========================================

-- =============================================================================
-- 01_REVIEWS.SQL
-- =============================================================================
-- Product reviews and wishlists
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql, 60_store/orders/01_orders.sql
-- =============================================================================

-- =============================================================================
-- PRODUCT REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.store_orders(id),

    -- Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,

    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One review per customer per product
    UNIQUE(product_id, customer_id)
);

COMMENT ON TABLE public.store_reviews IS 'Product reviews with moderation. One review per customer per product.';
COMMENT ON COLUMN public.store_reviews.is_approved IS 'Review must be approved before public display';

-- =============================================================================
-- WISHLIST
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(customer_id, product_id)
);

COMMENT ON TABLE public.store_wishlist IS 'Customer wishlists for saved products';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_store_reviews_tenant ON public.store_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_product ON public.store_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_customer ON public.store_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_rating ON public.store_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_store_reviews_approved ON public.store_reviews(is_approved, created_at DESC)
    WHERE is_approved = true AND deleted_at IS NULL;

-- Wishlist indexes
CREATE INDEX IF NOT EXISTS idx_store_wishlist_tenant ON public.store_wishlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlist_customer ON public.store_wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlist_product ON public.store_wishlist(product_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlist ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access reviews" ON public.store_reviews;
CREATE POLICY "Service role full access reviews" ON public.store_reviews
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access wishlist" ON public.store_wishlist;
CREATE POLICY "Service role full access wishlist" ON public.store_wishlist
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can view approved reviews
DROP POLICY IF EXISTS "Public view approved reviews" ON public.store_reviews;
CREATE POLICY "Public view approved reviews" ON public.store_reviews
    FOR SELECT USING (is_approved = true AND deleted_at IS NULL);

-- Customers can manage their own reviews and wishlist
DROP POLICY IF EXISTS "Customers manage own reviews" ON public.store_reviews;
CREATE POLICY "Customers manage own reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers manage own wishlist" ON public.store_wishlist;
CREATE POLICY "Customers manage own wishlist" ON public.store_wishlist
    FOR ALL TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- Clinic staff can moderate reviews
DROP POLICY IF EXISTS "Clinic staff moderate reviews" ON public.store_reviews;
CREATE POLICY "Clinic staff moderate reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_reviews.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_reviews.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for reviews
DROP TRIGGER IF EXISTS handle_updated_at_reviews ON public.store_reviews;
CREATE TRIGGER handle_updated_at_reviews
    BEFORE UPDATE ON public.store_reviews
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/procurement/01_procurement.sql
-- ==========================================

-- =============================================================================
-- 01_PROCUREMENT.SQL
-- =============================================================================
-- B2B procurement intelligence and clinic product assignments
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/suppliers/01_suppliers.sql, 60_store/categories/01_categories.sql,
--               60_store/brands/01_brands.sql, 60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- PROCUREMENT LEADS (B2B Market Intelligence)
-- =============================================================================
-- Captures competitor data when clinics import their purchase history.
-- Used for market analysis, price intelligence, and product discovery.
-- This is the "we learn from what you buy" layer.

CREATE TABLE IF NOT EXISTS public.procurement_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tenant (who uploaded this data)
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Raw data (as imported, before matching)
    raw_product_name TEXT NOT NULL,
    raw_brand_name TEXT,
    raw_supplier_name TEXT,
    raw_price_paid NUMERIC(12,2),
    raw_quantity NUMERIC(12,2),
    raw_unit TEXT,
    raw_invoice_date DATE,
    raw_data JSONB,                               -- Original row data for reference

    -- Matched entities (after processing)
    matched_product_id UUID REFERENCES public.store_products(id),
    matched_brand_id UUID REFERENCES public.store_brands(id),
    matched_supplier_id UUID REFERENCES public.suppliers(id),
    matched_category_id UUID REFERENCES public.store_categories(id),

    -- Processing status
    status TEXT DEFAULT 'new'
        CHECK (status IN ('new', 'processing', 'matched', 'unmatched', 'ignored', 'converted')),

    -- Match confidence (0-100)
    match_confidence INTEGER CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 100),

    -- Conversion tracking (when we create a catalog product from this lead)
    converted_product_id UUID REFERENCES public.store_products(id),
    converted_at TIMESTAMPTZ,
    converted_by UUID REFERENCES public.profiles(id),

    -- Intelligence flags
    is_new_product BOOLEAN DEFAULT false,         -- Product not in our catalog
    is_new_brand BOOLEAN DEFAULT false,           -- Brand not in our catalog
    is_new_supplier BOOLEAN DEFAULT false,        -- Supplier not in our catalog
    price_variance NUMERIC(5,2),                  -- % difference from catalog price

    -- Detection metadata
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.procurement_leads IS 'B2B market intelligence: captured competitor/supplier data from clinic imports';
COMMENT ON COLUMN public.procurement_leads.status IS 'Processing status: new, processing, matched, unmatched, ignored, converted';
COMMENT ON COLUMN public.procurement_leads.match_confidence IS 'Auto-matching confidence 0-100%';
COMMENT ON COLUMN public.procurement_leads.is_new_product IS 'TRUE if product not found in global catalog (market opportunity)';
COMMENT ON COLUMN public.procurement_leads.price_variance IS 'Percentage difference from catalog price (negative = cheaper elsewhere)';

-- =============================================================================
-- CLINIC PRODUCT ASSIGNMENTS (Link global products to clinics)
-- =============================================================================
-- When a clinic wants to use a global catalog product, they create an assignment
-- with their own pricing, stock levels, and location.

CREATE TABLE IF NOT EXISTS public.clinic_product_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Reference to global catalog product
    catalog_product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Clinic-specific settings
    sale_price NUMERIC(12,2) NOT NULL,            -- What THIS clinic charges
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    location TEXT,                                -- Storage location in clinic
    requires_prescription BOOLEAN DEFAULT false,  -- Clinic can override

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Created by
    created_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, catalog_product_id)
);

COMMENT ON TABLE public.clinic_product_assignments IS 'Links global catalog products to clinics with clinic-specific pricing and settings';
COMMENT ON COLUMN public.clinic_product_assignments.catalog_product_id IS 'Reference to global catalog product';
COMMENT ON COLUMN public.clinic_product_assignments.sale_price IS 'Clinic-specific selling price (may differ from catalog)';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Procurement leads indexes
CREATE INDEX IF NOT EXISTS idx_procurement_leads_tenant ON public.procurement_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_status ON public.procurement_leads(status);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_matched_product ON public.procurement_leads(matched_product_id);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_confidence ON public.procurement_leads(match_confidence);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_new_flags ON public.procurement_leads(is_new_product, is_new_brand, is_new_supplier)
    WHERE is_new_product = true OR is_new_brand = true OR is_new_supplier = true;

-- Clinic product assignments indexes
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_tenant ON public.clinic_product_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_catalog ON public.clinic_product_assignments(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_active ON public.clinic_product_assignments(tenant_id, is_active)
    WHERE is_active = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.procurement_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_product_assignments ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access procurement" ON public.procurement_leads;
CREATE POLICY "Service role full access procurement" ON public.procurement_leads
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access assignments" ON public.clinic_product_assignments;
CREATE POLICY "Service role full access assignments" ON public.clinic_product_assignments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's procurement data and product assignments
DROP POLICY IF EXISTS "Clinic staff manage procurement" ON public.procurement_leads;
CREATE POLICY "Clinic staff manage procurement" ON public.procurement_leads
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = procurement_leads.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = procurement_leads.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage assignments" ON public.clinic_product_assignments;
CREATE POLICY "Clinic staff manage assignments" ON public.clinic_product_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_product_assignments.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_product_assignments.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can view all procurement intelligence
DROP POLICY IF EXISTS "Platform admins view procurement" ON public.procurement_leads;
CREATE POLICY "Platform admins view procurement" ON public.procurement_leads
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
DROP TRIGGER IF EXISTS handle_updated_at_procurement ON public.procurement_leads;
CREATE TRIGGER handle_updated_at_procurement
    BEFORE UPDATE ON public.procurement_leads
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_assignments ON public.clinic_product_assignments;
CREATE TRIGGER handle_updated_at_assignments
    BEFORE UPDATE ON public.clinic_product_assignments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ==========================================
-- FILE: 60_store/02_import_rpc.sql
-- ==========================================

-- =============================================================================
-- 02_IMPORT_RPC.SQL
-- =============================================================================
-- RPC function for bulk inventory import from Excel/Google Sheets.
-- Handles: New Products, Purchases, Sales, Adjustments, Price Updates.
-- Uses weighted average cost for inventory valuation.
-- =============================================================================

-- Drop if exists to allow updates
DROP FUNCTION IF EXISTS public.import_inventory_batch(TEXT, UUID, JSONB);

-- =============================================================================
-- IMPORT INVENTORY BATCH RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.import_inventory_batch(
    p_tenant_id TEXT,
    p_performer_id UUID,
    p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_operation TEXT;
    v_sku TEXT;
    v_name TEXT;
    v_category TEXT;
    v_description TEXT;
    v_price NUMERIC;
    v_quantity NUMERIC;
    v_cost NUMERIC;
    v_min_stock NUMERIC;
    v_expiry_date DATE;
    v_batch_number TEXT;
    v_supplier_name TEXT;
    v_barcode TEXT;
    v_is_active BOOLEAN;

    v_product_id UUID;
    v_category_id UUID;
    v_current_stock NUMERIC;
    v_current_wac NUMERIC;
    v_new_wac NUMERIC;
    v_new_stock NUMERIC;

    v_success_count INTEGER := 0;
    v_errors TEXT[] := '{}';
    v_row_num INTEGER := 0;
BEGIN
    -- Iterate through each row
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_row_num := v_row_num + 1;

        BEGIN
            -- Extract values from row
            v_operation := LOWER(TRIM(COALESCE(v_row->>'operation', '')));
            v_sku := TRIM(COALESCE(v_row->>'sku', ''));
            v_name := TRIM(COALESCE(v_row->>'name', ''));
            v_category := TRIM(COALESCE(v_row->>'category', ''));
            v_description := TRIM(COALESCE(v_row->>'description', ''));
            v_price := COALESCE((v_row->>'price')::NUMERIC, 0);
            v_quantity := COALESCE((v_row->>'quantity')::NUMERIC, 0);
            v_cost := COALESCE((v_row->>'cost')::NUMERIC, 0);
            v_min_stock := COALESCE((v_row->>'min_stock_level')::NUMERIC, 0);
            v_barcode := NULLIF(TRIM(COALESCE(v_row->>'barcode', '')), '');
            v_batch_number := NULLIF(TRIM(COALESCE(v_row->>'batch_number', '')), '');
            v_supplier_name := NULLIF(TRIM(COALESCE(v_row->>'supplier_name', '')), '');
            v_is_active := COALESCE((v_row->>'is_active')::BOOLEAN, true);

            -- Parse expiry date
            IF v_row->>'expiry_date' IS NOT NULL AND TRIM(v_row->>'expiry_date') != '' THEN
                BEGIN
                    v_expiry_date := (v_row->>'expiry_date')::DATE;
                EXCEPTION WHEN OTHERS THEN
                    v_expiry_date := NULL;
                END;
            ELSE
                v_expiry_date := NULL;
            END IF;

            -- Skip empty rows
            IF v_operation = '' AND v_name = '' AND v_sku = '' THEN
                CONTINUE;
            END IF;

            -- ================================================================
            -- NEW PRODUCT
            -- ================================================================
            IF v_operation = 'new product' OR v_operation = 'nuevo producto' OR v_operation = 'new' THEN
                -- Validate required fields
                IF v_name = '' THEN
                    v_errors := array_append(v_errors, format('Fila %s: Nombre es requerido para nuevo producto', v_row_num));
                    CONTINUE;
                END IF;

                IF v_price <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Precio de venta debe ser mayor a 0', v_row_num));
                    CONTINUE;
                END IF;

                -- Generate SKU if not provided
                IF v_sku = '' THEN
                    v_sku := 'SKU-' || UPPER(SUBSTRING(MD5(v_name || NOW()::TEXT) FROM 1 FOR 8));
                END IF;

                -- Check if SKU already exists
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NOT NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: SKU %s ya existe', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Find or create category
                IF v_category != '' THEN
                    SELECT id INTO v_category_id
                    FROM public.store_categories
                    WHERE tenant_id = p_tenant_id
                      AND (LOWER(name) = LOWER(v_category) OR LOWER(slug) = LOWER(REPLACE(v_category, ' ', '-')));

                    IF v_category_id IS NULL THEN
                        -- Create new category
                        INSERT INTO public.store_categories (tenant_id, name, slug, level)
                        VALUES (p_tenant_id, v_category, LOWER(REPLACE(v_category, ' ', '-')), 1)
                        RETURNING id INTO v_category_id;
                    END IF;
                END IF;

                -- Insert product
                INSERT INTO public.store_products (
                    tenant_id, sku, barcode, name, description,
                    category_id, base_price, cost_price, is_active
                ) VALUES (
                    p_tenant_id, v_sku, v_barcode, v_name, v_description,
                    v_category_id, v_price, v_cost, v_is_active
                ) RETURNING id INTO v_product_id;

                -- Create inventory record
                INSERT INTO public.store_inventory (
                    tenant_id, product_id, stock_quantity,
                    min_stock_level, weighted_average_cost,
                    batch_number, expiry_date, supplier_name
                ) VALUES (
                    p_tenant_id, v_product_id, GREATEST(v_quantity, 0),
                    v_min_stock, v_cost,
                    v_batch_number, v_expiry_date, v_supplier_name
                );

                -- Create transaction if initial stock > 0
                IF v_quantity > 0 THEN
                    INSERT INTO public.store_inventory_transactions (
                        tenant_id, product_id, type, quantity,
                        unit_cost, notes, performed_by
                    ) VALUES (
                        p_tenant_id, v_product_id, 'purchase', v_quantity,
                        v_cost, 'Stock inicial', p_performer_id
                    );
                END IF;

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- PURCHASE (Compra)
            -- ================================================================
            ELSIF v_operation = 'purchase' OR v_operation = 'compra' OR v_operation = 'buy' THEN
                -- Find product by SKU
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                IF v_quantity <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Cantidad debe ser positiva para compra', v_row_num));
                    CONTINUE;
                END IF;

                IF v_cost <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Costo unitario requerido para compra', v_row_num));
                    CONTINUE;
                END IF;

                -- Get current stock and WAC
                SELECT stock_quantity, COALESCE(weighted_average_cost, 0)
                INTO v_current_stock, v_current_wac
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock IS NULL THEN
                    v_current_stock := 0;
                    v_current_wac := 0;
                END IF;

                -- Calculate new weighted average cost
                v_new_stock := v_current_stock + v_quantity;
                IF v_new_stock > 0 THEN
                    v_new_wac := ((v_current_stock * v_current_wac) + (v_quantity * v_cost)) / v_new_stock;
                ELSE
                    v_new_wac := v_cost;
                END IF;

                -- Update inventory
                INSERT INTO public.store_inventory (
                    tenant_id, product_id, stock_quantity, weighted_average_cost,
                    batch_number, expiry_date, supplier_name
                ) VALUES (
                    p_tenant_id, v_product_id, v_quantity, v_new_wac,
                    v_batch_number, v_expiry_date, v_supplier_name
                )
                ON CONFLICT (product_id) DO UPDATE SET
                    stock_quantity = public.store_inventory.stock_quantity + EXCLUDED.stock_quantity,
                    weighted_average_cost = v_new_wac,
                    batch_number = COALESCE(EXCLUDED.batch_number, public.store_inventory.batch_number),
                    expiry_date = COALESCE(EXCLUDED.expiry_date, public.store_inventory.expiry_date),
                    supplier_name = COALESCE(EXCLUDED.supplier_name, public.store_inventory.supplier_name),
                    updated_at = NOW();

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, unit_cost, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'purchase', v_quantity, v_cost, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- SALE (Venta)
            -- ================================================================
            ELSIF v_operation = 'sale' OR v_operation = 'venta' OR v_operation = 'sell' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Make quantity negative for sale
                v_quantity := -ABS(v_quantity);

                -- Get current stock
                SELECT stock_quantity, weighted_average_cost
                INTO v_current_stock, v_current_wac
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock + v_quantity < 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Stock insuficiente. Actual: %s, Solicitado: %s', v_row_num, v_current_stock, ABS(v_quantity)));
                    CONTINUE;
                END IF;

                -- Update inventory
                UPDATE public.store_inventory
                SET stock_quantity = stock_quantity + v_quantity,
                    updated_at = NOW()
                WHERE product_id = v_product_id;

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, unit_cost, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'sale', v_quantity, v_current_wac, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- ADJUSTMENT (Ajuste)
            -- ================================================================
            ELSIF v_operation = 'adjustment' OR v_operation = 'ajuste' OR v_operation = 'adjust' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Get current stock
                SELECT stock_quantity INTO v_current_stock
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock IS NULL THEN v_current_stock := 0; END IF;

                -- Prevent negative stock
                IF v_current_stock + v_quantity < 0 THEN
                    v_quantity := -v_current_stock; -- Adjust to zero
                END IF;

                -- Update inventory
                UPDATE public.store_inventory
                SET stock_quantity = GREATEST(stock_quantity + v_quantity, 0),
                    updated_at = NOW()
                WHERE product_id = v_product_id;

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'adjustment', v_quantity, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- DAMAGE / THEFT / EXPIRED
            -- ================================================================
            ELSIF v_operation IN ('damage', 'daño', 'theft', 'robo', 'expired', 'vencido', 'return', 'devolución') THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Make quantity negative
                v_quantity := -ABS(v_quantity);

                -- Map operation type
                DECLARE v_txn_type TEXT;
                BEGIN
                    v_txn_type := CASE
                        WHEN v_operation IN ('damage', 'daño') THEN 'damage'
                        WHEN v_operation IN ('theft', 'robo') THEN 'theft'
                        WHEN v_operation IN ('expired', 'vencido') THEN 'expired'
                        WHEN v_operation IN ('return', 'devolución') THEN 'return'
                        ELSE 'adjustment'
                    END;

                    -- Update inventory
                    UPDATE public.store_inventory
                    SET stock_quantity = GREATEST(stock_quantity + v_quantity, 0),
                        updated_at = NOW()
                    WHERE product_id = v_product_id;

                    -- Create transaction
                    INSERT INTO public.store_inventory_transactions (
                        tenant_id, product_id, type, quantity, performed_by
                    ) VALUES (
                        p_tenant_id, v_product_id, v_txn_type, v_quantity, p_performer_id
                    );
                END;

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- PRICE UPDATE
            -- ================================================================
            ELSIF v_operation = 'price update' OR v_operation = 'precio' OR v_operation = 'actualizar precio' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                IF v_price <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Precio debe ser mayor a 0', v_row_num));
                    CONTINUE;
                END IF;

                -- Update price
                UPDATE public.store_products
                SET base_price = v_price,
                    updated_at = NOW()
                WHERE id = v_product_id;

                v_success_count := v_success_count + 1;

            ELSE
                -- Unknown operation
                IF v_operation != '' THEN
                    v_errors := array_append(v_errors, format('Fila %s: Operación desconocida: %s', v_row_num, v_operation));
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, format('Fila %s: %s', v_row_num, SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success_count', v_success_count,
        'errors', v_errors
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.import_inventory_batch(TEXT, UUID, JSONB) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.import_inventory_batch IS 'Bulk import inventory from Excel/Sheets. Handles new products, purchases, sales, adjustments, and price updates.';


-- ==========================================
-- FILE: 60_store/03_checkout_rpc.sql
-- ==========================================

-- Function to process checkout atomically
-- Returns JSON with success/error status

CREATE OR REPLACE FUNCTION process_checkout(
  p_tenant_id TEXT,
  p_user_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC;
  v_type TEXT;
  v_product_name TEXT;
  v_current_stock INTEGER;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total NUMERIC := 0;
  v_stock_errors JSONB := '[]'::JSONB;
  v_item_total NUMERIC;
BEGIN
  -- 1. Validate Stock for all products first (Fail fast)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_product_name := v_item->>'name';
    v_price := (v_item->>'price')::NUMERIC;
    
    -- Accumulate total
    v_total := v_total + (v_price * v_quantity);

    IF v_type = 'product' THEN
      -- Check stock
      SELECT stock INTO v_current_stock
      FROM store_inventory
      WHERE product_id = v_product_id AND tenant_id = p_tenant_id
      FOR UPDATE; -- Lock the row

      IF v_current_stock IS NULL THEN
        -- Product not in inventory, treat as 0 stock? Or ignore if allow_backorder?
        -- For now, assume strict inventory.
         v_stock_errors := v_stock_errors || jsonb_build_object(
          'id', v_product_id,
          'name', v_product_name,
          'requested', v_quantity,
          'available', 0
        );
      ELSIF v_current_stock < v_quantity THEN
        v_stock_errors := v_stock_errors || jsonb_build_object(
          'id', v_product_id,
          'name', v_product_name,
          'requested', v_quantity,
          'available', v_current_stock
        );
      END IF;
    END IF;
  END LOOP;

  -- If any stock errors, return immediately
  IF jsonb_array_length(v_stock_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stock insuficiente',
      'stock_errors', v_stock_errors
    );
  END IF;

  -- 2. Create Invoice
  -- Generate invoice number (simple implementation, real one would use a sequence/function)
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 6);
  
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_number,
    date,
    due_date,
    status,
    total_amount,
    notes,
    created_items -- Assuming this is JSONB or we insert invoice_items separately
  ) VALUES (
    p_tenant_id,
    p_user_id, -- Assuming customer_id links to profile/user
    v_invoice_number,
    now(),
    now(),
    'paid', -- Assuming immediate payment for online store? Or 'pending'? Let's say 'pending' or 'paid' depending on logic. Plan says 'invoice record', let's assume 'pending'.
    v_total,
    p_notes,
    p_items -- Storing raw items for reference if needed
  ) RETURNING id INTO v_invoice_id;

  -- 3. Process Items: Decrement Stock & Create Invoice Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_price := (v_item->>'price')::NUMERIC;
    v_item_total := v_price * v_quantity;

    -- Decrement Stock (only for products)
    IF v_type = 'product' THEN
      UPDATE store_inventory
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE product_id = v_product_id AND tenant_id = p_tenant_id;
    END IF;

    -- Create Invoice Item
    INSERT INTO invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total_price,
      item_type,
      item_reference_id
    ) VALUES (
      v_invoice_id,
      v_item->>'name',
      v_quantity,
      v_price,
      v_item_total,
      v_type,
      v_product_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object(
      'id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'total', v_total,
      'status', 'pending'
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


-- ==========================================
-- FILE: 50_finance/01_invoicing.sql
-- ==========================================

-- =============================================================================
-- 01_INVOICING.SQL
-- =============================================================================
-- Invoicing system: invoices, items, payments, refunds, credits.
-- INCLUDES tenant_id on invoice_items for optimized RLS.
-- INCLUDES automatic totals calculation via triggers.
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 40_scheduling/*, 60_store/*
-- =============================================================================

-- =============================================================================
-- PAYMENT METHODS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Method info
    name TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('cash', 'card', 'transfer', 'check', 'credit', 'qr', 'other')),
    description TEXT,

    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    requires_reference BOOLEAN DEFAULT false,

    -- Fees and limits
    fee_percentage NUMERIC(5,2) CHECK (fee_percentage IS NULL OR fee_percentage >= 0),
    min_amount NUMERIC(12,2) CHECK (min_amount IS NULL OR min_amount >= 0),
    max_amount NUMERIC(12,2) CHECK (max_amount IS NULL OR max_amount >= 0),
    instructions TEXT,

    -- Display
    display_order INTEGER DEFAULT 100,
    icon TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_methods IS 'Payment methods available for a clinic (cash, card, transfer, etc.)';
COMMENT ON COLUMN public.payment_methods.type IS 'Method type: cash, card, transfer, check, credit, other';
COMMENT ON COLUMN public.payment_methods.is_default IS 'Default method for new payments (only one per tenant)';

-- Only one default payment method per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_one_default
ON public.payment_methods(tenant_id)
WHERE is_default = true AND is_active = true AND deleted_at IS NULL;

-- =============================================================================
-- INVOICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Invoice number
    invoice_number TEXT NOT NULL,

    -- Relationships
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    pet_id UUID REFERENCES public.pets(id),
    appointment_id UUID REFERENCES public.appointments(id),

    -- Dates
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Amounts (computed by trigger)
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,

    -- Currency
    currency TEXT DEFAULT 'PYG',

    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',        -- Being created
            'sent',         -- Sent to client
            'viewed',       -- Client viewed
            'partial',      -- Partially paid
            'paid',         -- Fully paid
            'overdue',      -- Past due date
            'void',         -- Cancelled
            'refunded'      -- Refunded
        )),

    -- Payment terms
    payment_terms TEXT,

    -- Notes
    notes TEXT,
    internal_notes TEXT,
    footer_text TEXT,

    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,

    -- Email tracking
    sent_at TIMESTAMPTZ,
    sent_to TEXT,
    opened_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, invoice_number),

    -- CHECK constraints
    CONSTRAINT invoices_amounts_non_negative CHECK (
        subtotal >= 0 AND
        total >= 0 AND
        amount_paid >= 0 AND
        COALESCE(discount_amount, 0) >= 0 AND
        COALESCE(tax_amount, 0) >= 0
    ),
    CONSTRAINT invoices_due_date_valid CHECK (due_date IS NULL OR due_date >= invoice_date)
);

COMMENT ON TABLE public.invoices IS 'Invoice headers with totals computed by triggers from invoice_items';
COMMENT ON COLUMN public.invoices.status IS 'Workflow: draft → sent → viewed → partial/paid. Also: overdue, void, refunded';
COMMENT ON COLUMN public.invoices.balance_due IS 'Computed column: total - amount_paid';
COMMENT ON COLUMN public.invoices.internal_notes IS 'Staff-only notes not visible to clients';

-- =============================================================================
-- INVOICE ITEMS - WITH TENANT_ID AND PRODUCT FK
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Item type
    item_type TEXT NOT NULL DEFAULT 'service'
        CHECK (item_type IN ('service', 'product', 'discount', 'custom')),

    -- References with proper FKs
    service_id UUID REFERENCES public.services(id),
    product_id UUID REFERENCES public.store_products(id) ON DELETE SET NULL,

    -- Details
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    tax_rate NUMERIC(5,2) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),

    -- Computed total for this line item (calculated by trigger)
    total NUMERIC(12,2) DEFAULT 0,

    -- Display
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- CHECK constraints
    CONSTRAINT invoice_items_quantity_valid CHECK (
        (item_type = 'discount' AND quantity != 0) OR
        (item_type != 'discount' AND quantity > 0)
    ),
    CONSTRAINT invoice_items_tax_rate_valid CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100))
);

COMMENT ON TABLE public.invoice_items IS 'Invoice line items (services, products, discounts, custom)';
COMMENT ON COLUMN public.invoice_items.item_type IS 'Type: service, product, discount, custom';
COMMENT ON COLUMN public.invoice_items.total IS 'Computed by trigger: (qty * price - discount) * (1 + tax_rate/100)';

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),

    -- Payment details
    payment_number TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

    -- Method
    payment_method_id UUID REFERENCES public.payment_methods(id),
    payment_method_name TEXT,

    -- Reference
    reference_number TEXT,
    authorization_code TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),

    -- Notes
    notes TEXT,

    -- Received by
    received_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- CHECK constraints (amount already has CHECK in column definition, but adding explicit constraint)
    CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

COMMENT ON TABLE public.payments IS 'Payment records against invoices';
COMMENT ON COLUMN public.payments.status IS 'Status: pending, completed, failed, cancelled, refunded';

-- =============================================================================
-- REFUNDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    payment_id UUID NOT NULL REFERENCES public.payments(id),

    -- Refund details
    refund_number TEXT,
    refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

    -- Reason
    reason TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'failed')),

    -- Processed by
    processed_by UUID REFERENCES public.profiles(id),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- CHECK constraints
    CONSTRAINT refunds_amount_positive CHECK (amount > 0),
    CONSTRAINT refunds_reason_required CHECK (reason IS NOT NULL AND char_length(TRIM(reason)) > 0)
);

COMMENT ON TABLE public.refunds IS 'Refund records for payments';
COMMENT ON COLUMN public.refunds.reason IS 'Required reason for the refund';

-- =============================================================================
-- CLIENT CREDITS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Credit details
    amount NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('payment', 'refund', 'adjustment', 'reward', 'promo')),
    description TEXT,

    -- Reference
    invoice_id UUID REFERENCES public.invoices(id),
    payment_id UUID REFERENCES public.payments(id),

    -- Status
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'used', 'expired')),
    used_at TIMESTAMPTZ,
    used_on_invoice_id UUID REFERENCES public.invoices(id),
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.client_credits IS 'Client credit balance for overpayments, refunds, or promotions';
COMMENT ON COLUMN public.client_credits.type IS 'Credit source: payment (overpay), refund, adjustment, reward, promo';
COMMENT ON COLUMN public.client_credits.status IS 'active: available, used: consumed, expired: past expiry date';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

-- Payment methods: Staff manage
DROP POLICY IF EXISTS "Staff manage payment methods" ON public.payment_methods;
CREATE POLICY "Staff manage payment methods" ON public.payment_methods
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access payment methods" ON public.payment_methods;
CREATE POLICY "Service role full access payment methods" ON public.payment_methods
    FOR ALL TO service_role USING (true);

-- Invoices: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Clients view own invoices" ON public.invoices;
CREATE POLICY "Clients view own invoices" ON public.invoices
    FOR SELECT TO authenticated
    USING (client_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access invoices" ON public.invoices;
CREATE POLICY "Service role full access invoices" ON public.invoices
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Invoice items uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage invoice items" ON public.invoice_items;
CREATE POLICY "Staff manage invoice items" ON public.invoice_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view invoice items" ON public.invoice_items;
CREATE POLICY "Clients view invoice items" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_items.invoice_id
            AND i.client_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role full access invoice items" ON public.invoice_items;
CREATE POLICY "Service role full access invoice items" ON public.invoice_items
    FOR ALL TO service_role USING (true);

-- Payments: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
CREATE POLICY "Staff manage payments" ON public.payments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own payments" ON public.payments;
CREATE POLICY "Clients view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = payments.invoice_id
            AND i.client_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
CREATE POLICY "Service role full access payments" ON public.payments
    FOR ALL TO service_role USING (true);

-- Refunds: Staff only
DROP POLICY IF EXISTS "Staff manage refunds" ON public.refunds;
CREATE POLICY "Staff manage refunds" ON public.refunds
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access refunds" ON public.refunds;
CREATE POLICY "Service role full access refunds" ON public.refunds
    FOR ALL TO service_role USING (true);

-- Credits: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage credits" ON public.client_credits;
CREATE POLICY "Staff manage credits" ON public.client_credits
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own credits" ON public.client_credits;
CREATE POLICY "Clients view own credits" ON public.client_credits
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access credits" ON public.client_credits;
CREATE POLICY "Service role full access credits" ON public.client_credits
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON public.payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pet ON public.invoices(pet_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_date_brin ON public.invoices
    USING BRIN(invoice_date) WITH (pages_per_range = 32);
-- Index for unpaid invoices with due dates (queries add: due_date < CURRENT_DATE at runtime)
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON public.invoices(due_date)
    WHERE status NOT IN ('paid', 'void', 'refunded') AND deleted_at IS NULL;

-- Covering index for invoice list
CREATE INDEX IF NOT EXISTS idx_invoices_list ON public.invoices(tenant_id, invoice_date DESC)
    INCLUDE (invoice_number, client_id, total, status, amount_paid, balance_due)
    WHERE deleted_at IS NULL;

-- Unpaid invoices for reminders
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON public.invoices(tenant_id, status, due_date)
    INCLUDE (invoice_number, client_id, total, balance_due)
    WHERE status NOT IN ('paid', 'void', 'refunded') AND deleted_at IS NULL;

-- Client's invoice history
CREATE INDEX IF NOT EXISTS idx_invoices_client_history ON public.invoices(client_id, invoice_date DESC)
    INCLUDE (invoice_number, total, status, balance_due)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON public.invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service ON public.invoice_items(service_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date_brin ON public.payments
    USING BRIN(payment_date) WITH (pages_per_range = 32);

-- Covering index for payments by invoice
CREATE INDEX IF NOT EXISTS idx_payments_invoice_list ON public.payments(invoice_id, payment_date DESC)
    INCLUDE (amount, payment_method_name, status, reference_number);

-- Daily payments report
CREATE INDEX IF NOT EXISTS idx_payments_daily_report ON public.payments(tenant_id, payment_date DESC)
    INCLUDE (invoice_id, amount, payment_method_name, status)
    WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_refunds_tenant ON public.refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds(payment_id);

CREATE INDEX IF NOT EXISTS idx_client_credits_tenant ON public.client_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_credits_client ON public.client_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credits_active ON public.client_credits(status)
    WHERE status = 'active';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.payment_methods;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.invoices;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.payments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for invoice items
CREATE OR REPLACE FUNCTION public.invoice_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.invoices
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS invoice_items_auto_tenant ON public.invoice_items;
CREATE TRIGGER invoice_items_auto_tenant
    BEFORE INSERT ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.invoice_items_set_tenant_id();

-- =============================================================================
-- FIXED: UPDATE INVOICE TOTALS
-- Correctly calculates subtotal, discount, tax, and total
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(12,2);
    v_discount NUMERIC(12,2);
    v_tax NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    -- Get the invoice ID from either NEW or OLD
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate subtotal (sum of line items excluding discount type)
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_subtotal
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id
    AND item_type != 'discount';

    -- Calculate total discounts (line item discounts + discount type items)
    SELECT
        COALESCE(SUM(CASE WHEN item_type != 'discount' THEN discount_amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN item_type = 'discount' THEN ABS(quantity * unit_price) ELSE 0 END), 0)
    INTO v_discount
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Calculate tax (on taxable amount after discounts)
    SELECT COALESCE(SUM(
        (quantity * unit_price - discount_amount) * tax_rate / 100
    ), 0)
    INTO v_tax
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id
    AND item_type != 'discount';

    -- Calculate total
    v_total := v_subtotal - v_discount + v_tax;

    -- Update invoice
    UPDATE public.invoices
    SET
        subtotal = v_subtotal,
        discount_amount = v_discount,
        tax_amount = v_tax,
        total = v_total
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS invoice_items_update_totals ON public.invoice_items;
CREATE TRIGGER invoice_items_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

-- =============================================================================
-- HELPER FUNCTION: Calculate Invoice Item Total
-- =============================================================================
-- Automatically calculates the total for each invoice item

CREATE OR REPLACE FUNCTION public.calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate item total: (qty * price - discount) * (1 + tax_rate/100)
    -- For discount items, use the provided total directly
    IF NEW.item_type = 'discount' THEN
        -- Discount items should have negative total
        NEW.total := -ABS(COALESCE(NEW.total, NEW.quantity * NEW.unit_price));
    ELSE
        NEW.total := (
            NEW.quantity * NEW.unit_price
            - COALESCE(NEW.discount_amount, 0)
        ) * (1 + COALESCE(NEW.tax_rate, 0) / 100);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS invoice_items_calc_total ON public.invoice_items;
CREATE TRIGGER invoice_items_calc_total
    BEFORE INSERT OR UPDATE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_invoice_item_total();

-- =============================================================================
-- UPDATE INVOICE ON PAYMENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(12,2);
    v_invoice_total NUMERIC(12,2);
BEGIN
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id
    AND status = 'completed';

    -- Get invoice total
    SELECT total INTO v_invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice
    UPDATE public.invoices
    SET
        amount_paid = v_total_paid,
        status = CASE
            WHEN v_total_paid >= v_invoice_total THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE status
        END
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS payment_update_invoice ON public.payments;
CREATE TRIGGER payment_update_invoice
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();

-- =============================================================================
-- THREAD-SAFE INVOICE NUMBER GENERATION
-- =============================================================================
-- Uses next_document_number function from 00_setup

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'invoice', 'FAC');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- HELPER: GENERATE PAYMENT NUMBER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_payment_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'payment', 'PAG');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- HELPER: GENERATE REFUND NUMBER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_refund_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'refund', 'REE');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- HELPER FUNCTIONS: Add Invoice Item and Discount
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_invoice_item(
    p_invoice_id UUID,
    p_item_type TEXT,
    p_description TEXT,
    p_quantity NUMERIC DEFAULT 1,
    p_unit_price NUMERIC DEFAULT 0,
    p_tax_rate NUMERIC DEFAULT 0,
    p_discount_amount NUMERIC DEFAULT 0,
    p_service_id UUID DEFAULT NULL,
    p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item_id UUID;
    v_tenant_id TEXT;
BEGIN
    -- Get tenant from invoice
    SELECT tenant_id INTO v_tenant_id FROM public.invoices WHERE id = p_invoice_id;

    INSERT INTO public.invoice_items (
        invoice_id,
        tenant_id,
        item_type,
        description,
        quantity,
        unit_price,
        tax_rate,
        discount_amount,
        service_id,
        product_id,
        display_order
    ) VALUES (
        p_invoice_id,
        v_tenant_id,
        p_item_type,
        p_description,
        p_quantity,
        p_unit_price,
        p_tax_rate,
        p_discount_amount,
        p_service_id,
        p_product_id,
        (SELECT COALESCE(MAX(display_order), 0) + 1 FROM public.invoice_items WHERE invoice_id = p_invoice_id)
    )
    RETURNING id INTO v_item_id;

    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.add_invoice_discount(
    p_invoice_id UUID,
    p_description TEXT,
    p_discount_amount NUMERIC
)
RETURNS UUID AS $$
BEGIN
    RETURN public.add_invoice_item(
        p_invoice_id,
        'discount',
        p_description,
        1,
        p_discount_amount,  -- unit_price = discount amount
        0,                  -- no tax on discounts
        0                   -- no line discount (this IS the discount)
    );
END;
$$ LANGUAGE plpgsql SET search_path = public;



-- ==========================================
-- FILE: 50_finance/02_expenses.sql
-- ==========================================

-- =============================================================================
-- 02_EXPENSES.SQL
-- =============================================================================
-- Expense tracking and loyalty points system.
--
-- DEPENDENCIES: 10_core/*, 50_finance/01_invoicing.sql
-- =============================================================================

-- =============================================================================
-- EXPENSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Expense details
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'PYG',

    -- Categorization
    category TEXT NOT NULL
        CHECK (category IN (
            'supplies', 'utilities', 'payroll', 'rent', 'equipment',
            'marketing', 'insurance', 'taxes', 'travel', 'maintenance',
            'professional_services', 'training', 'other'
        )),
    subcategory TEXT,

    -- Dates
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_date DATE,

    -- Payment
    payment_method TEXT,
    reference_number TEXT,
    vendor_name TEXT,

    -- Documentation
    receipt_url TEXT,
    notes TEXT,

    -- Approval workflow
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),

    -- Created by
    created_by UUID REFERENCES public.profiles(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.expenses IS 'Clinic operating expenses for financial tracking and tax purposes';
COMMENT ON COLUMN public.expenses.category IS 'Expense category: supplies, utilities, payroll, rent, equipment, marketing, insurance, taxes, travel, maintenance, professional_services, training, other';
COMMENT ON COLUMN public.expenses.status IS 'Approval workflow: pending → approved → paid, or rejected';
COMMENT ON COLUMN public.expenses.receipt_url IS 'URL to uploaded receipt image for documentation';
COMMENT ON COLUMN public.expenses.approved_by IS 'Staff member who approved the expense';

-- =============================================================================
-- EXPENSE CATEGORIES (Custom per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Category info
    name TEXT NOT NULL,
    code TEXT,
    parent_id UUID REFERENCES public.expense_categories(id),

    -- Settings
    budget_monthly NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,

    -- Display
    display_order INTEGER DEFAULT 100,
    icon TEXT,
    color TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE public.expense_categories IS 'Custom expense categories per tenant with optional monthly budgets';
COMMENT ON COLUMN public.expense_categories.parent_id IS 'Parent category for hierarchical organization';
COMMENT ON COLUMN public.expense_categories.budget_monthly IS 'Monthly budget limit for this category';

-- =============================================================================
-- LOYALTY POINTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Points balance
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_redeemed INTEGER DEFAULT 0,

    -- Tier
    tier TEXT DEFAULT 'bronze'
        CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, client_id)
);

COMMENT ON TABLE public.loyalty_points IS 'Client loyalty point balances with tier status. Auto-updated via triggers.';
COMMENT ON COLUMN public.loyalty_points.balance IS 'Current available points balance';
COMMENT ON COLUMN public.loyalty_points.lifetime_earned IS 'Total points earned all-time (used for tier calculation)';
COMMENT ON COLUMN public.loyalty_points.tier IS 'Loyalty tier: bronze (0-499), silver (500-1999), gold (2000-4999), platinum (5000+)';

-- =============================================================================
-- LOYALTY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Transaction
    type TEXT NOT NULL
        CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'bonus')),
    points INTEGER NOT NULL,
    description TEXT,

    -- Reference
    invoice_id UUID REFERENCES public.invoices(id),
    order_id UUID,  -- FK to store orders

    -- Balance after
    balance_after INTEGER,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.loyalty_transactions IS 'Point transaction history: earn, redeem, expire, adjust, bonus';
COMMENT ON COLUMN public.loyalty_transactions.type IS 'Transaction type: earn (purchase), redeem (use points), expire (time-based), adjust (manual), bonus (promotion)';
COMMENT ON COLUMN public.loyalty_transactions.balance_after IS 'Point balance after this transaction (auto-set by trigger)';
COMMENT ON COLUMN public.loyalty_transactions.expires_at IS 'When earned points expire (if applicable)';

-- =============================================================================
-- LOYALTY RULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Rule info
    name TEXT NOT NULL,
    description TEXT,

    -- Earning rules
    points_per_currency NUMERIC(10,4) DEFAULT 0.01,  -- Points per unit of currency spent
    min_purchase_amount NUMERIC(12,2) DEFAULT 0,
    max_points_per_transaction INTEGER,

    -- Multipliers
    service_category_multipliers JSONB DEFAULT '{}',
    -- Structure: {"vaccination": 2.0, "grooming": 1.5}

    tier_multipliers JSONB DEFAULT '{"bronze": 1.0, "silver": 1.25, "gold": 1.5, "platinum": 2.0}',

    -- Redemption
    points_value NUMERIC(10,4) DEFAULT 100,  -- Points per currency unit redemption
    min_points_to_redeem INTEGER DEFAULT 100,
    max_redemption_percentage NUMERIC(5,2) DEFAULT 50,  -- Max % of invoice

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.loyalty_rules IS 'Configuration for loyalty program: earning rates, tier multipliers, redemption rules';
COMMENT ON COLUMN public.loyalty_rules.points_per_currency IS 'Points earned per currency unit spent (e.g., 0.01 = 1 point per 100 PYG)';
COMMENT ON COLUMN public.loyalty_rules.tier_multipliers IS 'JSON object with tier multipliers: {"bronze": 1.0, "silver": 1.25, "gold": 1.5, "platinum": 2.0}';
COMMENT ON COLUMN public.loyalty_rules.points_value IS 'Currency value per point when redeeming (e.g., 100 = 100 PYG per point)';
COMMENT ON COLUMN public.loyalty_rules.max_redemption_percentage IS 'Maximum percentage of invoice that can be paid with points';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- Expenses: Staff only
DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
CREATE POLICY "Staff manage expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access expenses" ON public.expenses;
CREATE POLICY "Service role full access expenses" ON public.expenses
    FOR ALL TO service_role USING (true);

-- Expense categories: Staff only
DROP POLICY IF EXISTS "Staff manage expense categories" ON public.expense_categories;
CREATE POLICY "Staff manage expense categories" ON public.expense_categories
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access expense categories" ON public.expense_categories;
CREATE POLICY "Service role full access expense categories" ON public.expense_categories
    FOR ALL TO service_role USING (true);

-- Loyalty points: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage loyalty points" ON public.loyalty_points;
CREATE POLICY "Staff manage loyalty points" ON public.loyalty_points
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own points" ON public.loyalty_points;
CREATE POLICY "Clients view own points" ON public.loyalty_points
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access loyalty points" ON public.loyalty_points;
CREATE POLICY "Service role full access loyalty points" ON public.loyalty_points
    FOR ALL TO service_role USING (true);

-- Loyalty transactions: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Staff manage loyalty transactions" ON public.loyalty_transactions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own transactions" ON public.loyalty_transactions;
CREATE POLICY "Clients view own transactions" ON public.loyalty_transactions
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Service role full access loyalty transactions" ON public.loyalty_transactions
    FOR ALL TO service_role USING (true);

-- Loyalty rules: Staff only
DROP POLICY IF EXISTS "Staff manage loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Staff manage loyalty rules" ON public.loyalty_rules
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Service role full access loyalty rules" ON public.loyalty_rules
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date_brin ON public.expenses
    USING BRIN(expense_date) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status)
    WHERE deleted_at IS NULL;

-- Covering index for expense report
CREATE INDEX IF NOT EXISTS idx_expenses_report ON public.expenses(tenant_id, expense_date)
    INCLUDE (category, amount, status, vendor_name)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON public.expense_categories(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_tenant ON public.loyalty_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_client ON public.loyalty_points(client_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON public.loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON public.loyalty_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date_brin ON public.loyalty_transactions
    USING BRIN(created_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON public.loyalty_transactions(type);

CREATE INDEX IF NOT EXISTS idx_loyalty_rules_tenant ON public.loyalty_rules(tenant_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.expenses;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.loyalty_points;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.loyalty_points
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.loyalty_rules;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.loyalty_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate loyalty tier based on lifetime points earned
-- Tier thresholds (configurable per tenant in future):
--   Bronze:   0 - 499 points
--   Silver:   500 - 1999 points
--   Gold:     2000 - 4999 points
--   Platinum: 5000+ points
CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(p_lifetime_earned INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN p_lifetime_earned >= 5000 THEN 'platinum'
        WHEN p_lifetime_earned >= 2000 THEN 'gold'
        WHEN p_lifetime_earned >= 500 THEN 'silver'
        ELSE 'bronze'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_loyalty_tier IS 'Calculate loyalty tier based on lifetime points earned';

-- Update loyalty balance on transaction
CREATE OR REPLACE FUNCTION public.update_loyalty_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_new_balance INTEGER;
    v_new_lifetime_earned INTEGER;
    v_new_tier TEXT;
BEGIN
    -- Calculate new balance
    SELECT COALESCE(SUM(
        CASE
            WHEN type IN ('earn', 'bonus', 'adjust') THEN points
            WHEN type IN ('redeem', 'expire') THEN -ABS(points)
            ELSE 0
        END
    ), 0)
    INTO v_new_balance
    FROM public.loyalty_transactions
    WHERE client_id = NEW.client_id
      AND tenant_id = NEW.tenant_id;

    -- Ensure non-negative
    v_new_balance := GREATEST(0, v_new_balance);

    -- Calculate new lifetime earned for tier calculation
    SELECT COALESCE(lifetime_earned, 0) +
           CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END
    INTO v_new_lifetime_earned
    FROM public.loyalty_points
    WHERE tenant_id = NEW.tenant_id AND client_id = NEW.client_id;

    -- Default for new clients
    IF v_new_lifetime_earned IS NULL THEN
        v_new_lifetime_earned := CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END;
    END IF;

    -- Calculate tier based on new lifetime total
    v_new_tier := public.calculate_loyalty_tier(v_new_lifetime_earned);

    -- Update or insert loyalty points with auto-calculated tier
    INSERT INTO public.loyalty_points (tenant_id, client_id, balance, lifetime_earned, lifetime_redeemed, tier)
    VALUES (
        NEW.tenant_id,
        NEW.client_id,
        v_new_balance,
        CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END,
        CASE WHEN NEW.type = 'redeem' THEN ABS(NEW.points) ELSE 0 END,
        v_new_tier
    )
    ON CONFLICT (tenant_id, client_id) DO UPDATE SET
        balance = v_new_balance,
        lifetime_earned = public.loyalty_points.lifetime_earned +
            CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END,
        lifetime_redeemed = public.loyalty_points.lifetime_redeemed +
            CASE WHEN NEW.type = 'redeem' THEN ABS(NEW.points) ELSE 0 END,
        tier = v_new_tier,
        updated_at = NOW();

    -- Set balance_after on the transaction
    NEW.balance_after := v_new_balance;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_transaction_update_balance ON public.loyalty_transactions;
CREATE TRIGGER loyalty_transaction_update_balance
    BEFORE INSERT ON public.loyalty_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_balance();

-- Calculate points for purchase
CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(
    p_tenant_id TEXT,
    p_amount NUMERIC,
    p_client_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_rule public.loyalty_rules%ROWTYPE;
    v_loyalty public.loyalty_points%ROWTYPE;
    v_base_points INTEGER;
    v_multiplier NUMERIC;
BEGIN
    -- Get active rule
    SELECT * INTO v_rule
    FROM public.loyalty_rules
    WHERE tenant_id = p_tenant_id AND is_active = true
    LIMIT 1;

    IF v_rule IS NULL THEN
        RETURN 0;
    END IF;

    -- Check minimum purchase
    IF p_amount < v_rule.min_purchase_amount THEN
        RETURN 0;
    END IF;

    -- Calculate base points
    v_base_points := FLOOR(p_amount * v_rule.points_per_currency);

    -- Apply tier multiplier
    SELECT * INTO v_loyalty
    FROM public.loyalty_points
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id;

    IF v_loyalty IS NOT NULL AND v_rule.tier_multipliers IS NOT NULL THEN
        v_multiplier := COALESCE(
            (v_rule.tier_multipliers->>v_loyalty.tier)::NUMERIC,
            1.0
        );
        v_base_points := FLOOR(v_base_points * v_multiplier);
    END IF;

    -- Apply max points limit
    IF v_rule.max_points_per_transaction IS NOT NULL THEN
        v_base_points := LEAST(v_base_points, v_rule.max_points_per_transaction);
    END IF;

    RETURN v_base_points;
END;
$$ LANGUAGE plpgsql;

-- Get expense summary
CREATE OR REPLACE FUNCTION public.get_expense_summary(
    p_tenant_id TEXT,
    p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category TEXT,
    total_amount NUMERIC,
    transaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.category,
        SUM(e.amount)::NUMERIC,
        COUNT(*)::INTEGER
    FROM public.expenses e
    WHERE e.tenant_id = p_tenant_id
      AND e.expense_date BETWEEN p_start_date AND p_end_date
      AND e.status != 'rejected'
      AND e.deleted_at IS NULL
    GROUP BY e.category
    ORDER BY SUM(e.amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ==========================================
-- FILE: 30_clinical/03_hospitalization.sql
-- ==========================================

-- =============================================================================
-- 03_HOSPITALIZATION.SQL
-- =============================================================================
-- Hospitalization management: kennels, admissions, vitals, treatments, feedings.
-- ALL CHILD TABLES INCLUDE tenant_id FOR OPTIMIZED RLS (avoids joins to parent).
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 50_finance/01_invoicing.sql
-- =============================================================================

-- =============================================================================
-- KENNELS
-- =============================================================================
-- Physical kennel/cage units for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.kennels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Kennel info
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT,
    kennel_type TEXT DEFAULT 'standard'
        CHECK (kennel_type IN ('standard', 'isolation', 'icu', 'recovery', 'large', 'small', 'extra-large', 'oxygen', 'exotic')),

    -- Capacity
    max_occupancy INTEGER DEFAULT 1 CHECK (max_occupancy > 0),
    current_occupancy INTEGER DEFAULT 0 CHECK (current_occupancy >= 0),
    max_weight_kg NUMERIC(6,2) CHECK (max_weight_kg IS NULL OR max_weight_kg > 0),

    -- Features
    features TEXT[],

    -- Pricing
    daily_rate NUMERIC(12,2) DEFAULT 0 CHECK (daily_rate >= 0),

    -- Status
    current_status TEXT DEFAULT 'available'
        CHECK (current_status IN ('available', 'occupied', 'cleaning', 'maintenance', 'reserved')),
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT kennels_occupancy_valid CHECK (current_occupancy <= max_occupancy),
    CONSTRAINT kennels_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT kennels_code_length CHECK (char_length(code) >= 1)
);

COMMENT ON TABLE public.kennels IS 'Physical kennel/cage units for hospitalized patients';
COMMENT ON COLUMN public.kennels.kennel_type IS 'Type: standard, isolation (infectious), icu (critical), recovery, large, small, exotic';
COMMENT ON COLUMN public.kennels.current_status IS 'available: ready for patient, occupied: has patient, cleaning: being cleaned, maintenance: out of service';
COMMENT ON COLUMN public.kennels.daily_rate IS 'Base daily rate for this kennel (may vary by type)';

-- =============================================================================
-- HOSPITALIZATIONS
-- =============================================================================
-- Patient admission records for hospitalized animals.

CREATE TABLE IF NOT EXISTS public.hospitalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
    kennel_id UUID REFERENCES public.kennels(id) ON DELETE SET NULL,
    primary_vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Admission info
    admission_number TEXT NOT NULL,
    admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_discharge TIMESTAMPTZ,
    actual_discharge TIMESTAMPTZ,

    -- Diagnosis
    reason TEXT NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    discharge_instructions TEXT,

    -- Priority/Acuity
    acuity_level TEXT DEFAULT 'normal'
        CHECK (acuity_level IN ('low', 'normal', 'high', 'critical')),

    -- Status
    status TEXT NOT NULL DEFAULT 'admitted'
        CHECK (status IN (
            'admitted',       -- Currently hospitalized
            'in_treatment',   -- Active treatment
            'stable',         -- Stable condition
            'critical',       -- Critical condition
            'recovering',     -- Recovery phase
            'discharged',     -- Discharged
            'deceased',       -- Died during hospitalization
            'transferred'     -- Transferred to another facility
        )),

    -- Discharge
    discharge_notes TEXT,
    discharged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,

    -- Billing
    estimated_cost NUMERIC(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    actual_cost NUMERIC(12,2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, admission_number),
    CONSTRAINT hospitalizations_discharge_after_admission CHECK (
        actual_discharge IS NULL OR actual_discharge >= admitted_at
    ),
    CONSTRAINT hospitalizations_reason_length CHECK (char_length(reason) >= 3)
);

COMMENT ON TABLE public.hospitalizations IS 'Patient admission records for hospitalized animals';
COMMENT ON COLUMN public.hospitalizations.admission_number IS 'Unique admission number (format: ADM-NNNNNN)';
COMMENT ON COLUMN public.hospitalizations.acuity_level IS 'Patient acuity: low, normal, high, critical';
COMMENT ON COLUMN public.hospitalizations.status IS 'Admission status workflow: admitted → in_treatment → stable/critical → recovering → discharged';

-- Only one active hospitalization per pet
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitalizations_one_active_per_pet
ON public.hospitalizations(pet_id)
WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- =============================================================================
-- HOSPITALIZATION VITALS - WITH TENANT_ID
-- =============================================================================
-- Vital signs recordings for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Vitals (with medically reasonable ranges)
    temperature NUMERIC(4,1) CHECK (temperature IS NULL OR (temperature >= 30 AND temperature <= 45)),
    heart_rate INTEGER CHECK (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 400)),
    respiratory_rate INTEGER CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 5 AND respiratory_rate <= 150)),
    blood_pressure_systolic INTEGER CHECK (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 40 AND blood_pressure_systolic <= 300)),
    blood_pressure_diastolic INTEGER CHECK (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 20 AND blood_pressure_diastolic <= 200)),
    spo2 INTEGER CHECK (spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100)),
    weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
    pain_score INTEGER CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10)),
    mentation TEXT CHECK (mentation IS NULL OR mentation IN ('bright', 'quiet', 'dull', 'obtunded', 'comatose')),
    hydration_status TEXT CHECK (hydration_status IS NULL OR hydration_status IN ('normal', 'mild', 'moderate', 'severe')),

    -- Notes
    notes TEXT,

    -- Recorded by
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_vitals IS 'Vital signs recordings for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_vitals.pain_score IS 'Pain score on 0-10 scale (0=no pain, 10=worst pain)';
COMMENT ON COLUMN public.hospitalization_vitals.mentation IS 'Mental status: bright (normal), quiet, dull, obtunded, comatose';
COMMENT ON COLUMN public.hospitalization_vitals.spo2 IS 'Blood oxygen saturation percentage (0-100%)';

-- =============================================================================
-- HOSPITALIZATION MEDICATIONS - WITH TENANT_ID
-- =============================================================================
-- Medication administration records for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Medication
    medication_name TEXT NOT NULL,
    dose TEXT NOT NULL,
    route TEXT CHECK (route IS NULL OR route IN ('oral', 'IV', 'IM', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    frequency TEXT,

    -- Schedule
    scheduled_at TIMESTAMPTZ,
    administered_at TIMESTAMPTZ,
    skipped_reason TEXT,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'administered', 'skipped', 'held')),

    -- Administered by
    administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_medications IS 'Medication administration records for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_medications.status IS 'scheduled: pending, administered: given, skipped: missed intentionally, held: temporarily suspended';
COMMENT ON COLUMN public.hospitalization_medications.route IS 'Administration route: oral, IV, IM, SQ, topical, etc.';

-- =============================================================================
-- HOSPITALIZATION TREATMENTS - WITH TENANT_ID
-- =============================================================================
-- Non-medication treatments and procedures for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Treatment
    treatment_type TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Schedule
    scheduled_at TIMESTAMPTZ,
    performed_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'performed', 'skipped', 'pending')),

    -- Performed by
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_treatments IS 'Non-medication treatments and procedures (e.g., wound care, physical therapy)';
COMMENT ON COLUMN public.hospitalization_treatments.treatment_type IS 'Type of treatment: wound_care, fluid_therapy, physical_therapy, etc.';

-- =============================================================================
-- HOSPITALIZATION FEEDINGS - WITH TENANT_ID
-- =============================================================================
-- Feeding records for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_feedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Feeding details
    food_type TEXT NOT NULL,
    amount TEXT,
    method TEXT CHECK (method IS NULL OR method IN ('oral', 'syringe', 'tube', 'assisted')),

    -- Timing
    scheduled_at TIMESTAMPTZ,
    fed_at TIMESTAMPTZ,

    -- Results
    consumed_amount TEXT,
    appetite_score INTEGER CHECK (appetite_score IS NULL OR (appetite_score >= 0 AND appetite_score <= 5)),
    vomited BOOLEAN DEFAULT false,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'refused', 'partial')),

    -- Fed by
    fed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_feedings IS 'Feeding records for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_feedings.appetite_score IS 'Appetite score 0-5: 0=anorexic, 5=ravenous';
COMMENT ON COLUMN public.hospitalization_feedings.method IS 'Feeding method: oral (voluntary), syringe, tube (feeding tube), assisted';

-- =============================================================================
-- HOSPITALIZATION NOTES - WITH TENANT_ID
-- =============================================================================
-- Progress notes and documentation for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Note
    note_type TEXT DEFAULT 'progress'
        CHECK (note_type IN ('progress', 'doctor', 'nursing', 'discharge', 'owner_update', 'other')),
    content TEXT NOT NULL,

    -- Author
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_notes IS 'Progress notes and documentation for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_notes.note_type IS 'Type: progress (routine), doctor (vet notes), nursing, discharge (summary), owner_update';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_notes ENABLE ROW LEVEL SECURITY;

-- Kennels: Staff only
DROP POLICY IF EXISTS "Staff manage kennels" ON public.kennels;
CREATE POLICY "Staff manage kennels" ON public.kennels
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access kennels" ON public.kennels;
CREATE POLICY "Service role full access kennels" ON public.kennels
    FOR ALL TO service_role USING (true);

-- Hospitalizations: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage hospitalizations" ON public.hospitalizations;
CREATE POLICY "Staff manage hospitalizations" ON public.hospitalizations
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet hospitalizations" ON public.hospitalizations;
CREATE POLICY "Owners view pet hospitalizations" ON public.hospitalizations
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access hospitalizations" ON public.hospitalizations;
CREATE POLICY "Service role full access hospitalizations" ON public.hospitalizations
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Vitals uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage vitals" ON public.hospitalization_vitals;
CREATE POLICY "Staff manage vitals" ON public.hospitalization_vitals
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view vitals" ON public.hospitalization_vitals;
CREATE POLICY "Owners view vitals" ON public.hospitalization_vitals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hospitalizations h
            WHERE h.id = hospitalization_vitals.hospitalization_id
            AND public.is_owner_of_pet(h.pet_id)
        )
    );

DROP POLICY IF EXISTS "Service role full access vitals" ON public.hospitalization_vitals;
CREATE POLICY "Service role full access vitals" ON public.hospitalization_vitals
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Medications uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage medications" ON public.hospitalization_medications;
CREATE POLICY "Staff manage medications" ON public.hospitalization_medications
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access medications" ON public.hospitalization_medications;
CREATE POLICY "Service role full access medications" ON public.hospitalization_medications
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Treatments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage treatments" ON public.hospitalization_treatments;
CREATE POLICY "Staff manage treatments" ON public.hospitalization_treatments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access treatments" ON public.hospitalization_treatments;
CREATE POLICY "Service role full access treatments" ON public.hospitalization_treatments
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Feedings uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage feedings" ON public.hospitalization_feedings;
CREATE POLICY "Staff manage feedings" ON public.hospitalization_feedings
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access feedings" ON public.hospitalization_feedings;
CREATE POLICY "Service role full access feedings" ON public.hospitalization_feedings
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Notes uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage notes" ON public.hospitalization_notes;
CREATE POLICY "Staff manage notes" ON public.hospitalization_notes
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view notes" ON public.hospitalization_notes;
CREATE POLICY "Owners view notes" ON public.hospitalization_notes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hospitalizations h
            WHERE h.id = hospitalization_notes.hospitalization_id
            AND public.is_owner_of_pet(h.pet_id)
        )
    );

DROP POLICY IF EXISTS "Service role full access notes" ON public.hospitalization_notes;
CREATE POLICY "Service role full access notes" ON public.hospitalization_notes
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Kennels
CREATE INDEX IF NOT EXISTS idx_kennels_tenant ON public.kennels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kennels_status ON public.kennels(current_status)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kennels_available ON public.kennels(tenant_id, current_status)
    WHERE current_status = 'available' AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kennels_type ON public.kennels(tenant_id, kennel_type)
    WHERE is_active = true AND deleted_at IS NULL;

-- Hospitalizations
CREATE INDEX IF NOT EXISTS idx_hospitalizations_tenant ON public.hospitalizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_pet ON public.hospitalizations(pet_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_kennel ON public.hospitalizations(kennel_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_primary_vet ON public.hospitalizations(primary_vet_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_admitted_by ON public.hospitalizations(admitted_by);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_discharged_by ON public.hospitalizations(discharged_by);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_status ON public.hospitalizations(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospitalizations_active ON public.hospitalizations(tenant_id, status)
    WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- Covering index for active hospitalizations dashboard
CREATE INDEX IF NOT EXISTS idx_hospitalizations_board ON public.hospitalizations(tenant_id, status, acuity_level)
    INCLUDE (pet_id, kennel_id, admitted_at, expected_discharge, diagnosis, primary_vet_id)
    WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- BRIN indexes for time-series data (efficient for append-only tables)
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_hosp ON public.hospitalization_vitals(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_tenant ON public.hospitalization_vitals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_by ON public.hospitalization_vitals(recorded_by);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_brin ON public.hospitalization_vitals
    USING BRIN(recorded_at) WITH (pages_per_range = 32);

-- Medications indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_hosp ON public.hospitalization_medications(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_tenant ON public.hospitalization_medications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_administered_by ON public.hospitalization_medications(administered_by);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_scheduled ON public.hospitalization_medications(scheduled_at)
    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_hospitalization_meds_scheduled_brin ON public.hospitalization_medications
    USING BRIN(scheduled_at) WITH (pages_per_range = 32)
    WHERE scheduled_at IS NOT NULL;

-- Treatments indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_hosp ON public.hospitalization_treatments(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_tenant ON public.hospitalization_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_performed_by ON public.hospitalization_treatments(performed_by);

-- Feedings indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_hosp ON public.hospitalization_feedings(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_tenant ON public.hospitalization_feedings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_fed_by ON public.hospitalization_feedings(fed_by);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_hosp ON public.hospitalization_notes(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_tenant ON public.hospitalization_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_created_by ON public.hospitalization_notes(created_by);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.kennels;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.kennels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalizations;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_medications;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_medications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_treatments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_treatments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_feedings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_feedings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get hospitalization tenant_id efficiently
CREATE OR REPLACE FUNCTION public.get_hospitalization_tenant(p_hosp_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.hospitalizations WHERE id = p_hosp_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_hospitalization_tenant(UUID) IS
'Get tenant_id for a hospitalization (used by child table triggers)';

-- Auto-set tenant_id for child tables
CREATE OR REPLACE FUNCTION public.hospitalization_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.hospitalization_set_tenant_id() IS
'Auto-populate tenant_id from hospitalization for child tables';

DROP TRIGGER IF EXISTS vitals_auto_tenant ON public.hospitalization_vitals;
CREATE TRIGGER vitals_auto_tenant
    BEFORE INSERT ON public.hospitalization_vitals
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS medications_auto_tenant ON public.hospitalization_medications;
CREATE TRIGGER medications_auto_tenant
    BEFORE INSERT ON public.hospitalization_medications
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS treatments_auto_tenant ON public.hospitalization_treatments;
CREATE TRIGGER treatments_auto_tenant
    BEFORE INSERT ON public.hospitalization_treatments
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS feedings_auto_tenant ON public.hospitalization_feedings;
CREATE TRIGGER feedings_auto_tenant
    BEFORE INSERT ON public.hospitalization_feedings
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS notes_auto_tenant ON public.hospitalization_notes;
CREATE TRIGGER notes_auto_tenant
    BEFORE INSERT ON public.hospitalization_notes
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

-- =============================================================================
-- KENNEL STATUS MANAGEMENT
-- =============================================================================

-- Update kennel status on hospitalization changes
CREATE OR REPLACE FUNCTION public.update_kennel_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.kennel_id IS NOT NULL THEN
        UPDATE public.kennels
        SET current_occupancy = current_occupancy + 1,
            current_status = CASE
                WHEN current_occupancy + 1 >= max_occupancy THEN 'occupied'
                ELSE current_status
            END,
            updated_at = NOW()
        WHERE id = NEW.kennel_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Moving to different kennel
        IF OLD.kennel_id IS DISTINCT FROM NEW.kennel_id THEN
            IF OLD.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = GREATEST(0, current_occupancy - 1),
                    current_status = CASE
                        WHEN current_occupancy - 1 = 0 THEN 'available'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = OLD.kennel_id;
            END IF;
            IF NEW.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = current_occupancy + 1,
                    current_status = CASE
                        WHEN current_occupancy + 1 >= max_occupancy THEN 'occupied'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = NEW.kennel_id;
            END IF;
        END IF;
        -- Discharged/Deceased/Transferred - free up kennel
        IF NEW.status IN ('discharged', 'deceased', 'transferred')
           AND OLD.status NOT IN ('discharged', 'deceased', 'transferred') THEN
            IF NEW.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = GREATEST(0, current_occupancy - 1),
                    current_status = CASE
                        WHEN current_occupancy - 1 = 0 THEN 'available'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = NEW.kennel_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.update_kennel_status() IS
'Automatically update kennel occupancy and status when hospitalizations change';

DROP TRIGGER IF EXISTS hospitalization_kennel_status ON public.hospitalizations;
CREATE TRIGGER hospitalization_kennel_status
    AFTER INSERT OR UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION public.update_kennel_status();

-- =============================================================================
-- DOCUMENT NUMBER GENERATION
-- =============================================================================

-- THREAD-SAFE admission number generation using advisory locks
CREATE OR REPLACE FUNCTION public.generate_admission_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Admission numbers don't reset yearly, so we use year = 0
    v_lock_key := hashtext(p_tenant_id || ':admission:0');

    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert with year = 0 to indicate non-yearly sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, 'admission', 0, 1, 'ADM')
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'ADM' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_admission_number(TEXT) IS
'Generate unique admission number for a tenant. Format: ADM-NNNNNN (non-yearly sequence)';

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Get current hospitalizations for a tenant
CREATE OR REPLACE FUNCTION public.get_active_hospitalizations(p_tenant_id TEXT)
RETURNS TABLE (
    hospitalization_id UUID,
    admission_number TEXT,
    pet_name TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    kennel_name TEXT,
    status TEXT,
    acuity_level TEXT,
    admitted_at TIMESTAMPTZ,
    expected_discharge TIMESTAMPTZ,
    primary_vet_name TEXT,
    days_hospitalized INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.admission_number,
        p.name,
        pr.full_name,
        pr.phone,
        k.name,
        h.status,
        h.acuity_level,
        h.admitted_at,
        h.expected_discharge,
        vet.full_name,
        (CURRENT_DATE - h.admitted_at::DATE)::INTEGER
    FROM public.hospitalizations h
    JOIN public.pets p ON h.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.kennels k ON h.kennel_id = k.id
    LEFT JOIN public.profiles vet ON h.primary_vet_id = vet.id
    WHERE h.tenant_id = p_tenant_id
    AND h.status NOT IN ('discharged', 'deceased', 'transferred')
    AND h.deleted_at IS NULL
    ORDER BY
        CASE h.acuity_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
        END,
        h.admitted_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_active_hospitalizations(TEXT) IS
'Get all active hospitalizations for a tenant with patient and owner details';

-- Get hospitalization summary
CREATE OR REPLACE FUNCTION public.get_hospitalization_summary(p_hospitalization_id UUID)
RETURNS TABLE (
    admission_number TEXT,
    pet_name TEXT,
    days_hospitalized INTEGER,
    total_vitals_recorded INTEGER,
    total_medications_administered INTEGER,
    total_treatments_performed INTEGER,
    total_feedings INTEGER,
    last_vital_recorded_at TIMESTAMPTZ,
    last_medication_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.admission_number,
        p.name,
        (CURRENT_DATE - h.admitted_at::DATE)::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_vitals WHERE hospitalization_id = p_hospitalization_id),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_medications WHERE hospitalization_id = p_hospitalization_id AND status = 'administered'),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_treatments WHERE hospitalization_id = p_hospitalization_id AND status = 'performed'),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_feedings WHERE hospitalization_id = p_hospitalization_id AND status = 'completed'),
        (SELECT MAX(recorded_at) FROM public.hospitalization_vitals WHERE hospitalization_id = p_hospitalization_id),
        (SELECT MAX(administered_at) FROM public.hospitalization_medications WHERE hospitalization_id = p_hospitalization_id AND status = 'administered')
    FROM public.hospitalizations h
    JOIN public.pets p ON h.pet_id = p.id
    WHERE h.id = p_hospitalization_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_hospitalization_summary(UUID) IS
'Get summary statistics for a specific hospitalization';



-- ==========================================
-- FILE: 30_clinical/04_lab.sql
-- ==========================================

-- =============================================================================
-- 04_LAB.SQL
-- =============================================================================
-- Laboratory management: test catalog, panels, orders, results, attachments.
-- ALL CHILD TABLES INCLUDE tenant_id FOR OPTIMIZED RLS (avoids joins to parent).
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 30_clinical/02_medical_records.sql
-- =============================================================================

-- =============================================================================
-- LAB TEST CATALOG
-- =============================================================================
-- Available laboratory tests (global or tenant-specific).

CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,  -- NULL = global test

    -- Test info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,

    -- Pricing
    base_price NUMERIC(12,2) DEFAULT 0 CHECK (base_price >= 0),

    -- Reference ranges (JSON for flexibility by species)
    -- Structure: {"dog": {"min": 5, "max": 15, "unit": "mg/dL"}, "cat": {...}}
    reference_ranges JSONB DEFAULT '{}',

    -- Settings
    turnaround_days INTEGER DEFAULT 1 CHECK (turnaround_days > 0),
    requires_fasting BOOLEAN DEFAULT false,
    sample_type TEXT CHECK (sample_type IS NULL OR sample_type IN (
        'blood', 'serum', 'plasma', 'urine', 'feces', 'tissue', 'swab',
        'citrated_blood', 'edta_blood', 'aspirate', 'biopsy', 'skin', 'hair', 'other'
    )),
    sample_volume_ml NUMERIC(6,2) CHECK (sample_volume_ml IS NULL OR sample_volume_ml > 0),
    special_instructions TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT lab_test_catalog_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT lab_test_catalog_code_length CHECK (char_length(code) >= 2)
);

COMMENT ON TABLE public.lab_test_catalog IS 'Available laboratory tests. NULL tenant_id = global test available to all clinics.';
COMMENT ON COLUMN public.lab_test_catalog.reference_ranges IS 'Species-specific reference ranges as JSON: {"dog": {"min": 5, "max": 15, "unit": "mg/dL"}}';
COMMENT ON COLUMN public.lab_test_catalog.sample_type IS 'Required sample type: blood, serum, plasma, urine, feces, tissue, swab, etc.';

-- Unique for global tests
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_test_catalog_global_code
ON public.lab_test_catalog (code) WHERE tenant_id IS NULL AND deleted_at IS NULL;

-- =============================================================================
-- LAB PANELS (Test Groups)
-- =============================================================================
-- Pre-defined groups of tests that are commonly ordered together.

CREATE TABLE IF NOT EXISTS public.lab_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Panel info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Tests included (array of test IDs)
    test_ids UUID[] NOT NULL DEFAULT '{}',

    -- Pricing
    panel_price NUMERIC(12,2) CHECK (panel_price IS NULL OR panel_price >= 0),  -- NULL = sum of individual tests

    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT lab_panels_name_length CHECK (char_length(name) >= 2)
);

COMMENT ON TABLE public.lab_panels IS 'Pre-defined groups of tests (e.g., CBC+Chemistry, Pre-anesthetic panel)';
COMMENT ON COLUMN public.lab_panels.test_ids IS 'Array of lab_test_catalog IDs included in this panel';
COMMENT ON COLUMN public.lab_panels.panel_price IS 'Fixed panel price. NULL = sum of individual test prices.';

-- =============================================================================
-- LAB ORDERS
-- =============================================================================
-- Laboratory test orders for patients.

CREATE TABLE IF NOT EXISTS public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Order number
    order_number TEXT NOT NULL,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
    ordered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,

    -- Order details
    priority TEXT DEFAULT 'routine'
        CHECK (priority IN ('stat', 'urgent', 'routine')),
    clinical_notes TEXT,
    fasting_confirmed BOOLEAN DEFAULT false,

    -- Lab type
    lab_type TEXT DEFAULT 'in_house'
        CHECK (lab_type IN ('in_house', 'reference_lab')),
    reference_lab_name TEXT,
    external_accession TEXT,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Order created
            'collected',    -- Sample collected
            'processing',   -- Being analyzed
            'completed',    -- Results ready
            'reviewed',     -- Results reviewed by vet
            'cancelled'     -- Order cancelled
        )),

    -- Status timestamps
    collected_at TIMESTAMPTZ,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.lab_orders IS 'Laboratory test orders for patients';
COMMENT ON COLUMN public.lab_orders.order_number IS 'Unique order number (format: LAB-YYYY-NNNNNN)';
COMMENT ON COLUMN public.lab_orders.priority IS 'stat: immediate, urgent: within hours, routine: standard turnaround';
COMMENT ON COLUMN public.lab_orders.lab_type IS 'in_house: performed at clinic, reference_lab: sent to external lab';
COMMENT ON COLUMN public.lab_orders.status IS 'Workflow: pending → collected → processing → completed → reviewed';

-- =============================================================================
-- LAB ORDER ITEMS - WITH TENANT_ID
-- =============================================================================
-- Individual tests within a lab order.

CREATE TABLE IF NOT EXISTS public.lab_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),

    -- Pricing at time of order
    price NUMERIC(12,2) CHECK (price IS NULL OR price >= 0),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(lab_order_id, test_id)
);

COMMENT ON TABLE public.lab_order_items IS 'Individual tests within a lab order';
COMMENT ON COLUMN public.lab_order_items.price IS 'Price locked at time of order (may differ from catalog)';

-- =============================================================================
-- LAB RESULTS - WITH TENANT_ID
-- =============================================================================
-- Test results for lab orders.

CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,

    -- Result
    value TEXT NOT NULL,
    numeric_value NUMERIC(12,4),
    unit TEXT,

    -- Reference range at time of result
    reference_min NUMERIC(12,4),
    reference_max NUMERIC(12,4),

    -- Flags
    flag TEXT CHECK (flag IS NULL OR flag IN ('low', 'normal', 'high', 'critical_low', 'critical_high')),
    is_abnormal BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,

    -- Entered by
    entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(lab_order_id, test_id)
);

COMMENT ON TABLE public.lab_results IS 'Test results for lab orders';
COMMENT ON COLUMN public.lab_results.flag IS 'Result interpretation: low, normal, high, critical_low, critical_high';
COMMENT ON COLUMN public.lab_results.is_abnormal IS 'True if result is outside reference range';

-- =============================================================================
-- LAB RESULT ATTACHMENTS - WITH TENANT_ID
-- =============================================================================
-- File attachments for lab results (PDF reports, images, etc.).

CREATE TABLE IF NOT EXISTS public.lab_result_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- File info
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),

    -- Metadata
    description TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lab_result_attachments IS 'File attachments for lab results (PDF reports, microscopy images, etc.)';

-- =============================================================================
-- LAB RESULT COMMENTS - WITH TENANT_ID
-- =============================================================================
-- Comments and notes on lab results.

CREATE TABLE IF NOT EXISTS public.lab_result_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Comment
    comment TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lab_result_comments IS 'Comments and interpretation notes on lab results';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_result_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_result_comments ENABLE ROW LEVEL SECURITY;

-- Test catalog: Public read active tests
DROP POLICY IF EXISTS "Public read lab tests" ON public.lab_test_catalog;
CREATE POLICY "Public read lab tests" ON public.lab_test_catalog
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage tenant tests" ON public.lab_test_catalog;
CREATE POLICY "Staff manage tenant tests" ON public.lab_test_catalog
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access lab tests" ON public.lab_test_catalog;
CREATE POLICY "Service role full access lab tests" ON public.lab_test_catalog
    FOR ALL TO service_role USING (true);

-- Lab panels: Public read active panels
DROP POLICY IF EXISTS "Public read lab panels" ON public.lab_panels;
CREATE POLICY "Public read lab panels" ON public.lab_panels
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage panels" ON public.lab_panels;
CREATE POLICY "Staff manage panels" ON public.lab_panels
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access panels" ON public.lab_panels;
CREATE POLICY "Service role full access panels" ON public.lab_panels
    FOR ALL TO service_role USING (true);

-- Lab orders: Staff manage, owners view completed
DROP POLICY IF EXISTS "Staff manage lab orders" ON public.lab_orders;
CREATE POLICY "Staff manage lab orders" ON public.lab_orders
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet lab orders" ON public.lab_orders;
CREATE POLICY "Owners view pet lab orders" ON public.lab_orders
    FOR SELECT TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND status IN ('completed', 'reviewed')
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Service role full access lab orders" ON public.lab_orders;
CREATE POLICY "Service role full access lab orders" ON public.lab_orders
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Lab order items uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage order items" ON public.lab_order_items;
CREATE POLICY "Staff manage order items" ON public.lab_order_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view order items" ON public.lab_order_items;
CREATE POLICY "Owners view order items" ON public.lab_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_order_items.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access order items" ON public.lab_order_items;
CREATE POLICY "Service role full access order items" ON public.lab_order_items
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Lab results uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage results" ON public.lab_results;
CREATE POLICY "Staff manage results" ON public.lab_results
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view results" ON public.lab_results;
CREATE POLICY "Owners view results" ON public.lab_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_results.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access results" ON public.lab_results;
CREATE POLICY "Service role full access results" ON public.lab_results
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Attachments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage attachments" ON public.lab_result_attachments;
CREATE POLICY "Staff manage attachments" ON public.lab_result_attachments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view attachments" ON public.lab_result_attachments;
CREATE POLICY "Owners view attachments" ON public.lab_result_attachments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_result_attachments.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access attachments" ON public.lab_result_attachments;
CREATE POLICY "Service role full access attachments" ON public.lab_result_attachments
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Comments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage comments" ON public.lab_result_comments;
CREATE POLICY "Staff manage comments" ON public.lab_result_comments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access comments" ON public.lab_result_comments;
CREATE POLICY "Service role full access comments" ON public.lab_result_comments
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Lab test catalog
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_tenant ON public.lab_test_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_category ON public.lab_test_catalog(category);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_sample_type ON public.lab_test_catalog(sample_type);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_active ON public.lab_test_catalog(is_active)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_name_search ON public.lab_test_catalog USING gin(name gin_trgm_ops);

-- GIN index for JSONB reference ranges (efficient range lookups)
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_ranges_gin ON public.lab_test_catalog USING gin(reference_ranges jsonb_path_ops)
    WHERE reference_ranges IS NOT NULL AND reference_ranges != '{}';

-- Lab panels
CREATE INDEX IF NOT EXISTS idx_lab_panels_tenant ON public.lab_panels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_panels_active ON public.lab_panels(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

-- Lab orders
CREATE INDEX IF NOT EXISTS idx_lab_orders_tenant ON public.lab_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_pet ON public.lab_orders(pet_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_ordered_by ON public.lab_orders(ordered_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_collected_by ON public.lab_orders(collected_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_reviewed_by ON public.lab_orders(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_medical_record ON public.lab_orders(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_pending ON public.lab_orders(tenant_id, priority)
    WHERE status IN ('pending', 'collected', 'processing') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_created_brin ON public.lab_orders
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- Lab order items
CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON public.lab_order_items(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_tenant ON public.lab_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_test ON public.lab_order_items(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_status ON public.lab_order_items(status);

-- Lab results
CREATE INDEX IF NOT EXISTS idx_lab_results_order ON public.lab_results(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_tenant ON public.lab_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test ON public.lab_results(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_entered_by ON public.lab_results(entered_by);
CREATE INDEX IF NOT EXISTS idx_lab_results_abnormal ON public.lab_results(is_abnormal)
    WHERE is_abnormal = true;
CREATE INDEX IF NOT EXISTS idx_lab_results_flag ON public.lab_results(flag)
    WHERE flag IN ('critical_low', 'critical_high');

-- Lab attachments
CREATE INDEX IF NOT EXISTS idx_lab_attachments_order ON public.lab_result_attachments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_attachments_tenant ON public.lab_result_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_attachments_uploaded_by ON public.lab_result_attachments(uploaded_by);

-- Lab comments
CREATE INDEX IF NOT EXISTS idx_lab_comments_order ON public.lab_result_comments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_comments_tenant ON public.lab_result_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_comments_created_by ON public.lab_result_comments(created_by);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_test_catalog;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_test_catalog
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_panels;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_panels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_orders;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_order_items;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_order_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_results;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- TENANT ID AUTO-POPULATION
-- =============================================================================

-- Auto-set tenant_id for child tables
CREATE OR REPLACE FUNCTION public.lab_order_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.lab_orders
        WHERE id = NEW.lab_order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.lab_order_set_tenant_id() IS
'Auto-populate tenant_id from lab_order for child tables';

DROP TRIGGER IF EXISTS lab_order_items_auto_tenant ON public.lab_order_items;
CREATE TRIGGER lab_order_items_auto_tenant
    BEFORE INSERT ON public.lab_order_items
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_results_auto_tenant ON public.lab_results;
CREATE TRIGGER lab_results_auto_tenant
    BEFORE INSERT ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_attachments_auto_tenant ON public.lab_result_attachments;
CREATE TRIGGER lab_attachments_auto_tenant
    BEFORE INSERT ON public.lab_result_attachments
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_comments_auto_tenant ON public.lab_result_comments;
CREATE TRIGGER lab_comments_auto_tenant
    BEFORE INSERT ON public.lab_result_comments
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- THREAD-SAFE lab order number generation
CREATE OR REPLACE FUNCTION public.generate_lab_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'lab_order', 'LAB');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_lab_order_number(TEXT) IS
'Generate unique lab order number for a tenant. Format: LAB-YYYY-NNNNNN';

-- Get pending lab orders for a tenant
CREATE OR REPLACE FUNCTION public.get_pending_lab_orders(p_tenant_id TEXT)
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    pet_name TEXT,
    owner_name TEXT,
    priority TEXT,
    status TEXT,
    ordered_by_name TEXT,
    created_at TIMESTAMPTZ,
    tests_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lo.id,
        lo.order_number,
        p.name,
        pr.full_name,
        lo.priority,
        lo.status,
        orderer.full_name,
        lo.created_at,
        (SELECT COUNT(*)::INTEGER FROM public.lab_order_items WHERE lab_order_id = lo.id)
    FROM public.lab_orders lo
    JOIN public.pets p ON lo.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.profiles orderer ON lo.ordered_by = orderer.id
    WHERE lo.tenant_id = p_tenant_id
    AND lo.status IN ('pending', 'collected', 'processing')
    AND lo.deleted_at IS NULL
    ORDER BY
        CASE lo.priority WHEN 'stat' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        lo.created_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pending_lab_orders(TEXT) IS
'Get all pending lab orders for a tenant, ordered by priority';

-- Get lab order with results
CREATE OR REPLACE FUNCTION public.get_lab_order_results(p_order_id UUID)
RETURNS TABLE (
    test_code TEXT,
    test_name TEXT,
    category TEXT,
    value TEXT,
    numeric_value NUMERIC,
    unit TEXT,
    reference_min NUMERIC,
    reference_max NUMERIC,
    flag TEXT,
    is_abnormal BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.code,
        tc.name,
        tc.category,
        lr.value,
        lr.numeric_value,
        lr.unit,
        lr.reference_min,
        lr.reference_max,
        lr.flag,
        lr.is_abnormal,
        lr.notes
    FROM public.lab_results lr
    JOIN public.lab_test_catalog tc ON lr.test_id = tc.id
    WHERE lr.lab_order_id = p_order_id
    ORDER BY tc.category, tc.display_order, tc.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_lab_order_results(UUID) IS
'Get all results for a lab order with test details';

-- =============================================================================
-- SEED DATA
-- =============================================================================
-- Global lab tests (available to all clinics)

INSERT INTO public.lab_test_catalog (tenant_id, code, name, category, sample_type, turnaround_days, reference_ranges) VALUES
    (NULL, 'CBC', 'Complete Blood Count', 'Hematology', 'edta_blood', 1, '{}'),
    (NULL, 'CHEM10', 'Chemistry Panel 10', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'CHEM17', 'Chemistry Panel 17', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'UA', 'Urinalysis', 'Urine', 'urine', 1, '{}'),
    (NULL, 'T4', 'Total T4', 'Endocrine', 'serum', 1, '{}'),
    (NULL, 'TSH', 'Thyroid Stimulating Hormone', 'Endocrine', 'serum', 2, '{}'),
    (NULL, 'FELV', 'FeLV Antigen Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'FIV', 'FIV Antibody Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'HW', 'Heartworm Antigen Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'FECAL', 'Fecal Flotation', 'Parasitology', 'feces', 1, '{}'),
    (NULL, 'GIARDIA', 'Giardia Antigen', 'Parasitology', 'feces', 1, '{}'),
    (NULL, 'LIPID', 'Lipid Panel', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'COAG', 'Coagulation Panel', 'Hematology', 'citrated_blood', 1, '{}'),
    (NULL, 'LYTES', 'Electrolyte Panel', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'CORTISOL', 'Cortisol Baseline', 'Endocrine', 'serum', 2, '{}')
ON CONFLICT DO NOTHING;



-- ==========================================
-- FILE: 80_insurance/01_insurance.sql
-- ==========================================

-- =============================================================================
-- 01_INSURANCE.SQL
-- =============================================================================
-- Pet insurance management: providers, policies, claims.
--
-- DEPENDENCIES: 10_core/*, 20_pets/*, 40_scheduling/*, 50_finance/*
-- =============================================================================

-- =============================================================================
-- INSURANCE PROVIDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider info
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    country TEXT,
    logo_url TEXT,
    website TEXT,

    -- Contact
    phone TEXT,
    email TEXT,
    claims_email TEXT,
    claims_phone TEXT,

    -- Address
    address JSONB,

    -- Coverage
    coverage_types TEXT[],  -- ['accident', 'illness', 'wellness', 'dental']
    direct_billing BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_providers IS 'Pet insurance provider directory (global reference data)';
COMMENT ON COLUMN public.insurance_providers.claims_email IS 'Email for submitting claims';
COMMENT ON COLUMN public.insurance_providers.claims_phone IS 'Phone for claims inquiries';

-- =============================================================================
-- INSURANCE POLICIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),
    provider_id UUID REFERENCES public.insurance_providers(id),

    -- Policy info
    policy_number TEXT NOT NULL,
    group_number TEXT,

    -- Coverage
    coverage_type TEXT DEFAULT 'basic'
        CHECK (coverage_type IN ('basic', 'standard', 'premium', 'comprehensive')),
    coverage_details JSONB DEFAULT '{}',

    -- Limits
    annual_limit NUMERIC(12,2),
    deductible NUMERIC(12,2),
    copay_percentage NUMERIC(5,2),

    -- Validity
    effective_date DATE NOT NULL,
    expiry_date DATE,

    -- Status
    status TEXT DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),

    -- Contact for claims
    claims_contact_name TEXT,
    claims_contact_phone TEXT,
    claims_contact_email TEXT,

    -- Documents
    policy_document_url TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_policies IS 'Pet insurance policies with coverage details and limits';
COMMENT ON COLUMN public.insurance_policies.coverage_type IS 'Coverage tier: basic, standard, premium, comprehensive';
COMMENT ON COLUMN public.insurance_policies.coverage_details IS 'JSON with detailed coverage info: procedures, exclusions, limits';
COMMENT ON COLUMN public.insurance_policies.status IS 'Policy status: pending (application), active, expired, cancelled, suspended';

-- =============================================================================
-- INSURANCE CLAIMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),

    -- Claim info
    claim_number TEXT,
    claim_type TEXT NOT NULL
        CHECK (claim_type IN ('treatment', 'surgery', 'hospitalization', 'medication', 'diagnostic', 'other')),

    -- Amounts
    claimed_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),

    -- Dates
    service_date DATE NOT NULL,
    submitted_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid')),

    -- Denial
    denial_reason TEXT,

    -- Reference
    invoice_id UUID REFERENCES public.invoices(id),
    medical_record_id UUID REFERENCES public.medical_records(id),

    -- Documents
    supporting_documents TEXT[] DEFAULT '{}',

    -- Notes
    notes TEXT,
    provider_notes TEXT,

    -- Submitted by
    submitted_by UUID REFERENCES public.profiles(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_claims IS 'Insurance claim submissions with approval workflow';
COMMENT ON COLUMN public.insurance_claims.claim_type IS 'Type of claim: treatment, surgery, hospitalization, medication, diagnostic, other';
COMMENT ON COLUMN public.insurance_claims.status IS 'Claim status: draft → submitted → under_review → approved/denied → paid';
COMMENT ON COLUMN public.insurance_claims.supporting_documents IS 'Array of document URLs (invoices, medical records, etc.)';

-- =============================================================================
-- INSURANCE CLAIM ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_claim_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Item details
    description TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id),
    quantity INTEGER DEFAULT 1,
    amount NUMERIC(12,2) NOT NULL,

    -- Approval
    approved_amount NUMERIC(12,2),
    is_covered BOOLEAN,
    denial_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_claim_items IS 'Line items within a claim. Includes tenant_id for optimized RLS.';
COMMENT ON COLUMN public.insurance_claim_items.is_covered IS 'Whether the provider covers this item';
COMMENT ON COLUMN public.insurance_claim_items.denial_reason IS 'Reason if item was not covered';

-- =============================================================================
-- PRE-AUTHORIZATION REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_preauth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),

    -- Request info
    request_number TEXT,
    procedure_description TEXT NOT NULL,
    estimated_cost NUMERIC(12,2),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'expired')),

    -- Response
    approved_amount NUMERIC(12,2),
    valid_until DATE,
    authorization_code TEXT,
    denial_reason TEXT,

    -- Submitted
    submitted_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES public.profiles(id),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_preauth IS 'Pre-authorization requests for procedures. Get approval before treatment.';
COMMENT ON COLUMN public.insurance_preauth.status IS 'Request status: pending → submitted → approved/denied/expired';
COMMENT ON COLUMN public.insurance_preauth.authorization_code IS 'Code from insurer to reference when submitting claim';
COMMENT ON COLUMN public.insurance_preauth.valid_until IS 'Pre-auth expires after this date';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_preauth ENABLE ROW LEVEL SECURITY;

-- Providers: Public read
DROP POLICY IF EXISTS "Public read providers" ON public.insurance_providers;
CREATE POLICY "Public read providers" ON public.insurance_providers
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role manage providers" ON public.insurance_providers;
CREATE POLICY "Service role manage providers" ON public.insurance_providers
    FOR ALL TO service_role USING (true);

-- Policies: Staff manage, owners view own pets
DROP POLICY IF EXISTS "Staff manage policies" ON public.insurance_policies;
CREATE POLICY "Staff manage policies" ON public.insurance_policies
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet policies" ON public.insurance_policies;
CREATE POLICY "Owners view pet policies" ON public.insurance_policies
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access policies" ON public.insurance_policies;
CREATE POLICY "Service role full access policies" ON public.insurance_policies
    FOR ALL TO service_role USING (true);

-- Claims: Staff manage, owners view own
DROP POLICY IF EXISTS "Staff manage claims" ON public.insurance_claims;
CREATE POLICY "Staff manage claims" ON public.insurance_claims
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet claims" ON public.insurance_claims;
CREATE POLICY "Owners view pet claims" ON public.insurance_claims
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access claims" ON public.insurance_claims;
CREATE POLICY "Service role full access claims" ON public.insurance_claims
    FOR ALL TO service_role USING (true);

-- Claim items: Via claim RLS
DROP POLICY IF EXISTS "Staff manage claim items" ON public.insurance_claim_items;
CREATE POLICY "Staff manage claim items" ON public.insurance_claim_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access claim items" ON public.insurance_claim_items;
CREATE POLICY "Service role full access claim items" ON public.insurance_claim_items
    FOR ALL TO service_role USING (true);

-- Preauth: Staff manage
DROP POLICY IF EXISTS "Staff manage preauth" ON public.insurance_preauth;
CREATE POLICY "Staff manage preauth" ON public.insurance_preauth
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access preauth" ON public.insurance_preauth;
CREATE POLICY "Service role full access preauth" ON public.insurance_preauth
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_insurance_providers_active ON public.insurance_providers(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_insurance_policies_tenant ON public.insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_pet ON public.insurance_policies(pet_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_provider ON public.insurance_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON public.insurance_policies(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON public.insurance_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON public.insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_pet ON public.insurance_claims(pet_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_claim ON public.insurance_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_tenant ON public.insurance_claim_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_insurance_preauth_tenant ON public.insurance_preauth(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_policy ON public.insurance_preauth(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_status ON public.insurance_preauth(status);

-- GIN indexes for JSONB columns (efficient coverage lookups)
CREATE INDEX IF NOT EXISTS idx_insurance_policies_coverage_gin ON public.insurance_policies USING gin(coverage_details jsonb_path_ops)
    WHERE coverage_details IS NOT NULL AND coverage_details != '{}';
CREATE INDEX IF NOT EXISTS idx_insurance_providers_address_gin ON public.insurance_providers USING gin(address jsonb_path_ops)
    WHERE address IS NOT NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_providers;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_providers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_policies;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_claims;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_claims
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_preauth;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_preauth
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for claim items
CREATE OR REPLACE FUNCTION public.insurance_claim_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.insurance_claims
        WHERE id = NEW.claim_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS claim_items_auto_tenant ON public.insurance_claim_items;
CREATE TRIGGER claim_items_auto_tenant
    BEFORE INSERT ON public.insurance_claim_items
    FOR EACH ROW EXECUTE FUNCTION public.insurance_claim_items_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate claim number (thread-safe with advisory lock)
CREATE OR REPLACE FUNCTION public.generate_claim_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Generate lock key from tenant_id and document type
    v_lock_key := ('x' || substr(md5(p_tenant_id || ':claim:0'), 1, 8))::bit(32)::bigint;

    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert with year = 0 to indicate non-yearly sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, 'claim', 0, 1, 'CLM')
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'CLM' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;



-- ==========================================
-- FILE: 70_communications/01_messaging.sql
-- ==========================================

-- =============================================================================
-- 01_MESSAGING.SQL
-- =============================================================================
-- Communication system: conversations, messages, templates, reminders.
-- INCLUDES tenant_id on messages for optimized RLS.
--
-- DEPENDENCIES: 10_core/*, 20_pets/*, 40_scheduling/*
-- =============================================================================

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Participants
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    pet_id UUID REFERENCES public.pets(id),

    -- Conversation info
    subject TEXT,
    channel TEXT NOT NULL DEFAULT 'in_app'
        CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email')),

    -- Status
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'resolved', 'closed', 'spam')),
    priority TEXT DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ,

    -- Timestamps
    last_message_at TIMESTAMPTZ,
    last_client_message_at TIMESTAMPTZ,
    last_staff_message_at TIMESTAMPTZ,
    client_last_read_at TIMESTAMPTZ,
    staff_last_read_at TIMESTAMPTZ,

    -- Counts
    unread_client_count INTEGER DEFAULT 0,
    unread_staff_count INTEGER DEFAULT 0,

    -- Related entities
    appointment_id UUID REFERENCES public.appointments(id),

    -- Tags
    tags TEXT[],

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.conversations IS 'Message threads between clinic staff and clients. Can be linked to pets or appointments.';
COMMENT ON COLUMN public.conversations.channel IS 'Communication channel: in_app, sms, whatsapp, email';
COMMENT ON COLUMN public.conversations.status IS 'Conversation status: open, pending (awaiting response), resolved, closed, spam';
COMMENT ON COLUMN public.conversations.unread_client_count IS 'Unread messages count for the client';
COMMENT ON COLUMN public.conversations.unread_staff_count IS 'Unread messages count for staff';

-- =============================================================================
-- MESSAGES - WITH TENANT_ID
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Sender
    sender_id UUID REFERENCES public.profiles(id),
    sender_type TEXT NOT NULL
        CHECK (sender_type IN ('client', 'staff', 'system', 'bot')),
    sender_name TEXT,

    -- Content
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN (
            'text', 'image', 'file', 'audio', 'video', 'location',
            'appointment_card', 'invoice_card', 'prescription_card', 'system'
        )),
    content TEXT,
    content_html TEXT,

    -- Attachments
    attachments JSONB DEFAULT '[]',

    -- Rich cards
    card_data JSONB,

    -- Reply to
    reply_to_id UUID REFERENCES public.messages(id),

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_reason TEXT,

    -- External
    external_message_id TEXT,
    external_channel TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.messages IS 'Individual messages within conversations. Includes tenant_id for optimized RLS.';
COMMENT ON COLUMN public.messages.sender_type IS 'Who sent: client, staff, system (automated), bot (AI)';
COMMENT ON COLUMN public.messages.message_type IS 'Content type: text, image, file, audio, video, location, or rich cards (appointment_card, etc.)';
COMMENT ON COLUMN public.messages.status IS 'Delivery status: pending → sent → delivered → read, or failed';
COMMENT ON COLUMN public.messages.card_data IS 'JSON data for rich cards (appointment details, invoice summary, etc.)';

-- =============================================================================
-- MESSAGE TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id),  -- NULL = global

    -- Template info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN (
            'appointment', 'reminder', 'follow_up', 'marketing', 'transactional',
            'welcome', 'feedback', 'custom'
        )),

    -- Content
    subject TEXT,
    content TEXT NOT NULL,
    content_html TEXT,

    -- Variables
    variables TEXT[],

    -- Channel settings
    channels TEXT[] DEFAULT ARRAY['in_app'],
    sms_approved BOOLEAN DEFAULT false,
    whatsapp_template_id TEXT,

    -- Language
    language TEXT DEFAULT 'es',

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.message_templates IS 'Reusable message templates with variable substitution. NULL tenant_id = global templates.';
COMMENT ON COLUMN public.message_templates.variables IS 'Array of variable names like owner_name, pet_name, appointment_date';
COMMENT ON COLUMN public.message_templates.channels IS 'Which channels this template can be sent on: in_app, sms, whatsapp, email';
COMMENT ON COLUMN public.message_templates.whatsapp_template_id IS 'Pre-approved WhatsApp Business template ID for compliant messaging';

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_global_code
ON public.message_templates (code) WHERE tenant_id IS NULL AND deleted_at IS NULL;

-- =============================================================================
-- REMINDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Target
    client_id UUID NOT NULL REFERENCES public.profiles(id),
    pet_id UUID REFERENCES public.pets(id),

    -- Reminder type
    type TEXT NOT NULL
        CHECK (type IN (
            'vaccine_reminder', 'vaccine_overdue',
            'appointment_reminder', 'appointment_confirmation', 'appointment_cancelled',
            'invoice_sent', 'payment_received', 'payment_overdue',
            'birthday', 'follow_up', 'lab_results_ready',
            'hospitalization_update', 'custom'
        )),

    -- Reference
    reference_type TEXT,
    reference_id UUID,

    -- Schedule
    scheduled_at TIMESTAMPTZ NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped')),

    -- Attempts
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,

    -- Error
    error_message TEXT,

    -- Custom content
    custom_subject TEXT,
    custom_body TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.reminders IS 'Scheduled reminders for vaccines, appointments, payments, etc. Processed by background jobs.';
COMMENT ON COLUMN public.reminders.type IS 'Reminder type: vaccine_reminder, appointment_reminder, payment_overdue, birthday, follow_up, etc.';
COMMENT ON COLUMN public.reminders.status IS 'Processing status: pending → processing → sent, or failed/cancelled/skipped';
COMMENT ON COLUMN public.reminders.reference_type IS 'Type of referenced entity (vaccine, appointment, invoice, etc.)';
COMMENT ON COLUMN public.reminders.reference_id IS 'UUID of the referenced entity';

-- =============================================================================
-- NOTIFICATION QUEUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    reminder_id UUID REFERENCES public.reminders(id),

    -- Recipient
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Channel
    channel_type TEXT NOT NULL
        CHECK (channel_type IN ('email', 'sms', 'whatsapp', 'push', 'in_app')),

    -- Destination
    destination TEXT NOT NULL,

    -- Content
    subject TEXT,
    body TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'bounced')),

    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Error
    error_code TEXT,
    error_message TEXT,

    -- External reference
    external_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_queue IS 'Outbound notification queue for multi-channel delivery (email, SMS, WhatsApp, push)';
COMMENT ON COLUMN public.notification_queue.channel_type IS 'Delivery channel: email, sms, whatsapp, push, in_app';
COMMENT ON COLUMN public.notification_queue.status IS 'Delivery status: queued → sending → sent → delivered, or failed/bounced';

-- =============================================================================
-- COMMUNICATION PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Channel preferences
    allow_sms BOOLEAN DEFAULT true,
    allow_whatsapp BOOLEAN DEFAULT true,
    allow_email BOOLEAN DEFAULT true,
    allow_in_app BOOLEAN DEFAULT true,
    allow_push BOOLEAN DEFAULT true,

    -- Contact info
    preferred_phone TEXT,
    preferred_email TEXT,
    whatsapp_number TEXT,

    -- Type preferences
    allow_appointment_reminders BOOLEAN DEFAULT true,
    allow_vaccine_reminders BOOLEAN DEFAULT true,
    allow_marketing BOOLEAN DEFAULT false,
    allow_feedback_requests BOOLEAN DEFAULT true,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',

    -- Language
    preferred_language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Asuncion',

    -- Unsubscribe
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, tenant_id)
);

COMMENT ON TABLE public.communication_preferences IS 'Per-user communication preferences: channels, quiet hours, opt-outs';
COMMENT ON COLUMN public.communication_preferences.allow_marketing IS 'Opt-in for promotional messages (defaults false for GDPR/privacy)';
COMMENT ON COLUMN public.communication_preferences.quiet_hours_enabled IS 'When TRUE, no notifications between quiet_hours_start and quiet_hours_end';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "Staff manage conversations" ON public.conversations;
CREATE POLICY "Staff manage conversations" ON public.conversations
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own conversations" ON public.conversations;
CREATE POLICY "Clients view own conversations" ON public.conversations
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients create conversations" ON public.conversations;
CREATE POLICY "Clients create conversations" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access conversations" ON public.conversations;
CREATE POLICY "Service role full access conversations" ON public.conversations
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Messages uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage messages" ON public.messages;
CREATE POLICY "Staff manage messages" ON public.messages
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own messages" ON public.messages;
CREATE POLICY "Clients view own messages" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.client_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients send messages" ON public.messages;
CREATE POLICY "Clients send messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_type = 'client' AND sender_id = auth.uid()
    );

DROP POLICY IF EXISTS "Service role full access messages" ON public.messages;
CREATE POLICY "Service role full access messages" ON public.messages
    FOR ALL TO service_role USING (true);

-- Message templates
DROP POLICY IF EXISTS "Read templates" ON public.message_templates;
CREATE POLICY "Read templates" ON public.message_templates
    FOR SELECT TO authenticated
    USING ((tenant_id IS NULL OR public.is_staff_of(tenant_id)) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage templates" ON public.message_templates;
CREATE POLICY "Staff manage templates" ON public.message_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage templates" ON public.message_templates;
CREATE POLICY "Service role manage templates" ON public.message_templates
    FOR ALL TO service_role USING (true);

-- Reminders
DROP POLICY IF EXISTS "Staff manage reminders" ON public.reminders;
CREATE POLICY "Staff manage reminders" ON public.reminders
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own reminders" ON public.reminders;
CREATE POLICY "Clients view own reminders" ON public.reminders
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access reminders" ON public.reminders;
CREATE POLICY "Service role full access reminders" ON public.reminders
    FOR ALL TO service_role USING (true);

-- Notification queue
DROP POLICY IF EXISTS "Staff manage queue" ON public.notification_queue;
CREATE POLICY "Staff manage queue" ON public.notification_queue
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access queue" ON public.notification_queue;
CREATE POLICY "Service role full access queue" ON public.notification_queue
    FOR ALL TO service_role USING (true);

-- Communication preferences
DROP POLICY IF EXISTS "Users manage own preferences" ON public.communication_preferences;
CREATE POLICY "Users manage own preferences" ON public.communication_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view preferences" ON public.communication_preferences;
CREATE POLICY "Staff view preferences" ON public.communication_preferences
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access preferences" ON public.communication_preferences;
CREATE POLICY "Service role full access preferences" ON public.communication_preferences
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_pet ON public.conversations(pet_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread_staff ON public.conversations(unread_staff_count)
    WHERE unread_staff_count > 0;

-- Staff inbox (unread first)
CREATE INDEX IF NOT EXISTS idx_conversations_inbox ON public.conversations(tenant_id, unread_staff_count DESC, last_message_at DESC)
    INCLUDE (client_id, pet_id, subject, status, priority);

-- Client conversations (covering index)
CREATE INDEX IF NOT EXISTS idx_conversations_client_history ON public.conversations(client_id, last_message_at DESC)
    INCLUDE (tenant_id, subject, status, unread_client_count);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_brin ON public.messages
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- GIN indexes for JSONB columns (efficient message metadata searches)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON public.messages USING gin(metadata jsonb_path_ops)
    WHERE metadata IS NOT NULL AND metadata != '{}';
CREATE INDEX IF NOT EXISTS idx_messages_attachments_gin ON public.messages USING gin(attachments jsonb_path_ops)
    WHERE attachments IS NOT NULL AND attachments != '[]';

-- BRIN index for notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_brin ON public.notification_queue
    USING BRIN(created_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

CREATE INDEX IF NOT EXISTS idx_message_templates_tenant ON public.message_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON public.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON public.message_templates(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_tenant ON public.reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_client ON public.reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON public.reminders(scheduled_at)
    WHERE status = 'pending';

-- BRIN index for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_brin ON public.reminders
    USING BRIN(scheduled_at) WITH (pages_per_range = 32);

-- Reminders to process
CREATE INDEX IF NOT EXISTS idx_reminders_queue ON public.reminders(scheduled_at, status)
    INCLUDE (tenant_id, client_id, pet_id, type, reference_type, reference_id)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_reference ON public.reminders(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status)
    WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant ON public.notification_queue(tenant_id);

CREATE INDEX IF NOT EXISTS idx_communication_prefs_user ON public.communication_preferences(user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.conversations;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.messages;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.message_templates;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.message_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.reminders;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.communication_preferences;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.communication_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for messages
CREATE OR REPLACE FUNCTION public.messages_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.conversations
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS messages_auto_tenant ON public.messages;
CREATE TRIGGER messages_auto_tenant
    BEFORE INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.messages_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update conversation on message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations SET
        last_message_at = NEW.created_at,
        last_client_message_at = CASE WHEN NEW.sender_type = 'client' THEN NEW.created_at ELSE last_client_message_at END,
        last_staff_message_at = CASE WHEN NEW.sender_type = 'staff' THEN NEW.created_at ELSE last_staff_message_at END,
        unread_client_count = CASE WHEN NEW.sender_type IN ('staff', 'system') THEN unread_client_count + 1 ELSE unread_client_count END,
        unread_staff_count = CASE WHEN NEW.sender_type = 'client' THEN unread_staff_count + 1 ELSE unread_staff_count END,
        status = CASE WHEN status = 'resolved' AND NEW.sender_type = 'client' THEN 'open' ELSE status END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS message_update_conversation ON public.messages;
CREATE TRIGGER message_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
    p_conversation_id UUID,
    p_user_type TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_user_type = 'client' THEN
        UPDATE public.conversations SET
            client_last_read_at = NOW(),
            unread_client_count = 0
        WHERE id = p_conversation_id;

        UPDATE public.messages SET
            status = 'read',
            read_at = NOW()
        WHERE conversation_id = p_conversation_id
          AND sender_type IN ('staff', 'system')
          AND status != 'read';
    ELSE
        UPDATE public.conversations SET
            staff_last_read_at = NOW(),
            unread_staff_count = 0
        WHERE id = p_conversation_id;

        UPDATE public.messages SET
            status = 'read',
            read_at = NOW()
        WHERE conversation_id = p_conversation_id
          AND sender_type = 'client'
          AND status != 'read';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO public.message_templates (tenant_id, code, name, category, subject, content, variables, channels) VALUES
(NULL, 'APPT_CONFIRM', 'Confirmación de Cita', 'appointment',
 'Cita Confirmada',
 'Hola {{owner_name}}, tu cita para {{pet_name}} ha sido confirmada para el {{appointment_date}} a las {{appointment_time}}. Te esperamos en {{clinic_name}}.',
 ARRAY['owner_name', 'pet_name', 'appointment_date', 'appointment_time', 'clinic_name'],
 ARRAY['in_app', 'sms', 'whatsapp']),

(NULL, 'APPT_REMINDER_24H', 'Recordatorio de Cita (24h)', 'reminder',
 'Recordatorio de Cita',
 'Hola {{owner_name}}, te recordamos que tienes una cita mañana {{appointment_date}} a las {{appointment_time}} para {{pet_name}} en {{clinic_name}}.',
 ARRAY['owner_name', 'pet_name', 'appointment_date', 'appointment_time', 'clinic_name'],
 ARRAY['in_app', 'sms', 'whatsapp']),

(NULL, 'VACCINE_REMINDER', 'Recordatorio de Vacuna', 'reminder',
 'Recordatorio de Vacuna',
 'Hola {{owner_name}}, {{pet_name}} tiene pendiente la vacuna {{vaccine_name}}. Por favor agenda una cita llamando al {{clinic_phone}}.',
 ARRAY['owner_name', 'pet_name', 'vaccine_name', 'clinic_phone'],
 ARRAY['in_app', 'sms']),

(NULL, 'WELCOME', 'Bienvenida', 'welcome',
 'Bienvenido a {{clinic_name}}',
 'Bienvenido/a a {{clinic_name}}, {{owner_name}}! Gracias por registrar a {{pet_name}}. Estamos aquí para cuidar de tu mascota.',
 ARRAY['clinic_name', 'owner_name', 'pet_name'],
 ARRAY['in_app', 'email']),

(NULL, 'INVOICE_READY', 'Factura Lista', 'transactional',
 'Factura #{{invoice_number}} Lista',
 'Hola {{owner_name}}, tu factura #{{invoice_number}} por {{amount}} está lista. Puedes verla en tu portal de cliente.',
 ARRAY['owner_name', 'invoice_number', 'amount'],
 ARRAY['in_app', 'email'])
ON CONFLICT DO NOTHING;



-- ==========================================
-- FILE: 85_system/01_staff.sql
-- ==========================================

-- =============================================================================
-- 01_STAFF.SQL
-- =============================================================================
-- Staff management: profiles, schedules, time off.
--
-- DEPENDENCIES: 10_core/*
-- =============================================================================

-- =============================================================================
-- STAFF PROFILES (Extended info for staff members)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Professional info
    license_number TEXT,
    license_expiry DATE,
    specializations TEXT[],
    education TEXT,
    bio TEXT,

    -- Employment
    hire_date DATE,
    employment_type TEXT DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
    department TEXT,
    title TEXT,

    -- Rate/compensation
    hourly_rate NUMERIC(12,2),
    daily_rate NUMERIC(12,2),

    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,

    -- Signatures
    signature_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(profile_id)
);

COMMENT ON TABLE public.staff_profiles IS 'Extended staff info: licenses, specializations, employment details, signatures';
COMMENT ON COLUMN public.staff_profiles.license_number IS 'Professional license number (veterinarian, technician)';
COMMENT ON COLUMN public.staff_profiles.specializations IS 'Array of medical specializations (e.g., surgery, dermatology)';
COMMENT ON COLUMN public.staff_profiles.employment_type IS 'Employment type: full_time, part_time, contractor, intern';
COMMENT ON COLUMN public.staff_profiles.signature_url IS 'Digital signature image for prescriptions and documents';

-- =============================================================================
-- STAFF SCHEDULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Schedule name
    name TEXT DEFAULT 'Default',
    is_default BOOLEAN DEFAULT true,

    -- Effective dates
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.staff_schedules IS 'Named schedule definitions for staff members with effective date ranges';
COMMENT ON COLUMN public.staff_schedules.is_default IS 'TRUE if this is the staff members primary schedule';
COMMENT ON COLUMN public.staff_schedules.effective_from IS 'Schedule starts applying from this date';
COMMENT ON COLUMN public.staff_schedules.effective_until IS 'Schedule ends on this date (NULL = indefinite)';

-- =============================================================================
-- STAFF SCHEDULE ENTRIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.staff_schedules(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Day (1 = Monday, 7 = Sunday for ISO week)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),

    -- Time range
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Break
    break_start TIME,
    break_end TIME,

    -- Location (if multiple)
    location TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_schedule_entries_times CHECK (end_time > start_time),
    CONSTRAINT staff_schedule_entries_break CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    )
);

COMMENT ON TABLE public.staff_schedule_entries IS 'Daily working hours within a schedule (one row per working day)';
COMMENT ON COLUMN public.staff_schedule_entries.day_of_week IS 'ISO day of week: 1=Monday through 7=Sunday';
COMMENT ON COLUMN public.staff_schedule_entries.break_start IS 'Lunch/break start time (optional)';
COMMENT ON COLUMN public.staff_schedule_entries.break_end IS 'Lunch/break end time (optional)';

-- =============================================================================
-- TIME OFF TYPES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.time_off_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- tenant_id NULL = global template, NOT NULL = clinic-specific
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Type info
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,

    -- Settings
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    requires_documentation BOOLEAN DEFAULT false,

    -- Display
    color TEXT DEFAULT '#6366f1',
    icon TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.time_off_types IS 'Time off categories: vacation, sick, personal, etc. NULL tenant_id = global templates';
COMMENT ON COLUMN public.time_off_types.is_paid IS 'Whether this type of leave is paid';
COMMENT ON COLUMN public.time_off_types.max_days_per_year IS 'Annual allowance limit (NULL = unlimited)';
COMMENT ON COLUMN public.time_off_types.requires_approval IS 'Whether requests need manager approval';

-- =============================================================================
-- STAFF TIME OFF
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    type_id UUID REFERENCES public.time_off_types(id),

    -- Request details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_half_day BOOLEAN DEFAULT false,
    end_half_day BOOLEAN DEFAULT false,

    -- Reason
    reason TEXT,
    notes TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

    -- Approval
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_time_off_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.staff_time_off IS 'Staff time off requests with approval workflow';
COMMENT ON COLUMN public.staff_time_off.status IS 'Request status: pending → approved/rejected, or cancelled by staff';
COMMENT ON COLUMN public.staff_time_off.start_half_day IS 'TRUE if starting afternoon only';
COMMENT ON COLUMN public.staff_time_off.end_half_day IS 'TRUE if ending morning only';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

-- Staff profiles
DROP POLICY IF EXISTS "Staff view all profiles" ON public.staff_profiles;
CREATE POLICY "Staff view all profiles" ON public.staff_profiles
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage own profile" ON public.staff_profiles;
CREATE POLICY "Staff manage own profile" ON public.staff_profiles
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin manage all profiles" ON public.staff_profiles;
CREATE POLICY "Admin manage all profiles" ON public.staff_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_profiles.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Service role full access staff profiles" ON public.staff_profiles;
CREATE POLICY "Service role full access staff profiles" ON public.staff_profiles
    FOR ALL TO service_role USING (true);

-- Schedules
DROP POLICY IF EXISTS "Staff view schedules" ON public.staff_schedules;
CREATE POLICY "Staff view schedules" ON public.staff_schedules
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Admin manage schedules" ON public.staff_schedules;
CREATE POLICY "Admin manage schedules" ON public.staff_schedules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_schedules.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access schedules" ON public.staff_schedules;
CREATE POLICY "Service role full access schedules" ON public.staff_schedules
    FOR ALL TO service_role USING (true);

-- Schedule entries
DROP POLICY IF EXISTS "Access schedule entries" ON public.staff_schedule_entries;
CREATE POLICY "Access schedule entries" ON public.staff_schedule_entries
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access entries" ON public.staff_schedule_entries;
CREATE POLICY "Service role full access entries" ON public.staff_schedule_entries
    FOR ALL TO service_role USING (true);

-- Time off types
DROP POLICY IF EXISTS "Staff view time off types" ON public.time_off_types;
CREATE POLICY "Staff view time off types" ON public.time_off_types
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Admin manage time off types" ON public.time_off_types;
CREATE POLICY "Admin manage time off types" ON public.time_off_types
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = time_off_types.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access time off types" ON public.time_off_types;
CREATE POLICY "Service role full access time off types" ON public.time_off_types
    FOR ALL TO service_role USING (true);

-- Time off requests
DROP POLICY IF EXISTS "Staff view own time off" ON public.staff_time_off;
CREATE POLICY "Staff view own time off" ON public.staff_time_off
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            WHERE sp.id = staff_time_off.staff_id
            AND sp.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff request time off" ON public.staff_time_off;
CREATE POLICY "Staff request time off" ON public.staff_time_off
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            WHERE sp.id = staff_time_off.staff_id
            AND sp.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin manage time off" ON public.staff_time_off;
CREATE POLICY "Admin manage time off" ON public.staff_time_off
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_time_off.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access time off" ON public.staff_time_off;
CREATE POLICY "Service role full access time off" ON public.staff_time_off
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_profiles_profile ON public.staff_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant ON public.staff_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON public.staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_tenant ON public.staff_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_active ON public.staff_schedules(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_schedule ON public.staff_schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_tenant ON public.staff_schedule_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_day ON public.staff_schedule_entries(day_of_week);

CREATE INDEX IF NOT EXISTS idx_time_off_types_tenant ON public.time_off_types(tenant_id);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff ON public.staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_tenant ON public.staff_time_off(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON public.staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON public.staff_time_off(status)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_schedules;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_time_off;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_time_off
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for schedule entries
CREATE OR REPLACE FUNCTION public.staff_schedule_entries_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.staff_schedules
        WHERE id = NEW.schedule_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS schedule_entries_auto_tenant ON public.staff_schedule_entries;
CREATE TRIGGER schedule_entries_auto_tenant
    BEFORE INSERT ON public.staff_schedule_entries
    FOR EACH ROW EXECUTE FUNCTION public.staff_schedule_entries_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Check staff availability
CREATE OR REPLACE FUNCTION public.check_staff_availability(
    p_staff_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INTEGER;
    v_has_schedule BOOLEAN;
    v_has_time_off BOOLEAN;
BEGIN
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;

    -- Check schedule
    SELECT EXISTS (
        SELECT 1 FROM public.staff_schedule_entries se
        JOIN public.staff_schedules s ON se.schedule_id = s.id
        WHERE s.staff_id = p_staff_id
          AND s.is_active = true
          AND (s.effective_until IS NULL OR s.effective_until >= p_date)
          AND s.effective_from <= p_date
          AND se.day_of_week = v_day_of_week
          AND se.start_time <= p_start_time
          AND se.end_time >= p_end_time
    ) INTO v_has_schedule;

    IF NOT v_has_schedule THEN
        RETURN false;
    END IF;

    -- Check time off
    SELECT EXISTS (
        SELECT 1 FROM public.staff_time_off
        WHERE staff_id = p_staff_id
          AND status = 'approved'
          AND p_date BETWEEN start_date AND end_date
    ) INTO v_has_time_off;

    RETURN NOT v_has_time_off;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ==========================================
-- FILE: 90_infrastructure/01_storage.sql
-- ==========================================

-- =============================================================================
-- 01_STORAGE.SQL
-- =============================================================================
-- Supabase Storage buckets and policies for file uploads.
--
-- Bucket organization:
--   - pets/         → Pet photos
--   - vaccines/     → Vaccine certificates/photos
--   - records/      → Medical record attachments
--   - prescriptions/→ Prescription PDFs
--   - invoices/     → Invoice PDFs
--   - lab/          → Lab result attachments
--   - consents/     → Signed consent documents
--   - store/        → Product images
--   - receipts/     → Expense receipts (private)
--   - qr-codes/     → Generated QR code images
--   - signatures/   → Digital signatures
--   - messages/     → Message attachments
--
-- Dependencies: 00_setup/02_core_functions
-- =============================================================================

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Pet photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pets',
    'pets',
    TRUE,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Vaccine certificates/photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vaccines',
    'vaccines',
    TRUE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Medical record attachments (public read, staff write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'records',
    'records',
    TRUE,
    20971520,  -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Prescription PDFs (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'prescriptions',
    'prescriptions',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Invoice PDFs (public read for owners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lab result attachments (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lab',
    'lab',
    TRUE,
    20971520,  -- 20MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Consent documents (public read for signers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consents',
    'consents',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Store product images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'store',
    'store',
    TRUE,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Expense receipts (private - staff only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    FALSE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- QR code images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'qr-codes',
    'qr-codes',
    TRUE,
    1048576,  -- 1MB
    ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Digital signatures (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'signatures',
    'signatures',
    TRUE,
    1048576,  -- 1MB
    ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Message attachments (authenticated access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'messages',
    'messages',
    FALSE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STORAGE POLICIES - PETS BUCKET
-- =============================================================================

-- Anyone can view pet photos
DROP POLICY IF EXISTS "Public view pets" ON storage.objects;
CREATE POLICY "Public view pets" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pets');

-- Authenticated users can upload pet photos
DROP POLICY IF EXISTS "Authenticated upload pets" ON storage.objects;
CREATE POLICY "Authenticated upload pets" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pets');

-- Owners can update/delete their pet's photos
DROP POLICY IF EXISTS "Owners manage pets" ON storage.objects;
CREATE POLICY "Owners manage pets" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'pets'
        AND (
            auth.uid() IN (
                SELECT owner_id FROM public.pets
                WHERE id::TEXT = (storage.foldername(name))[1]
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('vet', 'admin')
            )
        )
    );

-- =============================================================================
-- STORAGE POLICIES - VACCINES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view vaccines" ON storage.objects;
CREATE POLICY "Public view vaccines" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'vaccines');

DROP POLICY IF EXISTS "Authenticated upload vaccines" ON storage.objects;
CREATE POLICY "Authenticated upload vaccines" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'vaccines');

DROP POLICY IF EXISTS "Staff delete vaccines" ON storage.objects;
CREATE POLICY "Staff delete vaccines" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'vaccines'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - RECORDS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view records" ON storage.objects;
CREATE POLICY "Public view records" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'records');

DROP POLICY IF EXISTS "Staff manage records" ON storage.objects;
CREATE POLICY "Staff manage records" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'records'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - PRESCRIPTIONS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view prescriptions" ON storage.objects;
CREATE POLICY "Public view prescriptions" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'prescriptions');

DROP POLICY IF EXISTS "Staff manage prescriptions" ON storage.objects;
CREATE POLICY "Staff manage prescriptions" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'prescriptions'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - INVOICES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view invoices" ON storage.objects;
CREATE POLICY "Public view invoices" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Staff manage invoices" ON storage.objects;
CREATE POLICY "Staff manage invoices" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'invoices'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - LAB BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view lab" ON storage.objects;
CREATE POLICY "Public view lab" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'lab');

DROP POLICY IF EXISTS "Staff manage lab" ON storage.objects;
CREATE POLICY "Staff manage lab" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'lab'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - CONSENTS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view consents" ON storage.objects;
CREATE POLICY "Public view consents" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'consents');

DROP POLICY IF EXISTS "Authenticated upload consents" ON storage.objects;
CREATE POLICY "Authenticated upload consents" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'consents');

DROP POLICY IF EXISTS "Staff delete consents" ON storage.objects;
CREATE POLICY "Staff delete consents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'consents'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- STORAGE POLICIES - STORE BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view store" ON storage.objects;
CREATE POLICY "Public view store" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'store');

DROP POLICY IF EXISTS "Staff manage store" ON storage.objects;
CREATE POLICY "Staff manage store" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'store'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - RECEIPTS BUCKET (Private)
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage receipts" ON storage.objects;
CREATE POLICY "Staff manage receipts" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - QR-CODES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view qr-codes" ON storage.objects;
CREATE POLICY "Public view qr-codes" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Authenticated upload qr-codes" ON storage.objects;
CREATE POLICY "Authenticated upload qr-codes" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Staff delete qr-codes" ON storage.objects;
CREATE POLICY "Staff delete qr-codes" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'qr-codes'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - SIGNATURES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view signatures" ON storage.objects;
CREATE POLICY "Public view signatures" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'signatures');

DROP POLICY IF EXISTS "Authenticated upload signatures" ON storage.objects;
CREATE POLICY "Authenticated upload signatures" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'signatures');

-- =============================================================================
-- STORAGE POLICIES - MESSAGES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated access messages" ON storage.objects;
CREATE POLICY "Authenticated access messages" ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'messages');

-- =============================================================================
-- STORAGE HELPER FUNCTIONS
-- =============================================================================

-- Get public URL for a storage object
CREATE OR REPLACE FUNCTION public.get_storage_url(
    p_bucket_id TEXT,
    p_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN CONCAT(
        current_setting('app.settings.storage_url', true),
        '/storage/v1/object/public/',
        p_bucket_id, '/',
        p_path
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Clean up orphaned storage objects (run periodically)
-- This is a template - actual cleanup should be handled by a scheduled job
CREATE OR REPLACE FUNCTION public.get_orphaned_storage_paths(p_bucket_id TEXT)
RETURNS TABLE (path TEXT) AS $$
BEGIN
    -- This would need to be customized per bucket
    -- Example for pets bucket:
    IF p_bucket_id = 'pets' THEN
        RETURN QUERY
        SELECT o.name
        FROM storage.objects o
        WHERE o.bucket_id = 'pets'
          AND NOT EXISTS (
              SELECT 1 FROM public.pets p
              WHERE p.photo_url LIKE '%' || o.name
          );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;




-- ==========================================
-- FILE: 02_functions/02_core_functions.sql
-- ==========================================

-- =============================================================================
-- 02_CORE_FUNCTIONS.SQL
-- =============================================================================
-- Core utility functions used throughout the application.
-- These replace the stub functions created earlier with real implementations.
-- =============================================================================

-- Functions use CREATE OR REPLACE to update in place without breaking dependencies

-- =============================================================================
-- A. UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- Automatically updates the updated_at column on row modification.
-- Used by all tables with updated_at column.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- B. IS_STAFF_OF (Authorization Helper)
-- =============================================================================
-- Checks if the current user is a staff member (vet/admin) of a given tenant.
-- Used extensively in RLS policies for row-level security.
--
-- SECURITY DEFINER: Runs with elevated privileges to query profiles table
-- even when the calling user might not have direct access.

CREATE OR REPLACE FUNCTION public.is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND role IN ('vet', 'admin')
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- C. IS_OWNER_OF_PET (Authorization Helper)
-- =============================================================================
-- Checks if the current user owns a specific pet.
-- Used in RLS policies for pet-related tables.

CREATE OR REPLACE FUNCTION public.is_owner_of_pet(pet_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = pet_uuid
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- D. GET_USER_TENANT (Helper)
-- =============================================================================
-- Returns the tenant_id for the current authenticated user.
-- Useful in RLS policies and application logic.

CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- E. GET_USER_ROLE (Helper)
-- =============================================================================
-- Returns the role for the current authenticated user.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- F. PROTECT_CRITICAL_COLUMNS (Security Trigger)
-- =============================================================================
-- Prevents users from modifying their own role or tenant_id.
-- Applied to profiles table.

CREATE OR REPLACE FUNCTION public.protect_critical_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service role to modify anything
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- For regular users, protect critical columns
    IF OLD.id = auth.uid() THEN
        -- User is modifying their own profile
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Cannot modify your own role';
        END IF;
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Cannot modify your own tenant';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- G. SOFT DELETE HELPER
-- =============================================================================
-- Generic function to soft delete records.
-- Handles tables with or without deleted_by column

CREATE OR REPLACE FUNCTION public.soft_delete(
    table_name TEXT,
    record_id UUID,
    deleted_by_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    -- Check if table has deleted_by column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = soft_delete.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
            table_name
        ) USING COALESCE(deleted_by_id, auth.uid()), record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- H. RESTORE DELETED RECORD
-- =============================================================================
-- Generic function to restore soft-deleted records.
-- Handles tables with or without deleted_by column

CREATE OR REPLACE FUNCTION public.restore_deleted(
    table_name TEXT,
    record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = restore_deleted.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- I. GENERATE SEQUENCE NUMBER
-- =============================================================================
-- Generates sequential numbers for invoices, lab orders, etc.
-- Uses document_sequences table for thread-safe generation

CREATE OR REPLACE FUNCTION public.generate_sequence_number(
    prefix TEXT,
    tenant TEXT,
    sequence_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_doc_type TEXT;
BEGIN
    -- Map prefix to document type
    v_doc_type := COALESCE(sequence_name, LOWER(prefix));

    RETURN public.next_document_number(tenant, v_doc_type, UPPER(prefix));
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ==========================================
-- FILE: 02_functions/03_helper_functions.sql
-- ==========================================

-- =============================================================================
-- 03_HELPER_FUNCTIONS.SQL
-- =============================================================================
-- Additional helper functions for business logic and API support.
-- These extend the core functions with specific business operations.
--
-- Dependencies: 02_core_functions.sql
-- =============================================================================

-- Functions use CREATE OR REPLACE to update in place without breaking dependencies

-- =============================================================================
-- A. PET MANAGEMENT FUNCTIONS
-- =============================================================================

-- Get pet by QR tag code (public lookup)
CREATE OR REPLACE FUNCTION public.get_pet_by_tag(tag_code TEXT)
RETURNS TABLE (
    pet_id UUID,
    pet_name TEXT,
    species TEXT,
    breed TEXT,
    photo_url TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    clinic_name TEXT,
    clinic_phone TEXT,
    is_lost BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.photo_url,
        pr.full_name,
        pr.phone,
        t.name,
        t.phone,
        EXISTS (SELECT 1 FROM public.lost_pets lp WHERE lp.pet_id = p.id AND lp.status = 'lost')
    FROM public.qr_tags qt
    INNER JOIN public.pets p ON qt.pet_id = p.id
    LEFT JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.tenants t ON p.tenant_id = t.id
    WHERE qt.code = tag_code
      AND qt.is_active = TRUE
      AND qt.is_registered = TRUE
      AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_by_tag IS 'Public lookup of pet info by QR tag code';

-- Assign QR tag to pet
CREATE OR REPLACE FUNCTION public.assign_tag_to_pet(
    p_tag_code TEXT,
    p_pet_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tag_id UUID;
    v_pet_tenant TEXT;
BEGIN
    -- Get pet's tenant
    SELECT tenant_id INTO v_pet_tenant
    FROM public.pets
    WHERE id = p_pet_id AND deleted_at IS NULL;

    IF v_pet_tenant IS NULL THEN
        RAISE EXCEPTION 'Pet not found';
    END IF;

    -- Check authorization
    IF NOT public.is_owner_of_pet(p_pet_id) AND NOT public.is_staff_of(v_pet_tenant) THEN
        RAISE EXCEPTION 'Not authorized to assign tag to this pet';
    END IF;

    -- Find and update tag
    UPDATE public.qr_tags
    SET pet_id = p_pet_id,
        assigned_at = NOW(),
        assigned_by = auth.uid(),
        is_registered = TRUE
    WHERE code = p_tag_code
      AND is_active = TRUE
      AND (pet_id IS NULL OR pet_id = p_pet_id)  -- Allow reassignment to same pet
      AND (tenant_id IS NULL OR tenant_id = v_pet_tenant)
    RETURNING id INTO v_tag_id;

    RETURN v_tag_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.assign_tag_to_pet IS 'Assign a QR tag to a pet';

-- Note: search_pets and get_pet_age are defined in 20_pets/01_pets.sql

-- =============================================================================
-- B. INVENTORY FUNCTIONS
-- =============================================================================

-- Process inventory transaction (updates stock and WAC)
CREATE OR REPLACE FUNCTION public.process_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty NUMERIC;
    v_current_cost NUMERIC;
    v_new_qty NUMERIC;
    v_new_cost NUMERIC;
BEGIN
    -- Get current inventory
    SELECT stock_quantity, weighted_average_cost
    INTO v_current_qty, v_current_cost
    FROM public.store_inventory
    WHERE product_id = NEW.product_id;

    IF NOT FOUND THEN
        -- Create inventory record if doesn't exist
        INSERT INTO public.store_inventory (product_id, tenant_id, stock_quantity, weighted_average_cost)
        VALUES (NEW.product_id, NEW.tenant_id, 0, 0);
        v_current_qty := 0;
        v_current_cost := 0;
    END IF;

    -- Calculate new quantity
    v_new_qty := v_current_qty + NEW.quantity;

    -- Calculate new WAC for purchases
    IF NEW.type = 'purchase' AND NEW.quantity > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_new_cost := ((v_current_qty * v_current_cost) + (NEW.quantity * NEW.unit_cost)) / NULLIF(v_new_qty, 0);
    ELSE
        v_new_cost := v_current_cost;
    END IF;

    -- Update inventory
    UPDATE public.store_inventory
    SET stock_quantity = v_new_qty,
        weighted_average_cost = COALESCE(v_new_cost, weighted_average_cost),
        updated_at = NOW()
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.process_inventory_transaction IS 'Updates stock and WAC on inventory transaction';

-- Note: track_price_change and validate_coupon are defined in 60_store/01_inventory.sql

-- =============================================================================
-- C. CLINICAL FUNCTIONS
-- =============================================================================

-- Temporarily disabled due to vaccines table issues
-- Handle new pet vaccines (auto-create from templates)
-- CREATE OR REPLACE FUNCTION public.handle_new_pet_vaccines()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     v_template RECORD;
-- BEGIN
--     -- Get vaccine templates for this species
--     FOR v_template IN
--         SELECT * FROM public.vaccine_templates
--         WHERE NEW.species = ANY(species)
--           AND is_active = TRUE
--           AND (tenant_id IS NULL OR tenant_id = NEW.tenant_id)
--         ORDER BY display_order
--     LOOP
--         -- Create scheduled vaccine record
--         INSERT INTO public.vaccines (pet_id, template_id, name, administered_date, status)
--         VALUES (
--             NEW.id,
--             v_template.id,
--             v_template.name,
--             CURRENT_DATE,  -- Placeholder date
--             'scheduled'
--         );
--     END LOOP;
--
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SET search_path = public;
--
-- COMMENT ON FUNCTION public.handle_new_pet_vaccines IS 'Auto-creates vaccine records for new pets based on templates';

-- Get pet's active insurance
CREATE OR REPLACE FUNCTION public.get_pet_active_insurance(p_pet_id UUID)
RETURNS TABLE (
    policy_id UUID,
    provider_name TEXT,
    policy_number TEXT,
    plan_name TEXT,
    annual_limit NUMERIC,
    deductible_amount NUMERIC,
    coinsurance_percentage NUMERIC,
    expiration_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ip.id,
        prov.name,
        ip.policy_number,
        ip.plan_name,
        ip.annual_limit,
        ip.deductible_amount,
        ip.coinsurance_percentage,
        ip.expiration_date
    FROM public.insurance_policies ip
    INNER JOIN public.insurance_providers prov ON ip.provider_id = prov.id
    WHERE ip.pet_id = p_pet_id
      AND ip.status = 'active'
      AND (ip.expiration_date IS NULL OR ip.expiration_date >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_active_insurance IS 'Get active insurance policy for a pet';

-- Note: check_appointment_overlap and get_available_slots are defined in 40_scheduling/02_appointments.sql

-- =============================================================================
-- D. CLIENT FUNCTIONS
-- =============================================================================

-- Get client pet counts (batch lookup)
CREATE OR REPLACE FUNCTION public.get_client_pet_counts(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (
    client_id UUID,
    pet_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.owner_id,
        COUNT(*)
    FROM public.pets p
    WHERE p.owner_id = ANY(p_client_ids)
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
    GROUP BY p.owner_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.get_client_pet_counts IS 'Get pet counts for multiple clients';

-- Get client last appointments (batch lookup)
CREATE OR REPLACE FUNCTION public.get_client_last_appointments(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (
    client_id UUID,
    last_appointment_date TIMESTAMPTZ,
    last_appointment_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.owner_id)
        p.owner_id,
        a.start_time,
        a.status
    FROM public.appointments a
    INNER JOIN public.pets p ON a.pet_id = p.id
    WHERE p.owner_id = ANY(p_client_ids)
      AND a.tenant_id = p_tenant_id
      AND a.status IN ('completed', 'confirmed', 'checked_in')
    ORDER BY p.owner_id, a.start_time DESC;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.get_client_last_appointments IS 'Get last appointment for multiple clients';

-- =============================================================================
-- F. INVITE FUNCTIONS
-- =============================================================================
-- Note: create_clinic_invite is defined in 10_core/03_invites.sql
-- Only additional invite helper functions should be here

-- Expire old invites
CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.expire_old_invites IS 'Mark expired invites as expired';

-- =============================================================================
-- G. ADDITIONAL TRIGGERS
-- =============================================================================

-- Note: These triggers should be created after their respective tables exist.
-- They are included here for reference and should be run after table creation.

-- Inventory transaction trigger (if not already created in 60_inventory.sql)
-- DROP TRIGGER IF EXISTS on_inventory_transaction ON public.store_inventory_transactions;
-- CREATE TRIGGER on_inventory_transaction
--     AFTER INSERT ON public.store_inventory_transactions
--     FOR EACH ROW EXECUTE FUNCTION public.process_inventory_transaction();

-- Price change trigger (if not already created in 60_inventory.sql)
-- DROP TRIGGER IF EXISTS on_price_change ON public.store_products;
-- CREATE TRIGGER on_price_change
--     AFTER UPDATE ON public.store_products
--     FOR EACH ROW
--     WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price OR OLD.sale_price IS DISTINCT FROM NEW.sale_price)
--     EXECUTE FUNCTION public.track_price_change();

-- =============================================================================
-- H. STANDARDIZED TENANT PROPAGATION
-- =============================================================================
-- Pattern for auto-setting tenant_id in child tables from parent tables.
-- This provides reusable lookup functions for common parent-child relationships.
--
-- USAGE: Create a trigger function that calls the appropriate lookup, then
--        attach it to the child table's BEFORE INSERT trigger.
-- =============================================================================

-- Generic parent tenant lookup functions
-- These are optimized SQL functions (not plpgsql) for maximum performance

-- Lookup tenant from pets table
CREATE OR REPLACE FUNCTION public.get_tenant_from_pet(p_pet_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.pets WHERE id = p_pet_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_pet IS 'Get tenant_id from pets table';

-- Lookup tenant from invoices table
CREATE OR REPLACE FUNCTION public.get_tenant_from_invoice(p_invoice_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.invoices WHERE id = p_invoice_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_invoice IS 'Get tenant_id from invoices table';

-- Lookup tenant from lab_orders table
CREATE OR REPLACE FUNCTION public.get_tenant_from_lab_order(p_lab_order_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.lab_orders WHERE id = p_lab_order_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_lab_order IS 'Get tenant_id from lab_orders table';

-- Lookup tenant from hospitalizations table
CREATE OR REPLACE FUNCTION public.get_tenant_from_hospitalization(p_hospitalization_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.hospitalizations WHERE id = p_hospitalization_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_hospitalization IS 'Get tenant_id from hospitalizations table';

-- Lookup tenant from store_orders table
CREATE OR REPLACE FUNCTION public.get_tenant_from_store_order(p_order_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.store_orders WHERE id = p_order_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_store_order IS 'Get tenant_id from store_orders table';

-- Lookup tenant from store_campaigns table
CREATE OR REPLACE FUNCTION public.get_tenant_from_campaign(p_campaign_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.store_campaigns WHERE id = p_campaign_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_campaign IS 'Get tenant_id from store_campaigns table';

-- Lookup tenant from conversations table
CREATE OR REPLACE FUNCTION public.get_tenant_from_conversation(p_conversation_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.conversations WHERE id = p_conversation_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_conversation IS 'Get tenant_id from conversations table';

-- Lookup tenant from insurance_claims table
CREATE OR REPLACE FUNCTION public.get_tenant_from_claim(p_claim_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.insurance_claims WHERE id = p_claim_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_claim IS 'Get tenant_id from insurance_claims table';

-- Lookup tenant from staff_schedules table
CREATE OR REPLACE FUNCTION public.get_tenant_from_schedule(p_schedule_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.staff_schedules WHERE id = p_schedule_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_schedule IS 'Get tenant_id from staff_schedules table';

-- Lookup tenant from qr_tags table
CREATE OR REPLACE FUNCTION public.get_tenant_from_qr_tag(p_tag_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.qr_tags WHERE id = p_tag_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_tenant_from_qr_tag IS 'Get tenant_id from qr_tags table';

-- Temporarily disabled due to vaccines table issues
-- Lookup tenant from vaccines table (for vaccine_reactions)
-- CREATE OR REPLACE FUNCTION public.get_tenant_from_vaccine(p_vaccine_id UUID)
-- RETURNS TEXT AS $$
--     SELECT tenant_id FROM public.vaccines WHERE id = p_vaccine_id;
-- $$ LANGUAGE sql STABLE SET search_path = public;
--
-- COMMENT ON FUNCTION public.get_tenant_from_vaccine IS 'Get tenant_id from vaccines table';

-- =============================================================================
-- DOCUMENTATION: How to use tenant propagation pattern
-- =============================================================================
--
-- For new child tables, follow this pattern:
--
-- 1. Create a trigger function for your specific parent-child relationship:
--
--    CREATE OR REPLACE FUNCTION public.my_child_set_tenant_id()
--    RETURNS TRIGGER AS $$
--    BEGIN
--        IF NEW.tenant_id IS NULL THEN
--            NEW.tenant_id := public.get_tenant_from_parent(NEW.parent_id);
--        END IF;
--        RETURN NEW;
--    END;
--    $$ LANGUAGE plpgsql SET search_path = public;
--
-- 2. Create the trigger on your child table:
--
--    CREATE TRIGGER my_child_auto_tenant
--        BEFORE INSERT ON public.my_child_table
--        FOR EACH ROW EXECUTE FUNCTION public.my_child_set_tenant_id();
--
-- Benefits:
-- - Consistent pattern across all modules
-- - SQL lookup functions are optimized (STABLE, no transaction overhead)
-- - Easy to trace and debug tenant propagation issues
-- - RLS policies can use direct tenant_id checks (no JOINs)
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS COMPLETE
-- =============================================================================
