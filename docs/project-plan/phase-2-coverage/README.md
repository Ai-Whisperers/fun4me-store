# Phase 2: Coverage Expansion (Services)

> **Duration:** 2 weeks (10 working days)
> **Goal:** Raise statement coverage from ~30% to 50%
> **Entry Criteria:** Phase 1 complete (0 test failures)
> **Exit Criteria:** 50% statement coverage, service layer at 80%

---

## 📊 Phase Overview

With tests stable, we expand coverage. This phase focuses on the service layer - the business logic core that should have highest coverage.

---

## 🎯 Objectives

| Objective | Current | Target |
|-----------|---------|--------|
| Statement Coverage | ~30% | 50% |
| Branch Coverage | ~25% | 40% |
| Service Layer Coverage | Variable | 80% |
| Action Coverage | ~20% | 60% |

---

## 📋 Epics

| Epic | Title | Tickets | Est. Hours |
|------|-------|---------|------------|
| [EPIC-P2-01](./EPIC-P2-01-service-coverage.md) | Service Coverage | 16 | 48-64h |
| [EPIC-P2-02](./EPIC-P2-02-action-coverage.md) | Server Action Coverage | 12 | 24-36h |
| [EPIC-P2-03](./EPIC-P2-03-util-coverage.md) | Utility Coverage | 8 | 16-24h |
| [EPIC-P2-04](./EPIC-P2-04-hook-coverage.md) | Hook Coverage | 6 | 12-18h |

**Total Estimated Hours:** 100-142h (~2 weeks)

---

## 📁 Service Coverage Targets

### Tier 1: Critical (Must reach 90%+)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| payment-service | ~20% | 90% | P0 |
| invoice-service | ~80% | 90% | P0 |
| prescription-service | 0% | 90% | P0 |
| appointment-service | ~80% | 90% | P0 |

### Tier 2: Important (Must reach 80%+)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| pet-service | ~97% | 95% | - (done) |
| inventory-service | 0% | 80% | P1 |
| medical-record-service | 0% | 80% | P1 |
| lab-service | 0% | 80% | P1 |
| vaccine-service | 0% | 80% | P1 |
| hospitalization-service | 0% | 80% | P1 |

### Tier 3: Standard (Must reach 70%+)

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| store-service | 0% | 70% | P2 |
| messaging-service | 0% | 70% | P2 |
| consent-service | ~50% | 70% | P2 |
| reminder-service | 0% | 70% | P2 |
| clinical-tools-service | 0% | 70% | P2 |
| safety-service | 0% | 70% | P2 |

---

## 📝 Test Writing Guidelines

### TDD Process

```
1. Identify uncovered function/branch
2. Write test that exercises it (expect fail or missing assertion)
3. Run test - confirm it fails appropriately
4. If code bug found, fix code
5. Run test - confirm it passes
6. Refactor if needed
```

### Coverage Requirements Per Service

Each service test file must include:

```typescript
describe('ServiceName', () => {
  describe('create', () => {
    it('creates with valid data', async () => {});
    it('validates required fields', async () => {});
    it('enforces tenant isolation', async () => {});
    it('handles database errors', async () => {});
  });

  describe('read', () => {
    it('returns item by id', async () => {});
    it('returns null for non-existent id', async () => {});
    it('respects tenant filter', async () => {});
  });

  describe('update', () => {
    it('updates with valid data', async () => {});
    it('rejects update to other tenant data', async () => {});
    it('handles concurrent updates', async () => {});
  });

  describe('delete', () => {
    it('soft deletes by default', async () => {});
    it('prevents cross-tenant deletion', async () => {});
  });

  describe('list', () => {
    it('returns paginated results', async () => {});
    it('filters by tenant', async () => {});
    it('applies search filters', async () => {});
    it('orders results', async () => {});
  });

  describe('business logic', () => {
    // Service-specific logic
  });
});
```

---

## 📈 Progress

```
EPIC-P2-01 (Services): ░░░░░░░░░░ 0%
EPIC-P2-02 (Actions):  ░░░░░░░░░░ 0%
EPIC-P2-03 (Utils):    ░░░░░░░░░░ 0%
EPIC-P2-04 (Hooks):    ░░░░░░░░░░ 0%
```

---

## 🔄 Weekly Strategy

### Week 1: Tier 1 & 2 Services

| Day | Focus | Coverage Goal |
|-----|-------|---------------|
| 1 | payment-service | 0% → 90% |
| 2 | prescription-service | 0% → 90% |
| 3 | inventory-service | 0% → 80% |
| 4 | medical-record-service | 0% → 80% |
| 5 | lab-service, vaccine-service | 0% → 80% |

### Week 2: Tier 3 & Actions

| Day | Focus | Coverage Goal |
|-----|-------|---------------|
| 6 | hospitalization-service | 0% → 80% |
| 7 | store-service, messaging-service | 0% → 70% |
| 8 | Remaining services | 0% → 70% |
| 9 | Server actions (billing, auth) | 20% → 60% |
| 10 | Utilities, hooks | Variable → 60% |

---

## 📊 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Service tests | `tests/services/*.test.ts` | Pending |
| Action tests | `tests/actions/*.test.ts` | Pending |
| Coverage report | CI artifacts | Pending |

---

*Created: 2026-02-03 | Owner: AI Agent*
