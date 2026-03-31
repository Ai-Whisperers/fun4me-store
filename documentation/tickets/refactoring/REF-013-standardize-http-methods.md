# REF-013: Standardize HTTP Method Usage (REST Semantics)

**Category**: Refactoring  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: 1 week (breaking change)  
**Impact**: Medium - API consistency  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-007)

## Summary

Some routes follow REST conventions, some don't. Inconsistent HTTP method usage creates confusion.

## Problem

**Mixed patterns:**
```typescript
// Correct
POST /api/appointments          // Create
PUT /api/appointments/[id]      // Update
DELETE /api/appointments/[id]   // Delete

// Incorrect
POST /api/appointments/cancel   // Should be PATCH /api/appointments/[id]/status
POST /api/invoices/pay          // Should be POST /api/payments
```

## Solution

### REST Conventions

```
GET    /api/resources           # List all
POST   /api/resources           # Create new
GET    /api/resources/[id]      # Get one
PUT    /api/resources/[id]      # Replace (full update)
PATCH  /api/resources/[id]      # Update (partial)
DELETE /api/resources/[id]      # Delete

# Actions as sub-resources
POST   /api/invoices/[id]/payments     # Pay invoice
POST   /api/appointments/[id]/cancel   # Cancel appointment
PATCH  /api/appointments/[id]/status   # Update status
```

## Implementation

**This is a BREAKING CHANGE.** Coordinate with frontend.

### Phase 1: Document Current State
- Audit all non-standard routes
- Prioritize by usage

### Phase 2: Create New Routes
- Implement correct REST routes
- Keep old routes for backward compatibility

### Phase 3: Deprecate Old Routes
- Add deprecation warnings
- Update frontend to use new routes
- Remove old routes after migration period

## Acceptance Criteria
- [ ] All routes follow REST conventions
- [ ] Actions use sub-resources
- [ ] Documentation updated
- [ ] Frontend migrated

## Related
- TECH-021: API versioning
- API documentation
