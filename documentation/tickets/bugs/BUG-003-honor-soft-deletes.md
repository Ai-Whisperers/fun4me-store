# BUG-003: Honor Soft Delete Filters in All Queries

**Category**: Bug  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 2-3 days  
**Impact**: High - Data integrity  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-002)

## Summary

Tables have `deleted_at` columns for soft deletes, but queries don't filter them out. "Deleted" data is still visible and active.

## Problem

**Schema has soft delete support:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  ...
  deleted_at TIMESTAMPTZ  -- For soft delete
);
```

**Queries ignore it:**
```typescript
const { data } = await supabase
  .from('store_carts')
  .select('*')
  .eq('customer_id', user.id)
  .eq('tenant_id', tenantId);
  // WHERE IS .is('deleted_at', null)?!
```

**Impact:**
- "Deleted" users can still have carts loaded
- "Deleted" products appear in stores
- Data thought to be gone is very much there
- Violates user expectations and potentially GDPR

## Solution

**Option 1: Add Filter Everywhere (Immediate)**
```typescript
const { data } = await supabase
  .from('table')
  .select('*')
  .is('deleted_at', null)  // Always include this
  .eq('tenant_id', tenantId);
```

**Option 2: Create Filtered Views (Recommended)**
```sql
-- Create views that hide deleted data
CREATE VIEW active_profiles AS
SELECT * FROM profiles WHERE deleted_at IS NULL;

CREATE VIEW active_pets AS
SELECT * FROM pets WHERE deleted_at IS NULL;

-- Use in queries
SELECT * FROM active_profiles WHERE tenant_id = $1;
```

**Option 3: RLS Policies (Most Robust)**
```sql
-- Hide deleted data at database level
CREATE POLICY "Hide deleted" ON profiles
FOR SELECT USING (deleted_at IS NULL);

-- Users can only soft delete, not hard delete
CREATE POLICY "Soft delete only" ON profiles
FOR DELETE USING (false);  -- No hard deletes allowed

CREATE POLICY "Allow soft delete" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (deleted_at IS NOT NULL);  -- Can only set deleted_at
```

## Implementation Plan

### Phase 1: Audit (1 day)
- [ ] Find all tables with `deleted_at` column
- [ ] Find all queries NOT filtering `deleted_at`
- [ ] Prioritize by data sensitivity

### Phase 2: Quick Fix (1 day)
- [ ] Add `.is('deleted_at', null)` to critical queries
- [ ] Test that deleted data is hidden
- [ ] Document pattern for new queries

### Phase 3: Robust Solution (1 day)
- [ ] Create filtered views OR RLS policies
- [ ] Migrate existing queries to use views
- [ ] Add tests to verify soft delete behavior

## Acceptance Criteria
- [ ] All queries filter out `deleted_at`
- [ ] Deleted data not visible in any UI
- [ ] Tests verify soft delete behavior
- [ ] Documentation updated with pattern

## Affected Tables
Tables with `deleted_at` column (estimated):
- profiles
- pets
- appointments
- invoices
- medical_records
- store_products
- store_carts
- (many more - needs audit)

## Related
- SEC-024: RLS testing framework
- Database schema documentation
