# Checkout Flow Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHECKOUT PROCESS                                │
└─────────────────────────────────────────────────────────────────────────────┘

    USER ACTION                  SYSTEM PROCESS              DATABASE OPERATION

┌─────────────┐
│ Add to Cart │
│  (Client)   │
└──────┬──────┘
       │
       │ Store in LocalStorage
       │
       ▼
┌─────────────┐
│  View Cart  │
│  (Client)   │
└──────┬──────┘
       │
       │ Click "Confirmar Pedido"
       │
       ▼
┌──────────────┐              ┌──────────────────┐
│   Checkout   │─────POST────▶│  /api/store/     │
│    Page      │              │    checkout      │
│  (Client)    │              │  (API Route)     │
└──────────────┘              └────────┬─────────┘
                                       │
                                       │ 1. Get user session
                                       │
                                       ▼
                              ┌──────────────────┐        ┌─────────────┐
                              │  Authenticate    │───────▶│  auth.users │
                              │    & Validate    │        │  profiles   │
                              │     Tenant       │        └─────────────┘
                              └────────┬─────────┘
                                       │
                                       │ 2. Call RPC
                                       │
                                       ▼
                              ┌──────────────────┐        ┌──────────────────┐
                              │  process_checkout│───────▶│  BEGIN TRANS.    │
                              │   (DB Function)  │        │                  │
                              └────────┬─────────┘        │  Lock Rows       │
                                       │                   │  (FOR UPDATE)    │
                                       │                   └────────┬─────────┘
                                       │                            │
                              ┌────────▼─────────┐                 │
                              │                  │                 │
                              │  3. Validate     │◀────────────────┘
                              │     Stock        │
                              │                  │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                    Stock OK?                   Stock Error?
                         │                           │
                         ▼                           ▼
              ┌──────────────────┐        ┌──────────────────┐
              │  4. Calculate    │        │  Return Errors   │
              │     Totals       │        │  (Rollback)      │
              └────────┬─────────┘        └────────┬─────────┘
                       │                           │
                       │                           │
              ┌────────▼─────────┐                │
              │  5. Create       │                │
              │     Invoice      │                │
              └────────┬─────────┘                │
                       │                           │
              ┌────────▼─────────┐                │
              │  6. Create       │                │
              │  Invoice Items   │                │
              └────────┬─────────┘                │
                       │                           │
              ┌────────▼─────────┐                │
              │  7. Decrement    │                │
              │     Stock        │                │
              └────────┬─────────┘                │
                       │                           │
              ┌────────▼─────────┐                │
              │  8. Log          │                │
              │  Transaction     │                │
              └────────┬─────────┘                │
                       │                           │
              ┌────────▼─────────┐                │
              │    COMMIT        │                │
              └────────┬─────────┘                │
                       │                           │
                       └─────────┬─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Return Result   │
                        │   to API Route   │
                        └────────┬─────────┘
                                 │
                                 │ 9. Log audit
                                 │
                        ┌────────▼─────────┐
                        │  Return JSON     │
                        │   to Client      │
                        └────────┬─────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
            Success?                         Error?
                 │                               │
                 ▼                               ▼
    ┌─────────────────────┐        ┌─────────────────────┐
    │  Clear Cart         │        │  Show Error         │
    │  Show Invoice       │        │  Keep Cart          │
    │  WhatsApp Link      │        │  Allow Adjustment   │
    └─────────────────────┘        └─────────────────────┘
```

## Database Transaction Detail

```
PROCESS_CHECKOUT FUNCTION EXECUTION
═══════════════════════════════════

START TRANSACTION
    │
    ├─▶ 1. FILTER PRODUCTS
    │      SELECT products WHERE type = 'product'
    │
    ├─▶ 2. VALIDATE_STOCK
    │      │
    │      ├─▶ For each product:
    │      │      SELECT stock FROM store_inventory
    │      │      WHERE product_id = X AND tenant_id = Y
    │      │
    │      ├─▶ Compare requested vs available
    │      │
    │      └─▶ Return errors if insufficient
    │
    ├─▶ 3. CALCULATE TOTALS
    │      subtotal = SUM(price × quantity)
    │      tax = subtotal × 0.10
    │      total = subtotal + tax
    │
    ├─▶ 4. CREATE INVOICE
    │      INSERT INTO invoices (
    │        tenant_id,
    │        invoice_number,
    │        user_id,
    │        status = 'pending',
    │        totals...
    │      )
    │      RETURNING id
    │
    ├─▶ 5. CREATE INVOICE ITEMS
    │      For each item:
    │        INSERT INTO invoice_items (
    │          invoice_id,
    │          description,
    │          quantity,
    │          unit_price,
    │          line_total
    │        )
    │
    ├─▶ 6. DECREMENT_STOCK (for each product)
    │      │
    │      ├─▶ LOCK ROW
    │      │   SELECT * FROM store_inventory
    │      │   WHERE product_id = X
    │      │   FOR UPDATE
    │      │
    │      ├─▶ UPDATE STOCK
    │      │   UPDATE store_inventory
    │      │   SET stock_quantity = stock_quantity - Y
    │      │   WHERE product_id = X
    │      │
    │      └─▶ LOG TRANSACTION
    │          INSERT INTO store_inventory_transactions (
    │            tenant_id,
    │            product_id,
    │            type = 'sale',
    │            quantity = -Y,
    │            notes = 'Checkout via store'
    │          )
    │
    └─▶ COMMIT TRANSACTION
        │
        └─▶ Return JSON result
```

## Race Condition Prevention

```
SCENARIO: Two users checkout same product simultaneously
═══════════════════════════════════════════════════════

Product: "Collar antipulgas"
Available Stock: 5 units
User A wants: 3 units
User B wants: 3 units

WITHOUT LOCKING (Race Condition - WRONG):
═════════════════════════════════════════

Time    User A                      User B                      Stock
────    ──────                      ──────                      ─────
T0      -                           -                           5
T1      SELECT stock (reads 5)      -                           5
T2      -                           SELECT stock (reads 5)      5
T3      Check: 5 >= 3 ✓             -                           5
T4      -                           Check: 5 >= 3 ✓             5
T5      UPDATE: 5 - 3 = 2           -                           2
T6      -                           UPDATE: 5 - 3 = 2           2
T7      COMMIT                      -                           2
T8      -                           COMMIT                      2

RESULT: Stock = 2 (WRONG! Should be -1 = oversold by 1 unit)


WITH LOCKING (Correct Implementation):
══════════════════════════════════════

Time    User A                      User B                      Stock
────    ──────                      ──────                      ─────
T0      -                           -                           5
T1      SELECT FOR UPDATE           -                           5 (locked by A)
        (acquires lock)
T2      -                           SELECT FOR UPDATE           5 (waiting...)
                                    (blocked, waits for A)
T3      Check: 5 >= 3 ✓             -                           5 (locked by A)
T4      UPDATE: 5 - 3 = 2           -                           2 (locked by A)
T5      COMMIT                      -                           2 (lock released)
T6      -                           (lock acquired)             2 (locked by B)
T7      -                           Check: 2 >= 3 ✗             2
T8      -                           ROLLBACK + Error            2

RESULT: Stock = 2 (CORRECT! User B gets stock error)
```

## State Diagram

```
CHECKOUT STATES
═══════════════

    ┌──────────────┐
    │   INITIAL    │
    │  Empty Cart  │
    └──────┬───────┘
           │
           │ Add Items
           ▼
    ┌──────────────┐
    │   PENDING    │
    │  Cart Active │
    └──────┬───────┘
           │
           │ Click Checkout
           ▼
    ┌──────────────┐
    │  PROCESSING  │
    │   Loading    │
    └──────┬───────┘
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
┌────────┐    ┌────────┐
│SUCCESS │    │ ERROR  │
└────┬───┘    └───┬────┘
     │            │
     │            ├─▶ Stock Error ──▶ Back to PENDING (adjust cart)
     │            │
     │            └─▶ Server Error ──▶ Retry or INITIAL
     │
     ├─▶ Clear Cart
     │
     └─▶ Show Invoice
         │
         ├─▶ Print
         ├─▶ WhatsApp
         └─▶ Continue Shopping ──▶ INITIAL
```

## Data Flow

```
CLIENT-SIDE DATA FLOW
═════════════════════

┌─────────────────────────────────────────────────────────────┐
│  CartContext (React Context + LocalStorage)                 │
│                                                              │
│  State:                                                      │
│    items: CartItem[]                                        │
│    total: number                                            │
│    discount: number                                         │
│                                                              │
│  Actions:                                                    │
│    addItem(item, quantity)                                  │
│    updateQuantity(id, delta)                                │
│    removeItem(id)                                           │
│    clearCart()                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Checkout
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Checkout Page (client.tsx)                                 │
│                                                              │
│  State:                                                      │
│    isProcessing: boolean                                    │
│    checkoutResult: CheckoutResult | null                    │
│    checkoutError: string | null                             │
│    stockErrors: StockError[]                                │
│                                                              │
│  Actions:                                                    │
│    handleCheckout() -> POST /api/store/checkout            │
│    handlePrint() -> window.print()                          │
│    generateWhatsAppLink() -> WhatsApp URL                   │
└─────────────────────────────────────────────────────────────┘


SERVER-SIDE DATA FLOW
═════════════════════

┌─────────────────────────────────────────────────────────────┐
│  API Route (/api/store/checkout/route.ts)                   │
└─────────────────────────────────────────────────────────────┘
            │
            ├─▶ 1. Auth Check
            │      supabase.auth.getUser()
            │
            ├─▶ 2. Profile Lookup
            │      SELECT tenant_id FROM profiles
            │
            ├─▶ 3. Tenant Validation
            │      clinic === profile.tenant_id
            │
            └─▶ 4. Process Checkout
                   supabase.rpc('process_checkout', {
                     p_tenant_id,
                     p_user_id,
                     p_items,
                     p_notes
                   })
                   │
                   ▼
            ┌─────────────────────────────────────────────┐
            │  Database Function (process_checkout)       │
            └─────────────────────────────────────────────┘
                   │
                   ├─▶ validate_stock()
                   │      └─▶ store_products + store_inventory
                   │
                   ├─▶ INSERT invoices
                   │
                   ├─▶ INSERT invoice_items
                   │
                   └─▶ decrement_stock()
                          ├─▶ UPDATE store_inventory
                          └─▶ INSERT store_inventory_transactions
```

## Security Layers

```
SECURITY ONION (Multiple Layers)
════════════════════════════════

┌───────────────────────────────────────────────────────────┐
│ Layer 1: Network                                           │
│   - HTTPS Only                                            │
│   - CORS Configuration                                     │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│ Layer 2: Authentication                                    │
│   - JWT Token Validation (Supabase)                       │
│   - Session Expiry                                         │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│ Layer 3: Authorization                                     │
│   - Profile Lookup                                         │
│   - Tenant Validation                                      │
│   - Role Check (if needed)                                 │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│ Layer 4: RLS Policies (Database)                          │
│   - profiles: User owns profile                           │
│   - invoices: User owns OR staff                          │
│   - invoice_items: Via invoice                            │
│   - store_inventory: Staff only                           │
│   - store_inventory_transactions: Staff only              │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│ Layer 5: Row-Level Locking                                │
│   - FOR UPDATE prevents concurrent modifications          │
│   - Transaction isolation                                  │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│ Layer 6: Audit Logging                                    │
│   - All operations logged                                 │
│   - Immutable audit trail                                  │
└───────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
ERROR HANDLING
══════════════

┌──────────────────────────────────────────────────────────────┐
│                     CHECKOUT REQUEST                          │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────┴──────────────────┐
        │                                     │
   Valid Session?                        No Session
        │                                     │
        ▼                                     ▼
    ┌────────┐                          ┌──────────┐
    │  YES   │                          │ 401 AUTH │
    └────┬───┘                          └──────────┘
         │
         ▼
    ┌──────────────────┐
    │ Profile Found?   │
    └────┬─────────────┘
         │
    ┌────┴─────┐
    │          │
   YES        NO
    │          │
    ▼          ▼
Valid     ┌──────────┐
JSON?     │ 404 NOT  │
    │     │  FOUND   │
    ▼     └──────────┘
┌────────┐
│  YES   │
└────┬───┘
     │
     ▼
┌──────────────────┐
│ Cart Not Empty?  │
└────┬─────────────┘
     │
┌────┴─────┐
│          │
YES       NO
│          │
▼          ▼
Tenant    ┌──────────┐
Matches?  │ 400 EMPTY│
│         └──────────┘
▼
┌────────┐
│  YES   │
└────┬───┘
     │
     ▼
┌──────────────────┐
│  Call DB Func    │
└────┬─────────────┘
     │
┌────┴──────┐
│           │
Stock OK?   Stock Error
│           │
▼           ▼
Invoice    ┌───────────────┐
Created?   │ 400 + Errors  │
│          └───────────────┘
▼
┌────────┐
│  YES   │
└────┬───┘
     │
     ▼
┌─────────────┐
│ 201 SUCCESS │
└─────────────┘
```

## Performance Monitoring Points

```
PERFORMANCE MONITORING
═════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Measure Point 1: API Route Entry                           │
│    Start: Request received                                  │
│    End: Before database call                                │
│    Expected: < 10ms                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Measure Point 2: Database Function                         │
│    Start: RPC call                                          │
│    End: RPC return                                           │
│    Expected: 150-400ms                                       │
│                                                              │
│    Breakdown:                                                │
│      - Stock validation: 20-50ms                            │
│      - Invoice creation: 30-80ms                            │
│      - Stock decrement: 50-150ms (with locking)            │
│      - Transaction logging: 30-70ms                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Measure Point 3: Audit Logging                             │
│    Start: After checkout success                            │
│    End: Audit log written                                    │
│    Expected: < 50ms                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Measure Point 4: Response Generation                       │
│    Start: Before NextResponse.json()                        │
│    End: Response sent                                        │
│    Expected: < 10ms                                          │
└─────────────────────────────────────────────────────────────┘

TOTAL EXPECTED: 200-500ms
P95: < 800ms
P99: < 1500ms
```

---

## Quick Reference

### Key Functions
- `process_checkout()` - Main atomic checkout function
- `validate_stock()` - Stock validation
- `decrement_stock()` - Atomic stock decrement with locking

### Key Tables
- `invoices` - Order records
- `invoice_items` - Line items
- `store_inventory` - Current stock levels
- `store_inventory_transactions` - Audit trail

### Key Files
- `web/app/api/store/checkout/route.ts` - API endpoint
- `web/db/81_checkout_functions.sql` - Database functions
- `web/app/[clinic]/cart/checkout/client.tsx` - UI

### Status Codes
- `201` - Success
- `400` - Validation error
- `401` - Not authenticated
- `403` - Tenant mismatch
- `500` - Server error
