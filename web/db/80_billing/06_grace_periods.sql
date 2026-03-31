-- =============================================================================
-- GRACE PERIOD EVALUATIONS - AI-Powered Payment Grace Periods
-- =============================================================================
-- Tracks AI evaluations that determine grace periods for overdue invoices.
-- Grace period ranges: 30, 60, or 90 days based on clinic health metrics.
--
-- Factors considered by AI:
--   - Monthly revenue and growth
--   - Active client count
--   - Appointment and order volume
--   - Payment history score
--   - Account age
--   - Seasonality factors
--   - Economic indicators
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 80_billing/04_platform_invoices.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create grace period evaluations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.grace_period_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform_invoice_id UUID REFERENCES public.platform_invoices(id) ON DELETE SET NULL,

    -- =========================================================================
    -- Input metrics (snapshot at evaluation time)
    -- =========================================================================
    metrics JSONB NOT NULL,
    /*
    Expected structure:
    {
      "monthly_revenue": 15000000,         -- Clinic's invoice revenue (PYG)
      "revenue_growth_rate": 0.15,         -- Month-over-month growth %
      "active_clients": 45,                -- Unique clients with activity
      "appointments_last_30d": 120,        -- Completed appointments
      "store_orders_last_30d": 35,         -- Store orders
      "pets_registered": 200,              -- Total pets in system
      "account_age_days": 180,             -- Days since tenant created
      "payment_history_score": 0.95,       -- % of invoices paid on time (0-1)
      "overdue_count": 1,                  -- Current overdue invoices
      "outstanding_balance": 500000,       -- Total unpaid amount (PYG)
      "seasonality_factor": 0.8,           -- 1.0 = normal, <1 = slow season
      "economic_index": 0.9                -- Paraguay economic indicator (0-1)
    }
    */

    -- =========================================================================
    -- AI scoring results
    -- =========================================================================
    economic_score NUMERIC(3,2),           -- 0.00 to 1.00 (clinic financial health)
    risk_score NUMERIC(3,2),               -- 0.00 to 1.00 (higher = riskier)
    engagement_score NUMERIC(3,2),         -- 0.00 to 1.00 (platform engagement)
    trust_score NUMERIC(3,2),              -- 0.00 to 1.00 (payment reliability)

    -- Weighted final score
    final_score NUMERIC(3,2),              -- 0.00 to 1.00

    -- =========================================================================
    -- AI output
    -- =========================================================================
    recommended_grace_days INTEGER NOT NULL CHECK (recommended_grace_days IN (30, 60, 90)),
    confidence NUMERIC(3,2),               -- AI confidence in recommendation (0-1)
    reasoning TEXT NOT NULL,               -- Human-readable explanation

    -- Factor breakdown (for transparency)
    factor_weights JSONB,
    /*
    {
      "payment_history": 0.30,
      "revenue": 0.25,
      "activity": 0.20,
      "account_age": 0.15,
      "economic": 0.10
    }
    */

    -- =========================================================================
    -- Decision tracking
    -- =========================================================================
    approved_grace_days INTEGER,           -- Admin can override
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'overridden', 'expired')),

    -- =========================================================================
    -- Model versioning (for reproducibility)
    -- =========================================================================
    model_version TEXT NOT NULL DEFAULT 'v1',
    model_params JSONB,                    -- Model configuration used

    -- =========================================================================
    -- Audit
    -- =========================================================================
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.grace_period_evaluations IS 'AI-powered grace period evaluations for overdue invoices';
COMMENT ON COLUMN public.grace_period_evaluations.metrics IS 'Snapshot of clinic metrics at evaluation time';
COMMENT ON COLUMN public.grace_period_evaluations.recommended_grace_days IS 'AI recommendation: 30, 60, or 90 days';
COMMENT ON COLUMN public.grace_period_evaluations.confidence IS 'AI confidence level in the recommendation (0-1)';
COMMENT ON COLUMN public.grace_period_evaluations.approved_grace_days IS 'Admin-approved grace days (may differ from recommendation)';
COMMENT ON COLUMN public.grace_period_evaluations.model_version IS 'Version of the AI model used for evaluation';

-- =============================================================================
-- STEP 2: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_grace_evaluations_tenant
ON public.grace_period_evaluations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_grace_evaluations_invoice
ON public.grace_period_evaluations(platform_invoice_id) WHERE platform_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grace_evaluations_status
ON public.grace_period_evaluations(status);

CREATE INDEX IF NOT EXISTS idx_grace_evaluations_pending
ON public.grace_period_evaluations(tenant_id, evaluated_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_grace_evaluations_model
ON public.grace_period_evaluations(model_version, evaluated_at);

-- =============================================================================
-- STEP 3: Row Level Security
-- =============================================================================

ALTER TABLE public.grace_period_evaluations ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access grace evaluations" ON public.grace_period_evaluations;
CREATE POLICY "Service role full access grace evaluations"
ON public.grace_period_evaluations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic admins can view their own evaluations (read-only)
DROP POLICY IF EXISTS "Clinic admin view own grace evaluations" ON public.grace_period_evaluations;
CREATE POLICY "Clinic admin view own grace evaluations"
ON public.grace_period_evaluations FOR SELECT
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- =============================================================================
-- STEP 4: Update platform_invoices to reference grace evaluation
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_platform_invoice_grace_eval'
    ) THEN
        ALTER TABLE public.platform_invoices
        ADD CONSTRAINT fk_platform_invoice_grace_eval
        FOREIGN KEY (grace_evaluation_id) REFERENCES public.grace_period_evaluations(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add grace_evaluation_id column if not exists
ALTER TABLE public.platform_invoices
ADD COLUMN IF NOT EXISTS grace_evaluation_id UUID REFERENCES public.grace_period_evaluations(id);
