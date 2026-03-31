# FEAT-013: Store Prescription Verification

## Priority: P2 - Medium
## Category: Feature
## Status: Completed
## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)
## Affected Areas: E-Commerce, Store, Checkout

## Description

Implement proper prescription verification at checkout for products marked as requiring prescriptions.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-006)

## Context

> **TODO in code**: `api/store/orders/route.ts:161` - "TODO: Verify user has valid prescription for this product"
> **Schema**: Products can be marked `requires_prescription`
> **UI**: No enforcement at checkout

## Current State

- Products have `requires_prescription` boolean field
- Users can upload prescription files for orders
- No validation that prescription covers the specific product
- No check for prescription expiry
- Staff approval workflow exists but is manual

## Proposed Solution

### 1. Prescription Check at Checkout

```typescript
// api/store/orders/route.ts
export async function POST(request: NextRequest) {
  // ... existing code ...

  // Get prescription-required items
  const prescriptionItems = cartItems.filter(
    item => item.product.requires_prescription
  );

  if (prescriptionItems.length > 0) {
    // Check for valid prescriptions in user's records
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('id, medications, valid_until, pet_id')
      .eq('pet_id', orderData.pet_id)
      .gt('valid_until', new Date().toISOString())
      .order('valid_until', { ascending: false });

    for (const item of prescriptionItems) {
      const hasPrescription = prescriptions?.some(rx =>
        rx.medications.some(med =>
          med.product_id === item.product_id ||
          med.name.toLowerCase().includes(item.product.name.toLowerCase())
        )
      );

      if (!hasPrescription) {
        return NextResponse.json({
          error: `${item.product.name} requiere receta médica válida`,
          code: 'PRESCRIPTION_REQUIRED',
          productId: item.product_id,
        }, { status: 400 });
      }
    }
  }

  // Continue with order creation...
}
```

### 2. UI Warning Component

```typescript
// components/store/prescription-warning.tsx
export function PrescriptionWarning({ product }: { product: Product }) {
  if (!product.requires_prescription) return null;

  return (
    <Alert variant="warning">
      <Pill className="h-4 w-4" />
      <AlertDescription>
        Este producto requiere receta médica válida.
        Su mascota debe tener una receta vigente para este medicamento.
      </AlertDescription>
    </Alert>
  );
}
```

### 3. Checkout Validation

```typescript
// components/store/checkout-form.tsx
const validatePrescriptions = async () => {
  const requiresPrescription = cartItems.some(
    item => item.product.requires_prescription
  );

  if (requiresPrescription && !selectedPet) {
    return 'Debe seleccionar una mascota para productos con receta';
  }

  // Server-side validation will catch specific product issues
  return null;
};
```

### 4. Staff Override

```typescript
// Admin can approve order despite missing prescription
// Requires logging the override with reason
await supabase.from('audit_logs').insert({
  action: 'prescription_override',
  resource: 'store_orders',
  resource_id: orderId,
  details: {
    reason: overrideReason,
    products: overriddenProducts,
  },
});
```

## Implementation Steps

1. [ ] Add prescription check logic to checkout API
2. [ ] Create prescription warning component for product pages
3. [ ] Add pet selection requirement for prescription products
4. [ ] Implement staff override with audit logging
5. [ ] Add clear error messages in Spanish
6. [ ] Update checkout flow UI for prescription items
7. [ ] Test various scenarios (valid, expired, missing prescriptions)

## Acceptance Criteria

- [ ] Products marked `requires_prescription` checked at checkout
- [ ] User must have valid (non-expired) prescription for product
- [ ] Clear error message if prescription missing/expired
- [ ] Staff can override with reason logged to audit trail
- [ ] Prescription warning shown on product detail pages
- [ ] Pet must be selected for prescription orders

## Related Files

- `web/app/api/store/orders/route.ts:161,179` - TODO locations
- `web/db/store_products` - has requires_prescription field
- `web/components/store/` - Store components

## Estimated Effort

- Checkout validation: 3 hours
- UI components: 2 hours
- Staff override: 2 hours
- Testing: 2 hours
- **Total: 9 hours (1 day)**

## Implementation Notes

### Completed: January 2026

#### Database Changes
- **Migration 063**: Added `pet_id` to `store_orders` for prescription product association
- Created `verify_prescription_products()` function - validates pet prescriptions match product names
- Created `override_prescription_requirement()` function - staff override with audit logging

#### API Changes
- **`/api/store/checkout`**: Now validates `pet_id` when cart contains prescription items
- **`/api/store/orders/[orderId]/prescription-override`**: New endpoint for staff to approve orders
- Updated `checkoutRequestSchema` and `createStoreOrderSchema` with `pet_id` field

#### Frontend Changes
- **`PrescriptionWarning`**: Warning component for product pages (compact & full modes)
- **`PrescriptionBadge`**: Inline Rx badge for product lists
- **`PrescriptionCheckoutBanner`**: Status banner showing prescription requirements
- **`PetSelector`**: Dropdown to select pet for prescription products
- Updated checkout flow to require pet selection for prescription items

#### Testing
- `tests/unit/components/store/prescription-warning.test.tsx` - Component tests (9 tests)
- `tests/unit/schemas/store-checkout.test.ts` - Schema validation tests (16 tests)

---
*Created: January 2026*
*Completed: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
