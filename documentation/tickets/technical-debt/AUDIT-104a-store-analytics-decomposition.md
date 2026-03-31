# AUDIT-104a: Store Analytics Page Decomposition

## Priority: P2 - Medium
## Category: Refactoring / Technical Debt
## Status: Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-104](./AUDIT-104-large-component-decomposition.md)
## Completed: January 2026

## Description

Decompose the store analytics page (1451 lines) into smaller, focused chart components. This page handles multiple analytics visualizations that should be separate components.

## Implementation Summary

Successfully decomposed the 1451-line store analytics page into a modular component structure. The page now imports a single `StoreAnalyticsClient` component that orchestrates all functionality.

### Files Created

```
components/analytics/store/
├── index.ts                       # Barrel exports (~40 lines)
├── types.ts                       # Shared types and constants (~241 lines)
├── StoreAnalyticsClient.tsx       # Main orchestrator (~100 lines)
├── PeriodSelector.tsx             # Period selector component (~50 lines)
├── AnalyticsTabNav.tsx            # Tab navigation component (~60 lines)
├── hooks/
│   ├── index.ts                   # Hook exports
│   └── use-store-analytics.ts     # Data fetching hook (~95 lines)
├── tabs/
│   ├── index.ts                   # Tab exports
│   ├── SalesTab.tsx               # Sales analytics (~360 lines)
│   ├── MarginsTab.tsx             # Margin analytics (~275 lines)
│   └── InventoryTab.tsx           # Inventory analytics (~280 lines)
└── utils/
    └── format.ts                  # Formatting utilities (~35 lines)
```

### Key Improvements

1. **Page reduced from 1451 lines to 23 lines** - Now a thin wrapper importing the client component
2. **Type definitions centralized** - All interfaces and constants in `types.ts`
3. **Data fetching separated** - `useStoreAnalytics` hook handles all API calls
4. **Tab content modularized** - Each tab is its own component with internal sub-components
5. **Reusable utilities** - Currency and date formatting in dedicated utils file
6. **Clean exports** - Barrel file enables simple imports: `import { StoreAnalyticsClient } from '@/components/analytics/store'`

### Component Breakdown

| Component | Purpose | Lines |
|-----------|---------|-------|
| `StoreAnalyticsClient` | Orchestrates state, data fetching, tabs | ~100 |
| `SalesTab` | Sales summary, charts, top products, coupons | ~360 |
| `MarginsTab` | Profit margins, category analysis, low-margin products | ~275 |
| `InventoryTab` | Stock levels, turnover, reorder suggestions | ~280 |
| `PeriodSelector` | 7/30/90 day period selection | ~50 |
| `AnalyticsTabNav` | Tab navigation between analytics views | ~60 |
| `useStoreAnalytics` | Data fetching with parallel API calls | ~95 |

### Acceptance Criteria Met

- [x] Main page file under 100 lines (23 lines)
- [x] Client orchestrator under 200 lines (~100 lines)
- [x] Tab components organized by analytics type
- [x] Data fetching centralized in hook
- [x] All charts render correctly (type-checked)
- [x] Date range filtering works (preserved)
- [x] Proper TypeScript types
- [x] Clean barrel exports for reusability

## Original State

**File**: `web/app/[clinic]/dashboard/analytics/store/page.tsx`
**Lines**: 1451
**Issues**:
- Multiple chart types in single file
- Data fetching mixed with presentation
- Types defined inline

## Related Files

- `web/app/[clinic]/dashboard/analytics/store/page.tsx` - Updated to use client component
- `web/components/analytics/store/` - New component directory

## Estimated vs Actual Effort

- Estimated: 8-10 hours
- Actual: ~4 hours (simpler grouping by tab vs individual charts)
