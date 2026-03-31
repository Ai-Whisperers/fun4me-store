# REF-006: Decompose Massive Client Components

## Priority: P2 - Medium
## Category: Refactoring
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Affected Areas: web/app/[clinic]/dashboard/*, web/app/[clinic]/portal/*

## Description

Multiple client-side components have grown beyond 900+ lines, creating maintenance challenges, poor testability, and increased cognitive load. These "god components" handle too many responsibilities including UI rendering, state management, API calls, and business logic.

## Final Progress Summary

| File | Original Lines | Final Lines | Status |
|------|----------------|-------------|--------|
| `dashboard/analytics/store/page.tsx` | 1451 | 23 | ✅ Decomposed (AUDIT-104a) |
| `portal/inventory/client.tsx` | 1242 | 21 | ✅ Decomposed (AUDIT-104b) |
| `dashboard/consents/templates/page.tsx` | 1171 | 15 | ✅ Decomposed (AUDIT-104c) |
| `dashboard/inventory/client.tsx` | 1421 | **271** | ✅ Decomposed |
| `components/landing/roi-calculator-detailed.tsx` | 1048 | 209 | ✅ Decomposed |
| `dashboard/service-subscriptions/client.tsx` | 1034 | 166 | ✅ Decomposed |
| `dashboard/campaigns/client.tsx` | 959 | 144 | ✅ Decomposed |
| `portal/service-subscriptions/client.tsx` | 962 | 149 | ✅ Decomposed |
| `dashboard/coupons/client.tsx` | 910 | 131 | ✅ Decomposed |
| `dashboard/orders/client.tsx` | 908 | 136 | ✅ Decomposed |

**All 10 files now under 400 lines target.**

## Dashboard Inventory Decomposition Details

The largest remaining file (`dashboard/inventory/client.tsx` at 1421 lines) was decomposed into:

### Components (`app/[clinic]/dashboard/inventory/components/`)
- `InventoryHeader.tsx` - Header section with action buttons
- `SourceTabs.tsx` - Source filter tabs (all/own/catalog)
- `AlertsSection.tsx` - Low stock and expiring product alerts
- `StatsCards.tsx` - Stats display cards
- `QuickLinks.tsx` - Navigation quick links grid
- `ImportSection.tsx` - File upload area and guide
- `LegacyImportPreviewModal.tsx` - Import preview modal
- `ImportPreviewModal.tsx` - Alternative import preview component
- `index.ts` - Barrel export

### Hooks (`app/[clinic]/dashboard/inventory/hooks/`)
- `use-inventory-data.ts` - Data fetching and state management (~230 lines)
- `use-inventory-operations.ts` - CRUD operations (~200 lines)
- `use-import-preview.ts` - Import preview state management (~120 lines)
- `index.ts` - Barrel export

### Supporting Files
- `types.ts` - All TypeScript type definitions
- `constants.tsx` - Constants like `ITEMS_PER_PAGE_OPTIONS` and `sourceTabOptions`
- `utils.ts` - Utility functions like `formatPrice`

## Acceptance Criteria - All Met ✅

- [x] No client component exceeds 400 lines
- [x] Each component has single responsibility
- [x] Types in separate files
- [x] Reusable hooks for common patterns
- [x] All existing functionality preserved
- [x] Build passes successfully

## Benefits Achieved

- **Maintainability**: Each file focused on single concern
- **Testability**: Hooks and components testable in isolation
- **Reusability**: Hooks like `useInventoryData` follow established patterns
- **Performance**: Smaller components enable better tree shaking
- **Code Review**: Changes isolated to specific concerns
- **Cognitive Load**: No file over 271 lines in decomposed components

## Related Files Created/Modified

### Dashboard Inventory
- `web/app/[clinic]/dashboard/inventory/client.tsx` (1421 → 271 lines)
- `web/app/[clinic]/dashboard/inventory/types.ts` (new)
- `web/app/[clinic]/dashboard/inventory/constants.tsx` (new)
- `web/app/[clinic]/dashboard/inventory/utils.ts` (new)
- `web/app/[clinic]/dashboard/inventory/hooks/*.ts` (3 new files)
- `web/app/[clinic]/dashboard/inventory/components/*.tsx` (8 new files)

### ROI Calculator
- `web/components/landing/roi-calculator-detailed.tsx` (1048 → 209 lines)
- `web/components/landing/roi-calculator/types.ts` (new)
- `web/components/landing/roi-calculator/constants.ts` (new)
- `web/components/landing/roi-calculator/hooks/use-roi-calculator.tsx` (new)
- `web/components/landing/roi-calculator/components/*.tsx` (multiple)

### Other Decomposed Files
- `web/app/[clinic]/dashboard/service-subscriptions/` (decomposed)
- `web/app/[clinic]/dashboard/campaigns/` (decomposed)
- `web/app/[clinic]/portal/service-subscriptions/` (decomposed)
- `web/app/[clinic]/dashboard/coupons/` (decomposed)
- `web/app/[clinic]/dashboard/orders/` (decomposed)

---
*Completed: January 2026*
*Total lines reduced from ~12,000+ to ~1,500 across 10 decomposed components*
