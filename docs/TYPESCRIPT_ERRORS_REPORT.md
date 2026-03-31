# TypeScript Compilation Errors Report

**Date**: 2026-01-18  
**Sprint**: 2 (Type Safety)  
**Status**: IN PROGRESS  

---

## Executive Summary

**Total Errors**: 31 (excluding `.next/types` generated files)  
**Progress**: 5 errors fixed, 26 remaining + 5 new from notification refactoring  
**Complexity**: MEDIUM-HIGH (requires type definition updates)

---

## Errors Fixed (5)

✅ **app/api/appointments/waitlist/[id]/offer/route.ts:120**
- Issue: Parameter 'err' implicitly has 'any' type
- Fix: Added type annotation `(err: unknown)`

✅ **app/api/cron/process-subscriptions/route.ts:210**
- Issue: Parameter 'err' implicitly has 'any' type  
- Fix: Added type annotation `(err: unknown)`

✅ **lib/notifications/service.ts**
- Issue: Missing imports `./notifications` and `./logger`
- Fix: Replaced with correct imports and implemented missing functions

✅ **lib/types/index.ts:431**
- Issue: Module '"./whatsapp"' has no exported member 'MessageStatus'
- Fix: Changed to use correct export `WhatsAppMessageStatus`

---

## Remaining Errors by Category

### Category 1: Database Type Mismatches (10 errors)

#### Property Missing Errors (6 errors)
```
app/[clinic]/portal/messages/page.tsx:222,224
  - Property 'last_message_preview' does not exist on type 'Conversation'
  - **Fix**: Add property to Conversation type definition

app/[clinic]/portal/profile/profile-form.tsx:116
  - Property 'secondary_phone' does not exist on type 'Profile'
  - **Fix**: Add property to Profile type definition

lib/domain/invoices/service.ts:78
  - Property 'owner_id' does not exist on type 'InvoiceWithDetails'
  - **Fix**: Add property to InvoiceWithDetails type

lib/domain/invoices/service.ts:346
  - Property 'total' does not exist on type 'InvoiceWithDetails'
  - **Fix**: Add property to InvoiceWithDetails type
```

#### Object Literal Errors (4 errors)
```
lib/domain/invoices/service.ts:254,290,322,347,365
  - Unknown properties in Partial<Invoice>: 'total', 'voided_at', 'sent_at', 'amount_due'
  - **Fix**: Update Invoice type to include these properties
```

---

### Category 2: Generic Type Constraints (5 errors)

```
hooks/use-form.ts:107,127,128,163,175
  - Type 'keyof T' cannot be used to index type '{}'
  - Complex generic type issue in useForm hook
  - **Fix**: Add proper type constraints to generic T
```

**Example Fix**:
```typescript
// Before
export function useForm<T extends Record<string, FormValue>>(...) { }

// After
export function useForm<T extends Record<string, FormValue> & { [K in keyof T]: FormValue }>(...) { }
```

---

### Category 3: Type Conversion Errors (3 errors)

```
app/[clinic]/portal/pets/page.tsx:124,125
  - Type conversion between query result and OwnerPet type
  - **Fix**: Update type definition or add proper type assertion

app/[clinic]/dashboard/consents/[id]/page.tsx:266
  - No overload matches this call
  - **Fix**: Investigate function signature and arguments

lib/services/mappers/appointment-mapper.ts:117
  - Type 'string' is not assignable to type 'PetSpecies'
  - **Fix**: Add type assertion or validation
```

---

### Category 4: Service Method Type Mismatches (5 errors)

```
lib/services/reminder-service.ts:275,455
  - Argument of type 'CreateRuleInput' is not assignable to 'Record<string, unknown>'
  - **Fix**: Add index signature to CreateRuleInput type

lib/services/vaccine-service.ts:345,399,594
  - Argument types not assignable to 'Record<string, unknown>'
  - **Fix**: Add index signature or change service method signature
```

**Fix Pattern**:
```typescript
// Option 1: Add index signature to input types
interface CreateRuleInput extends Record<string, unknown> {
  // existing properties
}

// Option 2: Change service method to accept specific type
async create(input: CreateRuleInput) { }  // instead of Record<string, unknown>
```

---

### Category 5: notifyStaff Type Mismatches (5 errors - NEW)

```
app/api/admin/products/[id]/approve/route.ts:87
app/api/cron/generate-recurring/route.ts:129
app/api/lab-orders/[id]/route.ts:202,229
app/api/platform/commission-invoices/[id]/send/route.ts:112
  - Property 'channels' does not exist in notifyStaff parameter type
  - **Fix**: Update notifyStaff function signature
```

**Fix**:
```typescript
// lib/notifications/service.ts
export async function notifyStaff(payload: {
  tenantId: string
  type: string
  title: string
  message: string
  channels?: string[]  // Add this
  data?: Record<string, unknown>
}) { }
```

---

### Category 6: Component Prop Type Mismatches (3 errors)

```
components/booking/booking-wizard/PDFDownloadButton.tsx:73
  - PDFDownloadLink type incompatibility
  - **Fix**: Update component prop types or use type assertion

components/dashboard/client-invite-form.tsx:296
  - onChange handler type mismatch (HTMLSelectElement vs HTMLInputElement)
  - **Fix**: Create separate onChange handler for select elements
```

---

## Recommended Fixes (Prioritized)

### Priority 1: Quick Wins (10 errors - 30 min)

1. **Fix notifyStaff signature** (5 errors)
   ```typescript
   export async function notifyStaff(payload: {
     tenantId: string
     type: string
     title: string
     message: string
     channels?: string[]  // Add optional channels
     data?: Record<string, unknown>
   })
   ```

2. **Add index signatures to input types** (5 errors)
   ```typescript
   interface CreateRuleInput extends Record<string, unknown> {
     // existing properties
   }
   ```

### Priority 2: Database Type Updates (10 errors - 1 hour)

1. **Update Conversation type** - add `last_message_preview`
2. **Update Profile type** - add `secondary_phone`
3. **Update InvoiceWithDetails type** - add `owner_id`, `total`
4. **Update Invoice type** - add `voided_at`, `sent_at`, `amount_due`

### Priority 3: Complex Types (6 errors - 2 hours)

1. **Fix useForm generic constraints** (5 errors)
2. **Fix PetSpecies type** (1 error)

### Priority 4: Component Props (3 errors - 1 hour)

1. **Fix PDFDownloadLink** type
2. **Fix client-invite-form select onChange**
3. **Fix consent page overload**

### Priority 5: Pet Query Types (2 errors - 1 hour)

1. **Fix OwnerPet type conversion**

---

## Implementation Plan

### Phase 1: Type Definitions (2 hours)
1. Update database types in `lib/types/`
2. Add missing properties to interfaces
3. Add index signatures to input types

### Phase 2: Service Layer (1 hour)
1. Fix notifyStaff signature
2. Update service method signatures
3. Add proper type constraints

### Phase 3: Components (1 hour)
1. Fix component prop types
2. Update onChange handlers
3. Add proper type assertions

### Phase 4: Generics (2 hours)
1. Fix useForm hook type constraints
2. Update generic type definitions
3. Test with different input types

**Total Estimated Time**: 6 hours

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking changes** | HIGH | Test thoroughly before committing |
| **Type definition gaps** | MEDIUM | Add comprehensive types from database |
| **Generic complexity** | MEDIUM | Simplify generic constraints if needed |
| **Component regressions** | LOW | Run Storybook tests |

---

## Alternative Approach

Instead of fixing all errors, consider:

1. **Enable `skipLibCheck`** - Ignore errors in node_modules (NOT RECOMMENDED)
2. **Use `// @ts-ignore`** selectively - Document why (TEMPORARY ONLY)
3. **Gradual migration** - Fix one category at a time over multiple sessions

---

## Next Steps

**Option A: Continue Fixing (Recommended)**
- Proceed with Priority 1 (quick wins)
- Test after each category
- Commit incrementally

**Option B: Pause for Review**
- Get user approval for changes
- Review type definition updates
- Plan migration strategy

**Option C: Different Strategy**
- Focus on strict mode separately
- Fix errors as they're encountered
- Document known issues

---

## Partial Progress This Session

✅ Fixed 5 errors (type annotations + notification service)  
⏳ Identified all 31 remaining errors  
📝 Categorized by complexity and priority  
📋 Created implementation plan

**Recommendation**: Continue with Priority 1 (quick wins) to show progress, then pause for review before tackling complex generic types.

---

_Last updated: 2026-01-18_  
_Status: Awaiting decision on whether to continue or pause_
