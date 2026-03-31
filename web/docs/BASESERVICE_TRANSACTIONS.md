# BaseService Transaction Limitations - Critical

**Version**: 1.0  
**Last Updated**: January 2026  
**Priority**: CRITICAL - Read before implementing multi-step database operations

---

## ⚠️ Critical Limitation

**The `BaseService.executeTransaction()` method DOES NOT provide real database transactions.**

Despite its name and API, it simply executes operations sequentially **without transaction guarantees**. This is a known limitation of the Supabase JavaScript client.

---

## The Problem

### What Developers Might Assume

```typescript
// ❌ MISLEADING - This looks like a transaction but ISN'T
export class InvoiceService extends BaseService {
  async createInvoiceWithItems(invoice: Invoice, items: InvoiceItem[]) {
    return this.executeTransaction(async () => {
      // Step 1: Create invoice
      const { data: newInvoice } = await this.supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single()

      // Step 2: Create invoice items
      await this.supabase
        .from('invoice_items')
        .insert(items.map((item) => ({ ...item, invoice_id: newInvoice.id })))

      // ❌ PROBLEM: If Step 2 fails, Step 1 is NOT rolled back!
      // You'll have an invoice with no items - data inconsistency!
    })
  }
}
```

### What Actually Happens

1. **No atomicity**: If Step 2 fails, Step 1 remains committed
2. **No isolation**: Other transactions can see partial results
3. **Data corruption**: Inconsistent state in the database
4. **No rollback**: Failed operations leave partial data

---

## Why This Happens

### Supabase JavaScript Client Limitation

The Supabase JavaScript client (`@supabase/supabase-js`) does **NOT** support transactions:

- No `BEGIN` / `COMMIT` / `ROLLBACK` commands
- No transaction isolation levels
- Each operation auto-commits immediately

This is by design - browser JavaScript clients can't maintain long-running connections.

### Source Code Evidence

From `web/lib/services/base-service.ts`:

```typescript
protected async executeTransaction<T>(
  operations: () => Promise<T>
): Promise<ServiceResult<T>> {
  // For now, just execute the operations
  // In production, wrap with database transaction via RPC
  return this.handleError(operations, 'Transaction failed');
}
```

The comment admits it's not a real transaction and recommends RPC functions.

---

## Correct Solutions

### Solution 1: PostgreSQL Functions with Transactions (Recommended)

Use PostgreSQL functions that run **server-side** with real transaction support.

#### Step 1: Create Database Function

```sql
-- web/db/migrations/095_create_invoice_atomic.sql
CREATE OR REPLACE FUNCTION create_invoice_atomic(
  p_tenant_id TEXT,
  p_client_id UUID,
  p_total DECIMAL,
  p_items JSONB,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_invoice_id UUID;
  v_item JSONB;
BEGIN
  -- Start implicit transaction (PostgreSQL function default)

  -- Step 1: Insert invoice
  INSERT INTO invoices (tenant_id, client_id, total, created_by)
  VALUES (p_tenant_id, p_client_id, p_total, p_created_by)
  RETURNING id INTO v_invoice_id;

  -- Step 2: Insert invoice items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO invoice_items (
      invoice_id,
      tenant_id,
      product_id,
      quantity,
      unit_price,
      total
    ) VALUES (
      v_invoice_id,
      p_tenant_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total')::DECIMAL
    );
  END LOOP;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error automatically rolls back entire transaction
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Step 2: Call from Service

```typescript
// ✅ CORRECT - Uses real transaction via database function
export class InvoiceService extends BaseService {
  async createInvoiceWithItems(
    tenantId: string,
    clientId: string,
    total: number,
    items: InvoiceItem[],
    userId: string
  ): Promise<ServiceResult<{ invoice_id: string }>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc('create_invoice_atomic', {
        p_tenant_id: tenantId,
        p_client_id: clientId,
        p_total: total,
        p_items: JSON.stringify(items),
        p_created_by: userId,
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      return { invoice_id: data.invoice_id }
    }, 'Failed to create invoice')
  }
}
```

**Benefits**:

- ✅ **Real transaction**: Atomic, isolated, consistent
- ✅ **Automatic rollback**: Any error rolls back entire operation
- ✅ **Row-level locking**: Prevents race conditions
- ✅ **Better performance**: Single round-trip to database
- ✅ **Safer**: Business logic enforced at database level

---

### Solution 2: Compensating Transactions (Fallback)

If you can't use database functions, implement compensating transactions.

```typescript
// ⚠️ ACCEPTABLE - Manual rollback logic
export class TransferService extends BaseService {
  async transferPetOwnership(
    petId: string,
    fromOwnerId: string,
    toOwnerId: string,
    tenantId: string
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      // Step 1: Update pet owner
      const { error: updateError } = await this.supabase
        .from('pets')
        .update({ owner_id: toOwnerId })
        .eq('id', petId)
        .eq('tenant_id', tenantId)

      if (updateError) throw updateError

      try {
        // Step 2: Create transfer record
        const { error: insertError } = await this.supabase.from('pet_transfers').insert({
          pet_id: petId,
          from_owner_id: fromOwnerId,
          to_owner_id: toOwnerId,
          tenant_id: tenantId,
        })

        if (insertError) throw insertError
      } catch (error) {
        // Step 2 failed - manually rollback Step 1
        await this.supabase
          .from('pets')
          .update({ owner_id: fromOwnerId })
          .eq('id', petId)
          .eq('tenant_id', tenantId)

        throw error
      }
    }, 'Failed to transfer pet ownership')
  }
}
```

**Limitations**:

- ❌ **Not atomic**: Small window for inconsistency
- ❌ **Complex**: Manual rollback logic required
- ❌ **Fragile**: What if rollback also fails?
- ⚠️ **Use only for simple 2-step operations**

---

### Solution 3: Optimistic Locking (For Updates)

For concurrent updates, use version numbers to detect conflicts.

```sql
-- Add version column to table
ALTER TABLE appointments ADD COLUMN version INTEGER DEFAULT 1;
```

```typescript
// ✅ PREVENTS LOST UPDATES
export class AppointmentService extends BaseService {
  async updateWithLocking(
    id: string,
    tenantId: string,
    currentVersion: number,
    updates: Partial<Appointment>
  ): Promise<ServiceResult<Appointment>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('appointments')
        .update({
          ...updates,
          version: currentVersion + 1, // Increment version
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('version', currentVersion) // Only update if version matches
        .select()
        .single()

      if (error) throw error
      if (!data) {
        throw new Error('Conflict: Appointment was modified by another user')
      }

      return data
    }, 'Failed to update appointment')
  }
}
```

---

## Decision Matrix

| Scenario                              | Recommended Solution                            |
| ------------------------------------- | ----------------------------------------------- |
| **Create parent + children records**  | PostgreSQL function with transaction            |
| **Update multiple related tables**    | PostgreSQL function with transaction            |
| **Complex business logic (3+ steps)** | PostgreSQL function with transaction            |
| **Transfer operations**               | PostgreSQL function OR compensating transaction |
| **Simple 2-step operations**          | Compensating transaction (acceptable)           |
| **Concurrent updates to same record** | Optimistic locking with version                 |
| **Read-only operations**              | No transaction needed                           |

---

## Existing Atomic Functions in Codebase

The codebase already has several atomic PostgreSQL functions:

```
web/db/migrations/
├── 076_adjust_inventory_atomic.sql       # Inventory adjustments
├── 077_receive_inventory_atomic.sql      # Receiving stock
├── 078_sell_inventory_atomic.sql         # Selling products
├── 079_update_appointment_status.sql     # Appointment updates
└── 080_create_lab_order_atomic.sql       # Lab order creation
```

**Use these as templates** when creating new atomic operations.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Trusting `executeTransaction()`

```typescript
// ❌ BAD - No real transaction
await this.executeTransaction(async () => {
  await step1()
  await step2() // If this fails, step1 is NOT rolled back
  await step3()
})
```

### Anti-Pattern 2: Sequential Inserts Without Transaction

```typescript
// ❌ BAD - Can leave partial data
const invoice = await createInvoice()
await createInvoiceItems(invoice.id) // If this fails, orphaned invoice!
```

### Anti-Pattern 3: Update Then Insert

```typescript
// ❌ BAD - Update commits immediately
await updateStock()
await createTransaction() // If this fails, stock is wrong!
```

### Anti-Pattern 4: No Error Handling

```typescript
// ❌ BAD - No rollback on error
await supabase.from('table1').insert(data1)
await supabase.from('table2').insert(data2) // Error here = inconsistent data
```

---

## Deprecation Notice

**The `BaseService.executeTransaction()` method is DEPRECATED.**

### What to Do

1. **Existing code using `executeTransaction()`**:
   - Audit for data consistency issues
   - Migrate to PostgreSQL functions
   - Or implement compensating transactions

2. **New code**:
   - DO NOT use `executeTransaction()`
   - Use PostgreSQL functions for multi-step operations
   - Document transaction requirements upfront

3. **Future**:
   - Method may be removed in future versions
   - Clear error will be thrown to prevent misuse

---

## Checklist for Multi-Step Operations

Before implementing multi-step database operations:

- [ ] Identified all steps in the operation
- [ ] Determined if atomicity is required
- [ ] Chosen appropriate solution (PostgreSQL function vs compensating)
- [ ] Created migration file for database function (if needed)
- [ ] Added error handling for each step
- [ ] Tested failure scenarios (what if step N fails?)
- [ ] Verified no partial data remains on error
- [ ] Added tests for transaction behavior
- [ ] Documented the operation's transaction guarantees

---

## Testing Transactions

### Test Rollback Behavior

```typescript
// Test that failure in step 2 doesn't leave partial data from step 1
test('rolls back on failure', async () => {
  const service = new InvoiceService(supabase)

  // Force step 2 to fail
  const result = await service.createInvoiceWithItems(
    tenantId,
    clientId,
    100,
    [invalidItem], // This will cause step 2 to fail
    userId
  )

  expect(result.success).toBe(false)

  // Verify step 1 was rolled back - no orphaned invoice
  const { data: invoices } = await supabase.from('invoices').select('*').eq('client_id', clientId)

  expect(invoices).toHaveLength(0) // No partial data!
})
```

---

## Migration Guide

### Step 1: Find Usages

```bash
# Find all uses of executeTransaction
grep -r "executeTransaction" web/lib/services --include="*.ts"
```

### Step 2: Assess Each Usage

For each usage:

1. What steps are being executed?
2. Are they critical (must be atomic)?
3. How complex is the operation?

### Step 3: Choose Solution

- **3+ steps OR critical data**: PostgreSQL function
- **2 steps, non-critical**: Compensating transaction
- **Single step**: Remove transaction wrapper

### Step 4: Implement & Test

- Create database function
- Update service method
- Add tests for rollback behavior
- Document transaction guarantees

---

## Resources

- **Example Functions**: `web/db/migrations/076_adjust_inventory_atomic.sql`
- **PostgreSQL Transactions**: https://www.postgresql.org/docs/current/tutorial-transactions.html
- **Supabase RPC**: https://supabase.com/docs/guides/database/functions
- **Row Locking**: https://www.postgresql.org/docs/current/explicit-locking.html

---

## Support

If you're unsure whether an operation needs a transaction:

1. Ask: "What happens if step N fails?"
2. If the answer is "data corruption" or "inconsistent state", you need a transaction
3. Use a PostgreSQL function with proper transaction handling

---

**Last Review**: January 2026  
**Next Review**: Before using `executeTransaction()` anywhere
