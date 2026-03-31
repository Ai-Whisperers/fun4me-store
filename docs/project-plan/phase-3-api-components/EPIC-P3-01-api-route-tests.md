# EPIC-P3-01: API Route Test Coverage

> **Epic Owner:** AI Agent
> **Duration:** 5-7 days
> **Priority:** P1 - High
> **Status:** Not Started
> **Depends On:** Phase 1 Complete, Phase 2 Complete

---

## 📋 Summary

Expand API route test coverage from ~3% to 60%. Focus on critical routes that handle financial data, medical records, and user authentication.

---

## 🎯 Goals

1. **Cover** all critical API routes (financial, medical)
2. **Test** authentication and authorization on every route
3. **Verify** input validation works correctly
4. **Confirm** error responses are appropriate

---

## 📊 Route Coverage Targets

### Tier 1: Financial & Medical (Must have 90%+)

| Route | Methods | Current | Target |
|-------|---------|---------|--------|
| `/api/billing/invoices` | GET, POST | ~20% | 90% |
| `/api/billing/payments` | POST | ~10% | 90% |
| `/api/prescriptions` | GET, POST, PUT | ~15% | 90% |
| `/api/medical-records` | GET, POST, PUT | ~10% | 90% |

### Tier 2: Core CRUD (Must have 70%+)

| Route | Methods | Current | Target |
|-------|---------|---------|--------|
| `/api/appointments` | GET, POST, PUT, DELETE | ~30% | 70% |
| `/api/pets` | GET, POST, PUT, DELETE | ~25% | 70% |
| `/api/inventory` | GET, POST, PUT | ~15% | 70% |
| `/api/lab-orders` | GET, POST, PUT | ~10% | 70% |

### Tier 3: Support Routes (Must have 50%+)

| Route | Methods | Current | Target |
|-------|---------|---------|--------|
| `/api/portal/*` | Various | ~5% | 50% |
| `/api/store/*` | Various | ~10% | 50% |
| `/api/messaging/*` | Various | ~5% | 50% |

---

## 📝 Tickets

### Tier 1 (P0)

| ID | Route | Est. |
|----|-------|------|
| P3-001 | /api/billing/invoices | 6h |
| P3-002 | /api/billing/payments | 4h |
| P3-003 | /api/prescriptions | 5h |
| P3-004 | /api/medical-records | 5h |

### Tier 2 (P1)

| ID | Route | Est. |
|----|-------|------|
| P3-005 | /api/appointments | 5h |
| P3-006 | /api/pets | 4h |
| P3-007 | /api/inventory | 4h |
| P3-008 | /api/lab-orders | 4h |

### Tier 3 (P2)

| ID | Route | Est. |
|----|-------|------|
| P3-009 | /api/portal/* | 6h |
| P3-010 | /api/store/* | 5h |
| P3-011 | /api/messaging/* | 4h |

**Total Estimated: 52 hours**

---

## 🔧 Test Requirements Per Route

Each API route must test:

```typescript
describe('POST /api/resource', () => {
  // Authentication (required)
  describe('authentication', () => {
    it('returns 401 for unauthenticated requests');
    it('returns 401 for expired tokens');
    it('returns 401 for invalid tokens');
  });

  // Authorization (required)
  describe('authorization', () => {
    it('returns 403 for insufficient permissions');
    it('returns 403 for cross-tenant access');
    it('allows access for authorized users');
  });

  // Validation (required)
  describe('validation', () => {
    it('returns 400 for missing required fields');
    it('returns 400 for invalid field formats');
    it('returns 400 for out-of-range values');
  });

  // Success cases (required)
  describe('success', () => {
    it('creates/returns resource with valid data');
    it('returns correct response format');
  });

  // Error handling (required)
  describe('errors', () => {
    it('returns 404 for non-existent resource');
    it('returns 409 for conflicts');
    it('returns 500 for internal errors');
    it('logs errors appropriately');
  });
});
```

---

## 📊 API Test Helpers

```typescript
// tests/api/helpers.ts

export function createAuthenticatedRequest(
  path: string,
  options: {
    method?: string;
    body?: object;
    userId?: string;
    tenantId?: string;
    role?: 'owner' | 'staff' | 'admin' | 'vet';
  }
) {
  // Implementation
}

export function expectUnauthorized(response: Response) {
  expect(response.status).toBe(401);
}

export function expectForbidden(response: Response) {
  expect(response.status).toBe(403);
}

export function expectValidationError(response: Response) {
  expect(response.status).toBe(400);
}
```

---

## ✅ Acceptance Criteria

- [ ] Tier 1 routes at 90%+ coverage
- [ ] Tier 2 routes at 70%+ coverage
- [ ] Tier 3 routes at 50%+ coverage
- [ ] All routes test auth/authz
- [ ] All routes test validation
- [ ] OpenAPI spec matches implementation

---

## 📈 Progress

```
Tier 1 (Financial/Medical): ░░░░░░░░░░ 0%
Tier 2 (Core CRUD):         ░░░░░░░░░░ 0%
Tier 3 (Support):           ░░░░░░░░░░ 0%
```

---

*Last Updated: 2026-02-03*
