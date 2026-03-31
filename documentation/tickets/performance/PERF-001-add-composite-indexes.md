# PERF-001: Add Missing Composite Indexes

**Category**: Performance  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 4-6 hours  
**Impact**: Medium - Query performance  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-003)

## Summary

Common query patterns lack composite indexes, causing sequential scans and slow queries.

## Problem

**Common query patterns:**
```typescript
// Pattern 1: tenant + customer
.eq('tenant_id', tenantId)
.eq('customer_id', userId)

// Pattern 2: tenant + owner
.eq('tenant_id', tenantId)
.eq('owner_id', ownerId)

// Pattern 3: tenant + status + date
.eq('tenant_id', tenantId)
.eq('status', 'completed')
.order('created_at', { ascending: false })
```

**But no composite indexes exist!**

## Solution

### Check Current Index Usage
```sql
SELECT
  relname AS table,
  seq_scan,
  idx_scan,
  seq_scan - idx_scan AS potential_improvement
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY potential_improvement DESC;
```

### Create Composite Indexes
```sql
-- Create migration: web/db/095_add_composite_indexes.sql

-- Invoices: tenant + customer
CREATE INDEX CONCURRENTLY idx_invoices_tenant_customer
ON invoices (tenant_id, customer_id);

-- Appointments: tenant + status + date
CREATE INDEX CONCURRENTLY idx_appointments_tenant_status_date
ON appointments (tenant_id, status, start_time DESC);

-- Pets: tenant + owner
CREATE INDEX CONCURRENTLY idx_pets_tenant_owner
ON pets (tenant_id, owner_id);

-- Store orders: tenant + status + date
CREATE INDEX CONCURRENTLY idx_store_orders_tenant_status
ON store_orders (tenant_id, status, created_at DESC);

-- Medical records: tenant + pet + date
CREATE INDEX CONCURRENTLY idx_medical_records_tenant_pet_date
ON medical_records (tenant_id, pet_id, created_at DESC);

-- Messages: tenant + recipient + read status
CREATE INDEX CONCURRENTLY idx_messages_tenant_recipient_read
ON messages (tenant_id, recipient_id, is_read, created_at DESC);
```

## Implementation Plan

1. **Analyze query patterns** (2 hours)
   - Review slow query logs
   - Identify most common filters
   - Check pg_stat_statements

2. **Create indexes** (1 hour)
   - Write migration file
   - Use CONCURRENTLY to avoid locks
   - Test in development first

3. **Deploy during low traffic** (1 hour)
   - Run migration
   - Monitor query performance
   - Verify indexes are used (EXPLAIN ANALYZE)

4. **Measure improvement** (30 min)
   - Compare before/after query times
   - Check index usage stats
   - Document performance gains

## Acceptance Criteria
- [ ] Composite indexes created for common patterns
- [ ] Query performance improved (measure with EXPLAIN)
- [ ] No production downtime during index creation
- [ ] Index usage verified with pg_stat_user_indexes

## Notes
- Use CONCURRENTLY to avoid table locks
- Run during low traffic periods
- Monitor disk space (indexes consume storage)
- Drop unused indexes after verification

## Related
- PERF-002: Add foreign key indexes
- Query performance monitoring
