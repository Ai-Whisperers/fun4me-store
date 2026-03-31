# BUG-011 Missing React Imports in Orders Client

## Priority: P0

## Category: Bug

## Status: Closed (False Positive)

## Resolution
Upon verification, the orders client (`web/app/[clinic]/store/orders/client.tsx`) correctly imports and uses `useQuery` from `@tanstack/react-query` (line 13, 162). The file does NOT use `useCallback` or `useEffect` for data fetching - this was a misread during the audit. No changes required.

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

The order history client component uses `useCallback` and `useEffect` hooks but only imports `useState` from React. This causes a runtime error that breaks the entire orders page.

### Current State

**File**: `web/app/[clinic]/store/orders/client.tsx` (line 9)

```typescript
import { useState } from 'react'  // Missing useCallback, useEffect
```

**Usage** (lines 148, 186):
```typescript
const fetchOrders = useCallback(async () => {  // useCallback not imported!
  // ...
}, [/* deps */])

useEffect(() => {  // useEffect not imported!
  fetchOrders()
}, [fetchOrders])
```

### Error

```
ReferenceError: useCallback is not defined
    at OrderHistoryClient (orders/client.tsx:148:23)
```

## Impact

**Severity: CRITICAL**
- Order history page completely broken
- Customers cannot view their orders
- No order tracking capability

## Proposed Fix

Add missing imports:

```typescript
import { useState, useCallback, useEffect } from 'react'
```

## Acceptance Criteria

- [ ] `useCallback` imported from React
- [ ] `useEffect` imported from React
- [ ] Orders page loads without errors
- [ ] Orders are fetched and displayed correctly
- [ ] No console errors related to undefined hooks

## Related Files

- `web/app/[clinic]/store/orders/client.tsx`

## Estimated Effort

5 minutes

## Testing Notes

1. Navigate to `/[clinic]/store/orders`
2. Verify page loads without errors
3. Verify orders are displayed (if user has orders)
4. Check browser console for errors
