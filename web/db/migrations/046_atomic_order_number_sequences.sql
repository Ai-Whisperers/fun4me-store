-- Migration: 046_atomic_order_number_sequences.sql
-- Description: Fix race conditions in lab order and hospitalization number generation (SEC-003, SEC-004)
-- Uses database sequences for guaranteed unique, atomic number generation

-- ============================================================================
-- SEC-003: Lab Order Number Sequence
-- ============================================================================

-- Create table to track daily sequences per tenant
CREATE TABLE IF NOT EXISTS lab_order_sequences (
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    date DATE NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, date)
);

-- Create atomic function for lab order numbers
CREATE OR REPLACE FUNCTION generate_lab_order_number(p_tenant_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date DATE;
    v_date_str TEXT;
    v_seq INTEGER;
BEGIN
    v_date := CURRENT_DATE;
    v_date_str := TO_CHAR(v_date, 'YYYYMMDD');

    -- Insert or update with row lock to get next sequence
    INSERT INTO lab_order_sequences (tenant_id, date, last_number)
    VALUES (p_tenant_id, v_date, 1)
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET last_number = lab_order_sequences.last_number + 1
    RETURNING last_number INTO v_seq;

    RETURN 'LAB-' || v_date_str || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_lab_order_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_lab_order_number(TEXT) TO service_role;

-- Add unique constraint on lab_orders.order_number if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lab_orders_order_number_key'
        AND conrelid = 'public.lab_orders'::regclass
    ) THEN
        ALTER TABLE lab_orders ADD CONSTRAINT lab_orders_order_number_key UNIQUE (order_number);
    END IF;
END $$;

-- ============================================================================
-- SEC-004: Hospitalization Number Sequence
-- ============================================================================

-- Create table to track yearly sequences per tenant
CREATE TABLE IF NOT EXISTS hospitalization_sequences (
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year)
);

-- Create atomic function for hospitalization numbers
CREATE OR REPLACE FUNCTION generate_hospitalization_number(p_tenant_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

    -- Insert or update with row lock to get next sequence
    INSERT INTO hospitalization_sequences (tenant_id, year, last_number)
    VALUES (p_tenant_id, v_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_number = hospitalization_sequences.last_number + 1
    RETURNING last_number INTO v_seq;

    RETURN 'H-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_hospitalization_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_hospitalization_number(TEXT) TO service_role;

-- Add unique constraint on hospitalizations.hospitalization_number if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'hospitalizations_number_key'
        AND conrelid = 'public.hospitalizations'::regclass
    ) THEN
        ALTER TABLE hospitalizations ADD CONSTRAINT hospitalizations_number_key UNIQUE (hospitalization_number);
    END IF;
END $$;

-- ============================================================================
-- RLS Policies for sequence tables
-- ============================================================================

ALTER TABLE lab_order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalization_sequences ENABLE ROW LEVEL SECURITY;

-- Staff can manage sequences for their tenant
CREATE POLICY "Staff manage lab order sequences" ON lab_order_sequences
    FOR ALL USING (is_staff_of(tenant_id));

CREATE POLICY "Staff manage hospitalization sequences" ON hospitalization_sequences
    FOR ALL USING (is_staff_of(tenant_id));

-- ============================================================================
-- Initialize sequences from existing data
-- ============================================================================

-- Initialize lab order sequences from existing orders
INSERT INTO lab_order_sequences (tenant_id, date, last_number)
SELECT
    tenant_id,
    (regexp_matches(order_number, 'LAB-(\d{8})-'))[1]::DATE as date,
    MAX((regexp_matches(order_number, 'LAB-\d{8}-(\d+)'))[1]::INTEGER) as last_number
FROM lab_orders
WHERE order_number ~ '^LAB-\d{8}-\d+'
GROUP BY tenant_id, (regexp_matches(order_number, 'LAB-(\d{8})-'))[1]::DATE
ON CONFLICT (tenant_id, date) DO UPDATE SET
    last_number = GREATEST(lab_order_sequences.last_number, EXCLUDED.last_number);

-- Initialize hospitalization sequences from existing records
INSERT INTO hospitalization_sequences (tenant_id, year, last_number)
SELECT
    p.tenant_id,
    (regexp_matches(h.hospitalization_number, 'H-(\d{4})-'))[1]::INTEGER as year,
    MAX((regexp_matches(h.hospitalization_number, 'H-\d{4}-(\d+)'))[1]::INTEGER) as last_number
FROM hospitalizations h
JOIN pets p ON h.pet_id = p.id
WHERE h.hospitalization_number ~ '^H-\d{4}-\d+'
GROUP BY p.tenant_id, (regexp_matches(h.hospitalization_number, 'H-(\d{4})-'))[1]::INTEGER
ON CONFLICT (tenant_id, year) DO UPDATE SET
    last_number = GREATEST(hospitalization_sequences.last_number, EXCLUDED.last_number);

-- Comments
COMMENT ON FUNCTION generate_lab_order_number(TEXT) IS
'Atomically generates unique lab order numbers in format LAB-YYYYMMDD-XXXX.
Uses INSERT ON CONFLICT for atomic increment. SEC-003 fix.';

COMMENT ON FUNCTION generate_hospitalization_number(TEXT) IS
'Atomically generates unique hospitalization numbers in format H-YYYY-XXXX.
Uses INSERT ON CONFLICT for atomic increment. SEC-004 fix.';
