# AUDIT-104b: Portal Inventory Client Decomposition

## Priority: P2 - Medium
## Category: Refactoring / Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-104](./AUDIT-104-large-component-decomposition.md)

## Description

Decompose the portal inventory client (1242 lines) into smaller, focused components. This is the **admin inventory management tool** for updating stock, prices, and product details via Excel import.

## Current State

**File**: `web/app/[clinic]/portal/inventory/client.tsx`
**Lines**: 1242 → **21 lines** (after decomposition)

## Actual Responsibilities (Corrected from Original Ticket)

1. Excel file import for stock updates
2. Product search and filtering
3. Category filtering
4. Stock status filtering (all, in stock, low stock, out of stock)
5. Pagination
6. Quick edit modal (price, stock, expiry, batch, location)
7. Stats cards (active products, low stock count, inventory value)
8. Low stock and expiring product alerts
9. Template download (Google Sheets, Excel)
10. Catalog export

## Final Component Structure

```
components/portal/inventory/
├── index.ts                       # Barrel exports
├── types.ts                       # All type definitions (~120 lines)
├── PortalInventoryClient.tsx      # Main orchestrator (~200 lines)
├── InventoryHeader.tsx            # Header with action buttons (~165 lines)
├── ImportSection.tsx              # Excel upload + instructions (~140 lines)
├── StockAlertsPanel.tsx           # Low stock/expiring alerts (~125 lines)
├── StatsCards.tsx                 # Stats display (~77 lines)
├── FilterBar.tsx                  # Search and filters (~105 lines)
├── ProductTable.tsx               # Product list/table (~195 lines)
├── Pagination.tsx                 # Page navigation (~88 lines)
├── ProductEditModal.tsx           # Edit modal with tabs (~250 lines)
└── hooks/
    ├── index.ts                   # Hook exports
    └── use-portal-inventory.ts    # Data fetching (~170 lines)
```

## Implementation Summary

### Phase 1: Setup ✅
1. [x] Created `components/portal/inventory/` directory
2. [x] Created `types.ts` with all type definitions and constants
3. [x] Created `usePortalInventory` hook for data fetching

### Phase 2: Extract Components ✅
4. [x] Extracted `InventoryHeader` component (header + action buttons + template dropdown)
5. [x] Extracted `ImportSection` component (upload area + instructions)
6. [x] Extracted `StockAlertsPanel` component (low stock/expiring alerts)
7. [x] Extracted `StatsCards` component (stats display)
8. [x] Extracted `FilterBar` component (search + category + stock filter)
9. [x] Extracted `ProductTable` component (mobile cards + desktop table)
10. [x] Extracted `Pagination` component
11. [x] Extracted `ProductEditModal` component (3-tab edit modal)

### Phase 3: Integration ✅
12. [x] Created `PortalInventoryClient` orchestrator
13. [x] Updated `client.tsx` to use orchestrator (21 lines)
14. [x] Created barrel exports (`index.ts`)

### Phase 4: Verification ✅
15. [x] ESLint passes (only img warnings, same as original)
16. [x] Build passes (no new errors introduced)

## Acceptance Criteria

- [x] Main client file reduced to ~21 lines (from 1242)
- [x] Each component under 250 lines
- [x] All functionality preserved (import, filter, edit, export)
- [x] Proper TypeScript types defined in `types.ts`
- [x] Barrel exports for clean imports

## Files Created

- `web/components/portal/inventory/types.ts`
- `web/components/portal/inventory/hooks/use-portal-inventory.ts`
- `web/components/portal/inventory/hooks/index.ts`
- `web/components/portal/inventory/InventoryHeader.tsx`
- `web/components/portal/inventory/ImportSection.tsx`
- `web/components/portal/inventory/StockAlertsPanel.tsx`
- `web/components/portal/inventory/StatsCards.tsx`
- `web/components/portal/inventory/FilterBar.tsx`
- `web/components/portal/inventory/ProductTable.tsx`
- `web/components/portal/inventory/Pagination.tsx`
- `web/components/portal/inventory/ProductEditModal.tsx`
- `web/components/portal/inventory/PortalInventoryClient.tsx`
- `web/components/portal/inventory/index.ts`

## Files Modified

- `web/app/[clinic]/portal/inventory/client.tsx` (reduced from 1242 to 21 lines)

## Estimated Effort

- 6-8 hours (actual: ~5 hours)

## Completed

**Date:** January 2026
**Result:** Reduced 1242-line monolithic component to 21-line wrapper using 12 focused components
