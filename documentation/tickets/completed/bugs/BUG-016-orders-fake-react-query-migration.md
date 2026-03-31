# BUG-016 Order History Claims React Query Migration But Uses useState

## Priority: P2

## Category: Bug / Technical Debt

## Status: Closed (False Positive)

## Resolution
Upon verification, the orders client (`web/app/[clinic]/store/orders/client.tsx`) correctly uses React Query. Line 13 imports `useQuery` from `@tanstack/react-query`, and line 162 uses it for data fetching. There is no legacy `useEffect`-based fetching pattern. The migration is complete and correct.

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

The order history component file header claims "RES-001: Migrated to React Query for data fetching" but the implementation uses manual `useState` + `useCallback` + `useEffect` pattern instead of React Query. The imports include `useQuery` but it is never used.

### Current State

**File**: `web/app/[clinic]/store/orders/client.tsx`

```typescript
// Line 7 comment:
// RES-001: Migrated to React Query for data fetching

// Line 13 - useQuery imported but unused:
import { useQuery } from '@tanstack/react-query'

// Actual implementation (lines 134-188):
const [orders, setOrders] = useState<Order[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const fetchOrders = useCallback(async () => {
  setIsLoading(true)
  try {
    const response = await fetch(`/api/store/orders?...`)
    // ...
  } catch (err) {
    setError('Error al cargar los pedidos')
  } finally {
    setIsLoading(false)
  }
}, [clinic, page, statusFilter])

useEffect(() => {
  fetchOrders()
}, [fetchOrders])
```

### Problems

1. **Misleading documentation** - Comment claims migration complete, but it's not
2. **Unused import** - `useQuery` imported but never used
3. **Missing React Query benefits** - No caching, no background refetch, no deduplication
4. **Inconsistent with project patterns** - Other components use React Query properly
5. **Manual error/loading state** - React Query handles this automatically

## Impact

**Severity: MEDIUM**
- Misleading documentation causes confusion
- Technical debt accumulation
- Missing caching and optimistic updates
- Code inconsistency

## Proposed Fix

Actually migrate to React Query:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

interface UseOrdersParams {
  clinic: string
  page: number
  statusFilter: string
}

function useOrders({ clinic, page, statusFilter }: UseOrdersParams) {
  return useQuery({
    queryKey: ['orders', clinic, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        clinic,
        page: page.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`/api/store/orders?${params}`)
      if (!response.ok) throw new Error('Failed to fetch orders')

      return response.json()
    },
    staleTime: 30000,  // 30 seconds
    refetchOnWindowFocus: true,
  })
}

export function OrderHistoryClient({ clinic, currency }: Props) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, error, refetch } = useOrders({
    clinic,
    page,
    statusFilter
  })

  const orders = data?.orders ?? []
  const totalPages = data?.totalPages ?? 1

  // ... rest of component using orders, isLoading, error
}
```

## Acceptance Criteria

- [ ] Remove misleading "RES-001: Migrated" comment (or complete the migration)
- [ ] Remove unused `useQuery` import if not migrating
- [ ] OR: Actually implement React Query pattern
- [ ] If migrating: Add query key for caching
- [ ] If migrating: Add staleTime and refetch options
- [ ] Test: Orders page still works correctly
- [ ] Test: Multiple visits to page use cached data

## Related Files

- `web/app/[clinic]/store/orders/client.tsx`
- `web/documentation/tickets/technical-debt/RES-001-react-query-adoption.md`

## Estimated Effort

2-3 hours (for actual migration) or 5 minutes (for removing misleading comment)

## Decision Needed

**Option A**: Complete the React Query migration (recommended)
**Option B**: Remove misleading comment and unused import (quick fix)
