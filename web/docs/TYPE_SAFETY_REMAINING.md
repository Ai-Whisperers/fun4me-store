# Remaining Type Safety Violations

**Generated**: January 23, 2026 - 14:45 PYT  
**Total Remaining**: 81 violations across 38 files  
**Priority**: Sorted by violation count per file

---

## Violations by File

### High Count Files (3+ violations)

| File                                             | Violations | Types             | Priority |
| ------------------------------------------------ | ---------- | ----------------- | -------- |
| `app/[clinic]/euthanasia_assessments/client.tsx` | 5          | non-null          | HIGH     |
| `app/api/vaccines/recommendations/route.ts`      | 4          | non-null          | HIGH     |
| `components/calendar/calendar.tsx`               | 4          | non-null          | HIGH     |
| `components/consents/consent-pdf.tsx`            | 3          | non-null          | MEDIUM   |
| `app/[clinic]/layout.tsx`                        | 3          | any (2), non-null | MEDIUM   |

### Medium Count Files (2 violations)

| File                                          | Violations | Types    | Priority   |
| --------------------------------------------- | ---------- | -------- | ---------- |
| `lib/domain/messaging/service.ts`             | 2          | any      | MEDIUM     |
| `lib/domain/safety/service.ts`                | 2          | any      | MEDIUM     |
| `lib/test-utils/mock-presets.ts`              | 2          | any      | LOW (test) |
| `lib/test-utils/supabase-mock.ts`             | 2          | any      | LOW (test) |
| `app/[clinic]/reproductive_cycles/client.tsx` | 2          | non-null | MEDIUM     |
| `app/[clinic]/portal/finance/client.tsx`      | 2          | non-null | MEDIUM     |

### Single Violation Files (1 each)

**API Routes** (5 files)

- `app/api/store/reorder-suggestions/route.ts` - non-null
- `app/api/health/errors/route.ts` - remaining
- `app/red/page.tsx` - non-null

**Components** (15 files)

- `components/booking/booking-wizard/index.tsx` - non-null
- `components/clinical/growth-chart.tsx` - non-null
- `components/consents/signing-form/consent-preview.tsx` - non-null
- `components/consents/signing-form/custom-fields.tsx` - non-null
- `components/consents/signing-form/index.tsx` - non-null
- `components/dashboard/appointments/appointment-queue.tsx` - non-null
- `components/dashboard/bottom-navigation.tsx` - non-null
- `components/dashboard/procurement/price-comparison.tsx` - non-null
- `components/hospital/timeline-panel.tsx` - non-null
- `components/landing/pricing-quiz.tsx` - non-null
- `components/pets/pet-detail-content.tsx` - non-null
- `components/pets/tabs/pet-summary-tab/use-pet-summary-data.ts` - non-null
- `components/store/filters/category-tree.tsx` - non-null

**Services/Domain** (8 files)

- `lib/domain/users/repository.ts` - any
- `lib/domain/users/service.ts` - any
- `lib/services/messaging-service.ts` - any
- `lib/services/safety-service.ts` - any
- `lib/db/migration-runner.ts` - any

**Other** (5 files)

- `app/[clinic]/store/wishlist/page.tsx` - non-null
- `lib/auth/action-wrapper.ts` - any

---

## Violations by Type

### `no-explicit-any` (21 violations)

**Pattern**: Generic `any` usage in type definitions or function parameters

**Files**:

1. `app/[clinic]/layout.tsx` (2) - Layout props
2. `lib/domain/messaging/service.ts` (2) - Message data types
3. `lib/domain/safety/service.ts` (2) - Safety record types
4. `lib/test-utils/mock-presets.ts` (2) - Test mocking
5. `lib/test-utils/supabase-mock.ts` (2) - Supabase mock
6. `lib/domain/users/repository.ts` (1) - User data
7. `lib/domain/users/service.ts` (1) - User operations
8. `lib/services/messaging-service.ts` (1) - Message handling
9. `lib/services/safety-service.ts` (1) - Safety operations
10. `lib/auth/action-wrapper.ts` (1) - Action wrapper
11. `lib/db/migration-runner.ts` (1) - Migration data
12. Other files (5) - Various types

**Recommended Fix**:

- Use `Record<string, unknown>` for untyped objects
- Use proper generic constraints for type parameters
- Consider creating specific interfaces for complex data structures

### `no-non-null-assertion` (60 violations)

**Pattern**: Non-null assertions (`!`) used without proper justification

**Categories**:

1. **Array Access After Filter** (20 violations)
   - Pattern: `array.filter(x => x.prop).map(x => x.prop!)`
   - Files: calendar, vaccines recommendations, various components
   - Fix: Add eslint-disable with explanation that filter guarantees existence

2. **Optional Property Access** (15 violations)
   - Pattern: `object.property!` where property is optional
   - Files: Components, API routes
   - Fix: Add null check or use optional chaining with fallback

3. **Array Index Access** (10 violations)
   - Pattern: `array[0]!` without length check
   - Files: Various components
   - Fix: Add length check or use `array[0] ?? defaultValue`

4. **Supabase Results** (10 violations)
   - Pattern: `data!` after Supabase query
   - Files: API routes, services
   - Fix: Proper error handling before accessing data

5. **Other** (5 violations)
   - Various edge cases requiring individual assessment

---

## Fix Strategy by Priority

### Phase 1: Quick Wins (30 violations, 1-2 hours)

**Target**: Files with 1 violation each (28 files)

These are isolated fixes that can be done quickly:

1. Single non-null assertions in components
2. Single `any` types in simple functions
3. Clear filter-guaranteed assertions

**Approach**: Work alphabetically through single-violation files

### Phase 2: Medium Complexity (35 violations, 2-3 hours)

**Target**: Files with 2-3 violations (10 files)

1. `app/[clinic]/layout.tsx` - Layout component types
2. `lib/domain/messaging/service.ts` - Message service types
3. `lib/domain/safety/service.ts` - Safety service types
4. Component files with multiple assertions
5. API routes with complex logic

**Approach**: Fix one file completely before moving to next

### Phase 3: Complex Cases (16 violations, 1-2 hours)

**Target**: Files with 4+ violations (5 files)

1. `app/[clinic]/euthanasia_assessments/client.tsx` (5) - Complex form logic
2. `app/api/vaccines/recommendations/route.ts` (4) - Vaccine calculation
3. `components/calendar/calendar.tsx` (4) - Calendar event handling
4. `components/consents/consent-pdf.tsx` (3) - PDF generation
5. High-complexity domain logic

**Approach**:

- Study the code context first
- Fix similar patterns together
- Test after each file

---

## Estimated Completion Time

| Phase               | Violations | Time      | Cumulative |
| ------------------- | ---------- | --------- | ---------- |
| Phase 1: Quick Wins | 30         | 1-2 hours | 1-2 hours  |
| Phase 2: Medium     | 35         | 2-3 hours | 3-5 hours  |
| Phase 3: Complex    | 16         | 1-2 hours | 4-7 hours  |

**Total Estimated**: 4-7 hours to complete all remaining violations

---

## Code Patterns to Apply

### Pattern 1: Filter-Guaranteed Assertion

```typescript
// ✅ BEFORE FIX
const ids = items.filter((i) => i.id).map((i) => i.id!)

// ✅ AFTER FIX
// Non-null assertion safe: filter ensures id exists
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const ids = items.filter((i) => i.id).map((i) => i.id!)
```

### Pattern 2: Array Access

```typescript
// ✅ BEFORE FIX
const first = items[0]!

// ✅ AFTER FIX
const first = items[0]
if (!first) throw new Error('Array is empty')
// OR
const first = items[0] ?? DEFAULT_VALUE
```

### Pattern 3: Generic Any

```typescript
// ✅ BEFORE FIX
function process(data: any) { ... }

// ✅ AFTER FIX
function process(data: Record<string, unknown>) { ... }
// OR for generic functions
function process<T>(data: T) { ... }
```

### Pattern 4: Optional Property

```typescript
// ✅ BEFORE FIX
const value = obj.property!

// ✅ AFTER FIX
const value = obj.property
if (!value) throw new Error('Property is required')
// OR
const value = obj.property ?? defaultValue
```

---

## Files by Category

### Components (18 files)

- Form components (5)
- Calendar/scheduling (2)
- Dashboard components (4)
- PDF generation (1)
- Other UI components (6)

### API Routes (4 files)

- Store/e-commerce routes (2)
- Vaccine recommendations (1)
- Health checks (1)

### Services/Domain (8 files)

- Messaging service (2)
- Safety service (2)
- User management (2)
- Other services (2)

### Test Utilities (2 files)

- Mock presets
- Supabase mock

### Other (6 files)

- Layout pages (2)
- Action wrappers (1)
- DB utilities (1)
- Miscellaneous (2)

---

## Next Steps

### Option 1: Continue Sprint 4 Now

Pick up Phase 1 (Quick Wins) and fix 30 violations in 1-2 hours:

```bash
cd web
npm run lint 2>&1 | grep "1 problem" -B5 | grep "^C:" > /tmp/single-violation-files.txt
# Fix files one by one
npm run test:unit  # After each batch of 5-10 fixes
```

### Option 2: Break into Sub-Sessions

1. **Session A**: Component files (18 violations, 2 hours)
2. **Session B**: API routes & services (30 violations, 2-3 hours)
3. **Session C**: Test utilities & misc (33 violations, 1-2 hours)

### Option 3: Prioritize by Impact

1. Fix all API routes first (high user impact)
2. Then services/domain (core business logic)
3. Finally components (UI/UX)
4. Test utilities last (low priority)

---

## Testing Strategy

After each phase:

```bash
# Run tests
npm run test:unit

# Check violation count
npm run lint 2>&1 | grep -E "no-explicit-any|no-non-null-assertion" | wc -l

# Build verification
npm run build
```

After Phase 3 completion:

```bash
# Full test suite
npm run test

# E2E tests
npm run test:e2e

# Final lint check
npm run lint
```

---

## Success Criteria

- [ ] All 81 violations fixed or justified
- [ ] All 920 unit tests passing
- [ ] Build successful
- [ ] No new violations introduced
- [ ] Documentation updated
- [ ] Progress tracking complete

**Current Status**: 65/149 fixed (44%), 81 remaining (56%)  
**Target Status**: 149/149 fixed (100%), 0 remaining

---

_Generated automatically from lint output - Last updated: January 23, 2026_
