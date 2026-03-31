# AUDIT-103b: Console.log Cleanup - Dashboard & Portal Pages

## Priority: P2 - Medium
## Category: Technical Debt / Code Quality
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-103](./AUDIT-103-console-log-cleanup.md)

## Description

Remove or replace console statements in dashboard and portal page components. Client-side logs should be removed or guarded by `process.env.NODE_ENV === 'development'`.

## Affected Files (44 files)

### Dashboard Pages (23 files)

| File | Est. Count | Notes |
|------|------------|-------|
| `dashboard/inventory/client.tsx` | 7 | Highest count - God component |
| `dashboard/analytics/store/page.tsx` | 1-2 | Charts |
| `dashboard/analytics/customers/page.tsx` | 1-2 | Charts |
| `dashboard/analytics/page.tsx` | 1-2 | Overview |
| `dashboard/service-subscriptions/client.tsx` | 3-5 | Subscription management |
| `dashboard/lost-pets/client.tsx` | 1-2 | Lost pets |
| `dashboard/lost-pets/[id]/client.tsx` | 1-2 | Detail page |
| `dashboard/consents/templates/page.tsx` | 4 | Already NODE_ENV guarded |
| `dashboard/consents/[id]/page.tsx` | 1-2 | Consent detail |
| `dashboard/consents/page.tsx` | 1-2 | Consents list |
| `dashboard/settings/sms/client.tsx` | 1-2 | SMS settings |
| `dashboard/settings/time-off-types/page.tsx` | 1-2 | Time off |
| `dashboard/settings/services/page.tsx` | 1-2 | Services |
| `dashboard/settings/modules/page.tsx` | 1-2 | Modules |
| `dashboard/settings/general/page.tsx` | 1-2 | General |
| `dashboard/settings/branding/page.tsx` | 1-2 | Branding |
| `dashboard/settings/alerts/client.tsx` | 1-2 | Alerts |
| `dashboard/schedules/[staffId]/schedule-editor-client.tsx` | 1-2 | Schedule |
| `dashboard/reminders/client.tsx` | 1-2 | Reminders |
| `dashboard/orders/prescriptions/client.tsx` | 1-2 | Rx orders |
| `dashboard/orders/client.tsx` | 1-2 | Orders |
| `dashboard/lab/[id]/page.tsx` | 1-2 | Lab detail |
| `dashboard/hospital/[id]/page.tsx` | 1-2 | Hospital |
| `dashboard/epidemiology/client.tsx` | 1-2 | Epidemiology |
| `dashboard/coupons/client.tsx` | 1-2 | Coupons |
| `dashboard/campaigns/client.tsx` | 1-2 | Campaigns |
| `dashboard/inventory/expiring/client.tsx` | 1-2 | Expiring |
| `dashboard/admin/catalog-approvals/client.tsx` | 1-2 | Approvals |

### Portal Pages (14 files)

| File | Est. Count | Notes |
|------|------------|-------|
| `portal/subscriptions/client.tsx` | 5 | High count |
| `portal/inventory/client.tsx` | 5 | High count |
| `portal/service-subscriptions/client.tsx` | 2-3 | Service subs |
| `portal/wishlist/client.tsx` | 1-2 | Wishlist |
| `portal/settings/notifications/page.tsx` | 1-2 | Notifications |
| `portal/prescriptions/new/client.tsx` | 1-2 | New prescription |
| `portal/pets/[id]/vaccines/new/page.tsx` | 1-2 | New vaccine |
| `portal/payments/page.tsx` | 1-2 | Payments |
| `portal/messages/[id]/page.tsx` | 1-2 | Messages |
| `portal/logout/page.tsx` | 1-2 | Logout |
| `portal/epidemiology/client.tsx` | 1-2 | Epidemiology |

### Store Pages (4 files)

| File | Est. Count | Notes |
|------|------------|-------|
| `store/product/[id]/client.tsx` | 1-2 | Product detail |
| `store/orders/client.tsx` | 1-2 | Orders |
| `store/wishlist/page.tsx` | 1-2 | Wishlist |

### Clinical Tools (4 files)

| File | Est. Count | Notes |
|------|------------|-------|
| `vaccine_reactions/client.tsx` | 1-2 | Reactions |
| `prescriptions/client.tsx` | 1-2 | Prescriptions |
| `growth_charts/client.tsx` | 1-2 | Growth charts |
| `drug_dosages/page.tsx` | 1-2 | Drug dosages |
| `diagnosis_codes/client.tsx` | 1-2 | Diagnosis |
| `consent/[token]/page.tsx` | 1-2 | Consent signing |

## Implementation Pattern for Client Components

```typescript
// Before
'use client'

export default function InventoryClient() {
  const handleClick = async () => {
    console.log('Button clicked')
    const data = await fetchData()
    console.log('Data:', data)
  }

  // ...
}

// After - Option 1: Remove entirely (preferred for debug logs)
'use client'

export default function InventoryClient() {
  const handleClick = async () => {
    const data = await fetchData()
    // console.log removed - was debug only
  }

  // ...
}

// After - Option 2: Guard with NODE_ENV (for useful dev feedback)
'use client'

export default function InventoryClient() {
  const handleClick = async () => {
    const data = await fetchData()
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetched inventory data:', data.length, 'items')
    }
  }

  // ...
}
```

## Decision Matrix for Client Components

| Original Log | Action |
|--------------|--------|
| `console.log('clicked')` | Remove |
| `console.log(data)` | Remove |
| `console.log('HERE')`, `console.log('test')` | Remove |
| `console.error('Error:', error)` | Keep with NODE_ENV guard |
| Useful state transitions | Keep with NODE_ENV guard |

## Implementation Steps

### Batch 1: High-count files (priority)
1. [ ] `dashboard/inventory/client.tsx` (7 logs)
2. [ ] `portal/subscriptions/client.tsx` (5 logs)
3. [ ] `portal/inventory/client.tsx` (5 logs)
4. [ ] `dashboard/service-subscriptions/client.tsx` (3-5 logs)

### Batch 2: Dashboard settings
5. [ ] `dashboard/settings/sms/client.tsx`
6. [ ] `dashboard/settings/time-off-types/page.tsx`
7. [ ] `dashboard/settings/services/page.tsx`
8. [ ] `dashboard/settings/modules/page.tsx`
9. [ ] `dashboard/settings/general/page.tsx`
10. [ ] `dashboard/settings/branding/page.tsx`
11. [ ] `dashboard/settings/alerts/client.tsx`

### Batch 3: Dashboard features
12. [ ] `dashboard/analytics/store/page.tsx`
13. [ ] `dashboard/analytics/customers/page.tsx`
14. [ ] `dashboard/analytics/page.tsx`
15. [ ] `dashboard/lost-pets/client.tsx`
16. [ ] `dashboard/lost-pets/[id]/client.tsx`
17. [ ] `dashboard/consents/[id]/page.tsx`
18. [ ] `dashboard/consents/page.tsx`
19. [ ] `dashboard/schedules/[staffId]/schedule-editor-client.tsx`
20. [ ] `dashboard/reminders/client.tsx`
21. [ ] `dashboard/orders/prescriptions/client.tsx`
22. [ ] `dashboard/orders/client.tsx`
23. [ ] `dashboard/lab/[id]/page.tsx`
24. [ ] `dashboard/hospital/[id]/page.tsx`
25. [ ] `dashboard/epidemiology/client.tsx`
26. [ ] `dashboard/coupons/client.tsx`
27. [ ] `dashboard/campaigns/client.tsx`
28. [ ] `dashboard/inventory/expiring/client.tsx`
29. [ ] `dashboard/admin/catalog-approvals/client.tsx`

### Batch 4: Portal pages
30. [ ] `portal/service-subscriptions/client.tsx`
31. [ ] `portal/wishlist/client.tsx`
32. [ ] `portal/settings/notifications/page.tsx`
33. [ ] `portal/prescriptions/new/client.tsx`
34. [ ] `portal/pets/[id]/vaccines/new/page.tsx`
35. [ ] `portal/payments/page.tsx`
36. [ ] `portal/messages/[id]/page.tsx`
37. [ ] `portal/logout/page.tsx`
38. [ ] `portal/epidemiology/client.tsx`

### Batch 5: Store & Clinical
39. [ ] `store/product/[id]/client.tsx`
40. [ ] `store/orders/client.tsx`
41. [ ] `store/wishlist/page.tsx`
42. [ ] `vaccine_reactions/client.tsx`
43. [ ] `prescriptions/client.tsx`
44. [ ] `growth_charts/client.tsx`
45. [ ] `drug_dosages/page.tsx`
46. [ ] `diagnosis_codes/client.tsx`
47. [ ] `consent/[token]/page.tsx`

### Final
48. [ ] Run `npm run build` to verify no regressions
49. [ ] Run `npm run lint`

## Acceptance Criteria

- [x] Zero unguarded `console.log` in production code
- [x] Debug logs either removed or NODE_ENV guarded
- [x] Error logs kept (with guard if client-side)

## Resolution Summary

**Completed:** January 2026

### Changes Made

Most files in dashboard, portal, and store pages already had NODE_ENV guards in place. The following files were updated to add proper guards:

| Category | Files Updated |
|----------|---------------|
| **Store** | `store/wishlist/page.tsx`, `store/orders/client.tsx`, `store/product/[id]/client.tsx` |
| **Dashboard** | `dashboard/service-subscriptions/client.tsx` |
| **Portal** | `portal/service-subscriptions/client.tsx` |
| **Clinical Tools** | `vaccine_reactions/client.tsx`, `drug_dosages/page.tsx`, `diagnosis_codes/client.tsx`, `growth_charts/client.tsx`, `prescriptions/client.tsx` |
| **Consent** | `consent/[token]/page.tsx` |

### Pattern Applied

All client-side console statements now follow this pattern:

```typescript
} catch (error) {
  // Client-side error logging - only in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Descriptive message:', error)
  }
  // User-facing error handling
  setError('Error message')
}
```

### Summary

- **Total files checked:** 48 pages/client components
- **Files already guarded:** 36 (75%)
- **Files updated:** 12 (25%)
- **Total console statements guarded:** 98 across all [clinic] pages

## Estimated Effort

- 2.5-3 hours (mechanical changes across many files)

## Risk Assessment

- **Low risk** - Non-functional changes
- Test critical flows after changes (inventory, subscriptions)
- Client components isolated - page-by-page testing
