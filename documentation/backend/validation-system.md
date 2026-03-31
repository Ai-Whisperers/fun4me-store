# Validation System

Zod-based validation schemas and Server Action result patterns for type-safe data handling.

> **Location**: `web/lib/schemas/` and `web/lib/actions/`
> **Last Updated**: January 2026
> **Ticket**: ARCH-005

---

## Overview

The validation system provides:
- Zod schemas for input validation
- Spanish error messages throughout
- Reusable schema helpers
- Standardized Server Action result types
- Type inference from schemas

---

## Schema Organization

```
lib/schemas/
├── index.ts           # Re-exports all schemas
├── common.ts          # Shared primitives (UUID, email, pagination)
├── pet.ts             # Pet-related schemas
├── appointment.ts     # Appointment schemas
├── invoice.ts         # Invoice/billing schemas
├── auth.ts            # Authentication schemas
├── medical.ts         # Medical records schemas
├── hospitalization.ts # Hospitalization schemas
├── laboratory.ts      # Lab order schemas
├── insurance.ts       # Insurance schemas
├── messaging.ts       # Messaging schemas
├── store.ts           # E-commerce schemas
└── settings.ts        # Settings schemas
```

---

## Common Schemas

### Primitive Validators

```typescript
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  dateStringSchema,
  futureDateSchema,
  pastDateSchema,
  currencySchema,
  percentageSchema,
} from '@/lib/schemas'

// UUID validation
const id = uuidSchema.parse('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

// Email validation
const email = emailSchema.parse('user@example.com')

// Phone (Paraguay format)
const phone = phoneSchema.parse('+595981234567')

// ISO date string
const date = dateStringSchema.parse('2026-01-04T10:00:00Z')

// Currency (auto-rounds to 2 decimals)
const price = currencySchema.parse(19.999) // → 20.00
```

### Pagination Schema

```typescript
import { paginationSchema, sortSchema, searchSchema } from '@/lib/schemas'

// Pagination
const params = paginationSchema.parse({
  page: '2',        // Coerced to number
  limit: '50',      // Coerced to number
})
// → { page: 2, limit: 50 }

// Sorting
const sort = sortSchema.parse({
  sortBy: 'created_at',
  sortOrder: 'desc',
})

// Search
const search = searchSchema.parse({
  q: 'fluffy',
  filter: { species: 'dog' },
})
```

### String Helpers

```typescript
import { requiredString, optionalString, enumSchema } from '@/lib/schemas'

// Required with Spanish error
const name = requiredString('Nombre', 50)
// Error: "Nombre es requerido" or "Nombre muy largo (máx 50 caracteres)"

// Optional with max length
const notes = optionalString(1000)
// Transforms empty strings to undefined

// Enum with Spanish error
const status = enumSchema(['pending', 'confirmed', 'cancelled'], 'Estado')
// Error: "Estado inválido"
```

---

## Domain Schemas

### Pet Schemas

```typescript
import {
  createPetSchema,
  updatePetSchema,
  petQuerySchema,
  deletePetSchema,
  PET_SPECIES,
  PET_GENDERS,
  type CreatePetInput,
  type UpdatePetInput,
} from '@/lib/schemas'

// Create pet
const petData = createPetSchema.parse({
  name: 'Luna',
  species: 'dog',
  breed: 'Labrador',
  gender: 'female',
  birth_date: '2022-01-15',
  weight: 25.5,
})

// Update (all fields optional except id)
const updateData = updatePetSchema.parse({
  id: 'abc-123',
  weight: 26.0,
})

// Query parameters
const queryParams = petQuerySchema.parse({
  species: 'dog',
  search: 'Luna',
  page: 0,
  limit: 20,
})
```

### Available Species and Genders

```typescript
const PET_SPECIES = [
  'dog', 'cat', 'bird', 'rabbit',
  'hamster', 'fish', 'reptile', 'other'
] as const

const PET_GENDERS = ['male', 'female', 'unknown'] as const
```

---

## Using Schemas in API Routes

### Basic Validation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createPetSchema } from '@/lib/schemas'
import { validationError } from '@/lib/api/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createPetSchema.parse(body)

    // Use validated data...
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Convert Zod errors to field errors
      const fieldErrors: Record<string, string[]> = {}
      error.errors.forEach((e) => {
        const path = e.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(e.message)
      })
      return validationError(fieldErrors)
    }
    throw error
  }
}
```

### With safeParse

```typescript
const result = createPetSchema.safeParse(body)

if (!result.success) {
  return validationError(formatZodErrors(result.error))
}

const data = result.data  // Type-safe data
```

---

## Server Action Results

### ActionResult Type

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: FieldErrors }

type FieldErrors = Record<string, string>
```

### Result Helpers

```typescript
import { actionSuccess, actionError } from '@/lib/actions/result'

// Success with data
return actionSuccess({ id: 'abc-123', name: 'Luna' })

// Success without data
return actionSuccess()

// Error
return actionError('No autorizado')

// Error with field errors
return actionError('Por favor corrige los errores', {
  name: 'Nombre es requerido',
  weight: 'Peso debe ser positivo',
})
```

### Type Guards

```typescript
import { isSuccess, isError } from '@/lib/types/action-result'

const result = await createPet(formData)

if (isSuccess(result)) {
  console.log(result.data)  // Type-safe access
} else {
  console.error(result.error)
  console.error(result.fieldErrors)
}
```

---

## Using Schemas in Server Actions

```typescript
'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/actions/result'
import { createPetSchema, type CreatePetInput } from '@/lib/schemas'
import type { ActionResult } from '@/lib/types/action-result'

interface Pet {
  id: string
  name: string
  species: string
}

export const createPet = withActionAuth<Pet, [CreatePetInput]>(
  async ({ profile, supabase }, input) => {
    // Validate input
    const result = createPetSchema.safeParse(input)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((e) => {
        fieldErrors[e.path.join('.')] = e.message
      })
      return actionError('Datos inválidos', fieldErrors)
    }

    // Create pet
    const { data, error } = await supabase
      .from('pets')
      .insert({
        ...result.data,
        owner_id: profile.id,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) {
      return actionError('Error al crear mascota')
    }

    return actionSuccess(data)
  }
)
```

---

## Creating Custom Schemas

### Basic Schema

```typescript
import { z } from 'zod'
import { uuidSchema, requiredString, currencySchema } from './common'

export const createProductSchema = z.object({
  name: requiredString('Nombre', 100),
  sku: requiredString('SKU', 50),
  price: currencySchema,
  category_id: uuidSchema,
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
```

### With Refinements

```typescript
export const dateRangeSchema = z.object({
  start_date: dateStringSchema,
  end_date: dateStringSchema,
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['end_date'],
  }
)
```

### With Transforms

```typescript
export const importDataSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .transform((val) => val.toLowerCase().trim()),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ''))  // Remove non-digits
    .pipe(phoneSchema),
})
```

---

## Error Messages (Spanish)

All schemas use Spanish error messages:

| Validation | Error Message |
|------------|---------------|
| Required | "X es requerido" |
| Max length | "X muy largo (máx N caracteres)" |
| Invalid email | "Formato de email inválido" |
| Invalid phone | "Número de teléfono inválido" |
| Invalid date | "Fecha inválida" |
| Future date | "La fecha debe ser futura" |
| Past date | "La fecha debe ser pasada o actual" |
| Positive number | "El monto debe ser positivo" |
| Invalid UUID | "ID inválido" |
| Invalid enum | "X inválido" |

---

## Best Practices

### DO

- Import schemas from `@/lib/schemas`
- Use `safeParse` for non-throwing validation
- Include Spanish error messages
- Use type inference: `z.infer<typeof schema>`
- Create reusable schemas in the schemas folder
- Use `requiredString` and `optionalString` helpers

### DON'T

- Use English error messages
- Skip validation in API routes
- Trust client-provided data without validation
- Duplicate validation logic across routes
- Use `parse` when errors should be handled gracefully

---

## Schema Index

| Schema | File | Purpose |
|--------|------|---------|
| `createPetSchema` | pet.ts | Create new pet |
| `updatePetSchema` | pet.ts | Update existing pet |
| `createAppointmentSchema` | appointment.ts | Book appointment |
| `createInvoiceSchema` | invoice.ts | Create invoice |
| `createMedicalRecordSchema` | medical.ts | Add medical record |
| `loginSchema` | auth.ts | User login |
| `registerSchema` | auth.ts | User registration |
| `createProductSchema` | store.ts | Add product |
| `checkoutSchema` | store.ts | Process checkout |
| `createLabOrderSchema` | laboratory.ts | Order lab tests |
| `admitPatientSchema` | hospitalization.ts | Admit patient |

---

## Related Documentation

- [Error Handling](error-handling.md)
- [Authentication Patterns](authentication-patterns.md)
- [API Overview](../api/overview.md)
