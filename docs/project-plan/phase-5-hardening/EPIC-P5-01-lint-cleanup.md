# EPIC-P5-01: Lint Warning Cleanup

> **Epic Owner:** AI Agent
> **Duration:** 3-4 days
> **Priority:** P2 - Medium
> **Status:** Not Started
> **Depends On:** Phase 4 Complete

---

## 📋 Summary

Reduce lint warnings from 776 to under 100. This improves code quality, catches potential bugs, and makes the codebase more maintainable.

---

## 🎯 Goals

1. **Reduce** lint warnings to <100
2. **Fix** real issues (not just suppress)
3. **Configure** appropriate rules
4. **Establish** lint-free CI requirement

---

## 📊 Warning Breakdown (776 Total)

| Category | Count | Priority | Action |
|----------|-------|----------|--------|
| `no-console` | ~126 | P0 | Replace with logger |
| `@typescript-eslint/no-explicit-any` | ~30 | P0 | Add proper types |
| `react-hooks/exhaustive-deps` | ~50 | P1 | Fix dependencies |
| `@typescript-eslint/no-unused-vars` | ~50 | P1 | Remove or use |
| `no-redeclare` | ~20 | P1 | Fix in tests |
| `@next/next/no-img-element` | ~25 | P2 | Use next/image |
| Other | ~475 | P2-P3 | Individual triage |

---

## 📝 Tickets

| ID | Focus | Warnings | Priority | Est. |
|----|-------|----------|----------|------|
| P5-001 | Replace console.log | 126 | P0 | 4h |
| P5-002 | Fix `any` types | 30 | P0 | 3h |
| P5-003 | Fix React hooks deps | 50 | P1 | 4h |
| P5-004 | Remove unused vars | 50 | P1 | 2h |
| P5-005 | Fix no-redeclare | 20 | P1 | 2h |
| P5-006 | Use next/image | 25 | P2 | 2h |
| P5-007 | Remaining warnings | 475 | P2 | 8h |
| P5-008 | Configure rules | - | P2 | 2h |

**Total Estimated: 27 hours**

---

## 🔧 Fix Patterns

### Console.log → Logger

```typescript
// BEFORE
console.log('Loading products');
console.error('Error:', error);

// AFTER
import { logger } from '@/lib/logger';

logger.debug('Loading products', { context: 'InventoryService' });
logger.error('Failed to load products', { error });
```

### Fix `any` Types

```typescript
// BEFORE
const handleSubmit = (data: any) => { ... }

// AFTER
interface PetFormData {
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed?: string;
}
const handleSubmit = (data: PetFormData) => { ... }
```

### Fix React Hook Dependencies

```typescript
// BEFORE (warning: missing dependency)
useEffect(() => {
  fetchPets(ownerId);
}, []); // ownerId missing

// AFTER
useEffect(() => {
  fetchPets(ownerId);
}, [ownerId]);

// OR if intentional:
useEffect(() => {
  fetchPets(ownerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only run on mount
```

### Fix no-redeclare in Tests

```typescript
// BEFORE (warning: redeclare)
const mockData = { ... };
// later in same file
const mockData = { ... }; // redeclare!

// AFTER
const mockDataList = { ... };
const mockDataSingle = { ... };
```

---

## 📊 Progress Strategy

### Week 1: High Impact

1. **Day 1-2:** Replace all console.log (P5-001)
   - Create logger if not exists
   - Find-replace with context
   
2. **Day 2-3:** Fix any types (P5-002)
   - Focus on public APIs first
   - Add interfaces as needed

3. **Day 3-4:** Fix React hooks (P5-003)
   - Review each warning
   - Fix or add eslint-disable with comment

### Week 2: Cleanup

4. **Day 4-5:** Fix unused vars, redeclare (P5-004, P5-005)
5. **Day 5-6:** Remaining warnings (P5-007)
6. **Day 6:** Configure rules (P5-008)

---

## 📋 Rule Configuration

```javascript
// eslint.config.mjs adjustments

{
  rules: {
    // Warnings we might downgrade to allow
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Rules to enforce strictly
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Rules to disable in test files
    'no-redeclare': 'off', // In test configs only
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] Total warnings < 100
- [ ] No `console.log` in production code
- [ ] No `any` in public APIs
- [ ] React hooks deps fixed or documented
- [ ] CI enforces lint check
- [ ] Remaining warnings documented/justified

---

*Last Updated: 2026-02-03*
