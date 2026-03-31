# BUG-014 Double-Click Can Trigger Duplicate Checkout

## Priority: P1

## Category: Bug

## Status: Completed

## Resolution
Fixed using Option A (ref for immediate blocking). Added `isSubmittingRef` that is checked immediately at the start of `handleCheckout()`, before any React state updates. This prevents double-click race conditions because the ref check is synchronous and happens before React's async state update cycle.

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

While `isProcessing` state disables the checkout button during submission, there is no immediate UI feedback or debouncing. A fast double-click before `setIsProcessing(true)` executes could trigger multiple checkout API calls, potentially creating duplicate orders.

### Current State

**File**: `web/app/[clinic]/cart/checkout/client.tsx` (lines 379-401)

```typescript
<button
  onClick={handleCheckout}
  disabled={!canCheckout || isProcessing}
  className="..."
>
  {isProcessing ? (
    <Spinner />
  ) : (
    // Button content
  )}
</button>
```

The `handleCheckout` function:
```typescript
const handleCheckout = async () => {
  setIsProcessing(true)  // ← Not immediate enough
  try {
    const response = await fetch('/api/store/checkout', { ... })
    // ...
  } finally {
    setIsProcessing(false)
  }
}
```

### Race Condition

1. User clicks button (t=0ms)
2. `handleCheckout` called, React schedules state update
3. User clicks again (t=50ms) before state update renders
4. Second `handleCheckout` call initiated
5. Both API calls proceed → Duplicate orders

## Impact

**Severity: HIGH**
- Duplicate orders created
- Inventory decremented twice
- Customer charged twice (when payment implemented)
- Database inconsistency

## Proposed Fix

### Option A: Use ref for immediate blocking

```typescript
const isSubmittingRef = useRef(false)

const handleCheckout = async () => {
  if (isSubmittingRef.current) return  // Immediate check
  isSubmittingRef.current = true
  setIsProcessing(true)

  try {
    const response = await fetch('/api/store/checkout', { ... })
    // ...
  } finally {
    isSubmittingRef.current = false
    setIsProcessing(false)
  }
}
```

### Option B: Disable button immediately via DOM

```typescript
const handleCheckout = async (e: React.MouseEvent<HTMLButtonElement>) => {
  const button = e.currentTarget
  button.disabled = true  // Immediate DOM manipulation
  setIsProcessing(true)

  try {
    // ...
  } finally {
    setIsProcessing(false)
    // button.disabled will be re-evaluated on render
  }
}
```

### Option C: Debounce the handler

```typescript
import { useDebouncedCallback } from 'use-debounce'

const handleCheckout = useDebouncedCallback(
  async () => {
    setIsProcessing(true)
    // ...
  },
  300,  // 300ms debounce
  { leading: true, trailing: false }  // Execute on first click only
)
```

### Option D: Server-side idempotency (defense in depth)

```typescript
// Generate client-side idempotency key
const idempotencyKey = useRef(crypto.randomUUID())

const handleCheckout = async () => {
  // ...
  const response = await fetch('/api/store/checkout', {
    headers: {
      'Idempotency-Key': idempotencyKey.current
    },
    body: JSON.stringify({ items, idempotencyKey: idempotencyKey.current })
  })
  // Server returns same response for duplicate key
}
```

## Acceptance Criteria

- [ ] Double-clicking checkout button only submits once
- [ ] Rapid clicks (within 300ms) trigger single API call
- [ ] Button visually disabled immediately on click
- [ ] Test: Click checkout rapidly 5 times → Only 1 order created
- [ ] Add comment `// BUG-014: Prevent double-click`
- [ ] Consider server-side idempotency key (separate ticket)

## Related Files

- `web/app/[clinic]/cart/checkout/client.tsx`

## Estimated Effort

1-2 hours

## Testing Notes

1. Add items to cart
2. Go to checkout
3. Use browser DevTools to slow down network (add 2s latency)
4. Click checkout button rapidly multiple times
5. Verify only 1 order created in database
6. Verify only 1 API call made (Network tab)
