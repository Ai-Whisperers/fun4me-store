# VALID-004: Complete Remaining Zod Request Body Schemas

## Priority: P2 - Medium
## Category: Validation / Technical Debt
## Status: Completed
## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)
## Affected Areas: API Routes, Input Validation

## Description

Complete the Zod request body validation schemas for all remaining POST/PATCH endpoints. SEC-007 implemented validation for store orders, but other critical endpoints still need similar treatment.

## Source

Remaining work from `documentation/tickets/completed/security/SEC-007-missing-request-body-validation.md`

## Completed Work (January 2026)

### Implementation Summary

All targeted API routes now use centralized Zod schemas from `lib/schemas/`:

| Endpoint | Schema | Status |
|----------|--------|--------|
| `POST /api/pets` | `apiCreatePetSchema` | ✅ Done |
| `POST /api/invoices` | `createInvoiceSchema` | ✅ Done |
| `POST /api/prescriptions` | `apiCreatePrescriptionSchema` | ✅ Done |
| `PUT /api/prescriptions` | `apiUpdatePrescriptionSchema` | ✅ Done |
| `POST /api/lab-orders` | `createLabOrderSchema` | ✅ Already done (VALID-003) |
| `POST /api/hospitalizations` | `createHospitalizationSchema` | ✅ Already done (VALID-002) |
| `PATCH /api/hospitalizations` | `updateHospitalizationSchema` | ✅ Already done (VALID-002) |

### Files Modified

1. **`app/api/pets/route.ts`**
   - Added inline `apiCreatePetSchema` for onboarding wizard
   - Validates name, species, breed, clinic
   - Returns field-level validation errors

2. **`app/api/invoices/route.ts`**
   - Integrated `createInvoiceSchema` from `lib/schemas/invoice.ts`
   - Validates pet_id, items array (with nested validation), notes, due_date, tax_rate
   - Discount percentage validation (0-100) now handled by schema

3. **`app/api/prescriptions/route.ts`**
   - Integrated new schemas from `lib/schemas/medical.ts`
   - `apiCreatePrescriptionSchema` for POST (multi-drug format)
   - `apiUpdatePrescriptionSchema` for PUT

4. **`lib/schemas/medical.ts`**
   - Added `prescriptionDrugItemSchema` for drug array items
   - Added `apiCreatePrescriptionSchema` for API POST endpoint
   - Added `apiUpdatePrescriptionSchema` for API PUT endpoint

### Schema Files (All in `lib/schemas/`)

```
lib/schemas/
├── appointment.ts    # Booking and appointment schemas
├── auth.ts           # Authentication schemas
├── common.ts         # Shared utilities (uuidSchema, etc.)
├── hospitalization.ts # Hospitalization schemas
├── index.ts          # Re-exports
├── insurance.ts      # Insurance schemas
├── invoice.ts        # Invoice and payment schemas ✅ Used
├── laboratory.ts     # Lab order schemas
├── medical.ts        # Prescriptions, vaccines, records ✅ Extended
├── messaging.ts      # Messaging schemas
├── pet.ts           # Pet CRUD schemas ✅ Used
├── settings.ts      # Settings schemas
└── store.ts         # Store/e-commerce schemas
```

## Validation Pattern Used

All routes follow the same pattern:

```typescript
import { someSchema } from '@/lib/schemas/xyz'

export const POST = withApiAuth(async ({ request, ... }) => {
  let body
  try {
    body = await request.json()
  } catch {
    return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
  }

  const validation = someSchema.safeParse(body)
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: {
        errors: validation.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    })
  }

  const { field1, field2 } = validation.data
  // ... rest of handler
})
```

## Benefits Achieved

1. **Type Safety**: Validated data is fully typed for TypeScript
2. **Consistent Errors**: All validation errors follow the same format
3. **Spanish Messages**: Error messages in Spanish for end users
4. **Input Sanitization**: Schemas trim strings and handle nulls
5. **Reusability**: Schemas in `lib/schemas/` can be imported anywhere
6. **Security**: Prevents malformed data from reaching business logic

## Acceptance Criteria - All Met

- [x] All listed endpoints have Zod schema validation
- [x] Invalid requests return 400 with field-level errors
- [x] Error messages are in Spanish
- [x] Validated data is type-safe for business logic
- [x] Consistent error response format across all endpoints

## Related Tickets

- VALID-002: Hospitalization validation (completed)
- VALID-003: Lab order validation (completed)
- SEC-007: Store order validation (completed)

## Estimated vs Actual Effort

- **Estimated**: 8 hours
- **Actual**: 4 hours (schemas already existed, just needed integration)

---
*Created: January 2026*
*Completed: January 2026*
