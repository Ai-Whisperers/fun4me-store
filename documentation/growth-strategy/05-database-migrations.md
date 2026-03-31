# Database Migrations Reference

> Complete reference for growth strategy database changes

## Overview

Two migrations were created for the growth strategy:

| Migration | Purpose | Tables Modified/Created |
|-----------|---------|------------------------|
| `060_pregeneration_fields.sql` | Pre-generation workflow | `tenants` (altered) |
| `061_ambassador_program.sql` | Ambassador system | `ambassadors`, `ambassador_referrals`, `ambassador_payouts`, `tenants` (altered) |

---

## Migration 060: Pre-Generation Fields

**File:** `web/db/migrations/060_pregeneration_fields.sql`

### Purpose

Adds fields to the `tenants` table to support the pre-generation workflow where clinic websites are created before owners claim them.

### Columns Added to `tenants`

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `status` | TEXT | 'active' | NOT NULL | Tenant lifecycle status |
| `is_pregenerated` | BOOLEAN | FALSE | NOT NULL | Whether auto-generated from scraped data |
| `claimed_at` | TIMESTAMPTZ | NULL | YES | When owner claimed the website |
| `claimed_by` | TEXT | NULL | YES | User ID who claimed |
| `scraped_data` | JSONB | NULL | YES | Original scraped data |
| `clinic_type` | TEXT | 'general' | YES | Template type for content |
| `zone` | TEXT | NULL | YES | Neighborhood for targeting |
| `google_rating` | TEXT | NULL | YES | Rating from Google Maps |
| `instagram_handle` | TEXT | NULL | YES | Instagram handle |

### Status Values

```sql
-- Valid status values
CHECK (status IN ('pregenerated', 'claimed', 'active', 'suspended', 'expired'))
```

| Status | Description |
|--------|-------------|
| `pregenerated` | Auto-generated, waiting for owner to claim |
| `claimed` | Owner claimed, in trial period |
| `active` | Paid subscription active |
| `suspended` | Subscription lapsed |
| `expired` | Pre-generated site not claimed within 30 days |

### Clinic Type Values

```sql
-- Valid clinic_type values
CHECK (clinic_type IN ('general', 'emergency', 'specialist', 'grooming', 'rural'))
```

### Indexes Created

```sql
-- Find by status
CREATE INDEX idx_tenants_status ON tenants(status);

-- Find pre-generated clinics
CREATE INDEX idx_tenants_pregenerated ON tenants(is_pregenerated)
    WHERE is_pregenerated = TRUE;

-- Find by zone for local targeting
CREATE INDEX idx_tenants_zone ON tenants(zone)
    WHERE zone IS NOT NULL;
```

### Data Migration

```sql
-- Existing tenants get 'active' status
UPDATE tenants SET status = 'active' WHERE status IS NULL OR status = '';
```

### Full Migration SQL

```sql
-- Add pre-generation fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_pregenerated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claimed_by TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS scraped_data JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'general';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_rating TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Comments
COMMENT ON COLUMN tenants.status IS 'Tenant status: pregenerated | claimed | active | suspended';
COMMENT ON COLUMN tenants.is_pregenerated IS 'Whether this tenant was auto-generated from scraped data';
COMMENT ON COLUMN tenants.claimed_at IS 'When the clinic owner claimed the pre-generated website';
COMMENT ON COLUMN tenants.claimed_by IS 'User ID who claimed the clinic';
COMMENT ON COLUMN tenants.scraped_data IS 'Original scraped data from Google Maps, Instagram, etc';
COMMENT ON COLUMN tenants.clinic_type IS 'Clinic type for template: general | emergency | specialist | grooming | rural';
COMMENT ON COLUMN tenants.zone IS 'Zone/neighborhood for local targeting';
COMMENT ON COLUMN tenants.google_rating IS 'Google rating from scraping';
COMMENT ON COLUMN tenants.instagram_handle IS 'Instagram handle if available';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_pregenerated ON tenants(is_pregenerated) WHERE is_pregenerated = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_zone ON tenants(zone) WHERE zone IS NOT NULL;

-- Update existing tenants
UPDATE tenants SET status = 'active' WHERE status IS NULL OR status = '';
```

---

## Migration 061: Ambassador Program

**File:** `web/db/migrations/061_ambassador_program.sql`

### Purpose

Creates the complete ambassador program infrastructure for individual referrers who earn cash commissions.

### Tables Created

#### 1. `ambassadors`

Main table for ambassador profiles.

```sql
CREATE TABLE ambassadors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal info
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,

    -- Authentication
    user_id UUID REFERENCES auth.users(id),

    -- Ambassador details
    type TEXT NOT NULL DEFAULT 'student'
        CHECK (type IN ('student', 'assistant', 'teacher', 'other')),
    university TEXT,
    institution TEXT,

    -- Program status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    tier TEXT NOT NULL DEFAULT 'embajador'
        CHECK (tier IN ('embajador', 'promotor', 'super')),

    -- Referral tracking
    referral_code TEXT NOT NULL UNIQUE,
    referrals_count INTEGER NOT NULL DEFAULT 0,
    conversions_count INTEGER NOT NULL DEFAULT 0,

    -- Commission tracking (Guaraníes)
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 30.00,
    total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_payout NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Bank details
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,

    -- Metadata
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2. `ambassador_referrals`

Tracks each clinic referred by an ambassador.

```sql
CREATE TABLE ambassador_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambassador_id UUID NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'trial_started', 'converted', 'expired', 'cancelled')),

    -- Timeline
    referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_started_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,

    -- Commission details
    subscription_amount NUMERIC(12,2),
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),

    -- Payout status
    payout_status TEXT DEFAULT 'pending'
        CHECK (payout_status IN ('pending', 'scheduled', 'paid')),
    payout_id UUID,
    paid_at TIMESTAMPTZ,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id)  -- Each clinic can only be referred once
);
```

#### 3. `ambassador_payouts`

Payout requests and history.

```sql
CREATE TABLE ambassador_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambassador_id UUID NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,

    -- Payout details
    amount NUMERIC(12,2) NOT NULL,
    referral_ids UUID[] NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed')),

    -- Bank details (snapshot at time of request)
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,
    transfer_reference TEXT,

    -- Processing
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,
    failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Column Added to `tenants`

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
    referred_by_ambassador_id UUID REFERENCES ambassadors(id);

CREATE INDEX idx_tenants_ambassador ON tenants(referred_by_ambassador_id)
    WHERE referred_by_ambassador_id IS NOT NULL;
```

### Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassador_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassador_payouts ENABLE ROW LEVEL SECURITY;

-- Ambassadors can view/update their own record
CREATE POLICY "Ambassador view own" ON ambassadors
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Ambassador update own" ON ambassadors
    FOR UPDATE USING (user_id = auth.uid());

-- Ambassadors can view their own referrals
CREATE POLICY "Ambassador view own referrals" ON ambassador_referrals
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

-- Ambassadors can view their own payouts
CREATE POLICY "Ambassador view own payouts" ON ambassador_payouts
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

-- Service role full access for admin operations
CREATE POLICY "Service role full access ambassadors" ON ambassadors
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access ambassador_referrals" ON ambassador_referrals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access ambassador_payouts" ON ambassador_payouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Indexes

```sql
-- Ambassadors
CREATE INDEX idx_ambassadors_email ON ambassadors(email);
CREATE INDEX idx_ambassadors_user ON ambassadors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ambassadors_code ON ambassadors(referral_code);
CREATE INDEX idx_ambassadors_status ON ambassadors(status);
CREATE INDEX idx_ambassadors_tier ON ambassadors(tier);

-- Referrals
CREATE INDEX idx_ambassador_referrals_ambassador ON ambassador_referrals(ambassador_id);
CREATE INDEX idx_ambassador_referrals_tenant ON ambassador_referrals(tenant_id);
CREATE INDEX idx_ambassador_referrals_status ON ambassador_referrals(status);
CREATE INDEX idx_ambassador_referrals_converted ON ambassador_referrals(ambassador_id, converted_at)
    WHERE status = 'converted';

-- Payouts
CREATE INDEX idx_ambassador_payouts_ambassador ON ambassador_payouts(ambassador_id);
CREATE INDEX idx_ambassador_payouts_status ON ambassador_payouts(status);
```

### Triggers

```sql
-- Auto-update updated_at on all tables
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON ambassadors
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON ambassador_referrals
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON ambassador_payouts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-upgrade tier on conversion
CREATE TRIGGER update_tier_on_conversion
    AFTER UPDATE OF status ON ambassador_referrals
    FOR EACH ROW
    WHEN (NEW.status = 'converted' AND OLD.status != 'converted')
    EXECUTE FUNCTION update_ambassador_tier();
```

### Database Functions

#### generate_ambassador_code(p_name)

Generates unique referral code from name.

```sql
CREATE OR REPLACE FUNCTION generate_ambassador_code(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_base_code TEXT;
    v_code TEXT;
BEGIN
    v_base_code := UPPER(LEFT(REGEXP_REPLACE(p_name, '[^A-Za-z]', '', 'g'), 4));
    v_code := v_base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    WHILE EXISTS (SELECT 1 FROM ambassadors WHERE referral_code = v_code) LOOP
        v_code := v_base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;
```

#### update_ambassador_tier()

Auto-upgrades tier based on conversions.

```sql
CREATE OR REPLACE FUNCTION update_ambassador_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_conversions INTEGER;
    v_new_tier TEXT;
    v_new_rate NUMERIC;
BEGIN
    SELECT conversions_count INTO v_conversions
    FROM ambassadors WHERE id = NEW.ambassador_id;

    IF v_conversions >= 10 THEN
        v_new_tier := 'super';
        v_new_rate := 50.00;
    ELSIF v_conversions >= 5 THEN
        v_new_tier := 'promotor';
        v_new_rate := 40.00;
    ELSE
        v_new_tier := 'embajador';
        v_new_rate := 30.00;
    END IF;

    UPDATE ambassadors
    SET tier = v_new_tier, commission_rate = v_new_rate, updated_at = NOW()
    WHERE id = NEW.ambassador_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### process_ambassador_referral(...)

Process clinic signup with ambassador code.

```sql
CREATE OR REPLACE FUNCTION process_ambassador_referral(
    p_ambassador_code TEXT,
    p_tenant_id TEXT,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_ambassador RECORD;
    v_referral_id UUID;
BEGIN
    -- Find ambassador
    SELECT * INTO v_ambassador
    FROM ambassadors
    WHERE referral_code = UPPER(p_ambassador_code)
    AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive ambassador code';
    END IF;

    -- Check if already referred
    IF EXISTS (SELECT 1 FROM ambassador_referrals WHERE tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'This clinic has already been referred';
    END IF;

    -- Create referral
    INSERT INTO ambassador_referrals (
        ambassador_id, tenant_id, status,
        utm_source, utm_medium, utm_campaign
    ) VALUES (
        v_ambassador.id, p_tenant_id, 'pending',
        p_utm_source, p_utm_medium, p_utm_campaign
    ) RETURNING id INTO v_referral_id;

    -- Update ambassador stats
    UPDATE ambassadors
    SET referrals_count = referrals_count + 1, updated_at = NOW()
    WHERE id = v_ambassador.id;

    -- Link tenant to ambassador
    UPDATE tenants
    SET referred_by_ambassador_id = v_ambassador.id, updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql;
```

#### convert_ambassador_referral(...)

Convert referral and calculate commission.

```sql
CREATE OR REPLACE FUNCTION convert_ambassador_referral(
    p_referral_id UUID,
    p_subscription_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral RECORD;
    v_commission NUMERIC;
BEGIN
    SELECT ar.*, a.commission_rate
    INTO v_referral
    FROM ambassador_referrals ar
    JOIN ambassadors a ON a.id = ar.ambassador_id
    WHERE ar.id = p_referral_id
    AND ar.status IN ('pending', 'trial_started');

    IF NOT FOUND THEN RETURN false; END IF;

    v_commission := p_subscription_amount * (v_referral.commission_rate / 100);

    -- Update referral
    UPDATE ambassador_referrals SET
        status = 'converted',
        converted_at = NOW(),
        subscription_amount = p_subscription_amount,
        commission_rate = v_referral.commission_rate,
        commission_amount = v_commission,
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Update ambassador
    UPDATE ambassadors SET
        conversions_count = conversions_count + 1,
        total_earned = total_earned + v_commission,
        pending_payout = pending_payout + v_commission,
        updated_at = NOW()
    WHERE id = v_referral.ambassador_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

#### get_ambassador_stats(p_ambassador_id)

Get comprehensive statistics.

```sql
CREATE OR REPLACE FUNCTION get_ambassador_stats(p_ambassador_id UUID)
RETURNS TABLE (
    total_referrals INTEGER,
    pending_referrals INTEGER,
    converted_referrals INTEGER,
    total_earned NUMERIC,
    pending_payout NUMERIC,
    tier TEXT,
    commission_rate NUMERIC,
    next_tier TEXT,
    referrals_to_next_tier INTEGER
) AS $$
DECLARE
    v_ambassador RECORD;
    v_next_tier TEXT;
    v_to_next INTEGER;
BEGIN
    SELECT * INTO v_ambassador FROM ambassadors WHERE id = p_ambassador_id;

    IF v_ambassador.conversions_count < 5 THEN
        v_next_tier := 'promotor';
        v_to_next := 5 - v_ambassador.conversions_count;
    ELSIF v_ambassador.conversions_count < 10 THEN
        v_next_tier := 'super';
        v_to_next := 10 - v_ambassador.conversions_count;
    ELSE
        v_next_tier := NULL;
        v_to_next := 0;
    END IF;

    RETURN QUERY
    SELECT
        v_ambassador.referrals_count,
        (SELECT COUNT(*)::INTEGER FROM ambassador_referrals ar
         WHERE ar.ambassador_id = p_ambassador_id
         AND ar.status IN ('pending', 'trial_started')),
        v_ambassador.conversions_count,
        v_ambassador.total_earned,
        v_ambassador.pending_payout,
        v_ambassador.tier,
        v_ambassador.commission_rate,
        v_next_tier,
        v_to_next;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Running Migrations

### Using Supabase CLI

```bash
# Apply migration
supabase db push

# Or apply specific file
psql $DATABASE_URL -f web/db/migrations/060_pregeneration_fields.sql
psql $DATABASE_URL -f web/db/migrations/061_ambassador_program.sql
```

### Using Supabase Dashboard

1. Go to SQL Editor
2. Copy migration content
3. Run query

### Verification Queries

```sql
-- Verify 060 migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN ('status', 'is_pregenerated', 'claimed_at', 'clinic_type', 'zone');

-- Verify 061 migration
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('ambassadors', 'ambassador_referrals', 'ambassador_payouts');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%ambassador%' OR routine_name LIKE 'generate_ambassador%';
```

---

## Rollback (If Needed)

### Rollback 060

```sql
ALTER TABLE tenants DROP COLUMN IF EXISTS status;
ALTER TABLE tenants DROP COLUMN IF EXISTS is_pregenerated;
ALTER TABLE tenants DROP COLUMN IF EXISTS claimed_at;
ALTER TABLE tenants DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE tenants DROP COLUMN IF EXISTS scraped_data;
ALTER TABLE tenants DROP COLUMN IF EXISTS clinic_type;
ALTER TABLE tenants DROP COLUMN IF EXISTS zone;
ALTER TABLE tenants DROP COLUMN IF EXISTS google_rating;
ALTER TABLE tenants DROP COLUMN IF EXISTS instagram_handle;

DROP INDEX IF EXISTS idx_tenants_status;
DROP INDEX IF EXISTS idx_tenants_pregenerated;
DROP INDEX IF EXISTS idx_tenants_zone;
```

### Rollback 061

```sql
-- Remove tenant column first (foreign key)
ALTER TABLE tenants DROP COLUMN IF EXISTS referred_by_ambassador_id;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS ambassador_payouts;
DROP TABLE IF EXISTS ambassador_referrals;
DROP TABLE IF EXISTS ambassadors;

-- Drop functions
DROP FUNCTION IF EXISTS generate_ambassador_code(TEXT);
DROP FUNCTION IF EXISTS update_ambassador_tier();
DROP FUNCTION IF EXISTS process_ambassador_referral(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS convert_ambassador_referral(UUID, NUMERIC);
DROP FUNCTION IF EXISTS get_ambassador_stats(UUID);
```

---

*Last updated: January 2026*
