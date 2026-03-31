# TECH-019: Standardize Pagination Across All List Endpoints

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 2-3 days  
**Impact**: Medium - API consistency  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-004)

## Summary

Some endpoints paginate, some return ALL records. This causes performance issues and inconsistent client handling.

## Problem

**Some endpoints paginate:**
```typescript
const { page, limit } = parsePagination(request);
return paginatedResponse(data, page, limit, total);
```

**Some don't:**
```typescript
const { data } = await supabase.from('appointments').select('*');
return NextResponse.json(data);  // ALL appointments. Ever.
```

## Solution

### Pagination Helper

```typescript
// lib/api/pagination.ts
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parsePagination(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)))
  );
  
  return { page, limit, offset: (page - 1) * limit };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}
```

### Apply to All List Endpoints

```typescript
export const GET = withAuth(async ({ request, supabase }) => {
  const { page, limit, offset } = parsePagination(request);
  
  const { data, count } = await supabase
    .from('table')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);
  
  return paginatedResponse(data, page, limit, count || 0);
});
```

## Implementation

1. **Audit all list endpoints** - Find which need pagination
2. **Add pagination helper** - Create utility functions
3. **Migrate endpoints** - Apply to all list routes
4. **Update frontend** - Handle pagination responses
5. **Document pattern** - Add to API guidelines

## Acceptance Criteria
- [ ] All list endpoints support pagination
- [ ] Consistent pagination response format
- [ ] Default and max limits enforced
- [ ] Frontend handles pagination

## Related
- API documentation
- Performance improvements
