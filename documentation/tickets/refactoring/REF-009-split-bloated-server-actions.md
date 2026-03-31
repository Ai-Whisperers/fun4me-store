# REF-009: Split Bloated Server Actions into Modular Files

## Summary

**Priority**: P0 - Critical  
**Effort**: 12-16 hours (2-3 days)  
**Epic**: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)  
**Type**: Refactoring  
**Dependencies**: None  
**Source**: critique/01-architecture-roast.md (ARCH-001)

## Problem Statement

Two server action files have grown to monolithic sizes, violating single responsibility and causing maintainability issues:

- `web/app/actions/invoices.ts` — **27KB (~800 lines)**
- `web/app/actions/appointments.ts` — **22KB (~650 lines)**

These "God Object" files handle everything from creation to payment to refunds in a single file.

### Impact

| Issue | Impact |
|-------|--------|
| **Testing** | Impossible to test individual operations in isolation |
| **Bundle Size** | Entire file loads for any operation (no tree-shaking) |
| **Merge Conflicts** | Multiple devs touching different operations cause conflicts |
| **Cognitive Load** | Developers must understand 800+ lines to modify one function |
| **Type Safety** | Harder to maintain focused types across sprawling file |

## Current State

```
web/app/actions/
├── invoices.ts          # 27KB - handles create, update, pay, refund, send, void
└── appointments.ts      # 22KB - handles request, schedule, update, check-in, complete, cancel
```

**Functions in invoices.ts** (example):
- `createInvoice` (~100 lines)
- `updateInvoice` (~80 lines)
- `processPayment` (~120 lines)
- `processRefund` (~100 lines)
- `sendInvoice` (~80 lines)
- `voidInvoice` (~60 lines)
- Plus shared helpers and types (~260 lines)

## Proposed Solution

### New Structure

```
web/app/actions/invoices/
├── create.ts           # ~100 lines - invoice creation
├── update.ts           # ~80 lines - invoice updates
├── payment.ts          # ~120 lines - payment processing
├── refund.ts           # ~100 lines - refund processing
├── send.ts             # ~80 lines - email delivery
├── void.ts             # ~60 lines - void operations
├── types.ts            # ~50 lines - shared types
├── helpers.ts          # ~50 lines - shared utilities
└── index.ts            # ~20 lines - re-exports

web/app/actions/appointments/
├── request.ts          # ~100 lines - booking requests
├── schedule.ts         # ~120 lines - scheduling
├── update.ts           # ~80 lines - updates
├── check-in.ts         # ~80 lines - check-in flow
├── complete.ts         # ~100 lines - completion flow
├── cancel.ts           # ~90 lines - cancellation + waitlist
├── types.ts            # ~40 lines - shared types
├── helpers.ts          # ~60 lines - shared utilities
└── index.ts            # ~20 lines - re-exports
```

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **File Size** | 27KB single file | 10 files, max 120 lines each |
| **Bundle Size** | 27KB loads for any action | Only needed file loads (~2-4KB) |
| **Testing** | Monolith with 800+ lines | Isolated test per operation |
| **Conflicts** | High (single file) | Low (multiple files) |
| **Discoverability** | Find function in 800 lines | File name = functionality |

## Implementation Steps

### Phase 1: Invoices Module (6-8 hours)

1. **Create directory structure**
   ```bash
   mkdir -p web/app/actions/invoices
   ```

2. **Extract shared types** (`types.ts`)
   ```typescript
   // web/app/actions/invoices/types.ts
   export interface InvoiceCreateInput {
     tenant_id: string
     customer_id: string
     items: InvoiceItem[]
     // ...
   }

   export type InvoiceActionResult = ActionResult<Invoice>
   ```

3. **Extract shared helpers** (`helpers.ts`)
   ```typescript
   // web/app/actions/invoices/helpers.ts
   export function calculateInvoiceTotal(items: InvoiceItem[]): number {
     return items.reduce((sum, item) => sum + item.amount, 0)
   }

   export function validateInvoiceItems(items: InvoiceItem[]): ValidationResult {
     // Shared validation logic
   }
   ```

4. **Split functions into files**
   - Move `createInvoice` → `create.ts`
   - Move `updateInvoice` → `update.ts`
   - Move `processPayment` → `payment.ts`
   - Move `processRefund` → `refund.ts`
   - Move `sendInvoice` → `send.ts`
   - Move `voidInvoice` → `void.ts`

5. **Create barrel export** (`index.ts`)
   ```typescript
   // web/app/actions/invoices/index.ts
   export { createInvoice } from './create'
   export { updateInvoice } from './update'
   export { processPayment } from './payment'
   export { processRefund } from './refund'
   export { sendInvoice } from './send'
   export { voidInvoice } from './void'
   
   export type * from './types'
   ```

6. **Update imports across codebase**
   ```typescript
   // Before
   import { createInvoice, processPayment } from '@/app/actions/invoices'
   
   // After (same import path, different source)
   import { createInvoice, processPayment } from '@/app/actions/invoices'
   ```

7. **Delete original file**
   ```bash
   git rm web/app/actions/invoices.ts
   ```

8. **Run tests to verify**
   ```bash
   npm run test:unit -- actions/invoices
   npm run type-check
   ```

### Phase 2: Appointments Module (6-8 hours)

Repeat steps 1-8 for `appointments.ts` following same pattern.

## Acceptance Criteria

**Invoices Module:**
- [ ] `invoices/` directory created with 9 files (6 operations + types + helpers + index)
- [ ] Each operation file is < 150 lines
- [ ] Shared types extracted to `types.ts`
- [ ] Shared helpers extracted to `helpers.ts`
- [ ] Barrel export maintains same public API
- [ ] All imports updated (search for `from '@/app/actions/invoices'`)
- [ ] Original `invoices.ts` deleted
- [ ] All existing tests pass unchanged
- [ ] TypeScript build succeeds with no errors
- [ ] Bundle analyzer shows reduced initial load

**Appointments Module:**
- [ ] `appointments/` directory created with 9 files
- [ ] Each operation file is < 150 lines
- [ ] Same quality criteria as Invoices
- [ ] All existing tests pass
- [ ] TypeScript build succeeds

**Quality Gates:**
- [ ] No `any` types introduced during refactor
- [ ] No logic changes (purely structural refactor)
- [ ] All error handling preserved
- [ ] All validation logic preserved
- [ ] Spanish error messages unchanged

## Files to Create/Modify

### New Files (Invoices)
- `web/app/actions/invoices/create.ts`
- `web/app/actions/invoices/update.ts`
- `web/app/actions/invoices/payment.ts`
- `web/app/actions/invoices/refund.ts`
- `web/app/actions/invoices/send.ts`
- `web/app/actions/invoices/void.ts`
- `web/app/actions/invoices/types.ts`
- `web/app/actions/invoices/helpers.ts`
- `web/app/actions/invoices/index.ts`

### New Files (Appointments)
- `web/app/actions/appointments/request.ts`
- `web/app/actions/appointments/schedule.ts`
- `web/app/actions/appointments/update.ts`
- `web/app/actions/appointments/check-in.ts`
- `web/app/actions/appointments/complete.ts`
- `web/app/actions/appointments/cancel.ts`
- `web/app/actions/appointments/types.ts`
- `web/app/actions/appointments/helpers.ts`
- `web/app/actions/appointments/index.ts`

### Modified Files
- All files importing from `@/app/actions/invoices` (search codebase)
- All files importing from `@/app/actions/appointments` (search codebase)

### Deleted Files
- `web/app/actions/invoices.ts`
- `web/app/actions/appointments.ts`

## Verification

```bash
# Before starting - count imports
rg "from '@/app/actions/invoices'" --count-matches
rg "from '@/app/actions/appointments'" --count-matches

# After refactor - verify no imports changed
rg "from '@/app/actions/invoices'" --count-matches  # Same count
rg "from '@/app/actions/appointments'" --count-matches  # Same count

# Verify bundle size reduction
npm run build
# Check .next/analyze for actions/invoices.js size reduction

# Run all tests
npm run test
npm run type-check
npm run lint
```

## Migration Notes

### Import Compatibility

The barrel export (`index.ts`) maintains 100% API compatibility:

```typescript
// This import works EXACTLY the same before and after
import { createInvoice, processPayment } from '@/app/actions/invoices'

// Before: resolves to web/app/actions/invoices.ts
// After: resolves to web/app/actions/invoices/index.ts
```

### No Breaking Changes

- Public API unchanged
- Function signatures unchanged
- Error messages unchanged
- Return types unchanged

### Gradual Rollout

Can be done incrementally:
1. Refactor `invoices` module
2. Test thoroughly
3. Deploy to staging
4. Refactor `appointments` module
5. Deploy both to production

## Related Issues

- Source: critique/01-architecture-roast.md (ARCH-001)
- Related: TECH-001 (Component Organization)
- Related: REF-004 (Barrel Exports)

## Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Initial JS Load** (invoices) | 27KB | ~2-4KB per action | **85-90% reduction** |
| **Time to Interactive** | +120ms | +20ms | **100ms faster** |
| **Bundle Tree-Shaking** | None | Full | ✅ |
| **Dev Hot Reload** | 800 lines recompile | 100-150 lines | **5-8x faster** |

---

**Created**: 2026-01-19  
**Status**: Not Started  
**Estimated Effort**: 12-16 hours  
**Priority**: P0 - Critical (reduces bundle size, improves DX)
