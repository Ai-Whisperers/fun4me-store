# TECH-021: Add API Versioning Strategy

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 1-2 days  
**Impact**: Medium - Future compatibility  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-006)

## Summary

All endpoints are unversioned. When breaking changes are needed, there's no migration path.

## Problem

**Current state:**
```
/api/invoices
/api/appointments
/api/store/products
```

When you need breaking changes, you're stuck.

## Solution

**Option 1: URL Versioning (Recommended)**
```
/api/v1/invoices
/api/v1/appointments
```

**Option 2: Header Versioning**
```typescript
const version = request.headers.get('API-Version') || 'v1';
```

**Option 3: Accept Header**
```
Accept: application/vnd.vete.v1+json
```

### Implementation Plan

For new APIs, use URL versioning:

```typescript
// app/api/v1/invoices/route.ts
export const GET = withAuth(async (ctx) => {
  // v1 implementation
});

// When v2 needed:
// app/api/v2/invoices/route.ts
export const GET = withAuth(async (ctx) => {
  // v2 implementation with breaking changes
});
```

### Versioning Policy

```typescript
// lib/api/versions.ts
export const API_VERSIONS = {
  v1: {
    current: true,
    deprecated: false,
    sunset: null,
  },
  v2: {
    current: true,
    deprecated: false,
    sunset: null,
  },
};

// Deprecation workflow:
// 1. Announce deprecation (6 months notice)
// 2. Mark as deprecated (return warning header)
// 3. Set sunset date
// 4. Remove old version after sunset
```

## Acceptance Criteria
- [ ] All new endpoints use /api/v1/ prefix
- [ ] Versioning policy documented
- [ ] Deprecation workflow defined
- [ ] Existing endpoints migrated (optional, can coexist)

## Related
- API documentation
- Breaking change process
