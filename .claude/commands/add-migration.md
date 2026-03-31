# Add Database Migration

Create a new database migration for the Supabase PostgreSQL database.

## Migration File Naming

Files are numbered sequentially in `web/db/`:
```
XX_description.sql
```

Examples:
- `40_campaigns.sql`
- `41_campaign_messages.sql`

## Standard Template

```sql
-- Migration: Description of what this does
-- Author: Your Name
-- Date: YYYY-MM-DD

-- =============================================
-- 1. CREATE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Add your columns here
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- =============================================
-- 2. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_your_table_clinic
  ON your_table(clinic_id);

CREATE INDEX IF NOT EXISTS idx_your_table_status
  ON your_table(status)
  WHERE status = 'active';

-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their clinic's data
CREATE POLICY "Users can view own clinic data" ON your_table
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Staff can insert
CREATE POLICY "Staff can insert" ON your_table
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND clinic_id = your_table.clinic_id
      AND role IN ('vet', 'admin')
    )
  );

-- Policy: Staff can update
CREATE POLICY "Staff can update" ON your_table
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND clinic_id = your_table.clinic_id
      AND role IN ('vet', 'admin')
    )
  );

-- =============================================
-- 4. TRIGGERS
-- =============================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON your_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Key Requirements

1. **Tenant Isolation**: Always include `clinic_id` foreign key
2. **RLS Policies**: REQUIRED for all tables
3. **Indexes**: Add for clinic_id and frequently queried columns
4. **Idempotent**: Use `IF NOT EXISTS` for rerunability
5. **Timestamps**: Include `created_at` and `updated_at`
6. **UUIDs**: Use `gen_random_uuid()` for primary keys

## Common RLS Patterns

### Public Read, Staff Write
```sql
CREATE POLICY "Anyone can view" ON table FOR SELECT USING (true);
CREATE POLICY "Staff can modify" ON table FOR ALL
  USING (is_staff_of(clinic_id));
```

### Owner Only
```sql
CREATE POLICY "Owner access" ON table FOR ALL
  USING (user_id = auth.uid());
```

### Clinic-Scoped
```sql
CREATE POLICY "Clinic access" ON table FOR ALL
  USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
  );
```

## Running Migrations

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste migration content
4. Execute

Or use Supabase CLI:
```bash
supabase db push
```

## Checklist

- [ ] Migration file created with sequential number
- [ ] Table has clinic_id for multi-tenancy
- [ ] RLS enabled on table
- [ ] RLS policies cover SELECT, INSERT, UPDATE, DELETE
- [ ] Indexes created for common queries
- [ ] Timestamps included
- [ ] Migration is idempotent (can re-run safely)
- [ ] Tested in development before production
