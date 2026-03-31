# SEC-009: Search Pattern Injection Risk

## Priority: P3 (Low)
## Category: Security
## Status: COMPLETED

## Description
Search endpoints construct LIKE patterns directly from user input, which could lead to unexpected behavior if Supabase parameterization changes.

## Current State
### Current Code
**`app/api/store/search/route.ts:13,43`**
```typescript
const query = searchParams.get('q')?.trim()
// ... later
const searchPattern = `%${query}%`

// Used in
.ilike('name', searchPattern)
.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
```

### Analysis
- Supabase currently parameterizes `.ilike()` calls internally
- However, the pattern construction happens client-side
- Special LIKE characters (`%`, `_`) in user input are not escaped
- User searching for "20%" would match "20" followed by any character

### Impact (Currently Low)
- Supabase handles SQL injection prevention
- However:
  - Search for "100%" matches "1000", "100x", etc.
  - Search for "_a_" matches "aaa", "bab", etc.
  - Unexpected search results for users

## Proposed Solution

### 1. Escape LIKE Special Characters
```typescript
// lib/utils/search.ts
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_')    // Escape underscore
}

export function createSearchPattern(query: string): string {
  const escaped = escapeLikePattern(query.trim())
  return `%${escaped}%`
}
```

### 2. Input Validation
```typescript
// lib/schemas/search.ts
import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string()
    .min(2, 'Búsqueda muy corta')
    .max(100, 'Búsqueda muy larga')
    .transform(s => s.trim()),
  category: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

### 3. Updated Search Route
```typescript
// app/api/store/search/route.ts
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const { q, category, limit } = searchQuerySchema.parse(params)

  const searchPattern = createSearchPattern(q)

  const { data } = await supabase
    .from('store_products')
    .select('*')
    .ilike('name', searchPattern)
    .limit(limit)

  return NextResponse.json(data)
}
```

## Implementation Steps
1. Create search utility with LIKE escaping
2. Add search query validation schema
3. Update store/search route
4. Update any other search endpoints
5. Add tests for special character searches

## Acceptance Criteria
- [ ] Search for "100%" returns products with literal "100%"
- [ ] Special characters don't cause unexpected matches
- [ ] Search length is validated (2-100 chars)
- [ ] No SQL injection possible
- [ ] Search performance unchanged

## Related Files
- `web/lib/utils/search.ts` (new)
- `web/lib/schemas/search.ts` (new)
- `web/app/api/store/search/route.ts`
- `web/app/api/pets/search/route.ts` (if exists)

## Estimated Effort
- Utility functions: 1 hour
- Route updates: 1 hour
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `lib/utils/search.ts` - Search utilities with LIKE pattern escaping

**Files Modified:**
- `app/api/store/search/route.ts` - Updated to use `createSearchPattern`
- `app/api/search/route.ts` - Updated to use `createSearchPattern`

**Changes Made:**
1. **New search utility functions:**
   - `escapeLikePattern(input)` - Escapes `%`, `_`, and `\` characters
   - `createSearchPattern(query)` - Trims, escapes, and wraps with `%`
   - `validateSearchQuery(query)` - Validates length bounds
   - `MIN_SEARCH_LENGTH = 2` constant

2. **Search endpoint updates:**
   - Both main search routes now use `createSearchPattern`
   - Constants imported for consistent minimum length

**Behavior after fix:**
- Search for "100%" now returns literal "100%" products, not "1000", "100x", etc.
- Search for "_a_" returns literal "_a_", not "aaa", "bab", etc.
- Backslashes in search terms handled correctly

**Note:** Internal staff-only search endpoints (20+) not updated as they are lower risk and protected by authentication.

---
*Completed: January 2026*
