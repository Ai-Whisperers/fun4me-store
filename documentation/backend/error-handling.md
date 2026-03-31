# Error Handling System

Standardized API error responses and error management across the Vete platform.

> **Location**: `web/lib/api/errors.ts`
> **Last Updated**: January 2026
> **Ticket**: ARCH-007

---

## Overview

The error handling system provides:
- Standardized error codes and messages (in Spanish)
- Type-safe error response generation
- Consistent API response structure
- HTTP status code reference

---

## Error Response Structure

### Error Response

```typescript
interface ApiErrorResponse {
  error: string          // Human-readable message (Spanish)
  code: string           // Machine-readable error code
  details?: Record<string, unknown>  // Additional context
  field_errors?: Record<string, string[]>  // Field-level validation errors
}
```

### Success Response

```typescript
interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string  // Optional success message
}
```

---

## Error Codes Reference

### Authentication Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `UNAUTHORIZED` | No autorizado | 401 | User not logged in |
| `INVALID_CREDENTIALS` | Credenciales inválidas | 401 | Wrong email/password |
| `SESSION_EXPIRED` | Sesión expirada | 401 | Token expired |

### Authorization Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `FORBIDDEN` | Sin permisos para esta acción | 403 | Access denied |
| `INSUFFICIENT_ROLE` | Rol insuficiente para esta acción | 403 | Wrong role (e.g., owner trying vet action) |

### Resource Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `NOT_FOUND` | Recurso no encontrado | 404 | Entity doesn't exist |
| `ALREADY_EXISTS` | El recurso ya existe | 409 | Duplicate resource |

### Validation Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `VALIDATION_ERROR` | Datos inválidos | 400 | Input validation failed |
| `MISSING_FIELDS` | Campos requeridos faltantes | 400 | Required fields not provided |
| `INVALID_FORMAT` | Formato de datos inválido | 400 | Wrong data format |

### Business Logic Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `CONFLICT` | Conflicto con datos existentes | 409 | Business rule violation |
| `RATE_LIMITED` | Demasiadas solicitudes. Intente más tarde. | 429 | Rate limit exceeded |
| `QUOTA_EXCEEDED` | Límite excedido | 429 | Quota/limit reached |

### File Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `FILE_TOO_LARGE` | Archivo muy grande | 413 | File size exceeds limit |
| `INVALID_FILE_TYPE` | Tipo de archivo no permitido | 415 | Unsupported file format |
| `UPLOAD_FAILED` | Error al subir archivo | 500 | Upload failure |

### Server Errors

| Code | Error (Spanish) | HTTP Status | Use Case |
|------|-----------------|-------------|----------|
| `SERVER_ERROR` | Error interno del servidor | 500 | Unexpected error |
| `DATABASE_ERROR` | Error de base de datos | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | Error de servicio externo | 503 | Third-party API failure |

---

## Usage

### Basic Error Response

```typescript
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

// Simple error
return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)

// Error with details
return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
  details: { resource: 'pet', id: petId }
})
```

### Validation Error with Field Errors

```typescript
import { validationError } from '@/lib/api/errors'

return validationError({
  email: ['Email es requerido', 'Formato inválido'],
  password: ['Mínimo 8 caracteres'],
})
```

### Success Response

```typescript
import { apiSuccess } from '@/lib/api/errors'

// Simple success
return apiSuccess(data)

// Success with message
return apiSuccess(data, 'Mascota creada exitosamente', HTTP_STATUS.CREATED)
```

### Complete API Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getUser()
    if (!user) {
      return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
    }

    // Fetch data
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id)

    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('API error:', error)
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
```

---

## HTTP Status Codes

The `HTTP_STATUS` constant provides type-safe status codes:

```typescript
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}
```

---

## Type Definitions

### ApiErrorType

```typescript
type ApiErrorType =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_ROLE'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'MISSING_FIELDS'
  | 'INVALID_FORMAT'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED'
  | 'SERVER_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
```

---

## Best Practices

### DO

- Use standardized error codes from `API_ERRORS`
- Include helpful details for debugging (in `details` field)
- Use field-level errors for validation failures
- Log errors before returning responses
- Use Spanish messages for user-facing errors

### DON'T

- Create custom error codes outside the standard set
- Expose sensitive information in error details
- Return generic 500 errors without logging
- Use English error messages (Spanish market)

---

## Integration with Auth Wrappers

When using `withApiAuth`, errors are automatically handled:

```typescript
import { withApiAuth } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export const GET = withApiAuth(
  async ({ profile, supabase }) => {
    const { data, error } = await supabase
      .from('pets')
      .select('*')

    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
```

The wrapper automatically handles:
- Authentication failures → `UNAUTHORIZED`
- Role mismatches → `INSUFFICIENT_ROLE`
- Rate limiting → `RATE_LIMITED`

---

## Related Documentation

- [Authentication Patterns](authentication-patterns.md)
- [Rate Limiting](rate-limiting.md)
- [API Overview](../api/overview.md)
- [Logger System](logging-and-monitoring.md)
