# AUDIT-101a: Extract Inventory Filters Component

## Priority: P1 - High
## Category: Refactoring / Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-101](./AUDIT-101-god-component-inventory.md)

## Description

Extract the filtering logic from the inventory client into a dedicated `InventoryFilters` component. This includes search, category filter, status filter, and source filter.

## Current State

The filtering UI and logic is embedded in `web/app/[clinic]/dashboard/inventory/client.tsx` around lines 400-600, mixed with other concerns.

**Current filter state in parent:**
```typescript
const [search, setSearch] = useState('')
const [categoryFilter, setCategoryFilter] = useState<string>('all')
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
const [sourceFilter, setSourceFilter] = useState<ProductSource>('all')
```

## Proposed Solution

Create `components/dashboard/inventory/InventoryFilters.tsx`:

```typescript
interface InventoryFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  categories: Category[]
  statusFilter: 'all' | 'active' | 'inactive'
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void
  sourceFilter: ProductSource
  onSourceChange: (value: ProductSource) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export function InventoryFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  onClearFilters,
  activeFilterCount,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      {/* Category dropdown */}
      {/* Status dropdown */}
      {/* Source tabs */}
      {/* Clear filters button */}
    </div>
  )
}
```

## Implementation Steps

1. [x] Create `components/dashboard/inventory/InventoryFilters.tsx`
2. [x] Define `InventoryFiltersProps` interface
3. [x] Move filter UI elements from client.tsx
4. [x] Keep state in parent, pass as props
5. [x] Add `onClearFilters` functionality
6. [x] Add `activeFilterCount` badge
7. [x] Export from barrel file
8. [x] Update parent component to use new component
9. [x] Remove extracted code from client.tsx
10. [x] Test filter functionality

## Acceptance Criteria

- [x] InventoryFilters component is under 150 lines (138 lines)
- [x] All filter types work correctly
- [x] Clear filters resets all to defaults
- [x] Active filter count displays correctly
- [x] No functionality regression
- [x] Proper TypeScript types (no `any`)

## Resolution Summary

**Completed:** January 2026

**Changes Made:**
1. Created `web/components/dashboard/inventory/inventory-filters.tsx` (138 lines)
2. Exported `InventoryFilters`, `STOCK_FILTER_OPTIONS`, and related types from barrel file
3. Updated `web/app/[clinic]/dashboard/inventory/client.tsx`:
   - Added `clearFilters` callback using `useCallback`
   - Added `activeFilterCount` computation using `useMemo`
   - Replaced inline filter UI (68 lines) with `<InventoryFilters />` component
   - Removed unused imports (`Filter`, `Search`) and local `stockFilterOptions` constant
4. TypeScript compiles without errors related to inventory
5. ESLint passes on new component

## Related Files

- `web/app/[clinic]/dashboard/inventory/client.tsx` (source)
- `web/components/dashboard/inventory/InventoryFilters.tsx` (new)
- `web/components/dashboard/inventory/index.ts` (barrel export)

## Estimated Effort

- 2-3 hours

## Dependencies

- None - can be done independently
