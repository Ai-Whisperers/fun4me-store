# EPIC-004: API Standardization

**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 1.5 weeks  
**Risk Level**: LOW  
**Dependencies**: EPIC-003 (Type Safety)

## Overview

Standardize all API routes to use consistent validation (Zod), error handling (`apiError`/`apiSuccess`), authentication (`withApiAuth`), and response formats.

## Current State

- 19+ routes without Zod validation
- 12+ routes with inconsistent response formats
- 3 routes with manual authentication
- Duplicate logic in lost-pets/lost-found

## Target State

- 100% Zod validation coverage
- Standardized error/success responses
- All routes use `withApiAuth` wrapper
- Single, consolidated lost-pets route

## Tickets

### TICKET-API-001: Add Zod Schemas to All Routes

**Priority**: HIGH  
**Effort**: 3 days

Create schemas for 19+ routes missing validation:
- `lost-pets`, `lost-found`
- `inventory/adjust`, `inventory/receive`
- `notifications`, `growth_charts`
- 13 more...

**Template**:
```typescript
import { z } from 'zod'

const createLostPetSchema = z.object({
  pet_id: z.string().uuid('ID inválido'),
  status: z.enum(['lost', 'found', 'reunited']),
  last_seen_location: z.string().min(1, 'Ubicación requerida'),
  last_seen_date: z.string().datetime('Fecha inválida'),
  description: z.string().optional(),
  photo_url: z.string().url('URL inválida').optional(),
})

export const POST = withApiAuth(async ({ request, profile, supabase }) => {
  const body = await request.json()
  const validation = createLostPetSchema.safeParse(body)
  
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      field_errors: validation.error.flatten().fieldErrors
    })
  }
  
  // Use validation.data (typed!)
})
```

---

### TICKET-API-002: Standardize Error Response Formats

**Priority**: MEDIUM  
**Effort**: 2 days

Replace all custom error returns with `apiError`:

```typescript
// Before
return NextResponse.json({ error: 'Not found' }, { status: 404 })
return new NextResponse('Unauthorized', { status: 401 })

// After
return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
```

**Acceptance Criteria**:
- [ ] All routes use `apiError`/`apiSuccess`
- [ ] Consistent error format across all endpoints
- [ ] Spanish error messages
- [ ] Validation errors use `field_errors` structure

---

### TICKET-API-003: Consolidate Lost Pets Routes

**Priority**: LOW  
**Effort**: 1 day

Merge duplicate routes:
- `web/app/api/lost-pets/route.ts`
- `web/app/api/lost-found/route.ts`

Keep one route with:
- Proper tenant isolation
- Zod validation
- RLS policies
- Standard responses

---

### TICKET-API-004: Migrate All Routes to withApiAuth

**Priority**: MEDIUM  
**Effort**: 2 days

Convert manual auth routes:
- `ambassador/route.ts`
- `gdpr/route.ts`
- Review `signup/route.ts` (might be intentional)

---

## Success Metrics

- [ ] 100% Zod validation coverage
- [ ] Zero custom error responses
- [ ] All routes use `withApiAuth`
- [ ] API documentation auto-generated from schemas

