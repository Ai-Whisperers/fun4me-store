# BUG-008 setTimeout Without Cleanup in Components

## Priority: P3

## Category: Bug / Code Quality

## Status: ✅ Completed

## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Description

Multiple components use `setTimeout` directly in event handlers without proper cleanup. If the component unmounts before the timer completes, React will attempt to update state on an unmounted component, causing:

1. Console warnings in development
2. Potential memory leaks in long-running sessions
3. React strict mode issues

### Affected Files (FIXED)

**`web/components/ambassador/ambassador-dashboard.tsx`**:
- ✅ Fixed using `useCopyTimeout` hook

**`web/components/billing/bank-transfer-modal.tsx`**:
- ✅ Fixed using `useCopyTimeout` hook

## Implementation

### Created: `web/lib/hooks/use-timeout.ts`

Three hooks for different use cases:

1. **`useTimeout(callback, delay, enabled)`** - Generic timeout with cleanup
2. **`useCopyTimeout(isCopied, onReset, delay)`** - Specialized for copy feedback
3. **`useSafeTimeout()`** - Returns a function for imperative use in handlers

```typescript
// Example usage in components:
import { useCopyTimeout } from '@/lib/hooks'

const [copied, setCopied] = useState(false)

// BUG-008: Safe timeout with cleanup for copy feedback
useCopyTimeout(copied, () => setCopied(false))

async function handleCopy() {
  await navigator.clipboard.writeText(text)
  setCopied(true)  // Timer handled by hook
}
```

### Files Modified

1. `web/lib/hooks/use-timeout.ts` - Created new hook file
2. `web/lib/hooks/index.ts` - Added export for timeout utilities
3. `web/components/ambassador/ambassador-dashboard.tsx` - Refactored 3 setTimeout instances
4. `web/components/billing/bank-transfer-modal.tsx` - Refactored 2 setTimeout instances

## Acceptance Criteria

- [x] All setTimeout calls in event handlers converted to useEffect pattern
- [x] No React console warnings about state updates on unmounted components
- [x] Copy feedback still works correctly (shows for 2s, then clears)
- [x] Component behavior unchanged from user perspective
- [x] TypeScript compiles without errors

## Testing Notes

1. Copy referral code in ambassador dashboard
2. Immediately navigate away from the component
3. Check console for any warnings about state updates
4. Repeat for bank transfer modal copy functionality

## Completion Date

January 2026
