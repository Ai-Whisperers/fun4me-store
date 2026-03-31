# TECH-018: Add Validation for JSONB Columns

**Category**: Technical Debt  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: 2-3 days  
**Impact**: Low - Data integrity  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-008)

## Summary

JSONB columns accept any structure. Need validation to ensure data integrity.

## Problem

```sql
-- What goes in items? Anything. Everything. Chaos.
items JSONB DEFAULT '[]'::jsonb
```

## Solution

**Option 1: Database Constraints**

```sql
ALTER TABLE store_carts ADD CONSTRAINT valid_cart_items CHECK (
  jsonb_typeof(items) = 'array' AND
  (items = '[]'::jsonb OR (
    (items->0->>'product_id') IS NOT NULL AND
    (items->0->>'quantity')::int > 0
  ))
);
```

**Option 2: Application Validation (Recommended)**

```typescript
// lib/schemas/cart.ts
import { z } from 'zod';

const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
});

export const CartSchema = z.array(CartItemSchema);

// Validate before insert/update
const validatedItems = CartSchema.parse(items);
```

## Implementation

1. Find all JSONB columns
2. Define schemas for each
3. Add validation in application
4. Optionally add database constraints

## Acceptance Criteria
- [ ] All JSONB columns have defined schemas
- [ ] Validation enforced in application
- [ ] Invalid data rejected with clear errors

## Related
- Data integrity improvements
- Type safety initiatives
