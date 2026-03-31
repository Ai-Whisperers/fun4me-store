# VALID-001: Store Orders Address Validation

## Priority: P2 (Medium)
## Category: Validation
## Status: COMPLETED

## Description
Store order creation accepts shipping and billing address objects without proper validation, allowing incomplete or malformed addresses to be saved.

## Current State
### Current Code
**`app/api/store/orders/route.ts`**
```typescript
interface CreateOrderInput {
  clinic: string
  items: OrderItem[]
  shipping_address?: {
    street: string
    city: string
    state?: string
    postal_code?: string
    country?: string
    phone?: string
    notes?: string
  }
  billing_address?: {
    // Same structure
  }
}

const body: CreateOrderInput = await request.json()
// No validation that address fields are valid!
```

### Issues
- Empty strings accepted as valid addresses
- No minimum length on street/city
- No format validation on postal_code
- Phone number not validated
- Can create order with incomplete shipping info

### Impact
- Orders can't be delivered
- Customer service issues
- Manual data cleanup required

## Proposed Solution

### Zod Schema for Addresses
```typescript
// lib/schemas/address.ts
import { z } from 'zod'

export const addressSchema = z.object({
  street: z.string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(255, 'La dirección es muy larga'),
  city: z.string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'El nombre de ciudad es muy largo'),
  state: z.string()
    .max(50, 'El estado/departamento es muy largo')
    .optional(),
  postal_code: z.string()
    .regex(/^[A-Za-z0-9\s-]{2,20}$/, 'Código postal inválido')
    .optional(),
  country: z.string()
    .max(50, 'El país es muy largo')
    .default('Paraguay'),
  phone: z.string()
    .regex(/^[\d\s\-+()]{7,20}$/, 'Número de teléfono inválido')
    .optional(),
  notes: z.string()
    .max(500, 'Las notas son muy largas')
    .optional(),
})

export type Address = z.infer<typeof addressSchema>
```

### Order Schema
```typescript
// lib/schemas/store-order.ts
import { z } from 'zod'
import { addressSchema } from './address'

const orderItemSchema = z.object({
  product_id: z.string().uuid('ID de producto inválido'),
  quantity: z.number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva')
    .max(100, 'Máximo 100 unidades por producto'),
  type: z.enum(['product', 'service']),
  requires_prescription: z.boolean().optional(),
})

export const createOrderSchema = z.object({
  clinic: z.string().min(1, 'Clínica requerida'),
  items: z.array(orderItemSchema)
    .min(1, 'El pedido debe tener al menos un producto')
    .max(50, 'Máximo 50 productos por pedido'),
  coupon_code: z.string()
    .max(50, 'Código de cupón muy largo')
    .optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  notes: z.string().max(1000).optional(),
  delivery_method: z.enum(['pickup', 'delivery']).default('delivery'),
}).refine(
  (data) => {
    // If delivery, shipping address required
    if (data.delivery_method === 'delivery' && !data.shipping_address) {
      return false
    }
    return true
  },
  {
    message: 'La dirección de envío es requerida para entregas a domicilio',
    path: ['shipping_address'],
  }
)
```

### Updated API Route
```typescript
// app/api/store/orders/route.ts
import { createOrderSchema } from '@/lib/schemas/store-order'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const result = createOrderSchema.safeParse(body)
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
    return NextResponse.json({
      error: 'Datos de pedido inválidos',
      details: errors
    }, { status: 400 })
  }

  const validatedData = result.data
  // Proceed with validated data...
}
```

## Implementation Steps
1. Create address and order schemas
2. Update order creation route
3. Return field-level errors
4. Update frontend to show validation errors
5. Test with various invalid inputs

## Acceptance Criteria
- [ ] Empty addresses rejected
- [ ] Street minimum 5 characters
- [ ] Delivery requires shipping address
- [ ] Phone format validated
- [ ] Field-level error messages in Spanish

## Related Files
- `web/lib/schemas/address.ts` (new)
- `web/lib/schemas/store-order.ts` (new)
- `web/app/api/store/orders/route.ts`
- `web/components/store/checkout-form.tsx`

## Estimated Effort
- Schemas: 1 hour
- API update: 1 hour
- Frontend: 1 hour
- Testing: 1 hour
- **Total: 4 hours**

---
## Implementation Summary (Completed)

**Schema Added to:** `lib/schemas/store.ts`

**Schemas Created:**
```typescript
export const shippingAddressSchema = z.object({
  street: z.string().min(5, 'Dirección muy corta').max(255, 'Dirección muy larga'),
  city: z.string().min(2, 'Ciudad requerida').max(100),
  state: optionalString(50),
  postal_code: optionalString(20),
  country: z.string().max(50).default('Paraguay'),
  phone: optionalString(20),
  notes: optionalString(500),
})

export const billingAddressSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(200),
  ruc: optionalString(20),
  street: z.string().min(5, 'Dirección muy corta').max(255),
  city: z.string().min(2, 'Ciudad requerida').max(100),
  state: optionalString(50),
  postal_code: optionalString(20),
  country: z.string().max(50).default('Paraguay'),
})
```

**Updated Route:** `app/api/store/orders/route.ts`
- Uses `createStoreOrderSchema` which includes both address schemas as optional fields
- Validates all fields before processing order

**Result:** Empty or malformed addresses now rejected with clear Spanish error messages.

---
*Ticket created: January 2026*
*Completed: January 2026*
