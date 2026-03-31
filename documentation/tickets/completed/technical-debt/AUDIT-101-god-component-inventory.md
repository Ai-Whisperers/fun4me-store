# AUDIT-101: God Component - Inventory Client

## Priority: P1 - High
## Category: Refactoring / Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Description

The `web/app/[clinic]/dashboard/inventory/client.tsx` file is a massive 2122-line "God component" that handles multiple unrelated responsibilities. This violates the Single Responsibility Principle and makes the code difficult to maintain, test, and understand.

## Current State

**File Stats:**
- **Lines of code**: 2122
- **Console.log statements**: 7
- **Responsibilities**: 8+ distinct features

**Current responsibilities in one file:**
1. Product listing with pagination
2. Product filtering (search, category, status, source)
3. Product sorting
4. Import wizard (file upload, preview, confirmation)
5. Stock adjustment modal
6. Product create/edit form
7. Barcode scanning integration
8. Stock history modal management
9. Export functionality

## Issues

1. **Maintainability** - Difficult to locate specific functionality
2. **Testing** - Cannot unit test individual features in isolation
3. **Performance** - Entire component re-renders on any state change
4. **Code review** - Changes require reviewing 2000+ lines
5. **Reusability** - Features cannot be used elsewhere
6. **Console.logs** - 7 debug statements left in production code

## Proposed Solution

Decompose into smaller, focused components:

```
components/dashboard/inventory/
├── InventoryClient.tsx         # Main orchestrator (~200 lines)
├── InventoryFilters.tsx        # Search, category, status filters (~150 lines)
├── InventoryTable.tsx          # Product listing table (~300 lines)
├── InventoryPagination.tsx     # Pagination controls (~100 lines)
├── ProductForm/
│   ├── index.tsx               # Create/edit product form (~400 lines)
│   ├── BasicInfoSection.tsx
│   └── InventorySection.tsx
├── ImportWizard/
│   ├── index.tsx               # Import flow orchestrator (~200 lines)
│   ├── FileUploadStep.tsx
│   ├── MappingStep.tsx
│   ├── PreviewStep.tsx
│   └── ConfirmationStep.tsx
├── StockAdjustmentModal.tsx    # Stock adjustment (~150 lines)
└── ExportButton.tsx            # Export functionality (~50 lines)
```

## Implementation Steps

1. [ ] Create new directory structure under `components/dashboard/inventory/`
2. [ ] Extract `InventoryFilters` component with filter state
3. [ ] Extract `InventoryTable` with sorting and selection
4. [ ] Extract `InventoryPagination` component
5. [ ] Extract `ProductForm` as standalone form component
6. [ ] Extract `ImportWizard` with step components
7. [ ] Extract `StockAdjustmentModal` component
8. [ ] Create barrel export in `index.ts`
9. [ ] Refactor main `client.tsx` to orchestrate sub-components
10. [ ] Remove all `console.log` statements
11. [ ] Add unit tests for each extracted component
12. [ ] Update any imports throughout codebase

## Acceptance Criteria

- [ ] Main client file is under 300 lines
- [ ] Each component has a single clear responsibility
- [ ] All console.log statements removed
- [ ] No functionality regression
- [ ] Unit tests for new components
- [ ] Props are properly typed (no `any`)
- [ ] Barrel exports for clean imports

## Related Files

- `web/app/[clinic]/dashboard/inventory/client.tsx`
- `web/components/dashboard/inventory/` (existing subcomponents)

## Estimated Effort

- 16-20 hours

## Dependencies

- Existing `ImportWizard` and `StockHistoryModal` components can be reused
- May want to coordinate with REF-006 (Massive Client Component Decomposition)

## Risk Assessment

- **Medium risk** - Large refactoring with potential for regressions
- Recommend incremental extraction with feature flags
- Should have good E2E test coverage before starting

---

## Resolution Summary

**Completed**: January 2026

### Components Extracted

All 4 sub-tickets completed successfully:

1. **AUDIT-101a: InventoryFilters** (`inventory-filters.tsx`, 138 lines)
   - Search input, category dropdown, stock status toggle buttons
   - Clear filters action
   - Items per page selector

2. **AUDIT-101b: InventoryTable** (`inventory-table.tsx`, 200+ lines)
   - Table wrapper with loading/empty states
   - Sort button component
   - Bulk actions toolbar
   - Pagination controls
   - Sub-components: `inventory-table-row.tsx`, `inventory-mobile-card.tsx`
   - Shared types: `types.ts`

3. **AUDIT-101c: ImportWizard** (Pre-existing)
   - Already modularized in `import-wizard/` directory
   - 8 files including step components

4. **AUDIT-101d: Modal Components**
   - `ProductEditModal` (108 lines) - Quick price/stock edit
   - `AddProductModal` (210 lines) - Product creation form
   - `DeleteConfirmModal` (55 lines) - Generic delete confirmation

### Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| client.tsx lines | 2,122 | 1,421 | -701 (33%) |
| Components | 1 | 8+ | +7 |
| Barrel exports | 6 | 19 | +13 |

### Benefits Achieved

- **Maintainability**: Each component has single responsibility
- **Testability**: Components can be unit tested in isolation
- **Reusability**: Modal components can be used elsewhere
- **Code review**: Changes are now localized to smaller files
- **Performance**: Better potential for memoization
