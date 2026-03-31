# Database Migration Pattern Exemplar

## Overview

Pattern for creating PostgreSQL migrations with Supabase RLS for the multi-tenant veterinary platform.

## When to Use

- **Use for**: New tables, schema changes, RLS policies
- **Critical for**: Any database modification

## Good Pattern - Complete Migration

```sql
-- Migration: 40_campaigns.sql
-- Description: Campaign management for clinic marketing
-- Author: Development Team
-- Date: 2025-01-15

-- =============================================
-- 1. CREATE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS campaigns (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (REQUIRED)
  clinic_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Business fields
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metrics
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,

  -- Audit fields (REQUIRED)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT campaigns_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT campaigns_scheduled_future CHECK (
    scheduled_at IS NULL OR scheduled_at > created_at
  )
);

-- Comment for documentation
COMMENT ON TABLE campaigns IS 'Marketing campaigns for clinic outreach';
COMMENT ON COLUMN campaigns.clinic_id IS 'Tenant isolation - required for multi-tenancy';

-- =============================================
-- 2. INDEXES
-- =============================================

-- Required: Clinic lookup (every query filters by this)
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic
  ON campaigns(clinic_id);

-- Frequent query: Active campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns(status)
  WHERE status IN ('scheduled', 'active');

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled
  ON campaigns(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- =============================================
-- 3. ROW LEVEL SECURITY (REQUIRED)
-- =============================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view their clinic's campaigns
CREATE POLICY "Staff can view clinic campaigns"
  ON campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.clinic_id = campaigns.clinic_id
      AND profiles.role IN ('vet', 'admin')
    )
  );

-- Policy: Staff can create campaigns for their clinic
CREATE POLICY "Staff can create campaigns"
  ON campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.clinic_id = campaigns.clinic_id
      AND profiles.role IN ('vet', 'admin')
    )
  );

-- Policy: Staff can update their clinic's campaigns
CREATE POLICY "Staff can update campaigns"
  ON campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.clinic_id = campaigns.clinic_id
      AND profiles.role IN ('vet', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.clinic_id = campaigns.clinic_id
      AND profiles.role IN ('vet', 'admin')
    )
  );

-- Policy: Only admin can delete campaigns
CREATE POLICY "Admin can delete campaigns"
  ON campaigns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.clinic_id = campaigns.clinic_id
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- 4. TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. FUNCTIONS (if needed)
-- =============================================

-- Function to increment campaign metrics
CREATE OR REPLACE FUNCTION increment_campaign_metric(
  p_campaign_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET
    sent_count = CASE WHEN p_metric = 'sent' THEN sent_count + p_amount ELSE sent_count END,
    opened_count = CASE WHEN p_metric = 'opened' THEN opened_count + p_amount ELSE opened_count END,
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$;
```

**Why this is good:**
- Header with metadata
- UUID primary key (Supabase standard)
- `clinic_id` for tenant isolation
- Proper constraints with meaningful names
- Comments for documentation
- Indexes for common queries
- RLS enabled and policies for each operation
- Role-based access (staff vs admin)
- Trigger for updated_at
- Idempotent (`IF NOT EXISTS`)

## Bad Pattern

```sql
-- campaigns table
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Why this is bad:**
- No tenant isolation (`clinic_id`)
- `SERIAL` instead of `UUID`
- `VARCHAR` instead of `TEXT`
- No constraints on values
- No indexes
- No RLS (data leak!)
- No updated_at
- No comments
- Not idempotent

## Common RLS Patterns

### Owner-only access
```sql
-- User can only see their own records
CREATE POLICY "Owner access"
  ON pets FOR ALL
  USING (owner_id = auth.uid());
```

### Clinic-scoped access
```sql
-- User can see all records in their clinic
CREATE POLICY "Clinic access"
  ON appointments FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Staff-only modification
```sql
-- Only staff can modify
CREATE POLICY "Staff modify"
  ON medical_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND clinic_id = medical_records.clinic_id
      AND role IN ('vet', 'admin')
    )
  );
```

### Public read, authenticated write
```sql
-- Anyone can read
CREATE POLICY "Public read" ON services FOR SELECT USING (true);

-- Only authenticated can create
CREATE POLICY "Auth create" ON services FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Using helper function
```sql
-- Create reusable function
CREATE OR REPLACE FUNCTION is_staff_of(p_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND clinic_id = p_clinic_id
    AND role IN ('vet', 'admin')
  );
$$;

-- Use in policy
CREATE POLICY "Staff access" ON table FOR ALL
  USING (is_staff_of(clinic_id));
```

## Adding Column to Existing Table

```sql
-- Migration: 41_add_campaign_template.sql

-- Add column with default
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id);

-- Add index if frequently queried
CREATE INDEX IF NOT EXISTS idx_campaigns_template
  ON campaigns(template_id)
  WHERE template_id IS NOT NULL;

-- Update comment
COMMENT ON COLUMN campaigns.template_id IS 'Optional template for campaign content';
```

## Final Must-Pass Checklist

- [ ] Header with description, author, date
- [ ] UUID primary key with `gen_random_uuid()`
- [ ] `clinic_id` column with REFERENCES tenants(id)
- [ ] `created_at` and `updated_at` TIMESTAMPTZ columns
- [ ] RLS enabled: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- [ ] SELECT policy for viewing
- [ ] INSERT policy with WITH CHECK
- [ ] UPDATE policy with USING and WITH CHECK
- [ ] DELETE policy (often admin-only)
- [ ] Index on `clinic_id`
- [ ] Trigger for `updated_at`
- [ ] `IF NOT EXISTS` for idempotent migrations
- [ ] CHECK constraints for enum-like fields
- [ ] Comments on table and critical columns
