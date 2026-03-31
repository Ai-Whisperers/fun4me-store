# REF-010: Standardize Error Handling Patterns

**Category**: Refactoring  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 3-4 days  
**Impact**: High - Consistency, maintainability  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-003)

## Summary

Three different error handling patterns exist across the codebase, making it difficult for frontend to handle errors consistently.

## Problem

### Current Patterns

**Pattern 1: API Error Helper**
```typescript
// lib/api/errors.ts
return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
  details: { message: 'Error al cargar' }
});
```

**Pattern 2: Direct NextResponse**
```typescript
// Some API routes
return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
```

**Pattern 3: Server Action Result**
```typescript
// Server actions
return { success: false, error: 'El nombre es obligatorio' };
```

### Issues

- Frontend doesn't know what error shape to expect
- Some errors have codes, some don't
- Some are Spanish, some are English
- Try/catch blocks are inconsistent
- Error handling logic duplicated across files

## Solution

### Create Unified Error Type

```typescript
// lib/errors.ts
export interface AppError {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'TENANT_MISMATCH'
  | 'RATE_LIMIT_EXCEEDED';

export const Errors = {
  unauthorized: (): AppError => ({
    code: 'UNAUTHORIZED',
    message: 'No autorizado',
    status: 401,
  }),
  
  validation: (field: string, message: string): AppError => ({
    code: 'VALIDATION_ERROR',
    message,
    status: 400,
    details: { field },
  }),
  
  notFound: (resource: string): AppError => ({
    code: 'NOT_FOUND',
    message: `${resource} no encontrado`,
    status: 404,
    details: { resource },
  }),
  
  database: (operation: string): AppError => ({
    code: 'DATABASE_ERROR',
    message: 'Error de base de datos',
    status: 500,
    details: { operation },
  }),
  
  // Add more as needed
};
```

### Create Error Response Helpers

```typescript
// lib/api/response.ts
import { AppError } from '@/lib/errors';
import { NextResponse } from 'next/server';

export function apiError(error: AppError) {
  return NextResponse.json(
    { error: error.message, code: error.code, details: error.details },
    { status: error.status }
  );
}

export function actionError<T = unknown>(error: AppError) {
  return {
    success: false as const,
    error: error.message,
    code: error.code,
    details: error.details,
  };
}

export function actionSuccess<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}
```

### Usage Examples

```typescript
// API Route
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return apiError(Errors.unauthorized());
  }
  
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (e) {
    return apiError(Errors.database('fetch'));
  }
}

// Server Action
export async function createPet(formData: FormData) {
  const name = formData.get('name');
  if (!name) {
    return actionError(Errors.validation('name', 'El nombre es obligatorio'));
  }
  
  try {
    const pet = await db.insert(pets).values({ name });
    return actionSuccess(pet);
  } catch (e) {
    return actionError(Errors.database('insert'));
  }
}
```

## Implementation Plan

### Phase 1: Create Error Infrastructure (1 day)
- [ ] Create `lib/errors.ts` with AppError type
- [ ] Create error factory functions
- [ ] Create response helpers
- [ ] Add unit tests for error helpers

### Phase 2: Migrate API Routes (1-2 days)
- [ ] Update all `/api` routes to use new pattern
- [ ] Ensure consistent error responses
- [ ] Test error handling

### Phase 3: Migrate Server Actions (1 day)
- [ ] Update all server actions
- [ ] Ensure consistent return types
- [ ] Update frontend error handling

### Phase 4: Update Frontend (1 day)
- [ ] Create error handling hook
- [ ] Update components to handle new error shape
- [ ] Add error boundary for unexpected errors

## Acceptance Criteria
- [ ] Single error type used throughout codebase
- [ ] All API routes use `apiError()` helper
- [ ] All server actions use `actionError()` / `actionSuccess()`
- [ ] Frontend error handling is consistent
- [ ] Error messages all in Spanish
- [ ] All errors have proper status codes
- [ ] Error types documented

## Related
- Documentation: Error handling guide
- REF-009: Split bloated server actions
- TECH-006: Create validated environment module
