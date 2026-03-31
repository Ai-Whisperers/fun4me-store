# AUDIT-106 Missing Idempotency Key on Store Orders

## Priority: P1

## Category: Technical Debt / Data Integrity

## Status: Not Started

## Epic: [EPIC-01: Data Integrity](../epics/EPIC-01-data-integrity.md)

## Description

The `store_orders` table lacks an idempotency key column. While the `invoices` table has idempotency key support (migration 038), store orders do not. This means checkout request retries could create duplicate orders.

### Current State

**Invoices** (has idempotency):
```sql
-- Migration 038_invoice_idempotency.sql
ALTER TABLE invoices ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_invoices_idempotency ON invoices(tenant_id, idempotency_key);
```

**Store Orders** (no idempotency):
```sql
-- web/db/60_store/orders/01_orders.sql
CREATE TABLE store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_number TEXT NOT NULL,  -- Unique but generated at checkout time
  -- No idempotency_key column
);
```

### Risk Scenario

1. User clicks checkout
2. Network timeout occurs
3. User clicks again (or browser auto-retries)
4. Server processes both requests
5. Two orders created with different order_numbers
6. Inventory decremented twice
7. Customer confused by duplicate orders

### Mitigations Currently in Place

- Rate limiting (5 req/min) - Helps but doesn't prevent fast retries
- Client-side `isProcessing` state - Can be bypassed with network issues

## Proposed Fix

### Migration

```sql
-- web/db/migrations/069_store_orders_idempotency.sql

-- Add idempotency key column
ALTER TABLE store_orders ADD COLUMN idempotency_key TEXT;

-- Create unique index for tenant + key combination
CREATE UNIQUE INDEX idx_store_orders_idempotency
ON store_orders(tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN store_orders.idempotency_key IS
  'Client-generated UUID to prevent duplicate orders on retry';
```

### Checkout API Update

```typescript
// web/app/api/store/checkout/route.ts

// Generate or accept idempotency key
const idempotencyKey = request.headers.get('Idempotency-Key')
  || body.idempotencyKey
  || crypto.randomUUID()

// Check for existing order with same key
const { data: existingOrder } = await supabase
  .from('store_orders')
  .select('id, order_number')
  .eq('tenant_id', clinic)
  .eq('idempotency_key', idempotencyKey)
  .single()

if (existingOrder) {
  // Return existing order instead of creating new
  return NextResponse.json({
    success: true,
    orderId: existingOrder.id,
    orderNumber: existingOrder.order_number,
    message: 'Order already exists (idempotent response)'
  })
}

// Pass idempotency key to RPC
const { data: result } = await supabase.rpc('process_checkout', {
  // ... existing params
  p_idempotency_key: idempotencyKey
})
```

### RPC Function Update

```sql
-- In process_checkout function
-- Add parameter
CREATE OR REPLACE FUNCTION process_checkout(
  -- ... existing params ...
  p_idempotency_key TEXT DEFAULT NULL
)

-- Use in insert
INSERT INTO store_orders (tenant_id, ..., idempotency_key)
VALUES (p_tenant_id, ..., p_idempotency_key)
ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
DO NOTHING
RETURNING id INTO v_order_id;

IF v_order_id IS NULL THEN
  -- Idempotency conflict - fetch existing
  SELECT id INTO v_order_id FROM store_orders
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
END IF;
```

### Client-Side Update

```typescript
// web/context/cart-context.tsx or checkout client
const idempotencyKeyRef = useRef<string | null>(null)

const handleCheckout = async () => {
  // Generate key on first attempt, reuse on retry
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID()
  }

  const response = await fetch('/api/store/checkout', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKeyRef.current
    },
    body: JSON.stringify({ items, clinic })
  })
  // ...
}
```

## Acceptance Criteria

- [ ] `store_orders` has `idempotency_key` column
- [ ] Unique constraint on (tenant_id, idempotency_key)
- [ ] Checkout API checks for existing order with same key
- [ ] Duplicate requests return same order (not error)
- [ ] Client generates and persists idempotency key
- [ ] Test: Submit same checkout twice → One order created
- [ ] Add comment `// AUDIT-106: Idempotency key`

## Related Files

- `web/db/60_store/orders/01_orders.sql`
- `web/db/60_store/03_checkout_rpc.sql`
- `web/app/api/store/checkout/route.ts`
- `web/app/[clinic]/cart/checkout/client.tsx`

## Estimated Effort

3-4 hours
