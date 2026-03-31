# Store Checkout System

## Overview

The checkout system handles the complete purchase flow for the veterinary clinic store, including:
- Server-side stock validation (BIZ-004)
- Atomic inventory decrement (BIZ-003)
- Invoice generation
- Transaction logging
- Multi-tenant isolation

## Architecture

### Atomic Transaction Flow

```
Client Request
    |
    v
API Route (Next.js)
    |
    ├─> Authentication Check
    ├─> Tenant Validation
    |
    v
Database Function: process_checkout()
    |
    ├─> Stock Validation (validate_stock)
    ├─> Calculate Totals
    ├─> Create Invoice
    ├─> Create Invoice Items
    ├─> Decrement Stock (decrement_stock)
    |   └─> Log Transaction
    |
    v
Return Result
```

## Database Functions

### 1. `process_checkout()`

**Purpose**: Atomic checkout operation that ensures consistency across all operations.

**Parameters**:
```sql
p_tenant_id TEXT      -- Clinic identifier
p_user_id UUID        -- User making the purchase
p_items JSONB         -- Cart items [{id, name, price, quantity, type}]
p_notes TEXT          -- Optional order notes
```

**Returns**: JSONB
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-1234567890",
    "total": 150000,
    "status": "pending"
  }
}
```

Or on error:
```json
{
  "success": false,
  "error": "Stock insuficiente para algunos productos",
  "stock_errors": [
    {
      "sku": "PROD-001",
      "name": "Product Name",
      "requested": 5,
      "available": 2
    }
  ]
}
```

**Transaction Safety**:
- Uses row-level locking (`FOR UPDATE`)
- All operations in a single transaction
- Automatic rollback on any error
- Race condition prevention

### 2. `validate_stock()`

**Purpose**: Validates cart items against available inventory.

**Parameters**:
```sql
p_tenant_id TEXT
p_items JSONB -- [{sku, quantity}]
```

**Returns**: JSONB array of errors (empty if all valid)

### 3. `decrement_stock()`

**Purpose**: Atomically decrements inventory and logs transaction.

**Parameters**:
```sql
p_product_id UUID
p_tenant_id TEXT
p_quantity INT
```

**Returns**: INT (new stock quantity)

**Features**:
- Row-level locking to prevent race conditions
- Automatic validation (raises exception if insufficient stock)
- Transaction logging in `store_inventory_transactions`

## API Endpoint

### POST `/api/store/checkout`

**Request Body**:
```json
{
  "items": [
    {
      "id": "PROD-001",       // SKU for products, ID for services
      "name": "Product Name",
      "price": 50000,
      "type": "product",      // or "service"
      "quantity": 2
    }
  ],
  "clinic": "adris",          // Tenant ID
  "notes": "Optional notes"   // Optional
}
```

**Response (Success)**:
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-1702345678",
    "total": 110000,
    "status": "pending"
  }
}
```

**Response (Stock Error)**:
```json
{
  "error": "Stock insuficiente para algunos productos",
  "stockErrors": [
    {
      "id": "PROD-001",
      "name": "Product Name",
      "requested": 5,
      "available": 2
    }
  ]
}
```

**Status Codes**:
- `201`: Checkout successful
- `400`: Validation error (empty cart, insufficient stock)
- `401`: Not authenticated
- `403`: Tenant mismatch
- `404`: Profile not found
- `500`: Server error

## Security

### Authentication
- Every request must have valid Supabase session
- User profile must exist and be linked to tenant

### Tenant Isolation
- All operations filtered by `tenant_id`
- Cannot checkout for different tenant than user belongs to
- RLS policies enforce data isolation

### Race Condition Prevention
```sql
-- Row-level locking in decrement_stock
SELECT stock_quantity FROM store_inventory
WHERE product_id = p_product_id
FOR UPDATE;
```

This ensures that concurrent checkouts for the same product are serialized.

## Testing

### Manual Testing

1. **Successful Checkout**:
```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {"id": "PROD-001", "name": "Collar", "price": 25000, "type": "product", "quantity": 1}
    ],
    "clinic": "adris"
  }'
```

2. **Insufficient Stock**:
```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {"id": "PROD-001", "name": "Collar", "price": 25000, "type": "product", "quantity": 999}
    ],
    "clinic": "adris"
  }'
```

3. **Mixed Cart (Products + Services)**:
```bash
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {"id": "PROD-001", "name": "Collar", "price": 25000, "type": "product", "quantity": 1},
      {"id": "SRV-001", "name": "Consulta", "price": 50000, "type": "service", "quantity": 1}
    ],
    "clinic": "adris"
  }'
```

### Database Testing

```sql
-- Test stock validation
SELECT public.validate_stock(
  'adris',
  '[{"sku": "PROD-001", "quantity": 5}]'::jsonb
);

-- Test atomic checkout
SELECT public.process_checkout(
  'adris',
  'user-uuid',
  '[{"id": "PROD-001", "name": "Test", "price": 100, "quantity": 1, "type": "product"}]'::jsonb,
  'Test order'
);

-- Verify inventory transaction logged
SELECT * FROM store_inventory_transactions
WHERE product_id = 'product-uuid'
ORDER BY created_at DESC
LIMIT 5;
```

## Troubleshooting

### Issue: "Product not found in inventory"
- **Cause**: Product exists in `store_products` but not in `store_inventory`
- **Fix**:
```sql
INSERT INTO store_inventory (product_id, tenant_id, stock_quantity, weighted_average_cost)
VALUES ('product-uuid', 'tenant-id', 100, 0);
```

### Issue: "Insufficient stock" but UI shows stock available
- **Cause**: Race condition or concurrent checkouts
- **Fix**: This is expected behavior - stock is validated at checkout time, not at cart time
- **Solution**: Show clear error message and allow user to adjust quantity

### Issue: Transaction logged twice
- **Cause**: Using both old and new checkout methods
- **Fix**: Ensure only using the atomic `process_checkout` function

## Migration Guide

If upgrading from the previous manual implementation:

1. Apply migration `85_fix_checkout_inventory_table.sql`
```bash
cd web
npx supabase db push
```

2. Verify functions are updated:
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name IN ('process_checkout', 'decrement_stock', 'validate_stock');
```

3. Test checkout flow end-to-end

## Performance Considerations

### Optimization 1: Batch Stock Validation
The `validate_stock` function checks all items in a single query, avoiding N+1 queries.

### Optimization 2: Single Transaction
All operations (invoice creation, stock decrement, logging) happen in one database transaction, reducing connection overhead.

### Optimization 3: Row-Level Locking
Only locks specific product rows during checkout, allowing concurrent checkouts for different products.

### Bottlenecks
- **High-demand products**: If many users checkout the same product simultaneously, they'll be serialized
- **Large carts**: Processing 100+ items may take several seconds
- **Recommendation**: Add timeout handling (30s) and optimistic UI updates

## Audit Trail

Every checkout creates:

1. **Invoice Record** (`invoices` table)
   - Invoice number, totals, status, user info

2. **Invoice Items** (`invoice_items` table)
   - Line items with snapshot of product/service at purchase time

3. **Inventory Transactions** (`store_inventory_transactions` table)
   - Type: 'sale'
   - Quantity: negative (decrement)
   - Reference: none (could link to invoice_id)
   - Performed by: NULL (system operation)

4. **Audit Log** (`audit_logs` table)
   - Action: 'CHECKOUT'
   - Resource: 'invoices/{uuid}'
   - Details: totals, item counts

## Future Enhancements

1. **Payment Integration**
   - Add payment gateway (Mercado Pago, PayPal)
   - Update invoice status on payment confirmation

2. **Inventory Reservation**
   - Reserve stock for 15 minutes during checkout
   - Release if payment not completed

3. **Backorder Support**
   - Allow checkout even if stock is insufficient
   - Create backorder record

4. **Email Notifications**
   - Send order confirmation email
   - Notify staff of new orders

5. **Analytics**
   - Track conversion rates
   - Identify abandoned carts
   - Monitor popular products

## Related Documentation

- [Database Schema: Inventory](../database/schema-reference.md#inventory)
- [Database Schema: Invoices](../database/schema-reference.md#invoices)
- [API Reference: Store](../api/store.md)
- [Multi-Tenancy Architecture](../architecture/multi-tenancy.md)
