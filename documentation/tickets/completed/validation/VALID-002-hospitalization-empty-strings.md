# VALID-002: Hospitalization Empty String Check

## Priority: P2 (Medium)
## Category: Validation
## Status: COMPLETED
## Epic: [EPIC-03: Input Validation](../epics/EPIC-03-input-validation.md)

## Description
Hospitalization creation validation uses JavaScript falsy checks, which allow empty strings to pass validation.

## Current State
### Current Code
**`app/api/hospitalizations/route.ts:65-85`**
```typescript
const {
  pet_id,
  kennel_id,
  hospitalization_type,
  admission_diagnosis,
  primary_vet_id,
  // ...
} = body

// PROBLEM: Empty string "" is falsy but passes this check
if (!pet_id || !kennel_id || !hospitalization_type || !admission_diagnosis) {
  return apiError('MISSING_FIELDS', 'Faltan campos requeridos', 400)
}

// Empty string "" would pass the check above
// But then fail at database constraint or cause issues
```

### JavaScript Falsy Values
```javascript
// These all evaluate to false:
!null      // true - correctly caught
!undefined // true - correctly caught
!""        // true - BUT empty string passes destructuring!
!0         // true - number zero
!false     // true - boolean false

// When body has: { admission_diagnosis: "" }
const { admission_diagnosis } = body  // admission_diagnosis = ""
if (!admission_diagnosis) // "" is falsy, so this DOES catch it

// But when body has: { admission_diagnosis: "   " }
const { admission_diagnosis } = body  // admission_diagnosis = "   "
if (!admission_diagnosis) // "   " is truthy! This passes!
```

### Real Issue
- Whitespace-only strings pass validation: `"   "`
- Database may accept them, creating bad data
- No length validation
- No format validation

## Proposed Solution

### Zod Schema
```typescript
// lib/schemas/hospitalization.ts
import { z } from 'zod'

export const createHospitalizationSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  kennel_id: z.string().uuid('ID de canil inválido'),
  hospitalization_type: z.enum([
    'observation',
    'treatment',
    'surgery',
    'critical_care',
    'post_operative'
  ], {
    errorMap: () => ({ message: 'Tipo de hospitalización inválido' })
  }),
  admission_diagnosis: z.string()
    .min(3, 'El diagnóstico debe tener al menos 3 caracteres')
    .max(500, 'El diagnóstico es muy largo')
    .transform(s => s.trim()),  // Trim whitespace!
  primary_vet_id: z.string().uuid('ID de veterinario inválido'),
  secondary_vet_id: z.string().uuid().optional(),
  admission_notes: z.string()
    .max(2000, 'Las notas son muy largas')
    .transform(s => s.trim())
    .optional(),
  estimated_discharge_date: z.string()
    .datetime({ message: 'Fecha de alta estimada inválida' })
    .optional(),
  acuity_level: z.enum(['low', 'medium', 'high', 'critical'])
    .default('medium'),
  diet_restrictions: z.string().max(500).optional(),
  isolation_required: z.boolean().default(false),
})

export type CreateHospitalizationInput = z.infer<typeof createHospitalizationSchema>
```

### Updated API Route
```typescript
// app/api/hospitalizations/route.ts
import { createHospitalizationSchema } from '@/lib/schemas/hospitalization'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const result = createHospitalizationSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({
      error: 'Datos de hospitalización inválidos',
      details: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }))
    }, { status: 400 })
  }

  const data = result.data
  // data.admission_diagnosis is now guaranteed to be:
  // - Not empty
  // - Not whitespace-only
  // - Trimmed
  // - At least 3 characters

  // Proceed with validated data...
}
```

## Implementation Steps
1. Create Zod schema for hospitalization
2. Add transform to trim strings
3. Update API to use schema validation
4. Return field-level errors
5. Test edge cases (whitespace, empty, too long)

## Acceptance Criteria
- [ ] Empty strings rejected
- [ ] Whitespace-only strings rejected
- [ ] All strings trimmed before storage
- [ ] Minimum lengths enforced
- [ ] Spanish error messages

## Related Files
- `web/lib/schemas/hospitalization.ts` (new)
- `web/app/api/hospitalizations/route.ts`
- `web/components/hospitalization/admission-form.tsx`

## Estimated Effort
- Schema: 1 hour
- API update: 1 hour
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Modified:**
- `lib/schemas/common.ts` - Updated `requiredString` and `optionalString` to trim whitespace
- `app/api/hospitalizations/route.ts` - Added Zod validation schemas for POST and PATCH

**Changes Made:**
1. **common.ts updates:**
   - `requiredString`: Now uses `.transform(s => s.trim())` then validates min length
   - `optionalString`: Now trims and converts empty/whitespace to undefined
   - All schemas using these helpers now automatically reject whitespace-only strings

2. **Hospitalizations API updates:**
   - Added `createHospitalizationSchema` with Zod validation
   - Added `updateHospitalizationSchema` with Zod validation
   - POST handler now validates with `safeParse()` before processing
   - PATCH handler now validates with `safeParse()` before processing
   - Field-level Spanish error messages returned

**Validation behavior:**
- `""` (empty string) -> rejected with "es requerido"
- `"   "` (whitespace only) -> rejected (trimmed to empty)
- `"valid text"` -> accepted and stored trimmed
- `"  text  "` -> accepted as "text" (trimmed)

---
*Completed: January 2026*
