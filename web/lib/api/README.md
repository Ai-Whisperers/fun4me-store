# API Utilities Reference

Standardized utilities for building consistent API routes in the Vete platform.

## Quick Start

```typescript
import {
  parsePagination,
  paginatedResponse,
  apiError,
  apiSuccess,
  HTTP_STATUS,
  verifyResourceTenant,
  validateStatusTransition,
} from '@/lib/api'
```

## Pagination

### `parsePagination(searchParams)`

Parse pagination parameters from URL search params.

**Parameters:**

- `searchParams: URLSearchParams` - URL search params from request

**Returns:**

```typescript
{
  page: number // Current page (min: 1, default: 1)
  limit: number // Items per page (min: 1, max: 100, default: 20)
  offset: number // Database offset (calculated)
}
```

**Example:**

```typescript
export const GET = withApiAuth(async ({ request, supabase }) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, offset } = parsePagination(searchParams)

  const { data, count } = await supabase
    .from('table')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)

  return NextResponse.json(paginatedResponse(data, count, { page, limit, offset }))
})
```

### `paginatedResponse(data, total, params)`

Create standardized pagination response.

**Parameters:**

- `data: T[]` - Array of items for current page
- `total: number` - Total count across all pages
- `params: PaginationParams` - Pagination params from `parsePagination()`

**Returns:**

```typescript
{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;      // Total pages
    hasNext: boolean;   // Has next page
    hasPrev: boolean;   // Has previous page
  }
}
```

**Example:**

```typescript
// Returns:
// {
//   data: [...],
//   pagination: { page: 2, limit: 20, total: 150, pages: 8, hasNext: true, hasPrev: true }
// }
return NextResponse.json(paginatedResponse(clients, 150, { page: 2, limit: 20, offset: 20 }))
```

## Error Handling

### `apiError(type, status, details?)`

Create standardized error response.

**Parameters:**

- `type: ApiErrorType` - Error type (see list below)
- `status: number` - HTTP status code (use `HTTP_STATUS` constants)
- `details?: object` - Optional additional details

**Error Types:**

```typescript
'UNAUTHORIZED' // Not authenticated
'FORBIDDEN' // No permission
'NOT_FOUND' // Resource not found
'VALIDATION_ERROR' // Invalid input
'MISSING_FIELDS' // Required fields missing
'INVALID_FORMAT' // Malformed request
'CONFLICT' // Resource conflict
'DATABASE_ERROR' // DB operation failed
'SERVER_ERROR' // Unexpected error
```

**Example:**

```typescript
// Simple error
return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)

// With details
return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
  details: { reason: 'Tenant access denied' },
})

// With field errors
return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
  field_errors: {
    email: ['Email es requerido', 'Formato inválido'],
    password: ['Mínimo 8 caracteres'],
  },
})
```

**Response Format:**

```json
{
  "error": "No autorizado",
  "code": "UNAUTHORIZED",
  "details": { ... },
  "field_errors": { ... }
}
```

### `apiSuccess(data, message?, status?)`

Create standardized success response.

**Parameters:**

- `data: T` - Response data
- `message?: string` - Optional success message
- `status?: number` - HTTP status (default: 200)

**Example:**

```typescript
return apiSuccess(invoice, 'Factura creada exitosamente', HTTP_STATUS.CREATED)
```

**Response Format:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Factura creada exitosamente"
}
```

### `HTTP_STATUS` Constants

Use these instead of magic numbers:

```typescript
HTTP_STATUS.OK // 200
HTTP_STATUS.CREATED // 201
HTTP_STATUS.NO_CONTENT // 204
HTTP_STATUS.BAD_REQUEST // 400
HTTP_STATUS.UNAUTHORIZED // 401
HTTP_STATUS.FORBIDDEN // 403
HTTP_STATUS.NOT_FOUND // 404
HTTP_STATUS.CONFLICT // 409
HTTP_STATUS.UNPROCESSABLE_ENTITY // 422
HTTP_STATUS.TOO_MANY_REQUESTS // 429
HTTP_STATUS.INTERNAL_SERVER_ERROR // 500
HTTP_STATUS.SERVICE_UNAVAILABLE // 503
```

## Tenant Verification

### `verifyResourceTenant(supabase, table, resourceId, userTenantId)`

Verify that a resource belongs to the user's tenant.

**Parameters:**

- `supabase: SupabaseClient` - Supabase client
- `table: string` - Table name
- `resourceId: string` - Resource ID
- `userTenantId: string` - User's tenant ID

**Returns:**

```typescript
{
  valid: boolean;
  error?: NextResponse;  // Error response if invalid
  data?: { tenant_id: string };
}
```

**Example:**

```typescript
const verification = await verifyResourceTenant(supabase, 'invoices', invoiceId, profile.tenant_id)

if (!verification.valid) {
  return verification.error // Returns 404 or 403
}

// Continue with verified resource
```

### `verifyPetOwnership(supabase, petId, userId, userTenantId)`

Verify pet ownership (for pet owners, not staff).

**Parameters:**

- `supabase: SupabaseClient` - Supabase client
- `petId: string` - Pet ID
- `userId: string` - User ID
- `userTenantId: string` - User's tenant ID

**Example:**

```typescript
const verification = await verifyPetOwnership(supabase, petId, user.id, profile.tenant_id)

if (!verification.valid) {
  return verification.error // Returns 404 or 403
}
```

## Status Transitions

### `canTransitionTo(currentStatus, newStatus, entityType)`

Check if a status transition is valid.

**Parameters:**

- `currentStatus: string` - Current status
- `newStatus: string` - Desired new status
- `entityType: 'invoice' | 'appointment' | 'lab_order' | 'hospitalization'`

**Returns:** `boolean`

**Example:**

```typescript
if (!canTransitionTo('draft', 'paid', 'invoice')) {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
    field_errors: { status: ['Transición inválida'] },
  })
}
```

### `validateStatusTransition(currentStatus, newStatus, entityType)`

Validate status transition and return error if invalid.

**Returns:** `NextResponse | null` - Error response or null if valid

**Example:**

```typescript
const transitionError = validateStatusTransition(invoice.status, newStatus, 'invoice')

if (transitionError) {
  return transitionError // Returns 400 with error message
}

// Update status
await supabase.from('invoices').update({ status: newStatus }).eq('id', invoiceId)
```

### `getValidTransitions(currentStatus, entityType)`

Get all valid next statuses for current status.

**Returns:** `string[]` - Array of valid next statuses

**Example:**

```typescript
const validNextStatuses = getValidTransitions('draft', 'invoice')
// Returns: ['sent', 'cancelled']
```

## Status Transition Rules

### Invoice

```
draft → sent, cancelled
sent → paid, partial, overdue, cancelled
partial → paid, overdue, cancelled
paid → void
overdue → paid, partial, cancelled
cancelled → (terminal)
void → (terminal)
```

### Appointment

```
scheduled → confirmed, cancelled
confirmed → checked_in, cancelled, no_show
checked_in → in_progress, cancelled
in_progress → completed
completed → (terminal)
cancelled → (terminal)
no_show → (terminal)
```

### Lab Order

```
pending → collected, cancelled
collected → processing, cancelled
processing → completed, cancelled
completed → (terminal)
cancelled → (terminal)
```

### Hospitalization

```
admitted → active, discharged
active → discharged, transferred, deceased
discharged → (terminal)
transferred → (terminal)
deceased → (terminal)
```

## Complete Example

```typescript
import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import {
  parsePagination,
  paginatedResponse,
  apiError,
  apiSuccess,
  HTTP_STATUS,
  verifyResourceTenant,
  validateStatusTransition,
} from '@/lib/api'

// GET - List resources with pagination
export const GET = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, offset } = parsePagination(searchParams)

  try {
    const { data, error, count } = await supabase
      .from('resources')
      .select('*', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json(paginatedResponse(data || [], count || 0, { page, limit, offset }))
  } catch (e) {
    console.error('Error loading resources:', e)
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

// POST - Create resource
export const POST = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      const body = await request.json()

      if (!body.name) {
        return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
          field_errors: { name: ['El nombre es requerido'] },
        })
      }

      const { data, error } = await supabase
        .from('resources')
        .insert({ ...body, tenant_id: profile.tenant_id })
        .select()
        .single()

      if (error) throw error

      return apiSuccess(data, 'Recurso creado exitosamente', HTTP_STATUS.CREATED)
    } catch (e) {
      console.error('Error creating resource:', e)
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

// PATCH - Update resource status
export const PATCH = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: { id: ['El ID es requerido'] },
      })
    }

    // Verify tenant
    const verification = await verifyResourceTenant(supabase, 'resources', id, profile.tenant_id)

    if (!verification.valid) {
      return verification.error
    }

    const body = await request.json()

    // Validate status transition if status is being updated
    if (body.status) {
      const { data: current } = await supabase
        .from('resources')
        .select('status')
        .eq('id', id)
        .single()

      const transitionError = validateStatusTransition(current?.status, body.status, 'appointment')

      if (transitionError) {
        return transitionError
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return apiSuccess(data, 'Recurso actualizado exitosamente')
  },
  { roles: ['vet', 'admin'] }
)
```

## Best Practices

### ✅ DO:

- Always use `parsePagination()` for paginated endpoints
- Use `HTTP_STATUS` constants instead of numbers
- Return consistent error responses with `apiError()`
- Verify tenant isolation for all resource access
- Validate status transitions before updates
- Include Spanish error messages

### ❌ DON'T:

- Don't use hardcoded status codes (`{ status: 404 }`)
- Don't create custom pagination logic
- Don't skip tenant verification
- Don't allow invalid status transitions
- Don't return inconsistent error formats
- Don't use English error messages

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { parsePagination, canTransitionTo } from '@/lib/api'

describe('API Utilities', () => {
  it('parses pagination params', () => {
    const params = new URLSearchParams('page=2&limit=50')
    const result = parsePagination(params)

    expect(result).toEqual({
      page: 2,
      limit: 50,
      offset: 50,
    })
  })

  it('validates invoice transitions', () => {
    expect(canTransitionTo('draft', 'sent', 'invoice')).toBe(true)
    expect(canTransitionTo('draft', 'paid', 'invoice')).toBe(false)
  })
})
```

## Related Files

- `web/lib/api/errors.ts` - Error handling utilities
- `web/lib/api/with-auth.ts` - Authentication wrapper
- `web/lib/api/pagination.ts` - Pagination utilities
- `web/lib/api/verify-tenant.ts` - Tenant verification
- `web/lib/api/status-transitions.ts` - Status validation

---

For more details, see `API_STANDARDIZATION_SUMMARY.md` in the project root.
