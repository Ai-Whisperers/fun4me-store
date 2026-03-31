# EPIC-006: Performance Optimization

**Status**: Not Started  
**Priority**: LOW  
**Estimated Effort**: 2 weeks  
**Risk Level**: LOW  
**Dependencies**: None

## Overview

Fix N+1 query patterns, add missing database indexes, implement pagination, configure caching strategies, and optimize React Query usage.

## Current State

- 8+ N+1 query patterns
- Missing indexes on foreign keys
- No pagination on several endpoints
- React Query not optimally configured
- Redis available but unused

## Target State

- Zero N+1 queries
- All foreign keys indexed
- Pagination on all list endpoints
- React Query caching configured
- Redis caching for public data

## Tickets

### TICKET-PERF-001: Add Missing Database Indexes

**Priority**: HIGH  
**Effort**: 2 days

Add indexes on:
- Foreign keys without indexes
- Common WHERE clause columns
- JOIN columns

```sql
-- Check for missing indexes
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

---

### TICKET-PERF-002: Fix N+1 Query Patterns

**Priority**: HIGH  
**Effort**: 3 days

Affected routes:
- Dashboard appointments
- Invoice generation
- Medical records listing

Replace loops with batch queries:
```typescript
// Before
for (const appointment of appointments) {
  const pet = await fetch Pet
}

// After
const petIds = appointments.map(a => a.pet_id)
const pets = await fetchPets(petIds)
```

---

### TICKET-PERF-003: Implement Pagination

**Priority**: MEDIUM  
**Effort**: 2 days

Add to:
- `/api/lost-pets`
- `/api/notifications`
- Dashboard list endpoints

Use standard pattern:
```typescript
const { page, limit, offset } = parsePagination(searchParams)
const { data, count } = await query.range(offset, offset + limit - 1)
return paginatedResponse(data, count, { page, limit, offset })
```

---

### TICKET-PERF-004: Configure React Query Caching

**Priority**: LOW  
**Effort**: 1 day

```typescript
// web/app/providers.tsx
<QueryClientProvider client={queryClient}>
  {/* Configure staleTime, cacheTime, etc. */}
</QueryClientProvider>
```

---

### TICKET-PERF-005: Implement Redis Caching

**Priority**: LOW  
**Effort**: 2 days

Cache public data:
- Service catalog
- Growth standards
- Drug dosages

---

## Success Metrics

- [ ] Page load time <2s (p95)
- [ ] Zero N+1 queries
- [ ] All endpoints paginated
- [ ] Cache hit rate >70%

