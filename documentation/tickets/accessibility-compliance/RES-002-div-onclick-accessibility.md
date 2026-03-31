# RES-002: Replace div onClick with Semantic Buttons

## Priority: P3 - Low
## Category: Research / Accessibility
## Status: Not Started
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)
## Affected Areas: Components with interactive elements

## Problem

**17 instances** across **16 files** use `<div onClick>` instead of semantic `<button>` elements. This creates accessibility issues:

1. **Not keyboard accessible**: Users can't Tab to or press Enter on divs
2. **No role announcement**: Screen readers don't announce as interactive
3. **Missing focus indicators**: No default focus styling
4. **No disabled state**: Can't communicate unavailability

## Current State

### Files with `<div onClick>` (16 files)

| File | Context |
|------|---------|
| `components/calendar/quick-add-modal.tsx` | Calendar slot selection |
| `components/calendar/event-detail-modal.tsx` | Event interaction |
| `components/ui/language-selector.tsx` | Language toggle |
| `components/about/facilities-gallery.tsx` | Image gallery |
| `components/ui/confirm-dialog.tsx` | Dialog actions |
| `components/dashboard/inventory/stock-history-modal.tsx` | History item |
| `components/invoices/pet-selector.tsx` | Pet card selection |
| `components/store/filters/filter-drawer.tsx` | Filter toggle |
| `components/store/quick-view-modal/index.tsx` | Quick view trigger |
| `components/store/product-card.tsx` | Product interaction |
| `app/[clinic]/dashboard/admin/catalog-approvals/client.tsx` | Approval actions (2x) |
| `app/[clinic]/dashboard/campaigns/client.tsx` | Campaign selection |
| `app/[clinic]/dashboard/coupons/client.tsx` | Coupon selection |
| `app/platform/clinics/client.tsx` | Clinic selection |
| `app/[clinic]/dashboard/orders/client.tsx` | Order selection |
| `app/[clinic]/portal/messages/[id]/page.tsx` | Message interaction |

### Example Anti-Pattern

```tsx
// components/store/product-card.tsx
<div
  onClick={() => setShowQuickView(true)}
  className="cursor-pointer hover:bg-gray-50"
>
  Quick View
</div>
```

## Proposed Solution

### 1. Use Semantic Button Elements

```tsx
// Before
<div onClick={handleClick} className="cursor-pointer">
  Click me
</div>

// After
<button
  type="button"
  onClick={handleClick}
  className="text-left" // Reset button styles if needed
>
  Click me
</button>
```

### 2. For Card-Like Interactive Elements

```tsx
// Before
<div onClick={() => selectPet(pet.id)} className="p-4 border rounded">
  <h3>{pet.name}</h3>
</div>

// After - Option A: Button wrapper
<button
  type="button"
  onClick={() => selectPet(pet.id)}
  className="w-full text-left p-4 border rounded focus:ring-2"
>
  <h3>{pet.name}</h3>
</button>

// After - Option B: With ARIA role (if button doesn't fit layout)
<div
  role="button"
  tabIndex={0}
  onClick={() => selectPet(pet.id)}
  onKeyDown={(e) => e.key === 'Enter' && selectPet(pet.id)}
  className="p-4 border rounded focus:ring-2"
>
  <h3>{pet.name}</h3>
</div>
```

### 3. Create Reusable Interactive Card Component

```tsx
// components/ui/interactive-card.tsx
interface InteractiveCardProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function InteractiveCard({
  onClick,
  children,
  className,
  disabled
}: InteractiveCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left focus:outline-none focus:ring-2 focus:ring-[var(--primary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
```

## Implementation Steps

1. [ ] Create `InteractiveCard` component
2. [ ] Update `components/store/product-card.tsx`
3. [ ] Update `components/invoices/pet-selector.tsx`
4. [ ] Update calendar components (2 files)
5. [ ] Update dashboard selection components (5 files)
6. [ ] Update remaining components (7 files)
7. [ ] Add keyboard navigation tests
8. [ ] Verify with screen reader

## Acceptance Criteria

- [ ] Zero `<div onClick>` without proper ARIA attributes
- [ ] All interactive elements keyboard accessible (Tab + Enter)
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader announces elements as interactive
- [ ] No regressions in click functionality

## Testing Checklist

- [ ] Tab through page hits all interactive elements
- [ ] Enter/Space activates elements
- [ ] VoiceOver/NVDA announces elements correctly
- [ ] Focus ring visible on all elements
- [ ] Disabled states work correctly

## Estimated Effort

| Task | Hours |
|------|-------|
| Create InteractiveCard component | 0.5h |
| Update 16 files | 2h |
| Testing | 1h |
| **Total** | **~3.5 hours** |

## Risk Assessment

**Low Risk** - Simple HTML semantic change.

## Related Tickets

- [A11Y-001](./A11Y-001-wcag-audit.md) - WCAG 2.1 AA Audit
- [A11Y-002](./A11Y-002-keyboard-navigation.md) - Keyboard Navigation

---
*Created: January 2026*
*Source: Ralph Research Analysis*
*Found: 17 instances across 16 files*
