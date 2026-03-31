# EPIC-P2-01: Service Layer Coverage

> **Epic Owner:** AI Agent
> **Duration:** 5-7 days
> **Priority:** P0 - Critical
> **Status:** Not Started
> **Depends On:** Phase 1 Complete

---

## 📋 Summary

Expand test coverage for all service files to meet coverage thresholds. Focus on business logic, error handling, and edge cases.

---

## 🎯 Coverage Targets

| Tier | Services | Current | Target |
|------|----------|---------|--------|
| 1 (Critical) | payment, prescription, invoice, appointment | Variable | 90% |
| 2 (Important) | inventory, medical-record, lab, vaccine, hospitalization | 0-20% | 80% |
| 3 (Standard) | store, messaging, consent, reminder, clinical-tools, safety | 0% | 70% |

---

## 📝 Tickets by Service

### Tier 1: Critical Services (90% Target)

| ID | Service | Current | Tests to Add | Est. |
|----|---------|---------|--------------|------|
| P2-001 | payment-service | ~20% | Payment processing, refunds, failures | 8h |
| P2-002 | prescription-service | 0% | CRUD, validation, PDF generation | 6h |
| P2-003 | invoice-service | ~80% | Edge cases, partial payments | 4h |
| P2-004 | appointment-service | ~80% | Conflicts, cancellations, rescheduling | 4h |

### Tier 2: Important Services (80% Target)

| ID | Service | Current | Tests to Add | Est. |
|----|---------|---------|--------------|------|
| P2-005 | inventory-service | 0% | Stock management, alerts, movements | 6h |
| P2-006 | medical-record-service | 0% | CRUD, access control, history | 5h |
| P2-007 | lab-service | 0% | Order lifecycle, results, notifications | 5h |
| P2-008 | vaccine-service | 0% | Schedules, administration, reminders | 4h |
| P2-009 | hospitalization-service | 0% | Admission, updates, discharge, billing | 5h |

### Tier 3: Standard Services (70% Target)

| ID | Service | Current | Tests to Add | Est. |
|----|---------|---------|--------------|------|
| P2-010 | store-service | 0% | Products, cart, checkout | 4h |
| P2-011 | messaging-service | 0% | Send, receive, threads | 3h |
| P2-012 | consent-service | ~50% | Templates, signing, versioning | 3h |
| P2-013 | reminder-service | 0% | Scheduling, delivery, acknowledgment | 3h |
| P2-014 | clinical-tools-service | 0% | Calculations, recommendations | 3h |
| P2-015 | safety-service | 0% | Drug interactions, alerts | 3h |

**Total Estimated: 66 hours**

---

## 🔧 Test Categories Per Service

Each service should have tests for:

```
1. CRUD Operations
   - create (valid data, validation failures, duplicates)
   - read (by id, not found, tenant isolation)
   - update (valid, partial, unauthorized)
   - delete (soft delete, hard delete, cascades)
   - list (pagination, filtering, sorting)

2. Business Logic
   - Core business rules
   - State transitions
   - Calculations
   - Validations

3. Error Handling
   - Database errors
   - Validation errors
   - External service failures
   - Edge cases

4. Security
   - Tenant isolation
   - Role-based access
   - Input sanitization
```

---

## 📊 Test Template

```typescript
describe('ServiceName', () => {
  // Setup
  let service: ServiceName;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new ServiceName(mockSupabase);
  });

  describe('create', () => {
    it('creates with valid data', async () => {
      const input = createValidInput();
      mockSupabase.from.mockReturnValue(
        createChainableQueryMock({ id: '1', ...input })
      );

      const result = await service.create(input);

      expect(result.data).toMatchObject(input);
      expect(result.error).toBeNull();
    });

    it('validates required fields', async () => {
      const result = await service.create({});

      expect(result.error).toContain('required');
    });

    it('enforces tenant isolation', async () => {
      const input = createValidInput({ tenant_id: 'other-tenant' });

      const result = await service.create(input);

      expect(result.error).toContain('No puede acceder');
    });

    it('handles database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue(
        createChainableQueryMock(null, new Error('DB error'))
      );

      const result = await service.create(createValidInput());

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  // ... more test groups
});
```

---

## ✅ Acceptance Criteria

- [ ] All Tier 1 services at 90%+ coverage
- [ ] All Tier 2 services at 80%+ coverage
- [ ] All Tier 3 services at 70%+ coverage
- [ ] Overall statement coverage ≥50%
- [ ] No decrease in existing coverage
- [ ] Tests follow established patterns

---

## 📈 Coverage Progress

```
payment-service:         ░░░░░░░░░░ 20%
prescription-service:    ░░░░░░░░░░ 0%
invoice-service:         ████████░░ 80%
appointment-service:     ████████░░ 80%
inventory-service:       ░░░░░░░░░░ 0%
medical-record-service:  ░░░░░░░░░░ 0%
lab-service:             ░░░░░░░░░░ 0%
vaccine-service:         ░░░░░░░░░░ 0%
hospitalization-service: ░░░░░░░░░░ 0%
store-service:           ░░░░░░░░░░ 0%
messaging-service:       ░░░░░░░░░░ 0%
consent-service:         █████░░░░░ 50%
reminder-service:        ░░░░░░░░░░ 0%
clinical-tools-service:  ░░░░░░░░░░ 0%
safety-service:          ░░░░░░░░░░ 0%
```

---

*Last Updated: 2026-02-03*
