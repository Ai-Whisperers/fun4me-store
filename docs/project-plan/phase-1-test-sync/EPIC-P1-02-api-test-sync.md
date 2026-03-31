# EPIC-P1-02: API Test Synchronization

> **Epic Owner:** AI Agent
> **Duration:** 3-4 days
> **Priority:** P0 - Critical
> **Status:** Not Started
> **Depends On:** EPIC-P0-02 (Mock Infrastructure)

---

## 📋 Summary

Fix all failing API route tests. These tests verify HTTP endpoints work correctly with proper authentication, authorization, validation, and error handling.

---

## 🎯 Goals

1. **Fix** all ~150 failing API tests across 20+ route groups
2. **Standardize** API test patterns
3. **Verify** auth/authz checks are tested
4. **Achieve** 100% pass rate for API tests

---

## 📊 API Test File Analysis

| Route Group | File | Est. Failures | Priority |
|-------------|------|---------------|----------|
| `/api/appointments/*` | `appointments/` | ~40 | P0 |
| `/api/billing/*` | `billing/` | ~30 | P0 |
| `/api/inventory/*` | `inventory/` | ~25 | P0 |
| `/api/pets/*` | `pets/` | ~20 | P1 |
| `/api/prescriptions/*` | `prescriptions/` | ~15 | P1 |
| `/api/lab-orders/*` | `lab-orders/` | ~15 | P1 |
| `/api/medical-records/*` | `medical-records/` | ~20 | P1 |
| `/api/cron/*` | `cron/` | ~10 | P2 |
| `/api/health/*` | `health/` | ~5 | P2 |
| `/api/settings/*` | `settings-general.test.ts` | ~10 | P2 |
| Contract tests | `*-contract.test.ts` | ~30 | P2 |

---

## 📝 Tickets

| ID | Route Group | Priority | Est. |
|----|-------------|----------|------|
| P1-020 | /api/appointments/* | P0 | 4h |
| P1-021 | /api/billing/* | P0 | 4h |
| P1-022 | /api/inventory/* | P0 | 3h |
| P1-023 | /api/pets/* | P1 | 3h |
| P1-024 | /api/prescriptions/* | P1 | 2h |
| P1-025 | /api/lab-orders/* | P1 | 2h |
| P1-026 | /api/medical-records/* | P1 | 3h |
| P1-027 | /api/cron/* | P2 | 2h |
| P1-028 | /api/health/* | P2 | 1h |
| P1-029 | /api/settings/* | P2 | 2h |
| P1-030 | Contract tests | P2 | 3h |

**Total Estimated: 29 hours**

---

## 🔧 Common API Test Issues

### Issue 1: Auth Mock Not Set Up

```typescript
// BEFORE (fails - no auth)
const response = await GET(createRequest('/api/pets'));

// AFTER (works - auth mocked)
const response = await GET(createAuthenticatedRequest('/api/pets', {
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'staff'
}));
```

### Issue 2: Request Body Parsing

```typescript
// BEFORE (fails - body not parsed)
const req = new Request('http://localhost/api/pets', {
  method: 'POST',
  body: JSON.stringify(data)
});

// AFTER (works - proper content type)
const req = new Request('http://localhost/api/pets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Issue 3: Next.js cookies() Mock

```typescript
// BEFORE (fails - cookies not mocked)
// Error: cookies was called outside request scope

// AFTER (works - cookies mocked)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'session-token' })
  })
}));
```

---

## ✅ Acceptance Criteria

- [ ] All API test files pass
- [ ] Each route tests: auth, authz, validation, success, errors
- [ ] No flaky tests
- [ ] Response formats match API contracts
- [ ] Coverage maintained or improved

---

## 📈 Progress

```
appointments:     ░░░░░░░░░░ 0%
billing:          ░░░░░░░░░░ 0%
inventory:        ░░░░░░░░░░ 0%
pets:             ░░░░░░░░░░ 0%
prescriptions:    ░░░░░░░░░░ 0%
lab-orders:       ░░░░░░░░░░ 0%
medical-records:  ░░░░░░░░░░ 0%
cron:             ░░░░░░░░░░ 0%
health:           ░░░░░░░░░░ 0%
settings:         ░░░░░░░░░░ 0%
contracts:        ░░░░░░░░░░ 0%
```

---

## 📎 Related Files

- `web/tests/api/` - All API tests
- `web/tests/api/setup.ts` - Test setup helpers
- `web/tests/api/AUTH_PATTERN.md` - Auth testing guide

---

*Last Updated: 2026-02-03*
