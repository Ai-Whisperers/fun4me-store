# TECH-017: Standardize Timestamp Columns Across Tables

**Category**: Technical Debt  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: 2-3 days  
**Impact**: Low - Consistency  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-006)

## Summary

Timestamp columns use inconsistent patterns across tables. Need standardization.

## Problem

**Current inconsistencies:**
```sql
-- Pattern 1
created_at TIMESTAMPTZ DEFAULT NOW()

-- Pattern 2
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- Pattern 3
updated_at TIMESTAMPTZ  -- updated by trigger

-- Pattern 4
-- Missing updated_at entirely!
```

## Solution

### Standard Template

```sql
-- For ALL new tables
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- for soft delete
);

-- Standard updated_at trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON new_table
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### For Existing Tables

**DO NOT** migrate existing tables unless absolutely necessary.
Instead:
- Apply standard to NEW tables only
- Document existing patterns
- Fix incrementally when making other changes

## Implementation

1. Create table template in docs
2. Add to migration guidelines
3. Apply to new tables going forward

## Acceptance Criteria
- [ ] Standard template documented
- [ ] All new tables use standard pattern
- [ ] Trigger function exists for updated_at

## Related
- TECH-016: Migration guidelines
- Database schema documentation
