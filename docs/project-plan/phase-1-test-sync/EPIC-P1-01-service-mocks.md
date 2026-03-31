# EPIC-P1-01: Service Mock Fixes

> **Epic Owner:** AI Agent
> **Duration:** 5-7 days
> **Priority:** P0 - Critical
> **Status:** Not Started
> **Depends On:** Phase 0 Complete

---

## 📋 Summary

Fix all failing service tests by updating mocks to match current Supabase client behavior. Most failures stem from incomplete chainable query mocks.

---

## 🎯 Goals

1. **Fix** all 16 service test files
2. **Standardize** mock patterns across all tests
3. **Document** any behavioral changes found
4. **Achieve** 100% pass rate for service tests

---

## 📊 Service Test Status

| Service | File | Current | Target | Est. |
|---------|------|---------|--------|------|
| pet-service | `pet-service.test.ts` | ✅ Passing | Maintain | - |
| base-service | `base-service.test.ts` | ✅ Passing | Maintain | - |
| appointment-service | `appointment-service.test.ts` | ~30 fail | 0 fail | 4h |
| invoice-service | `invoice-service.test.ts` | ~25 fail | 0 fail | 3h |
| inventory-service | `inventory-service.test.ts` | ~40 fail | 0 fail | 4h |
| medical-record-service | `medical-record-service.test.ts` | ~35 fail | 0 fail | 4h |
| vaccine-service | `vaccine-service.test.ts` | ~20 fail | 0 fail | 3h |
| hospitalization-service | `hospitalization-service.test.ts` | ~25 fail | 0 fail | 3h |
| lab-service | `lab-service.test.ts` | ~30 fail | 0 fail | 4h |
| messaging-service | `messaging-service.test.ts` | ~20 fail | 0 fail | 3h |
| payment-service | `payment-service.test.ts` | ~25 fail | 0 fail | 3h |
| store-service | `store-service.test.ts` | ~35 fail | 0 fail | 4h |
| consent-service | `consent-service.test.ts` | ~15 fail | 0 fail | 2h |
| reminder-service | `reminder-service.test.ts` | ~10 fail | 0 fail | 2h |
| safety-service | `safety-service.test.ts` | ~15 fail | 0 fail | 2h |
| clinical-tools-service | `clinical-tools-service.test.ts` | ~20 fail | 0 fail | 3h |
| user-service | `user-service.test.ts` | ~10 fail | 0 fail | 2h |

**Total Estimated: 46 hours**

---

## 📝 Tickets

| ID | Service | Priority | Depends On |
|----|---------|----------|------------|
| P1-001 | pet-service | - | (already passing) |
| P1-002 | appointment-service | P0 | P0 complete |
| P1-003 | invoice-service | P0 | P0 complete |
| P1-004 | inventory-service | P0 | P0 complete |
| P1-005 | medical-record-service | P0 | P0 complete |
| P1-006 | vaccine-service | P1 | P1-002 |
| P1-007 | hospitalization-service | P1 | P1-002 |
| P1-008 | lab-service | P1 | P1-005 |
| P1-009 | messaging-service | P1 | P1-002 |
| P1-010 | payment-service | P1 | P1-003 |
| P1-011 | store-service | P1 | P1-004 |
| P1-012 | consent-service | P2 | P1-005 |
| P1-013 | reminder-service | P2 | P1-002 |
| P1-014 | safety-service | P2 | P1-005 |
| P1-015 | clinical-tools-service | P2 | P1-005 |
| P1-016 | user-service | P2 | P0 complete |

---

## 🔧 Common Fix Patterns

### Pattern 1: Chainable Query Mock

**Problem:** Mock doesn't support method chaining

```typescript
// BEFORE (fails)
mockSupabase.from.mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [], error: null })
});

// AFTER (works)
mockSupabase.from.mockReturnValue(
  createChainableQueryMock(mockData)
);
```

### Pattern 2: RPC Mock

**Problem:** RPC functions not mocked

```typescript
// Add RPC mock
mockSupabase.rpc.mockImplementation((funcName, params) => {
  if (funcName === 'record_invoice_payment') {
    return Promise.resolve({ data: mockPayment, error: null });
  }
  return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
});
```

### Pattern 3: Schema Updates

**Problem:** Test uses old field names

```typescript
// BEFORE
const mockPet = { clinic_id: 'abc', ... };

// AFTER
const mockPet = { tenant_id: 'abc', ... };
```

### Pattern 4: Error Message Updates

**Problem:** Test expects generic error, service returns specific

```typescript
// BEFORE
expect(result.error).toBe('Error');

// AFTER
expect(result.error).toBe('No se encontró la mascota');
```

---

## ✅ Acceptance Criteria

- [ ] All 16 service test files pass
- [ ] Each fix documented with root cause
- [ ] Standardized mock helpers used
- [ ] No tests skipped without ticket
- [ ] Coverage maintained or improved

---

## 📈 Progress

```
pet-service:              ██████████ 100% ✅
base-service:             ██████████ 100% ✅
appointment-service:      ░░░░░░░░░░ 0%
invoice-service:          ░░░░░░░░░░ 0%
inventory-service:        ░░░░░░░░░░ 0%
medical-record-service:   ░░░░░░░░░░ 0%
vaccine-service:          ░░░░░░░░░░ 0%
hospitalization-service:  ░░░░░░░░░░ 0%
lab-service:              ░░░░░░░░░░ 0%
messaging-service:        ░░░░░░░░░░ 0%
payment-service:          ░░░░░░░░░░ 0%
store-service:            ░░░░░░░░░░ 0%
consent-service:          ░░░░░░░░░░ 0%
reminder-service:         ░░░░░░░░░░ 0%
safety-service:           ░░░░░░░░░░ 0%
clinical-tools-service:   ░░░░░░░░░░ 0%
user-service:             ░░░░░░░░░░ 0%
```

---

## 📎 Related Files

- `web/tests/services/` - All service tests
- `web/tests/services/__mocks__/supabase-mock.ts` - Mock implementations
- `web/lib/services/` - Service implementations

---

*Last Updated: 2026-02-03*
