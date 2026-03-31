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
