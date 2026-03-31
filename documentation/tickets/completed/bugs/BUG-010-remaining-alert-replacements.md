# BUG-010 Remaining Alert() Replacements

## Priority: P3

## Category: Bug / UX

## Status: Completed

## Epic: [EPIC-16: User Experience](../epics/EPIC-16-user-experience.md)

## Description

Follow-up to BUG-009. Additional `alert()` instances were discovered during BUG-009 implementation that were outside the original ticket scope.

## Source

Derived from `documentation/tickets/bugs/BUG-009-alert-usage-instead-of-toast.md` (Additional alert() Instances Found section)

## Context

> These should be addressed in a follow-up ticket.

BUG-009 fixed 10 documented instances across 6 files. During the fix, 12 additional instances were found in 11 files that need similar treatment.

## Affected Files (Original)

### Hospital Module (3 files)
- `web/components/hospital/feedings-panel.tsx`
- `web/components/hospital/treatment-sheet.tsx`
- `web/components/hospital/vitals-panel.tsx`

### Invoice Module (3 files)
- `web/components/invoices/invoice-pdf.tsx`
- `web/components/invoices/invoice-detail.tsx`
- `web/components/portal/invoice-actions.tsx`

### WhatsApp Module (3 files)
- `web/components/whatsapp/template-selector.tsx`
- `web/components/whatsapp/inbox.tsx`
- `web/components/whatsapp/template-manager.tsx`

### Lab Module (1 file)
- `web/components/lab/result-entry.tsx`

### Store Module (1 file)
- `web/components/store/order-invoice-pdf.tsx`

## Additional Files Fixed (Discovered During Implementation)

### App Pages - Portal
- `web/app/[clinic]/portal/prescriptions/new/client.tsx` (3 alerts)
- `web/app/[clinic]/portal/messages/[id]/page.tsx` (5 alerts)
- `web/app/[clinic]/portal/dashboard/patients/PatientRequestButton.tsx` (1 alert)
- `web/app/[clinic]/portal/service-subscriptions/client.tsx` (1 alert)
- `web/app/[clinic]/store/wishlist/page.tsx` (1 alert)

### App Pages - Dashboard
- `web/app/[clinic]/dashboard/hospital/[id]/page.tsx` (5 alerts)
- `web/app/[clinic]/dashboard/epidemiology/client.tsx` (2 alerts)
- `web/app/[clinic]/dashboard/reminders/client.tsx` (2 alerts)
- `web/app/[clinic]/dashboard/lab/[id]/page.tsx` (3 alerts)
- `web/app/[clinic]/dashboard/consents/[id]/page.tsx` (5 alerts)
- `web/app/[clinic]/dashboard/settings/time-off-types/page.tsx` (1 alert)
- `web/app/[clinic]/dashboard/service-subscriptions/client.tsx` (1 alert)

## Implementation

Same pattern as BUG-009:

```typescript
import { useToast } from '@/components/ui/Toast'

// Inside component:
const { showToast } = useToast()

// Replace alert:
showToast({
  title: 'Error message',
  variant: 'error',  // or 'warning', 'success'
})
```

## Acceptance Criteria

- [x] All alert() calls in listed files replaced with toast
- [x] No console errors in development
- [x] TypeScript compiles without errors
- [x] Toast styling matches design system

## Files Changed (Total: 23 files, 40+ alert replacements)

### Hospital Module (3 files) - Fixed in previous session
1. `web/components/hospital/feedings-panel.tsx`
2. `web/components/hospital/treatment-sheet.tsx`
3. `web/components/hospital/vitals-panel.tsx`

### Invoice Module (3 files)
4. `web/components/invoices/invoice-pdf.tsx`
5. `web/components/invoices/invoice-detail.tsx`
6. `web/components/portal/invoice-actions.tsx`

### WhatsApp Module (3 files)
7. `web/components/whatsapp/template-selector.tsx`
8. `web/components/whatsapp/inbox.tsx`
9. `web/components/whatsapp/template-manager.tsx`

### Lab Module (2 files)
10. `web/components/lab/result-entry.tsx`
11. `web/app/[clinic]/dashboard/lab/[id]/page.tsx`

### Store Module (1 file)
12. `web/components/store/order-invoice-pdf.tsx`

### Portal Pages (5 files)
13. `web/app/[clinic]/portal/prescriptions/new/client.tsx`
14. `web/app/[clinic]/portal/messages/[id]/page.tsx`
15. `web/app/[clinic]/portal/dashboard/patients/PatientRequestButton.tsx`
16. `web/app/[clinic]/portal/service-subscriptions/client.tsx`
17. `web/app/[clinic]/store/wishlist/page.tsx`

### Dashboard Pages (6 files)
18. `web/app/[clinic]/dashboard/hospital/[id]/page.tsx`
19. `web/app/[clinic]/dashboard/epidemiology/client.tsx`
20. `web/app/[clinic]/dashboard/reminders/client.tsx`
21. `web/app/[clinic]/dashboard/consents/[id]/page.tsx`
22. `web/app/[clinic]/dashboard/settings/time-off-types/page.tsx`
23. `web/app/[clinic]/dashboard/service-subscriptions/client.tsx`

## Remaining alert() Uses (Intentionally Kept)

- **Test files**: `sanitize.test.ts`, `store-cart.test.ts`, `auth-security.test.ts` - XSS test cases
- **Comments**: `order-form.tsx` - Future ticket references (TICKET-FORM-002)

## Estimated Effort

- ~2-3 hours (similar pattern to BUG-009)

## Actual Effort

- ~3 hours (more files discovered than originally scoped)

---
*Created: January 2026*
*Derived from BUG-009 Future Work section*
*Completed: January 2026*
