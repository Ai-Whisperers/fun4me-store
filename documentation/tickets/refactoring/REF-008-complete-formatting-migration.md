# REF-008: Complete Formatting Utilities Migration

## Priority: P3 - Low
## Category: Refactoring
## Status: Not Started
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Affected Areas: web/lib/utils/, web/lib/formatting/

## Description

A comprehensive formatting module was created at `lib/formatting/` with a migration guide, but the legacy `lib/utils/formatting.ts` file still exists with duplicate functions. The migration documented in `lib/FORMATTING_MIGRATION.md` is incomplete - legacy code needs to be removed and all consumers updated.

## Current State

### Duplicate Functions Found

| Function | Legacy Location | New Location |
|----------|-----------------|--------------|
| `formatDate` | `lib/utils/formatting.ts:4` | `lib/formatting/date.ts:42` |
| `formatDateTime` | `lib/utils/formatting.ts:17` | `lib/formatting/date.ts:57` |
| `formatCurrency` | `lib/utils/formatting.ts:32` | `lib/formatting/currency.ts:27` |
| `formatNumber` | `lib/utils/formatting.ts:43` | `lib/formatting/number.ts:19` |
| `formatPhoneNumber` | `lib/utils/formatting.ts:50` | `lib/formatting/number.ts:161` |

### Additional Legacy Locations

Per `FORMATTING_MIGRATION.md`, these files also have local formatting functions:

1. `web/lib/types/invoicing.ts` - `formatCurrency`, `formatDate`
2. `web/lib/utils/pet-size.ts` - `formatPriceGs`
3. `web/components/booking/booking-wizard/useBookingState.ts` - `formatPrice`, `getLocalDateString`
4. `web/lib/email/templates/*.ts` - Local `formatCurrency`, `formatDate` functions

### Migration Status (from FORMATTING_MIGRATION.md)

```markdown
## Next Steps

1. ✅ Created consolidated formatting module
2. ✅ Created constants module
3. ✅ Created memoization utility
4. ✅ Created backward compatibility shim
5. ⏳ Gradually migrate existing code        ← IN PROGRESS
6. ⏳ Add unit tests for formatting functions ← NOT STARTED
7. ⏳ Remove compatibility shim after full migration ← NOT STARTED
8. ⏳ Remove deprecated functions from old files ← NOT STARTED
```

## Proposed Solution

### Phase 1: Identify All Consumers

Find all imports of legacy formatting functions:

```bash
# Search for legacy imports
grep -r "from '@/lib/utils/formatting'" web/
grep -r "from '@/lib/types/invoicing'" web/ | grep -E "format(Date|Currency)"
grep -r "formatPriceGs" web/
```

### Phase 2: Update Imports

Replace legacy imports with consolidated module:

```typescript
// Before (scattered imports)
import { formatDate, formatCurrency } from '@/lib/utils/formatting'
import { formatPriceGs } from '@/lib/utils/pet-size'

// After (single import)
import { formatDate, formatCurrency, formatPriceGs } from '@/lib/formatting'
```

### Phase 3: Remove Legacy Files

1. Delete `lib/utils/formatting.ts`
2. Remove formatting functions from `lib/types/invoicing.ts`
3. Remove `formatPriceGs` from `lib/utils/pet-size.ts`
4. Remove local functions from booking/email files

### Phase 4: Add Tests

Create comprehensive tests for the formatting module:

```typescript
// tests/unit/lib/formatting/currency.test.ts
import { formatPrice, formatCurrency, parseCurrency } from '@/lib/formatting'

describe('Currency Formatting', () => {
  it('formats PYG correctly', () => {
    expect(formatPrice(150000)).toBe('₲ 150.000')
  })

  it('parses currency strings', () => {
    expect(parseCurrency('₲ 150.000')).toBe(150000)
  })
})
```

## Implementation Steps

### Phase 1: Audit (30 min)
1. [ ] Run grep commands to find all consumers
2. [ ] Document all files needing updates
3. [ ] Count total import statements to change

### Phase 2: Update Consumers (2-3 hours)
4. [ ] Update imports in `app/` directory
5. [ ] Update imports in `components/` directory
6. [ ] Update imports in `lib/` directory
7. [ ] Update email template files
8. [ ] Verify no TypeScript errors

### Phase 3: Remove Legacy (30 min)
9. [ ] Delete `lib/utils/formatting.ts`
10. [ ] Remove formatting from `lib/types/invoicing.ts`
11. [ ] Clean up `lib/utils/pet-size.ts`
12. [ ] Remove compatibility shim if exists

### Phase 4: Testing (1 hour)
13. [ ] Add unit tests for `lib/formatting/currency.ts`
14. [ ] Add unit tests for `lib/formatting/date.ts`
15. [ ] Add unit tests for `lib/formatting/number.ts`
16. [ ] Add unit tests for `lib/formatting/text.ts`
17. [ ] Run full test suite

### Phase 5: Documentation (15 min)
18. [ ] Update `FORMATTING_MIGRATION.md` to mark complete
19. [ ] Remove "gradual migration" notes

## Acceptance Criteria

- [ ] No imports from `@/lib/utils/formatting`
- [ ] No duplicate formatting functions in codebase
- [ ] `lib/utils/formatting.ts` deleted
- [ ] All formatting from single `@/lib/formatting` module
- [ ] Unit tests for all formatting functions
- [ ] All existing tests pass
- [ ] FORMATTING_MIGRATION.md marked as complete

## Benefits

- **Single source of truth**: One location for all formatting
- **Reduced bundle size**: No duplicate code
- **Better maintainability**: Changes in one place
- **Full test coverage**: Formatting is business-critical
- **Clear documentation**: Migration guide becomes reference

## Related Files

### Files to Delete
- `web/lib/utils/formatting.ts`

### Files to Update
- `web/lib/types/invoicing.ts`
- `web/lib/utils/pet-size.ts`
- `web/components/booking/booking-wizard/useBookingState.ts`
- `web/lib/email/templates/*.ts`
- All consumers of legacy formatting

### Documentation
- `web/lib/FORMATTING_MIGRATION.md`

## Estimated Effort

| Phase | Time |
|-------|------|
| Phase 1: Audit | 30 min |
| Phase 2: Update consumers | 2-3 hours |
| Phase 3: Remove legacy | 30 min |
| Phase 4: Testing | 1 hour |
| Phase 5: Documentation | 15 min |
| **Total** | **4-5 hours** |

## Risk Assessment

**Low Risk** - Well-documented migration path already exists.

### Mitigation
- Keep compatibility shim until all consumers updated
- Run full test suite after each phase
- Can be done incrementally across multiple PRs

## Dependencies

- None - migration path already documented

---
*Created: January 2026*
*Source: Ralph refactoring analysis*
*Reference: web/lib/FORMATTING_MIGRATION.md*
