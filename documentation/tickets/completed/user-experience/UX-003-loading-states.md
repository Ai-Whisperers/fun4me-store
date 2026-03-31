# UX-003: Loading States & Skeletons

## Priority: P2
## Category: User Experience
## Status: Completed
## Epic: [EPIC-16: User Experience](../../epics/EPIC-16-user-experience.md)

## Description
Implement consistent loading states and skeleton screens throughout the application to improve perceived performance and user experience.

## Implementation Summary

### What Was Found (Pre-existing)

The codebase already had an extensive skeleton component library at `components/ui/skeleton.tsx`:

**Base Skeleton Component:**
- `Skeleton` - Base with variants (`default`, `circular`, `rounded`) and animations (`pulse`, `shimmer`, `none`)

**Pre-built Skeleton Components:**
- `SkeletonText` - Multi-line text placeholder
- `SkeletonCard` - Generic card with avatar and text
- `SkeletonProductCard` - E-commerce product card
- `SkeletonPetCard` - Pet profile card
- `SkeletonTable` - Dynamic table with configurable rows/columns
- `SkeletonStatCard` - Dashboard stat card
- `SkeletonAppointmentCard` - Appointment list item
- `SkeletonInvoiceRow` - Invoice list item
- `SkeletonAvatar` - Sized avatar placeholder
- `SkeletonButton` - Button placeholder
- `SkeletonDashboard` - Full dashboard layout skeleton
- `SkeletonForm` - Form with configurable fields
- `SkeletonList` - Generic list items

**Button Loading State:**
- `Button` component already supports `isLoading` and `loadingLabel` props
- `LoadingButton` convenience wrapper available
- Proper accessibility with `aria-busy` and `aria-live`

**Loading.tsx Files:**
- 41 existing `loading.tsx` files across routes

### What Was Added

1. **Exported All Skeleton Variants in index.ts**
   - All 14 skeleton components now exported from `@/components/ui`

2. **Shimmer Animation in Tailwind**
   - Added `shimmer` keyframes and animation to `tailwind.config.js`
   - Added `indeterminate` animation for progress bars

3. **Progress Component Library** (`components/ui/progress.tsx`)
   - `Progress` - Linear progress bar with variants (default, success, warning, error)
   - `CircularProgress` - Circular progress/spinner with percentage display
   - `ProgressOverlay` - Full-screen or container progress overlay
   - All components support determinate and indeterminate modes

4. **Enhanced Loading.tsx Files**
   - Updated `dashboard/loading.tsx` to use `SkeletonDashboard`
   - Updated `portal/loading.tsx` to use `SkeletonCard`
   - Added `app/[clinic]/loading.tsx` for main clinic pages

5. **Progress Components Exported**
   - `Progress`, `CircularProgress`, `ProgressOverlay` now in `@/components/ui`
   - `ProgressIndicator`, `DotProgress` from progress-stepper now exported

## Files Changed

### Modified
- `components/ui/index.ts` - Added all skeleton and progress exports
- `tailwind.config.js` - Added shimmer and indeterminate animations
- `app/[clinic]/dashboard/loading.tsx` - Use SkeletonDashboard
- `app/[clinic]/portal/loading.tsx` - Use SkeletonCard

### Created
- `components/ui/progress.tsx` - Progress, CircularProgress, ProgressOverlay
- `app/[clinic]/loading.tsx` - Main clinic page loading state

## Acceptance Criteria

- [x] Skeleton component library
- [x] Page-specific loading states
- [x] React Suspense integration (41 loading.tsx files)
- [x] Button loading states
- [x] Progress indicators
- [x] No flash of empty content

## Skeleton Inventory

- [x] Pet card skeleton (`SkeletonPetCard`)
- [x] Appointment card skeleton (`SkeletonAppointmentCard`)
- [x] Product card skeleton (`SkeletonProductCard`)
- [x] Table skeleton (`SkeletonTable`)
- [x] Form skeleton (`SkeletonForm`)
- [x] Dashboard stats skeleton (`SkeletonStatCard`)
- [x] Full dashboard skeleton (`SkeletonDashboard`)
- [x] Invoice row skeleton (`SkeletonInvoiceRow`)
- [x] List skeleton (`SkeletonList`)

## Usage Examples

### Skeleton Components
```tsx
import { Skeleton, SkeletonPetCard, SkeletonTable } from '@/components/ui'

// Base skeleton
<Skeleton className="h-8 w-48" />

// Pet card skeleton
<SkeletonPetCard />

// Table with 5 rows, 4 columns
<SkeletonTable rows={5} columns={4} />

// Full dashboard loading
<SkeletonDashboard />
```

### Progress Components
```tsx
import { Progress, CircularProgress, ProgressOverlay } from '@/components/ui'

// Linear progress bar
<Progress value={75} label="Uploading..." showPercentage />

// Circular progress
<CircularProgress value={60} size={48} showPercentage />

// Indeterminate spinner
<CircularProgress indeterminate />

// Loading overlay
<ProgressOverlay
  isVisible={isUploading}
  progress={uploadProgress}
  message="Uploading files..."
/>
```

### Button Loading
```tsx
import { Button, LoadingButton } from '@/components/ui'

// Using Button directly
<Button isLoading={isSubmitting} loadingLabel="Guardando...">
  Guardar
</Button>

// Using LoadingButton wrapper
<LoadingButton isLoading={isSubmitting} loadingText="Guardando...">
  Guardar
</LoadingButton>
```

## Estimated Effort
- Original: 8 hours
- Actual: ~2 hours (much was already implemented)

---
*Completed: January 2026*
