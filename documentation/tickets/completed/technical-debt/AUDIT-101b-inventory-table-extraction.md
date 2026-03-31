# AUDIT-101b: Extract Inventory Table Component

## Priority: P1 - High
## Category: Refactoring / Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-101](./AUDIT-101-god-component-inventory.md)

## Description

Extract the product listing table from the inventory client into a dedicated `InventoryTable` component. This includes the table header, rows, sorting controls, and row actions.

## Current State

The table rendering is embedded in `web/app/[clinic]/dashboard/inventory/client.tsx` around lines 800-1200, with sorting logic scattered throughout.

**Current sorting state:**
```typescript
const [sortField, setSortField] = useState<string>('name')
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
```

## Proposed Solution

Create `components/dashboard/inventory/InventoryTable.tsx`:

```typescript
interface InventoryTableProps {
  products: Product[]
  isLoading: boolean
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onAdjustStock: (product: Product) => void
  onViewHistory: (product: Product) => void
  onDuplicate: (product: Product) => void
  selectedProducts: Set<string>
  onSelectionChange: (productId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
}

export function InventoryTable({
  products,
  isLoading,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onAdjustStock,
  onViewHistory,
  onDuplicate,
  selectedProducts,
  onSelectionChange,
  onSelectAll,
}: InventoryTableProps) {
  // Table header with sort controls
  // Table body with product rows
  // Row actions menu
  // Selection checkboxes
  // Loading skeleton
}
```

### Sub-components to extract:

1. **InventoryTableHeader** - Column headers with sort controls
2. **InventoryTableRow** - Individual product row
3. **InventoryRowActions** - Dropdown menu with actions
4. **InventoryTableSkeleton** - Loading state

## Implementation Steps

1. [ ] Create `components/dashboard/inventory/InventoryTable.tsx`
2. [ ] Define `InventoryTableProps` interface
3. [ ] Extract `Product` type to shared types file
4. [ ] Create `InventoryTableHeader` sub-component
5. [ ] Create `InventoryTableRow` sub-component
6. [ ] Create `InventoryRowActions` dropdown
7. [ ] Create `InventoryTableSkeleton` for loading
8. [ ] Implement sorting via props
9. [ ] Implement selection via props
10. [ ] Export from barrel file
11. [ ] Update parent to use new component
12. [ ] Test all table functionality

## Acceptance Criteria

- [ ] InventoryTable component is under 300 lines
- [ ] Sub-components are under 100 lines each
- [ ] Sorting works on all columns
- [ ] Row selection works correctly
- [ ] All row actions function properly
- [ ] Loading skeleton displays during fetch
- [ ] No functionality regression
- [ ] Proper TypeScript types

## Related Files

- `web/app/[clinic]/dashboard/inventory/client.tsx` (source)
- `web/components/dashboard/inventory/InventoryTable.tsx` (new)
- `web/components/dashboard/inventory/InventoryTableRow.tsx` (new)
- `web/components/dashboard/inventory/InventoryRowActions.tsx` (new)

## Estimated Effort

- 4-5 hours

## Dependencies

- AUDIT-101a (filters) recommended first but not required

---

## Resolution Summary

**Completed**: January 2026

### Changes Made

1. **Created shared types** (`types.ts`):
   - `InventoryProduct` interface with full product shape
   - `SortField` and `SortDirection` types
   - `PaginationInfo` interface

2. **Created InventoryTable component** (`inventory-table.tsx`):
   - Main table wrapper with loading/empty states
   - Internal `SortButton` component for column headers
   - Bulk action toolbar (export, clear selection)
   - Pagination controls
   - Props-based controlled component design

3. **Created InventoryTableRow component** (`inventory-table-row.tsx`):
   - Desktop table row with product image, details, pricing
   - Source badge (catalog/own)
   - Action buttons (history, edit, delete)
   - Selection checkbox

4. **Created InventoryMobileCard component** (`inventory-mobile-card.tsx`):
   - Mobile-optimized card layout
   - Same information as desktop row
   - Touch-friendly action buttons

5. **Updated barrel exports** (`index.ts`):
   - Export all new components and types
   - Re-exports for clean imports

6. **Updated client.tsx**:
   - Replaced ~370 lines of inline table code with `<InventoryTable />`
   - Removed unused imports (ArrowUpDown, ArrowUp, ArrowDown, Edit2, ChevronLeft, ChevronRight, History, Image)
   - Removed local SortButton component
   - Removed local SortField/SortDirection type definitions
   - Removed unused toggleSelectAll function

### Metrics

- **client.tsx reduced from ~2000 to 1701 lines** (-300 lines)
- **New components**: 4 files (~450 lines total, well-organized)
- **TypeScript**: Clean compilation
- **ESLint**: 7 warnings (all pre-existing, not introduced by changes)
