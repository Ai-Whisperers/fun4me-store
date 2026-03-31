# PERF-002: Add Indexes for Foreign Key Columns

**Category**: Performance  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 3-4 hours  
**Impact**: Medium - Join performance  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-007)

## Summary

Foreign keys create constraints but not indexes. Queries filtering by foreign keys are slow.

## Problem

```sql
-- Foreign key creates constraint, NOT index!
pet_id UUID REFERENCES pets(id)

-- But queries like this need an INDEX:
SELECT * FROM medical_records WHERE pet_id = $1;
```

## Solution

### Find Missing Indexes

```sql
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

### Create Indexes

```sql
-- Add indexes for foreign keys
CREATE INDEX CONCURRENTLY idx_medical_records_pet_id
ON medical_records(pet_id);

CREATE INDEX CONCURRENTLY idx_appointments_pet_id
ON appointments(pet_id);

CREATE INDEX CONCURRENTLY idx_invoices_customer_id
ON invoices(customer_id);

-- Continue for all foreign keys
```

## Implementation

1. Run query to find missing indexes
2. Create migration file
3. Add indexes incrementally
4. Verify with EXPLAIN ANALYZE

## Acceptance Criteria
- [ ] All foreign keys have indexes
- [ ] Join performance improved
- [ ] No table locks during index creation

## Related
- PERF-001: Add composite indexes
