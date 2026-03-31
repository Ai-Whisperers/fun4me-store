# SEC-007: Missing Request Body Schema Validation

## Priority: P2 (Medium)
## Category: Security / Validation
## Status: COMPLETED (Partial - Store Orders)

## Description
Multiple API endpoints accept complex request bodies without Zod schema validation, relying on implicit type coercion and runtime checks.

## Current State
### Examples of Missing Validation

**`app/api/store/orders/route.ts:150-160`**
```typescript
const body: CreateOrderInput = await request.json()
const { clinic, items, coupon_code, ... } = body
if (!clinic || !items || items.length === 0) { ... }
// No validation on item structure, addresses, etc.
```

**`app/api/cron/process-subscriptions/route.ts:75+`**
```typescript
// Processes subscription data without validating structure
for (const subscription of dueSubscriptions) {
  // Assumes data shape is correct
}
```

### Affected Endpoints
- `POST /api/store/orders` - Order creation
- `POST /api/lab-orders` - Lab order creation
- `POST /api/hospitalizations` - Admission creation
- `PATCH /api/appointments/[id]` - Status updates
- Various cron job data processing

### Impact
- Malformed requests reach business logic
- Unexpected errors in production
- Potential for injection via unexpected fields
- Type confusion vulnerabilities

## Proposed Solution

### 1. Create Shared Schemas
```typescript
// lib/schemas/store-order.ts
import { z } from 'zod'

const addressSchema = z.object({
  street: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  state: z.string().max(50).optional(),
  postal_code: z.string().min(2).max(20).optional(),
  country: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
})

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
  type: z.enum(['product', 'service']),
  requires_prescription: z.boolean().optional(),
})

export const createOrderSchema = z.object({
  clinic: z.string().min(1),
  items: z.array(orderItemSchema).min(1).max(50),
  coupon_code: z.string().max(50).optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  notes: z.string().max(1000).optional(),
})
```

### 2. Validation Wrapper
```typescript
// lib/api/with-validation.ts
import { z } from 'zod'
import { apiError } from './errors'

export function withValidation<T>(schema: z.Schema<T>) {
  return async (request: NextRequest): Promise<T> => {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message
      }))
      throw new ValidationError(errors)
    }

    return result.data
  }
}
```

### 3. Usage in Routes
```typescript
// app/api/store/orders/route.ts
export async function POST(request: NextRequest) {
  const body = await withValidation(createOrderSchema)(request)
  // body is now fully typed and validated
}
```

## Implementation Steps
1. Create Zod schemas for all POST/PATCH endpoints
2. Create validation wrapper utility
3. Update routes to use validation
4. Return structured validation errors
5. Add tests for invalid inputs

## Acceptance Criteria
- [ ] All POST/PATCH endpoints have Zod schemas
- [ ] Invalid requests return 400 with field-level errors
- [ ] Error messages in Spanish
- [ ] No business logic reached with invalid data
- [ ] Type safety maintained end-to-end

## Endpoints to Update
| Endpoint | Schema Needed |
|----------|---------------|
| `POST /api/store/orders` | createOrderSchema |
| `POST /api/lab-orders` | createLabOrderSchema |
| `POST /api/hospitalizations` | createHospitalizationSchema |
| `PATCH /api/appointments/[id]` | updateAppointmentSchema |
| `POST /api/pets` | createPetSchema |
| `POST /api/billing/invoices` | createInvoiceSchema |

## Related Files
- `web/lib/schemas/` (new folder)
- `web/lib/api/with-validation.ts` (new)
- All POST/PATCH API routes

## Estimated Effort
- Schema definitions: 4 hours
- Validation wrapper: 1 hour
- Route updates: 4 hours
- Testing: 2 hours
- **Total: 11 hours**

---
## Implementation Summary (Partial - Store Orders)

**Schema Added to:** `lib/schemas/store.ts`

**New Schemas Created:**
1. `shippingAddressSchema` - Validates street (5-255 chars), city (2-100), state, postal_code, country (default: Paraguay), phone, notes
2. `billingAddressSchema` - Validates name, RUC, street, city, state, postal_code, country
3. `orderItemSchema` - Validates product_id (UUID), variant_id, quantity (1-99), unit_price, discount_amount
4. `createStoreOrderSchema` - Full order validation with items array (1-50), coupon_code, addresses, shipping/payment methods, notes

**Updated Route:** `app/api/store/orders/route.ts`
- Added Zod validation using `createStoreOrderSchema.safeParse(body)`
- Returns 400 with field-level errors on validation failure
- Error messages in Spanish

**Remaining Work:**
Other endpoints listed in ticket (lab-orders, hospitalizations, etc.) still need similar Zod validation schemas.

---
*Ticket created: January 2026*
*Partially completed: January 2026*
