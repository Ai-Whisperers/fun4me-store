-- =============================================================================
-- 003_FIX_SEQUENCE_GENERATION.SQL
-- =============================================================================
-- Fixes race conditions in sequence number generation by using proper
-- sequence tables with advisory locks.
--
-- Affected functions:
--   - generate_invoice_number()
--   - generate_admission_number()
--   - generate_sequence_number() (generic)
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. CREATE SEQUENCE TRACKING TABLES
-- =============================================================================

-- Generic sequence table for all document types
CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    document_type TEXT NOT NULL,  -- 'invoice', 'admission', 'lab_order', etc.
    year INTEGER NOT NULL,
    current_sequence INTEGER NOT NULL DEFAULT 0,
    prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, document_type, year)
);

-- Enable RLS
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can manage sequences
CREATE POLICY "Admin manage sequences" ON public.document_sequences
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = document_sequences.tenant_id
            AND p.role = 'admin'
        )
    );

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
-- B. GENERIC SEQUENCE GENERATOR (Thread-Safe)
-- =============================================================================

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
    -- Default year to current
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

    -- Default prefix based on document type
    v_prefix := COALESCE(p_prefix, CASE p_document_type
        WHEN 'invoice' THEN 'FAC'
        WHEN 'admission' THEN 'ADM'
        WHEN 'lab_order' THEN 'LAB'
        WHEN 'payment' THEN 'PAG'
        WHEN 'refund' THEN 'REE'
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

    -- Return formatted number
    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- C. REPLACE INVOICE NUMBER GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'invoice', 'FAC');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- D. REPLACE ADMISSION NUMBER GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_admission_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Admission numbers don't reset yearly, so we use a different approach
    v_lock_key := hashtext(p_tenant_id || ':admission');

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
$$ LANGUAGE plpgsql;

-- =============================================================================
-- E. REPLACE GENERIC SEQUENCE GENERATOR
-- =============================================================================

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
$$ LANGUAGE plpgsql;

-- =============================================================================
-- F. PAYMENT NUMBER GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_payment_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'payment', 'PAG');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- G. REFUND NUMBER GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_refund_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'refund', 'REE');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- H. LAB ORDER NUMBER GENERATOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_lab_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'lab_order', 'LAB');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- I. MIGRATE EXISTING SEQUENCES
-- =============================================================================
-- Initialize sequence counters based on existing data

-- Invoices
INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
SELECT
    tenant_id,
    'invoice',
    EXTRACT(YEAR FROM invoice_date)::INTEGER,
    MAX(COALESCE(
        CASE
            WHEN invoice_number ~ '^FAC-\d{4}-\d+$'
            THEN CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)
            ELSE 0
        END, 0
    )),
    'FAC'
FROM public.invoices
WHERE invoice_number IS NOT NULL
GROUP BY tenant_id, EXTRACT(YEAR FROM invoice_date)
ON CONFLICT (tenant_id, document_type, year)
DO UPDATE SET current_sequence = GREATEST(
    public.document_sequences.current_sequence,
    EXCLUDED.current_sequence
);

-- Hospitalizations (admission numbers)
INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
SELECT
    tenant_id,
    'admission',
    0,
    MAX(COALESCE(
        CASE
            WHEN admission_number ~ '^ADM\d+$'
            THEN CAST(SUBSTRING(admission_number FROM 4) AS INTEGER)
            ELSE 0
        END, 0
    )),
    'ADM'
FROM public.hospitalizations
WHERE admission_number IS NOT NULL
GROUP BY tenant_id
ON CONFLICT (tenant_id, document_type, year)
DO UPDATE SET current_sequence = GREATEST(
    public.document_sequences.current_sequence,
    EXCLUDED.current_sequence
);

COMMIT;
