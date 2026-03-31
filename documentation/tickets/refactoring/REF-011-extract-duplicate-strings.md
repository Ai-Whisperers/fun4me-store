# REF-011: Extract Duplicate String Literals to Constants

**Category**: Refactoring  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: Ongoing (incremental)  
**Impact**: Low - Maintainability  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-007)

## Summary

50+ duplicate string literals scattered across codebase. Should be extracted to constants.

## Problem

**Found in 15+ files:**
```typescript
.eq('tenant_id', profile.tenant_id)
```

**Found in 10+ files:**
```typescript
if (!user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```

**Found in 8+ files:**
```typescript
style={{ backgroundColor: "var(--status-success-bg)" }}
```

## Solution

### Create Constants

```typescript
// lib/constants/queries.ts
export const Filters = {
  byTenant: (tenantId: string) => ({ tenant_id: tenantId }),
  byOwner: (ownerId: string) => ({ owner_id: ownerId }),
};

// lib/constants/responses.ts
export const Responses = {
  unauthorized: () => NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
  ),
  notFound: (resource: string) => NextResponse.json(
    { error: `${resource} no encontrado` },
    { status: 404 }
  ),
};

// lib/constants/styles.ts
export const StatusStyles = {
  success: { backgroundColor: "var(--status-success-bg)" },
  error: { backgroundColor: "var(--status-error-bg)" },
  warning: { backgroundColor: "var(--status-warning-bg)" },
  info: { backgroundColor: "var(--status-info-bg)" },
};
```

### Usage

```typescript
// Before
.eq('tenant_id', profile.tenant_id)

// After
.match(Filters.byTenant(profile.tenant_id))

// Before
return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

// After
return Responses.unauthorized();

// Before
style={{ backgroundColor: "var(--status-success-bg)" }}

// After
style={StatusStyles.success}
```

## Implementation Strategy

Fix incrementally:
- When touching a file, extract duplicates
- Track common patterns
- Add to constants as discovered

## Acceptance Criteria
- [ ] Duplicate strings reduced from 50+ to <10
- [ ] Common patterns extracted to constants
- [ ] Constants organized by category
- [ ] Documentation for constant usage

## Related
- REF-010: Standardize error handling
- Code organization improvements
