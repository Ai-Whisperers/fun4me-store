# BUG-009 Alert() Usage Instead of Toast Notifications

## Priority: P3

## Category: Bug / UX

## Status: ✅ Completed

## Epic: [EPIC-16: User Experience](../epics/EPIC-16-user-experience.md)

## Description

Multiple components use the browser's native `alert()` function for error handling instead of proper toast/notification UI. This creates a poor user experience:

1. Blocks the main thread until user dismisses
2. Inconsistent with the rest of the UI styling
3. Cannot be customized (no icons, colors, or branding)
4. Breaks the app's visual flow

### Originally Documented Instances (10 instances - ALL FIXED)

**`web/components/billing/invoice-list.tsx`**:
- ✅ Line 137: Load invoice error
- ✅ Line 161: Download PDF error

**`web/components/billing/invoice-detail-modal.tsx`**:
- ✅ Line 112: Download PDF error

**`web/components/billing/payment-methods-manager.tsx`**:
- ✅ Line 77: Set default error
- ✅ Line 99: Delete method error

**`web/components/consents/blanket-consents/add-consent-modal.tsx`**:
- ✅ Line 134: Signature required warning
- ✅ Line 158: Create consent error

**`web/components/consents/blanket-consents/index.tsx`**:
- ✅ Line 110: Revoke consent error

**`web/components/dashboard/export-csv-button.tsx`**:
- ✅ Already fixed (uses showToast)

**`web/components/dashboard/time-off-actions.tsx`**:
- ✅ Line 29: Update request error
- ✅ Line 32: Connection error

## Implementation

Replaced all `alert()` calls with `useToast` hook from `@/components/ui/Toast`:

```typescript
import { useToast } from '@/components/ui/Toast'

// Inside component:
const { showToast } = useToast()

// Replace alert:
showToast({
  title: 'Error message',
  variant: 'error',  // or 'warning', 'success', 'default'
})
```

### Files Modified

1. `web/components/billing/invoice-list.tsx` - 2 instances
2. `web/components/billing/invoice-detail-modal.tsx` - 1 instance
3. `web/components/billing/payment-methods-manager.tsx` - 2 instances
4. `web/components/consents/blanket-consents/add-consent-modal.tsx` - 2 instances
5. `web/components/consents/blanket-consents/index.tsx` - 1 instance
6. `web/components/dashboard/time-off-actions.tsx` - 2 instances

## Acceptance Criteria

- [x] All 10 documented `alert()` calls replaced with toast notifications
- [x] Error messages displayed in styled toast component
- [x] Toast auto-dismisses after 3 seconds (default)
- [x] Toast includes appropriate styling (error = red)
- [x] No visual flash or jarring user experience
- [x] Matches app's design system
- [x] TypeScript compiles without errors

## Additional alert() Instances Found (Future Work)

The codebase grep revealed additional alert() usage not in the original scope:
- `web/components/hospital/feedings-panel.tsx`
- `web/components/hospital/treatment-sheet.tsx`
- `web/components/hospital/vitals-panel.tsx`
- `web/components/invoices/invoice-pdf.tsx`
- `web/components/invoices/invoice-detail.tsx`
- `web/components/whatsapp/template-selector.tsx`
- `web/components/whatsapp/inbox.tsx`
- `web/components/whatsapp/template-manager.tsx`
- `web/components/lab/result-entry.tsx`
- `web/components/portal/invoice-actions.tsx`
- `web/components/store/order-invoice-pdf.tsx`

These should be addressed in a follow-up ticket.

## Completion Date

January 2026
