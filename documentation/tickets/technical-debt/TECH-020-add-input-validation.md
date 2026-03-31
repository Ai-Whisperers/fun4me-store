# TECH-020: Add Input Validation to All API Routes

**Category**: Technical Debt  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 3-4 days  
**Impact**: High - Data integrity, security  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-005)

## Summary

Some routes validate input with Zod, many don't. Unvalidated input leads to database errors and potential injection vectors.

## Problem

**Some routes validate:**
```typescript
const schema = z.object({
  name: z.string().min(1),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
});
const body = schema.parse(await request.json());
```

**Some trust blindly:**
```typescript
const body = await request.json();
await supabase.from('appointments').insert(body);  // YOLO
```

**Impact:**
- Invalid data in database
- Cryptic Supabase errors to users
- Potential injection vectors
- Type safety compromised

## Solution

### Validation Decorator

```typescript
// lib/api/validation.ts
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: (data: T, ctx: AuthContext) => Promise<Response>) => {
    return withAuth(async (ctx) => {
      const body = await ctx.request.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        return apiError('VALIDATION_ERROR', 'Datos inválidos', 400, {
          errors: result.error.flatten(),
        });
      }
      
      return handler(result.data, ctx);
    });
  };
}

// Usage
export const POST = withValidation(createAppointmentSchema)(
  async (data, ctx) => {
    // data is typed and validated!
    await ctx.supabase.from('appointments').insert(data);
    return apiSuccess(data);
  }
);
```

### Create Schema Library

```typescript
// lib/schemas/appointments.ts
export const createAppointmentSchema = z.object({
  pet_id: z.string().uuid(),
  start_time: z.string().datetime(),
  duration: z.number().int().min(15).max(240),
  service_id: z.string().uuid(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
```

## Implementation Plan

1. **Audit routes** - Find all POST/PUT/PATCH without validation
2. **Create schemas** - Define Zod schemas for each resource
3. **Add decorator** - Create withValidation helper
4. **Migrate routes** - Apply validation to all routes
5. **Test** - Verify validation works and error messages are clear

## Acceptance Criteria
- [ ] All POST/PUT/PATCH routes validate input
- [ ] Validation errors return consistent format
- [ ] Schemas documented and typed
- [ ] Frontend receives clear error messages

## Related
- REF-010: Standardize error handling
- Type safety improvements
