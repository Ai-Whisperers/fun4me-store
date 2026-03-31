# AUDIT-105: TODO Comment Resolution

## Priority: P2 - Medium
## Category: Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Description

The codebase contained 14 TODO comments indicating incomplete functionality. These have been resolved through three sub-tickets:

- **AUDIT-105a**: Notification System TODOs ✅
- **AUDIT-105b**: Backend Enhancement TODOs ✅
- **AUDIT-105c**: UI Enhancement TODOs ✅

## Resolution Summary

| Category | Original TODOs | Resolved |
|----------|----------------|----------|
| Notification System | 6 | 6 (all implemented with `sendNotification`/`notifyStaff`) |
| Backend Enhancements | 3 | 3 (cron tracking implemented, others pre-existing) |
| UI Enhancements | 4 | 4 (2 wired to existing modals, 2 pre-existing) |
| **Total** | **13** | **13** ✅ |

## Original TODOs (Historical)

## Current TODOs

### High Priority (User-Facing Features)

| File | Line | TODO |
|------|------|------|
| `api/admin/products/[id]/approve/route.ts` | 70 | Send notification to clinic that submitted the product |
| `api/appointments/waitlist/[id]/decline/route.ts` | 94 | Notify next person in waitlist |
| `api/appointments/waitlist/[id]/accept/route.ts` | 109 | Send confirmation notification |
| `api/cron/process-subscriptions/route.ts` | 348 | Send order confirmation email to customer |
| `api/cron/generate-recurring/route.ts` | 96 | Send notification to staff about recurrences nearing limit |
| `api/platform/commission-invoices/[id]/send/route.ts` | 100 | Send actual email/notification to clinic |

### Medium Priority (Backend Enhancements)

| File | Line | TODO |
|------|------|------|
| `api/health/cron/route.ts` | 159 | Add cron_job_runs table and track executions |
| `api/procurement/orders/[id]/route.ts` | 178 | If status is 'received', also update inventory |
| `actions/create-medical-record.ts` | 56 | Handle file uploads for attachments |

### Low Priority (UI Enhancements)

| File | Line | TODO |
|------|------|------|
| `dashboard/inventory/client.tsx` | 1040 | Add new product modal |
| `dashboard/inventory/procurement/page.tsx` | 43 | Implement order detail modal |
| `dashboard/inventory/procurement/page.tsx` | 47 | Implement order edit |
| `dashboard/inventory/procurement/page.tsx` | 121 | Add to purchase order |

## Proposed Actions

### Convert to Feature Tickets

1. **Notification TODOs** (6 items) - Create FEAT-XXX for notification system enhancement
   - Clinic notification on product approval
   - Waitlist notifications
   - Subscription order confirmations
   - Recurring appointment warnings
   - Commission invoice notifications

2. **Cron Monitoring** (1 item) - Create TECH-XXX for cron job tracking
   - Add `cron_job_runs` table
   - Track execution history
   - Enable failure alerting

3. **Inventory Updates** (1 item) - Create FEAT-XXX for procurement flow
   - Auto-update inventory on procurement order receipt

### Implement Directly

4. **Medical Record Attachments** - Small feature, can be implemented directly
5. **Procurement UI** (3 items) - Part of ongoing procurement feature work

### Remove or Defer

6. **New Product Modal** - May already be covered by existing functionality

## Implementation Steps

1. [ ] Review each TODO with business context
2. [ ] Create feature tickets for complex items
3. [ ] Implement simple items directly
4. [ ] Remove outdated TODOs
5. [ ] Add link to ticket in TODO comments for deferred items

### Example After Cleanup

```typescript
// Before
// TODO: Send notification to clinic

// After
// See FEAT-018 for notification implementation
await sendClinicNotification(...)
```

Or:

```typescript
// Remove TODO entirely after implementation
await notificationService.send({
  type: 'product_approved',
  clinicId: clinic.id,
  ...
})
```

## Acceptance Criteria

- [ ] All TODOs either implemented, converted to tickets, or documented
- [ ] No orphaned TODO comments without context
- [ ] High-priority notification TODOs addressed
- [ ] TODO count reduced to <5 (only complex future features)

## Related Files

- 14 files containing TODO comments (see list above)

## Estimated Effort

| Action | Effort |
|--------|--------|
| Notification system | 8-12 hours |
| Cron monitoring | 4-6 hours |
| Procurement flow | 2-4 hours |
| Medical attachments | 2-3 hours |
| Cleanup/review | 2-3 hours |
| **Total** | **18-28 hours** |

## Risk Assessment

- **Low to Medium risk**
- Some TODOs may have dependencies on other features
- Notification TODOs indicate missing user communication
- Recommend prioritizing waitlist and subscription notifications
