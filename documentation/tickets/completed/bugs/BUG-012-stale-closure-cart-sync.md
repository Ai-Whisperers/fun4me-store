# BUG-012 Stale Closure in Cart Context Sync

## Priority: P1

## Category: Bug

## Status: Completed

## Resolution
Implemented Option A - using a ref to always get the latest items:
1. Added `itemsRef = useRef(items)` to hold the latest cart items
2. Added effect to keep `itemsRef.current` in sync with items state
3. Updated `syncToDatabase` to read from `itemsRef.current` instead of closure
4. Removed `items` from `syncToDatabase`'s dependency array

This ensures the debounced sync always uses the absolute latest cart state, regardless of when the timeout fires.

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

The cart context has a race condition where the debounced `syncToDatabase` callback can execute with stale `items` state. When users make rapid changes to their cart, some changes may be lost due to closure capturing outdated state.

### Current State

**File**: `web/context/cart-context.tsx` (lines 186-214)

```typescript
useEffect(() => {
  if (isInitialized) {
    localStorage.setItem('vete_cart', JSON.stringify(items))
    if (isLoggedIn) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToDatabase()  // ← This captures stale `items` in closure
      }, 500)
    }
  }
  // ...
}, [items, isInitialized, isLoggedIn])
```

The `syncToDatabase` callback is defined with `useCallback` depending on `[items, isLoggedIn]`, but when the timeout fires 500ms later, the `items` value captured in the closure may be stale if the user made additional changes.

### Reproduction Scenario

1. User adds item A to cart
2. 200ms later, user adds item B to cart
3. First timeout (for A) is cleared, new timeout starts
4. 500ms later, sync fires
5. If `syncToDatabase` was memoized with old items, item B might be missing

## Impact

**Severity: HIGH**
- Cart data loss during rapid interactions
- User frustration when items disappear
- Database cart out of sync with localStorage

## Proposed Fix

### Option A: Use ref for latest items

```typescript
const itemsRef = useRef(items)
useEffect(() => {
  itemsRef.current = items
}, [items])

const syncToDatabase = useCallback(async () => {
  const currentItems = itemsRef.current  // Always get latest
  // ... sync currentItems to database
}, [isLoggedIn])  // Remove items from deps
```

### Option B: Pass items directly to sync call

```typescript
useEffect(() => {
  if (isInitialized && isLoggedIn) {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    const itemsToSync = items  // Capture current value
    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabaseWithItems(itemsToSync)  // Pass explicitly
    }, 500)
  }
}, [items, isInitialized, isLoggedIn])
```

### Option C: Use useDeferredValue + sync on stable state

```typescript
const deferredItems = useDeferredValue(items)

useEffect(() => {
  if (isInitialized && isLoggedIn && items === deferredItems) {
    // Only sync when items have stabilized
    syncToDatabase()
  }
}, [deferredItems, isInitialized, isLoggedIn])
```

## Acceptance Criteria

- [ ] Rapid cart changes don't lose items
- [ ] Database always receives latest cart state
- [ ] localStorage and database stay in sync
- [ ] Test: Add 5 items rapidly → All 5 persist
- [ ] Add comment `// BUG-012: Fixed stale closure`

## Related Files

- `web/context/cart-context.tsx`

## Estimated Effort

2-3 hours

## Testing Notes

1. Open browser DevTools Network tab
2. Rapidly add/remove items (within 500ms intervals)
3. Verify final API call has all expected items
4. Refresh page and verify cart state persists
