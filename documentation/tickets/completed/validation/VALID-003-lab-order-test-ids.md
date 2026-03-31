# VALID-003: Lab Order Test ID Validation

## Priority: P2 (Medium)
## Category: Validation
## Status: COMPLETED

## Description
Lab order creation accepts test_ids array without validating that the values are valid UUIDs or that the tests exist for the tenant.

## Current State
### Current Code
**`app/api/lab-orders/route.ts:69-78`**
```typescript
const { pet_id, test_ids, panel_ids, priority, lab_type, fasting_status, clinical_notes } = body

if (!pet_id || !test_ids || test_ids.length === 0) {
  return apiError('MISSING_FIELDS', 'Pet ID and at least one test required', 400)
}

// PROBLEM: No validation that test_ids are UUIDs
// PROBLEM: No validation that tests exist
// PROBLEM: No validation that tests belong to this tenant

// Later in code:
const items = test_ids.map((testId: string) => ({
  lab_order_id: order.id,
  test_id: testId,  // Could be anything!
  status: 'pending',
}))

await supabase.from('lab_order_items').insert(items)
// May fail with FK violation, or worse - could reference wrong tenant's test
```

### Issues
1. Invalid UUIDs cause database errors
2. Non-existent test IDs cause FK violations
3. Tests from other tenants could be referenced
4. No limit on number of tests per order

## Proposed Solution

### Zod Schema
```typescript
// lib/schemas/lab-order.ts
import { z } from 'zod'

export const createLabOrderSchema = z.object({
  pet_id: z.string().uuid('ID de mascota inválido'),
  test_ids: z.array(z.string().uuid('ID de prueba inválido'))
    .min(1, 'Se requiere al menos una prueba')
    .max(20, 'Máximo 20 pruebas por orden'),
  panel_ids: z.array(z.string().uuid('ID de panel inválido'))
    .max(5, 'Máximo 5 paneles por orden')
    .optional(),
  priority: z.enum(['routine', 'urgent', 'stat'])
    .default('routine'),
  lab_type: z.enum(['in_house', 'external', 'reference'])
    .default('in_house'),
  fasting_status: z.enum(['fasted', 'not_fasted', 'unknown'])
    .default('unknown'),
  clinical_notes: z.string()
    .max(2000, 'Las notas son muy largas')
    .optional(),
  collection_time: z.string().datetime().optional(),
  specimen_type: z.string().max(100).optional(),
})
```

### Validate Tests Exist for Tenant
```typescript
// app/api/lab-orders/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Schema validation
  const result = createLabOrderSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({
      error: 'Datos inválidos',
      details: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }))
    }, { status: 400 })
  }

  const { test_ids, panel_ids } = result.data

  // Verify all tests exist and belong to tenant
  const { data: validTests, error: testError } = await supabase
    .from('lab_test_catalog')
    .select('id')
    .in('id', test_ids)
    .eq('tenant_id', tenantId)

  if (testError || !validTests) {
    return apiError('DATABASE_ERROR', 'Error al verificar pruebas', 500)
  }

  // Check all requested tests were found
  const validTestIds = new Set(validTests.map(t => t.id))
  const invalidTests = test_ids.filter(id => !validTestIds.has(id))

  if (invalidTests.length > 0) {
    return NextResponse.json({
      error: 'Pruebas no encontradas',
      details: invalidTests.map(id => ({
        field: 'test_ids',
        message: `Prueba ${id} no encontrada o no disponible`
      }))
    }, { status: 400 })
  }

  // Proceed with validated and verified test IDs...
}
```

### Database Constraint (Defense in Depth)
```sql
-- Ensure lab_order_items.test_id references valid test
ALTER TABLE lab_order_items
ADD CONSTRAINT fk_lab_order_items_test
FOREIGN KEY (test_id)
REFERENCES lab_test_catalog(id);
```

## Implementation Steps
1. Create Zod schema for lab orders
2. Validate UUIDs with Zod
3. Verify tests exist for tenant
4. Return specific error for invalid tests
5. Add database FK constraint
6. Test with invalid inputs

## Acceptance Criteria
- [ ] Invalid UUIDs rejected at validation
- [ ] Non-existent tests rejected with clear message
- [ ] Tests from other tenants rejected
- [ ] Max 20 tests per order enforced
- [ ] FK constraint prevents invalid inserts

## Related Files
- `web/lib/schemas/lab-order.ts` (new)
- `web/app/api/lab-orders/route.ts`
- `web/db/migrations/xxx_lab_order_fk.sql` (new)

## Estimated Effort
- Schema: 1 hour
- API validation: 1 hour
- Migration: 30 minutes
- Testing: 1 hour
- **Total: 3.5 hours**

---
## Implementation Summary (Completed)

**Files Modified:**
- `app/api/lab-orders/route.ts`

**Changes Made:**
1. **Zod schema validation:**
   - `pet_id`: UUID validation
   - `test_ids`: Array of UUIDs, min 1, max 20
   - `panel_ids`: Array of UUIDs, max 5 (optional)
   - `priority`: Enum validation (routine, urgent, stat)
   - `lab_type`: Enum validation (in_house, external, reference)
   - `fasting_status`: Enum validation
   - `clinical_notes`: Max 2000 chars, trimmed

2. **Test existence verification:**
   - Query `lab_test_catalog` for all test_ids
   - Verify tenant_id matches
   - Return specific error for each invalid test ID

3. **Panel existence verification:**
   - Query `lab_panels` for all panel_ids
   - Verify tenant_id matches
   - Return specific error for each invalid panel ID

**Validation behavior:**
- Invalid UUIDs rejected with Zod error
- Non-existent tests rejected with "Prueba xxx... no encontrada"
- Tests from other tenants rejected (same error, doesn't leak tenant info)
- Max 20 tests per order enforced
- Max 5 panels per order enforced

---
*Completed: January 2026*
