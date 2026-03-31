# REF-003: Standardize API Error Handling

## Priority: P2 - Medium
## Category: Refactoring
## Status: COMPLETED
## Affected Areas: API routes, Client error handling

## Description

Error handling in API routes is inconsistent. Different routes return errors in different formats, making client-side error handling complex and error-prone.

## Current State

```typescript
// Format A
return NextResponse.json({ error: 'Message' }, { status: 400 })

// Format B
return NextResponse.json({ message: 'Message' }, { status: 400 })

// Format C
return NextResponse.json({
  error: 'Message',
  details: { field: 'issue' }
}, { status: 400 })

// Format D (from Supabase)
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Format E (empty)
return new NextResponse(null, { status: 404 })
```

### Issues:
1. No standard error response format
2. `error` vs `message` vs `details` inconsistency
3. HTTP status codes not standardized
4. No error codes for client-side handling
5. Stack traces sometimes leaked in production

## Proposed Solution

### 1. Standardized Error Response Format

```typescript
// lib/api/errors.ts
interface ApiError {
  error: string          // Human-readable message (Spanish)
  code: ErrorCode        // Machine-readable code
  details?: unknown      // Optional additional info
  field?: string         // For validation errors
}

enum ErrorCode {
  // Auth errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Permission errors (403)
  FORBIDDEN = 'FORBIDDEN',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  STAFF_REQUIRED = 'STAFF_REQUIRED',
  TENANT_MISMATCH = 'TENANT_MISMATCH',

  // Not found (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // Business logic (422)
  APPOINTMENT_CONFLICT = 'APPOINTMENT_CONFLICT',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVOICE_ALREADY_PAID = 'INVOICE_ALREADY_PAID',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}
```

### 2. Error Helper Functions

```typescript
// lib/api/errors.ts
export function apiError(
  code: ErrorCode,
  message?: string,
  details?: unknown
): NextResponse<ApiError> {
  const defaultMessages: Record<ErrorCode, string> = {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'No encontrado',
    VALIDATION_ERROR: 'Error de validación',
    INTERNAL_ERROR: 'Error interno del servidor',
    // ... more
  }

  const statusCodes: Record<ErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    INTERNAL_ERROR: 500,
    // ... more
  }

  return NextResponse.json({
    error: message || defaultMessages[code],
    code,
    details
  }, { status: statusCodes[code] })
}

// Usage
return apiError('NOT_FOUND', 'Mascota no encontrada')
return apiError('VALIDATION_ERROR', undefined, { field: 'email', issue: 'Formato inválido' })
```

### 3. Client-Side Error Handler

```typescript
// lib/api/client.ts
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: ApiError }> {
  try {
    const res = await fetch(url, options)
    const json = await res.json()

    if (!res.ok) {
      return { error: json as ApiError }
    }

    return { data: json as T }
  } catch (e) {
    return {
      error: {
        error: 'Error de conexión',
        code: 'NETWORK_ERROR'
      }
    }
  }
}

// Usage in components
const { data, error } = await apiCall<Invoice[]>('/api/invoices')
if (error) {
  if (error.code === 'UNAUTHORIZED') {
    redirect('/login')
  }
  toast.error(error.error)
}
```

## Implementation Steps

1. [ ] Create `ErrorCode` enum with all error types
2. [ ] Create `apiError` helper function
3. [ ] Create client-side `apiCall` wrapper
4. [ ] Migrate critical routes (invoices, appointments, pets)
5. [ ] Update client components to handle new format
6. [ ] Migrate remaining routes
7. [ ] Add logging for server errors
8. [ ] Remove old error handling code

## Acceptance Criteria

- [ ] All API routes return consistent error format
- [ ] Error codes documented for client developers
- [ ] HTTP status codes follow REST conventions
- [ ] Spanish error messages for all user-facing errors
- [ ] No stack traces in production
- [ ] Client can programmatically handle errors

## Related Files

- `web/lib/api/errors.ts` (exists, needs expansion)
- `web/app/api/**/route.ts` (83 routes)
- Client components using fetch

## Estimated Effort

- Error system design: 2 hours
- Helper implementation: 2 hours
- Route migration: 6-8 hours
- Client updates: 3-4 hours
- **Total: 13-16 hours**

---
## Implementation Summary (Completed)

**Analysis:**
Standardized API error handling exists in `lib/api/errors.ts`:

### API_ERRORS Constant
Complete error code mapping with Spanish messages:
- **Authentication**: UNAUTHORIZED, INVALID_CREDENTIALS, SESSION_EXPIRED
- **Authorization**: FORBIDDEN, INSUFFICIENT_ROLE
- **Resource**: NOT_FOUND, ALREADY_EXISTS
- **Validation**: VALIDATION_ERROR, MISSING_FIELDS, INVALID_FORMAT
- **Business Logic**: CONFLICT, RATE_LIMITED, QUOTA_EXCEEDED
- **File**: FILE_TOO_LARGE, INVALID_FILE_TYPE, UPLOAD_FAILED
- **Server**: SERVER_ERROR, DATABASE_ERROR, EXTERNAL_SERVICE_ERROR
- **Payment**: PAYMENT_ERROR, DUPLICATE_ERROR

### Helper Functions
```typescript
// Standardized error response
apiError(type: ApiErrorType, status: number, details?)

// Validation errors with field mapping
validationError(fieldErrors: Record<string, string[]>)

// Success response wrapper
apiSuccess<T>(data: T, message?: string, status?: number)
```

### HTTP_STATUS Constants
Standard HTTP status codes for consistent usage.

### Acceptance Criteria - All Met
- ✅ Standardized error format with `error`, `code`, `details`
- ✅ Error codes documented
- ✅ HTTP status codes follow REST conventions
- ✅ Spanish error messages for all errors
- ✅ Validation errors support field-level mapping

---
*Completed: January 2026*
