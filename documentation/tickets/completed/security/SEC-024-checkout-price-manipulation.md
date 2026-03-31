# SEC-024 Price Manipulation Vulnerability in Checkout

## Priority: P0

## Category: Security

## Status: Completed

## Resolution
Fixed in migration `069_fix_checkout_price_validation.sql`. The `process_checkout()` RPC function now:
1. Ignores client-supplied prices entirely
2. Looks up actual prices from `store_products` (with `clinic_product_assignments` overrides for global catalog)
3. Looks up service prices from `services.base_price`
4. Logs price mismatches to `financial_audit_logs` for security monitoring
5. Returns any price corrections in the response (for cart UI refresh)

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

The checkout API sends client-supplied prices to the `process_checkout()` database function without server-side verification against actual product prices. An attacker can modify the checkout request to pay arbitrary prices.

### Vulnerable Code

**API Route** (`web/app/api/store/checkout/route.ts` lines 160-169):
```typescript
const { data: checkoutResult, error: checkoutError } = await supabase.rpc(
  'process_checkout',
  {
    p_tenant_id: clinic,
    p_user_id: user.id,
    p_items: JSON.stringify(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,  // ← CLIENT-SUPPLIED PRICE SENT TO DB
        quantity: item.quantity,
        // ...
      }))
    ),
  }
)
```

**RPC Function** (`web/db/60_store/03_checkout_rpc.sql` line 34):
```sql
v_price := (v_item->>'price')::NUMERIC;  -- Uses client price directly
```

### Attack Scenario

1. Customer adds product worth ₲50,000 to cart
2. Attacker intercepts checkout request
3. Modifies `price: 1` in the request body
4. Server accepts and creates invoice for ₲1
5. Inventory is decremented, product is "sold" for ₲1

## Impact

**Security Risk: CRITICAL**
- Direct financial loss through price manipulation
- Can be exploited at scale to drain inventory
- No audit trail would show the manipulation (looks like valid order)

**Financial Risk**: Unlimited - attackers could buy entire inventory at near-zero cost

## Proposed Fix

### Option A: Server-side price lookup in RPC function (Recommended)

```sql
-- In process_checkout() function
-- Replace: v_price := (v_item->>'price')::NUMERIC;
-- With:
SELECT COALESCE(
  cpa.override_price,
  sp.base_price
) INTO v_price
FROM store_products sp
LEFT JOIN clinic_product_assignments cpa ON cpa.product_id = sp.id AND cpa.tenant_id = p_tenant_id
WHERE sp.id = v_item_id;

IF v_price IS NULL THEN
  RETURN jsonb_build_object('success', false, 'error', 'Product not found: ' || v_item_id);
END IF;
```

### Option B: Pre-validation in API route

```typescript
// Before calling RPC, verify prices match database
const productIds = items.filter(i => i.type === 'product').map(i => i.id)
const { data: products } = await supabase
  .from('store_products')
  .select('id, base_price')
  .in('id', productIds)

const priceMap = new Map(products.map(p => [p.id, p.base_price]))
for (const item of items) {
  if (item.type === 'product' && priceMap.get(item.id) !== item.price) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Price mismatch detected' }
    })
  }
}
```

### Option C: Defense in depth (Both)

Implement both options - API-level validation as first line of defense, RPC validation as guarantee.

## Acceptance Criteria

- [ ] RPC function looks up actual product prices from database
- [ ] Client-supplied prices are ignored or validated
- [ ] Attempting price manipulation returns error
- [ ] Test: Submit checkout with `price: 1` for expensive product
  - Expected: Error or correct price charged
- [ ] Add comment `// SEC-024: Price validated server-side`
- [ ] Audit log records actual price used

## Related Files

- `web/app/api/store/checkout/route.ts`
- `web/db/60_store/03_checkout_rpc.sql`
- `web/lib/schemas/store.ts`

## Estimated Effort

3-4 hours

## Security Severity

**CRITICAL** - Direct financial manipulation vulnerability with unlimited monetary impact.
