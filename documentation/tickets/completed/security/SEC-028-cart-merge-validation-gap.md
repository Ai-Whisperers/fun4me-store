# SEC-028 Cart POST (Merge) Lacks Request Body Validation

## Priority: P2

## Category: Security

## Status: Completed

## Resolution
1. Created `fullCartItemSchema` with comprehensive Zod validation in `lib/schemas/store.ts`
2. Created `cartSyncSchema` and `cartMergeSchema` for PUT/POST requests
3. Applied Zod validation to both PUT and POST handlers in `app/api/store/cart/route.ts`

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

The POST endpoint for cart merging does minimal validation on `localItems`. While it checks `Array.isArray(localItems)`, it does not validate the structure of each item using a Zod schema.

### Current State

**File**: `web/app/api/store/cart/route.ts` (lines 233-248)

```typescript
const { items: localItems, clinic } = await request.json()

if (!Array.isArray(localItems)) {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
    details: { message: 'Items inválidos' },
  })
}

// MISSING: Validation of item structure
// Each item could have arbitrary properties or wrong types
```

### Risk

Malformed cart items could:
- Cause downstream errors in checkout
- Be stored in database with unexpected properties
- Potentially exploit type coercion bugs
- Increase attack surface

## Impact

**Security Risk: LOW-MEDIUM**
- Input validation gap
- Potential for unexpected data in database
- Type confusion attacks

## Proposed Fix

Apply Zod schema validation similar to `checkoutRequestSchema`:

```typescript
import { z } from 'zod'

const cartItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  price: z.number().positive().finite(),
  quantity: z.number().int().positive().max(100),
  type: z.enum(['service', 'product']),
  image_url: z.string().url().optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  requires_prescription: z.boolean().optional(),
  pet_id: z.string().uuid().optional(),
  pet_name: z.string().optional(),
  service_id: z.string().uuid().optional(),
  variant_name: z.string().optional(),
})

const cartMergeSchema = z.object({
  items: z.array(cartItemSchema).max(50),
  clinic: z.string().optional(),
})

// In POST handler:
export async function POST(request: NextRequest) {
  // ... auth ...

  const body = await request.json()
  const validation = cartMergeSchema.safeParse(body)

  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { items: localItems } = validation.data
  // ... rest of handler with validated data ...
}
```

## Acceptance Criteria

- [ ] Create `cartItemSchema` Zod schema
- [ ] Apply validation to Cart POST endpoint
- [ ] Apply same validation to Cart PUT endpoint
- [ ] Test: Submit malformed items → Returns 400 with validation errors
- [ ] Test: Submit valid items → Works as before
- [ ] Add comment `// SEC-028: Cart items validated with Zod`

## Related Files

- `web/app/api/store/cart/route.ts`
- `web/lib/schemas/store.ts`

## Estimated Effort

1-2 hours

## Security Severity

**LOW-MEDIUM** - Input validation hardening.
